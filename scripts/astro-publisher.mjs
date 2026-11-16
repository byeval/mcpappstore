#!/usr/bin/env node
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
if(action==='prepare'){
 config.buildCommit=run('git',['rev-parse','HEAD'],config.actualSourceRepo,{capture:true}).trim();
 run('git',['merge-base','--is-ancestor',config.sourceCommit,'HEAD'],config.actualSourceRepo); // Audit baseline must belong to this checkout lineage; parity tests compare CURRENT content.
 run('git',['diff','--quiet','HEAD','--'],config.actualSourceRepo);
 if(run('git',['ls-files','--others','--exclude-standard'],config.actualSourceRepo,{capture:true}).trim())throw Error('Untracked source files present; commit reviewed release sources before production preparation');

 const receipt=await prepareRelease(config,markerId,{
 assertReady,expandAudit:(audit,snapshot)=>expandPublicAudit(audit,snapshot,config.astroProject),exportSnapshot:()=>publication.exportReadySnapshot({DB},{blockedPaths:config.blockedPaths,sourceCommit:config.sourceCommit}),
 async stageProject(work){await fs.cp(config.astroProject,work,{recursive:true,filter:source=>{const rel=path.relative(config.astroProject,source);if(!rel)return true;const first=rel.split(path.sep)[0];return !first.startsWith('.')&&!['node_modules','evidence','releases'].includes(first)&&!first.startsWith('dist');}});},
 async build(work){run('npm',['ci','--ignore-scripts'],work);run('npm',['run','check'],work,{env:{ASTRO_TELEMETRY_DISABLED:'1'}});run('npm',['run','build','--','--outDir','dist-audited'],work,{env:{ASTRO_CURRENT_RELEASE:'true',ASTRO_TELEMETRY_DISABLED:'1',PRODUCTION_BUILD:'true'}});run(process.execPath,['--test','tests/current-source-static-parity.test.mjs','tests/audited-edge.test.mjs'],work,{env:{CURRENT_SOURCE_REPO:config.actualSourceRepo,AUDITED_DIST:'dist-audited'}});},
 async split(work,assets,output,release){run(process.execPath,['sharding/split.mjs',assets,output,release,config.shardMode??'eight'],work);}
 });const receiptOut=args.includes('--receipt-out')?args[args.indexOf('--receipt-out')+1]:null;if(receiptOut){if(!path.isAbsolute(receiptOut))throw Error('Absolute receipt-out path required');await fs.writeFile(receiptOut,JSON.stringify({receiptPath:receipt.receiptPath,artifactId:receipt.artifactId,markerId:receipt.markerId}),{flag:'wx'});}
 console.log(JSON.stringify({prepared:true,receiptPath:receipt.receiptPath,artifactId:receipt.artifactId,markerId:receipt.markerId,sourceCommit:receipt.sourceCommit,urls:receipt.auditedUrlCount,artifactSha256:receipt.digest.sha256,activationAllowed:false}));
}else if(action==='activate'||action==='plan'){
 const receiptPath=args[args.indexOf('--receipt')+1];if(!args.includes('--receipt')||!path.isAbsolute(receiptPath))throw Error('Explicit absolute prepared --receipt path required');
 const receipt=JSON.parse(await fs.readFile(receiptPath,'utf8'));
 if(receipt.markerId!==markerId||receipt.sourceCommit!==config.sourceCommit)throw Error('Prepared artifact identity mismatch');
 const digest=await fileDigest(receipt.assets);if(digest.sha256!==receipt.digest.sha256)throw Error('Prepared artifact changed');
 const audit=JSON.parse(await fs.readFile(path.join(receipt.releaseDir,'work/evidence/current-source-audited-routes.json'),'utf8'));const plan=await generateActivationPlan(config,receipt,audit);
 if(action==='plan'||args.includes('--dry-run')){
  for(const file of [...plan.shardConfigs,plan.frontConfig])run('npx',['--no-install','wrangler','deploy','--dry-run','--config',file,'--outdir',path.join(path.dirname(file),'dry-run')],process.cwd());
  console.log(JSON.stringify({dryRun:true,frontConfig:plan.frontConfig,frontendName:plan.frontendName,legacyService:plan.legacyService,shards:plan.shardConfigs.length,activationEligible:plan.activationEligible}));
 }else{
  await assertReady(markerId,receipt.snapshot.publicationContentRevision);
  if(!plan.activationEligible||config.remoteHealthEnabled!==true)throw Error('Reviewed activation, routes, legacy and remote health must be explicitly enabled');
  if(!/^[a-f0-9]{40}$/.test(receipt.buildCommit??''))throw Error('Prepared source build commit missing');
  const deploy=async file=>{await new Promise((resolve,reject)=>{const child=spawn('npx',['--no-install','wrangler','deploy','--config',file],{cwd:config.actualSourceRepo,stdio:'inherit'});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Worker deployment failed')));});};
  const legacyConfig=path.join(config.actualSourceRepo,'dist/server/wrangler.private.json');const legacy=JSON.parse(await fs.readFile(legacyConfig));if(legacy.name!=='mcpapp-legacy'||legacy.workers_dev!==false||legacy.preview_urls!==false||legacy.routes?.length||legacy.vars?.MCPAPP_BUILD_COMMIT!==receipt.buildCommit||legacy.vars?.MCPAPP_PRIVATE_BACKEND!=='true')throw Error('Private backend build identity/config mismatch');
  assertNoSourceSecrets(run('npx',['--no-install','wrangler','secret','list','--name','mcpapp','--config',path.join(config.actualSourceRepo,'wrangler.jsonc'),'--format','json'],config.actualSourceRepo,{capture:true}));
  const checksForShard=async file=>{const c=JSON.parse(await fs.readFile(file));const key=path.basename(path.dirname(file));const root=path.join(receipt.shardDir,key,'assets');const candidates=audit.explicitUrls.filter(p=>{const locale=p.match(/^\/(es|fr|de|ru|zh-hans|ja|ko)(?=\/|$)/)?.[1]??'en';return receipt.shards.mode==='eight'?locale===key:key==='east'?['ru','zh-hans','ja','ko'].includes(locale):!['ru','zh-hans','ja','ko'].includes(locale);});const publicPath=candidates.find(p=>p.endsWith('/docs'))??candidates[0];if(!publicPath)throw Error('No audited public probe path for shard');const body=await fs.readFile(path.join(root,publicPath,'index.html'));return [{service:c.name,path:publicPath,status:200,sha256:createHash('sha256').update(body).digest('hex')}];};
  await withDeploymentLease(DB,async lease=>{
   const assertHead=async()=>{await lease.assertOwned();const local=run('git',['rev-parse','HEAD'],config.actualSourceRepo,{capture:true}).trim();const remote=run('git',['ls-remote','origin','refs/heads/main'],config.actualSourceRepo,{capture:true}).trim().split(/\s+/)[0];if(local!==receipt.buildCommit||remote!==local)throw Error('Stale source build: current origin/main differs');};
   const captureService=async service=>{const deployments=JSON.parse(run('npx',['--no-install','wrangler','deployments','list','--name',service,'--json','--config',plan.frontConfig],config.actualSourceRepo,{capture:true}));const latest=[...deployments].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0];const id=latest?.versions?.[0]?.version_id;if(!/^[a-f0-9-]{36}$/.test(id??''))throw Error('Previous service version unavailable');const version=JSON.parse(run('npx',['--no-install','wrangler','versions','view',id,'--name',service,'--json','--config',plan.frontConfig],config.actualSourceRepo,{capture:true}));return captureRollbackMetadata(deployments,version);};
   await assertHead();const previousFront=await captureService('mcpapp');const requiresLegacy=previousFront.bindings.some(b=>b.type==='service'&&b.service==='mcpapp-legacy');const previousPair={front:previousFront,legacy:requiresLegacy?await captureService('mcpapp-legacy'):null,routeInventory:assertUnchangedRouting(await readLiveRouting({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,zoneId:config.zoneId,token:process.env.CLOUDFLARE_API_TOKEN}),config)};
   await fs.writeFile(path.join(receipt.releaseDir,'previous-deployment-pair.json'),JSON.stringify(previousPair,null,2),{flag:'wx'});
   let restorationAttempted=false;
   const restorePair=async previous=>{restorationAttempted=true;await restoreDeploymentPair(previous,{assertOwned:()=>lease.assertOwned(),rollback:async(service,versionId)=>run('npx',['--no-install','wrangler','rollback',versionId,'--name',service,'--config',plan.frontConfig,'--message','Automated rollout failed; restore verified previous version','--yes'],config.actualSourceRepo)});};
   const verifyOld=async()=>verifyRemotePublic([{service:'mcpapp',path:'/docs',status:200},{service:'mcpapp',path:'/admin',status:401},{service:'mcpapp',path:'/app/viator',status:410}],{cwd:config.actualSourceRepo});
   try{
   await assertHead();await assertReady(markerId,receipt.snapshot.publicationContentRevision);await deploy(legacyConfig);await verifyRemotePublic([{service:'mcpapp-legacy',path:'/__mcpapp-release',status:200,commit:receipt.buildCommit},{service:'mcpapp-legacy',path:'/docs',status:200},{service:'mcpapp-legacy',path:'/api/import',status:405}],{cwd:config.actualSourceRepo});
   const appPath=audit.explicitUrls.find(p=>p.startsWith('/app/'));if(!appPath)throw Error('Production smoke requires an audited app');
   const cssFiles=await fs.readdir(path.join(receipt.assets,'_astro'));const css=cssFiles.find(p=>p.endsWith('.css'));if(!css)throw Error('Production CSS probe missing');
   const catalog=JSON.parse(await fs.readFile(path.join(receipt.releaseDir,'work/src/data/catalog.json')));const icon=catalog.apps.find(a=>typeof a.iconKey==='string'&&/^(icons|previews)\/[a-zA-Z0-9_./-]+$/.test(a.iconKey))?.iconKey;if(!icon)throw Error('Production media probe missing');
   await activatePlan(plan,{
    assertReady:async(id,content)=>{await assertHead();await assertReady(id,content);},deployShard:deploy,
    verifyShard:async file=>verifyRemotePublic(await checksForShard(file),{cwd:config.actualSourceRepo}),
    capturePrevious:async()=>previousPair,
    deployFront:async file=>{await assertHead();await deploy(file);},
    verifyFront:async()=>verifyRemotePublic([{service:'mcpapp',path:'/docs',status:200,delivery:'astro-static'},{service:'mcpapp',path:appPath,status:200,delivery:'astro-static'},{service:'mcpapp',path:'/_astro/'+css,status:200},{service:'mcpapp',host:'cdn.mcpapp.net',path:'/'+icon,status:200},{service:'mcpapp',path:'/admin',status:401},{service:'mcpapp',path:'/app/viator',status:410}],{cwd:config.actualSourceRepo}),
    rollbackFront:restorePair,verifyPrevious:verifyOld
   });
   }catch(error){if(!restorationAttempted){try{await restorePair(previousPair);await verifyOld();}catch(rollbackError){throw new AggregateError([error,rollbackError],'Release failed AND previous deployment pair could not be restored/verified');}}throw error;}
  },{ttlMs:300000});
  console.log(JSON.stringify({activated:true,artifactId:receipt.artifactId}));
 }
}else throw Error('Usage: astro-publisher.mjs prepare|plan|activate --marker-id UUID [--receipt PATH | --receipt-out PATH]');
