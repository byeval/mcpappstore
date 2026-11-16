#!/usr/bin/env node
import {createWranglerHybridRegistry,requireVerifiedHybrid,makeVerifiedHybridRecord,saveVerifiedHybrid} from './verified-hybrid-registry.mjs';
import {deriveProductionSlotPlan,assertCurrentSlotUnchanged} from './production-slot-plan.mjs';
import {assertCutoverBudget} from './cutover-budget.mjs';
import {validateVerifiedAnchor} from './verified-anchor.mjs';
import {samplePublicBaseline,comparePublicAfterSwitch,createBrowserTicket} from './public-baseline-policy.mjs';
import {readWorkerCapacity} from './worker-capacity.mjs';
import {verifyPublicCutover} from './public-domain-smoke.mjs';
import {expandPublicAudit} from './expand-public-audit.mjs';
import {readLiveRouting,assertUnchangedRouting} from './live-routing.mjs';
import {captureRollbackMetadata,restoreDeploymentPair} from './frontend-rollback.mjs';
import {createHash} from 'node:crypto';
import {assertNoSourceSecrets} from './private-legacy.mjs';
import {withDeploymentLease} from './deployment-lease.mjs';
import {verifyRemotePublic} from './remote-public-health.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import {spawn,spawnSync} from 'node:child_process';
import {activatePlan,generateActivationPlan} from './astro-activation.mjs';
import {createWranglerD1} from './wrangler-d1.mjs';
import {prepareRelease,resolvePublisherConfig,fileDigest} from './astro-publisher-core.mjs';
const [action,...args]=process.argv.slice(2);const markerId=args[args.indexOf('--marker-id')+1];
const configFile=process.env.ASTRO_PUBLICATION_CONFIG;if(!configFile||!path.isAbsolute(configFile))throw Error('Explicit absolute ASTRO_PUBLICATION_CONFIG required');
const config=resolvePublisherConfig(JSON.parse(await fs.readFile(configFile,'utf8')),path.dirname(configFile));
function run(command,args,cwd,{capture=false,env={}}={}){const r=spawnSync(command,args,{cwd,env:{...process.env,...env},encoding:'utf8',stdio:capture?'pipe':'inherit',maxBuffer:64*1024*1024,timeout:capture?60000:undefined});if(r.error||r.status!==0)throw Error(`${command} ${args.slice(0,2).join(' ')} failed`);return r.stdout;}
const publication=await import(pathToFileURL(path.join(config.astroProject,'publishing-v3/publication.mjs')));
const DB=createWranglerD1();
const assertReady=(id,contentRevision)=>publication.assertCurrentPublication(DB,id,contentRevision);
let frontWasDeployed=false;
try{
if(action==='prepare'){
 config.buildCommit=run('git',['rev-parse','HEAD'],config.actualSourceRepo,{capture:true}).trim();
 run('git',['merge-base','--is-ancestor',config.sourceCommit,'HEAD'],config.actualSourceRepo); // Audit baseline must belong to this checkout lineage; parity tests compare CURRENT content.
 run('git',['diff','--quiet','HEAD','--'],config.actualSourceRepo);
 if(run('git',['ls-files','--others','--exclude-standard'],config.actualSourceRepo,{capture:true}).trim())throw Error('Untracked source files present; commit reviewed release sources before production preparation');

 const receipt=await prepareRelease(config,markerId,{
 assertReady,expandAudit:(audit,snapshot)=>expandPublicAudit(audit,snapshot,config.astroProject),exportSnapshot:()=>publication.exportReadySnapshot({DB},{blockedPaths:config.blockedPaths,sourceCommit:config.sourceCommit}),
 async stageProject(work){await fs.cp(config.astroProject,work,{recursive:true,filter:source=>{const rel=path.relative(config.astroProject,source);if(!rel)return true;const first=rel.split(path.sep)[0];return !first.startsWith('.')&&!['node_modules','evidence','releases'].includes(first)&&!first.startsWith('dist');}});},
 async build(work){run('npm',['ci','--ignore-scripts'],work);run('npm',['run','check'],work,{env:{ASTRO_TELEMETRY_DISABLED:'1'}});run('npm',['run','build','--','--outDir','dist-audited'],work,{env:{ASTRO_CURRENT_RELEASE:'true',ASTRO_TELEMETRY_DISABLED:'1',PRODUCTION_BUILD:'true'}});run(process.execPath,['--test','tests/current-source-static-parity.test.mjs','tests/audited-edge.test.mjs','tests/current-publication-policy.test.mjs'],work,{env:{CURRENT_SOURCE_REPO:config.actualSourceRepo,AUDITED_DIST:'dist-audited'}});},
 async split(work,assets,output,release){run(process.execPath,['sharding/split.mjs',assets,output,release,config.shardMode??'eight'],work);}
 });const receiptOut=args.includes('--receipt-out')?args[args.indexOf('--receipt-out')+1]:null;if(receiptOut){if(!path.isAbsolute(receiptOut))throw Error('Absolute receipt-out path required');await fs.writeFile(receiptOut,JSON.stringify({receiptPath:receipt.receiptPath,artifactId:receipt.artifactId,markerId:receipt.markerId}),{flag:'wx'});}
 console.log(JSON.stringify({prepared:true,receiptPath:receipt.receiptPath,artifactId:receipt.artifactId,markerId:receipt.markerId,sourceCommit:receipt.sourceCommit,urls:receipt.auditedUrlCount,artifactSha256:receipt.digest.sha256,activationAllowed:false}));
}else if(action==='activate'||action==='plan'){
 const receiptPath=args[args.indexOf('--receipt')+1];if(!args.includes('--receipt')||!path.isAbsolute(receiptPath))throw Error('Explicit absolute prepared --receipt path required');
 const receipt=JSON.parse(await fs.readFile(receiptPath,'utf8'));
 if(receipt.markerId!==markerId||receipt.sourceCommit!==config.sourceCommit)throw Error('Prepared artifact identity mismatch');
 const digest=await fileDigest(receipt.assets);if(digest.sha256!==receipt.digest.sha256)throw Error('Prepared artifact changed');
 const audit=JSON.parse(await fs.readFile(path.join(receipt.releaseDir,'work/evidence/current-source-audited-routes.json'),'utf8'));let plan=await generateActivationPlan(config,receipt,audit);
 if(action==='plan'||args.includes('--dry-run')){
  for(const file of [...plan.shardConfigs,plan.frontConfig])run('npx',['--no-install','wrangler','deploy','--dry-run','--config',file,'--outdir',path.join(path.dirname(file),'dry-run')],process.cwd());
  console.log(JSON.stringify({dryRun:true,frontConfig:plan.frontConfig,frontendName:plan.frontendName,legacyService:plan.legacyService,shards:plan.shardConfigs.length,activationEligible:plan.activationEligible}));
 }else{
  await assertReady(markerId,receipt.snapshot.publicationContentRevision);
  if(!plan.activationEligible||config.remoteHealthEnabled!==true)throw Error('Reviewed activation, routes, legacy and remote health must be explicitly enabled');
  if(!/^[a-f0-9]{40}$/.test(receipt.buildCommit??''))throw Error('Prepared source build commit missing');
  const capacityFor=plannedNames=>readWorkerCapacity({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN,plannedNames});
  const deploy=async file=>{const deploying=JSON.parse(await fs.readFile(file));await capacityFor([deploying.name]);await new Promise((resolve,reject)=>{const child=spawn('npx',['--no-install','wrangler','deploy','--config',file],{cwd:config.actualSourceRepo,stdio:'inherit'});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Worker deployment failed')));});};
  const legacyConfig=path.join(config.actualSourceRepo,'dist/server/wrangler.private.json');const legacy=JSON.parse(await fs.readFile(legacyConfig));if(legacy.name!=='mcpapp-legacy'||legacy.workers_dev!==false||legacy.preview_urls!==false||legacy.routes?.length||legacy.vars?.MCPAPP_BUILD_COMMIT!==receipt.buildCommit||legacy.vars?.MCPAPP_PRIVATE_BACKEND!=='true')throw Error('Private backend build identity/config mismatch');
  assertNoSourceSecrets(run('npx',['--no-install','wrangler','secret','list','--name','mcpapp','--config',path.join(config.actualSourceRepo,'wrangler.jsonc'),'--format','json'],config.actualSourceRepo,{capture:true}));
  const checksForShard=async file=>{const c=JSON.parse(await fs.readFile(file));const key=path.basename(path.dirname(file));const root=path.join(receipt.shardDir,key,'assets');const candidates=audit.explicitUrls.filter(p=>{const locale=p.match(/^\/(es|fr|de|ru|zh-hans|ja|ko)(?=\/|$)/)?.[1]??'en';return receipt.shards.mode==='eight'?locale===key:key==='east'?['ru','zh-hans','ja','ko'].includes(locale):!['ru','zh-hans','ja','ko'].includes(locale);});const publicPath=candidates.find(p=>p.endsWith('/docs'))??candidates[0];if(!publicPath)throw Error('No audited public probe path for shard');const body=await fs.readFile(path.join(root,publicPath,'index.html'));return [{service:c.name,path:publicPath,status:200,sha256:createHash('sha256').update(body).digest('hex')}];};
  await withDeploymentLease(DB,async lease=>{
   const assertHead=async()=>{await lease.assertOwned();const local=run('git',['rev-parse','HEAD'],config.actualSourceRepo,{capture:true}).trim();const remote=run('git',['ls-remote','origin','refs/heads/main'],config.actualSourceRepo,{capture:true}).trim().split(/\s+/)[0];if(local!==receipt.buildCommit||remote!==local)throw Error('Stale source build: current origin/main differs');};
   const captureService=async service=>{const deployments=JSON.parse(run('npx',['--no-install','wrangler','deployments','list','--name',service,'--json','--config',plan.frontConfig],config.actualSourceRepo,{capture:true}));const latest=[...deployments].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0];const id=latest?.versions?.[0]?.version_id;if(!/^[a-f0-9-]{36}$/.test(id??''))throw Error('Previous service version unavailable');const version=JSON.parse(run('npx',['--no-install','wrangler','versions','view',id,'--name',service,'--json','--config',plan.frontConfig],config.actualSourceRepo,{capture:true}));return captureRollbackMetadata(deployments,version);};
   await assertHead();const previousFront=await captureService('mcpapp');const requiresLegacy=previousFront.bindings.some(b=>b.type==='service'&&b.service==='mcpapp-legacy');const previousPair={front:previousFront,legacy:requiresLegacy?await captureService('mcpapp-legacy'):null,routeInventory:assertUnchangedRouting(await readLiveRouting({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,zoneId:config.zoneId,token:process.env.CLOUDFLARE_API_TOKEN}),config)};
   if(!requiresLegacy){const file=path.join(config.actualSourceRepo,'release-evidence/verified-legacy-anchor.json');const anchor=JSON.parse(await fs.readFile(file,'utf8'));validateVerifiedAnchor(anchor,previousFront,{isAncestor:commit=>spawnSync('git',['merge-base','--is-ancestor',commit,'HEAD'],{cwd:config.actualSourceRepo}).status===0});}
   await verifyRemotePublic([...['','/en','/es','/fr','/de','/ru','/ja','/ko','/zh-hans'].map(prefix=>({service:'mcpapp',path:prefix+'/app/viator',status:410})),...(requiresLegacy?[{service:'mcpapp-legacy',path:'/app/viator',status:410}]:[])],{cwd:config.actualSourceRepo});
   const hybridRegistry=await createWranglerHybridRegistry(config.actualSourceRepo,{leaseOwner:lease.owner});if(requiresLegacy)await requireVerifiedHybrid(hybridRegistry,previousFront,previousPair.legacy.versionId);
   plan=await deriveProductionSlotPlan(plan,receipt,previousFront);
   const assertActiveUnchanged=async()=>{await lease.assertOwned();assertCurrentSlotUnchanged(previousFront,await captureService('mcpapp'));};
   await fs.writeFile(path.join(receipt.releaseDir,'previous-deployment-pair.json'),JSON.stringify(previousPair,null,2),{flag:'wx'});
   let restorationAttempted=false;
   const restorePair=async previous=>{restorationAttempted=true;await restoreDeploymentPair(previous,{assertOwned:()=>lease.assertOwned(),rollback:async(service,versionId)=>run('npx',['--no-install','wrangler','rollback',versionId,'--name',service,'--config',plan.frontConfig,'--message','Automated rollout failed; restore verified previous version','--yes'],config.actualSourceRepo)});};
   const verifyPublic=async checks=>verifyPublicCutover({checks,readRouting:()=>readLiveRouting({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,zoneId:config.zoneId,token:process.env.CLOUDFLARE_API_TOKEN}),assertRouting:current=>assertUnchangedRouting(current,config)});
   const appPath=audit.explicitUrls.find(p=>p.startsWith('/app/'));if(!appPath)throw Error('Production smoke requires an audited app');
   const cssFiles=await fs.readdir(path.join(receipt.assets,'_astro'));const css=cssFiles.find(p=>p.endsWith('.css'));if(!css)throw Error('Production CSS probe missing');
   const catalog=JSON.parse(await fs.readFile(path.join(receipt.releaseDir,'work/src/data/catalog.json')));const icon=catalog.apps.find(a=>typeof a.iconKey==='string'&&/^(icons|previews)\/[a-zA-Z0-9_./-]+$/.test(a.iconKey))?.iconKey;if(!icon)throw Error('Production media probe missing');
   const publicChecks=[{path:'/docs',status:200,delivery:'astro-static',contentTypePrefix:'text/html',canonical:'https://mcpapp.net/docs'},{path:appPath,status:200,delivery:'astro-static',contentTypePrefix:'text/html',canonical:'https://mcpapp.net'+appPath},{path:'/_astro/'+css,status:200,contentTypePrefix:'text/css'},{host:'cdn.mcpapp.net',path:'/'+icon,status:200,contentTypePrefix:'image/'},{path:'/admin',status:401},{path:'/app/viator',status:410}];
   const baselineChecks=publicChecks.map(c=>({...c,delivery:undefined,canonical:undefined,...(c.path.startsWith('/_astro/')?{baselineMayBeMissing:true}:{})}));
   let baseline;
   const verifyOld=async()=>{await verifyRemotePublic([{service:'mcpapp',path:'/docs',status:200},{service:'mcpapp',path:'/admin',status:401},{service:'mcpapp',path:'/app/viator',status:410}],{cwd:config.actualSourceRepo});assertUnchangedRouting(await readLiveRouting({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,zoneId:config.zoneId,token:process.env.CLOUDFLARE_API_TOKEN}),config);const checks=baselineChecks.filter(c=>!c.path.startsWith('/_astro/'));const result=await comparePublicAfterSwitch(checks,baseline);await fs.writeFile(path.join(receipt.releaseDir,'rollback-public-observations.json'),JSON.stringify({...result,restoredPriorVersions:true},null,2));};
   const plannedServices=['mcpapp-legacy',...plan.productionServices,'mcpapp'];
   try{const capacity=await capacityFor(plannedServices);await fs.writeFile(path.join(receipt.releaseDir,'capacity-preflight.json'),JSON.stringify({...capacity,at:new Date().toISOString()},null,2),{flag:'wx'});}catch(error){if(error.capacity)await fs.writeFile(path.join(receipt.releaseDir,'capacity-preflight-failed.json'),JSON.stringify(error.capacity,null,2));throw error;}
   // Only a freshly confirmed cf-mitigated challenge can be inconclusive, never HTTP success.
   baseline=await samplePublicBaseline(baselineChecks);await fs.writeFile(path.join(receipt.releaseDir,'public-predeploy-baseline.json'),JSON.stringify(baseline,null,2),{flag:'wx'});
   try{
   await assertHead();await assertReady(markerId,receipt.snapshot.publicationContentRevision);await assertActiveUnchanged();await deploy(legacyConfig);await verifyRemotePublic([{service:'mcpapp-legacy',path:'/__mcpapp-release',status:200,commit:receipt.buildCommit},{service:'mcpapp-legacy',path:'/docs',status:200},{service:'mcpapp-legacy',path:'/api/import',status:405}],{cwd:config.actualSourceRepo});
   await activatePlan(plan,{
    assertReady:async(id,content)=>{await assertHead();await assertReady(id,content);},deployShard:async file=>{await assertActiveUnchanged();await deploy(file);},
    verifyShard:async file=>verifyRemotePublic(await checksForShard(file),{cwd:config.actualSourceRepo}),
    capturePrevious:async()=>previousPair,
    deployFront:async file=>{if(process.env.GITHUB_ACTIONS==='true')assertCutoverBudget({startedAt:Number(process.env.MCPAPP_JOB_STARTED_AT)});await assertHead();await assertActiveUnchanged();await deploy(file);frontWasDeployed=true;},
    verifyFront:async()=>{await verifyRemotePublic([{service:'mcpapp',path:'/docs',status:200,delivery:'astro-static'},{service:'mcpapp',path:appPath,status:200,delivery:'astro-static'},{service:'mcpapp',path:'/_astro/'+css,status:200},{service:'mcpapp',host:'cdn.mcpapp.net',path:'/'+icon,status:200},{service:'mcpapp',path:'/admin',status:401},{service:'mcpapp',path:'/app/viator',status:410}],{cwd:config.actualSourceRepo});const routing=assertUnchangedRouting(await readLiveRouting({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,zoneId:config.zoneId,token:process.env.CLOUDFLARE_API_TOKEN}),config);const proof=await comparePublicAfterSwitch(publicChecks,baseline);await fs.writeFile(path.join(receipt.releaseDir,'public-cutover-proof.json'),JSON.stringify({routing,...proof},null,2),{flag:'wx'});if(proof.state==='http-verified'){const record=makeVerifiedHybridRecord({front:await captureService('mcpapp'),backendVersion:(await captureService('mcpapp-legacy')).versionId,sourceCommit:receipt.buildCommit,proofDigest:createHash('sha256').update(JSON.stringify({routing,...proof})).digest('hex'),method:'public-https-plus-version-bound-service-http'});await saveVerifiedHybrid(hybridRegistry,record,{assertOwned:()=>lease.assertOwned()});}if(proof.state==='awaiting-browser'){const front=await captureService('mcpapp'),backend=await captureService('mcpapp-legacy');const frontConfig=JSON.parse(await fs.readFile(plan.frontConfig));const ticket=createBrowserTicket({artifactId:receipt.artifactId,buildCommit:receipt.buildCommit,markerId:receipt.markerId,contentRevision:receipt.snapshot.publicationContentRevision,frontVersion:front.versionId,backendVersion:backend.versionId,previousPair,checks:publicChecks,services:frontConfig.services,publicResult:proof});await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/browser-verification-ticket.json',JSON.stringify(ticket,null,2),{flag:'wx'});const pending=new Error('Deployment applied; public HTTPS is inconclusive under the same confirmed challenge. Exact-release normal-browser verification required.');pending.code='PUBLIC_BROWSER_VERIFICATION_PENDING';pending.challengeConfirmed=true;pending.sameConfirmedBaseline=true;pending.browserTicketCreated=true;throw pending;}},
    rollbackFront:restorePair,verifyPrevious:verifyOld
   });
   }catch(error){if(error?.code==='EXTERNAL_FRONTEND_CHANGED')throw error;if(error?.code==='PUBLIC_BROWSER_VERIFICATION_PENDING'&&error.sameConfirmedBaseline&&error.browserTicketCreated){await fs.writeFile(path.join(receipt.releaseDir,'public-browser-verification-required.json'),JSON.stringify({phase:'after-deployment',deployed:true,verified:false,reason:error.message,challengeConfirmed:error.challengeConfirmed}));throw error;}if(!restorationAttempted){try{await restorePair(previousPair);await verifyOld();}catch(rollbackError){throw new AggregateError([error,rollbackError],'Release failed AND previous deployment pair could not be restored/verified');}}throw error;}
  },{ttlMs:300000});
  console.log(JSON.stringify({activated:true,artifactId:receipt.artifactId}));
 }
}else throw Error('Usage: astro-publisher.mjs prepare|plan|activate --marker-id UUID [--receipt PATH | --receipt-out PATH]');

}catch(error){if(error?.code==='PUBLIC_BROWSER_VERIFICATION_REQUIRED'||(error?.code==='PUBLIC_BROWSER_VERIFICATION_PENDING'&&error.sameConfirmedBaseline&&error.browserTicketCreated)){console.log(JSON.stringify({state:'awaiting-browser',verified:false,reason:error.message,deployed:frontWasDeployed,deployRetryRequired:!frontWasDeployed}));process.exitCode=78;}else throw error;}
