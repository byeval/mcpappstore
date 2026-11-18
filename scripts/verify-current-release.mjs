import {saveRecoveryRegistry} from './recovery-registry.mjs';
import {readRecoveryOrigin} from './recovery-origin.mjs';
// Explicit recovery only: no deploy, rollback, build, or inherited/direct evidence insert.
import fs from 'node:fs/promises';import path from 'node:path';
import {runRecoveryVerification,validateRecoveryExpected} from './verification-only-core.mjs';
import {productionSmokeChecks} from './production-smoke-checks.mjs';
import {inheritanceServiceChecks,evidenceHash,runtimeConfigHash} from './data-only-verification.mjs';
import {samplePublicBaseline} from './public-baseline-policy.mjs';
import {workerOriginChecks,verifyCdnR2Media,verifyCdnMapping} from './cdn-r2-proof.mjs';
import {currentVersion,wranglerJson} from './release-control.mjs';
import {readLiveRouting,assertUnchangedRouting} from './live-routing.mjs';
import {readPublicationState} from './publication-state.mjs';
import {resolvePublisherConfig} from './astro-publisher-core.mjs';
import {createWranglerD1} from './wrangler-d1.mjs';
import {withDeploymentLease} from './deployment-lease.mjs';
import {makeVerifiedHybridRecord} from './verified-hybrid-registry.mjs';
import {verifyRemotePublic} from './remote-public-health.mjs';
const args=process.argv.slice(2);function arg(name,optional=false){const i=args.indexOf(name);if(i<0&&optional)return null;const value=args[i+1];if(i<0||!value||!path.isAbsolute(value))throw Error('Explicit absolute '+name+' required');return value;}
const expectedFile=arg('--expected'),output=arg('--output'),ticketFile=arg('--ticket',true),proofFile=arg('--observations',true);if(Boolean(ticketFile)!==Boolean(proofFile))throw Error('Ticket and observations required together');
const read=file=>fs.readFile(file,'utf8').then(JSON.parse);const expected=validateRecoveryExpected(await read(expectedFile));const origin=readRecoveryOrigin(expected);
const configFile=process.env.ASTRO_PUBLICATION_CONFIG;if(!configFile||!path.isAbsolute(configFile))throw Error('Explicit config required');
const config=resolvePublisherConfig(await read(configFile),path.dirname(configFile)),repo=config.actualSourceRepo,DB=createWranglerD1({cwd:repo});
if(!process.env.CLOUDFLARE_API_TOKEN||!process.env.CLOUDFLARE_ACCOUNT_ID)throw Error('Authenticated read-only CF inventory capability required');
// Recovery inputs are explicit fresh public sample choices, not claims about lost build artifacts.
const checks=inheritanceServiceChecks(productionSmokeChecks(expected.smoke).publicChecks).map(c=>({...c,url:'https://'+(c.host??'mcpapp.net')+c.path}));
let registryCommitted=false;
await withDeploymentLease(DB,async lease=>{
 const current=async service=>{await lease.assertOwned();return currentVersion(service,repo);};
 const metadata=async (version,service)=>{await lease.assertOwned();return wranglerJson(['versions','view',version,'--name',service,'--json'],repo);};
 const capture=async()=>{
  const publication=await readPublicationState(DB),frontVersion=await current('mcpapp'),backendVersion=await current('mcpapp-legacy');
  const front=await metadata(frontVersion,'mcpapp'),back=await metadata(backendVersion,'mcpapp-legacy');
  if(front.id!==frontVersion||back.id!==backendVersion)throw Error('Version metadata mismatch');
  const shards=[];for(const s of expected.shards)shards.push({...s,versionId:await current(s.service)});
  for(const s of shards)if(!front.resources?.bindings?.some(b=>b.type==='service'&&b.name===s.binding&&b.service===s.service))throw Error('Shard binding mismatch');
  const frontHash=runtimeConfigHash(front,{kind:'front',sourceCommit:expected.sourceCommit,publication}),backHash=runtimeConfigHash(back,{kind:'backend',sourceCommit:expected.sourceCommit,publication});
  const routing=assertUnchangedRouting(await readLiveRouting({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,zoneId:config.zoneId,token:process.env.CLOUDFLARE_API_TOKEN}),config);
  const mapping=await verifyCdnMapping({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,zoneId:config.zoneId,token:process.env.CLOUDFLARE_API_TOKEN});
  if(await current('mcpapp')!==frontVersion||await current('mcpapp-legacy')!==backendVersion)throw Error('Runtime changed during capture');for(const s of shards)if(await current(s.service)!==s.versionId)throw Error('Shard changed during capture');
  return {sourceCommit:expected.sourceCommit,frontVersion,backendVersion,markerId:publication.id,contentRevision:publication.contentRevision,publicationPhase:publication.phase,cdnMappingSha256:mapping.sha256,shards,bindings:front.resources.bindings.filter(b=>b.type==='service'),runtimeDigest:evidenceHash({frontHash,backHash,shards,publication,routing:{domains:routing.domains.sort((a,b)=>a.hostname.localeCompare(b.hostname)),routes:routing.routes.sort((a,b)=>a.pattern.localeCompare(b.pattern))},mapping})};
 };
 const result=await runRecoveryVerification({expected,origin,checks,ticket:ticketFile?await read(ticketFile):undefined,proof:proofFile?await read(proofFile):undefined,effects:{assertOwned:()=>lease.assertOwned(),capture,
 verifyService:checks=>verifyRemotePublic([{service:'mcpapp-legacy',path:'/__mcpapp-release',status:200,commit:expected.sourceCommit},...workerOriginChecks(checks).map(c=>({...c,service:'mcpapp'}))],{cwd:repo}),
 verifyMedia:checks=>verifyCdnR2Media(checks.filter(c=>c.host==='cdn.mcpapp.net'),{cwd:repo,zoneId:config.zoneId}),
 verifyPublic:checks=>samplePublicBaseline(checks),saveEvidence:e=>fs.writeFile(output+'.evidence.json',JSON.stringify(e,null,2),{flag:'wx',mode:0o600}),
 saveRegistry:async ({proofDigest,verifiedAt,state,deadline})=>{const saved=await saveRecoveryRegistry(DB,makeVerifiedHybridRecord({front:{versionId:expected.frontVersion,bindings:state.bindings},backendVersion:expected.backendVersion,sourceCommit:expected.sourceCommit,proofDigest,verifiedAt,method:'normal-browser-dom-plus-version-bound-service-http'}),{leaseOwner:lease.owner,deadline,assertOwned:()=>lease.assertOwned()});registryCommitted=true;return saved;}}});
 try{await fs.writeFile(output,JSON.stringify({...result,origin},null,2),{flag:'wx',mode:0o600});}catch(error){if(result.verified){const failed=new Error('Registry verification committed; local result write failed. Reconcile registry read-only; do not retry write.',{cause:error});failed.code='RECOVERY_REGISTRY_COMMITTED_OUTPUT_FAILED';throw failed;}throw error;}console.log(JSON.stringify({ticketCreated:!!result.ticket,verified:result.verified===true,deploy:false,rollback:false,directEvidenceSaved:false}));
}).catch(error=>{if(registryCommitted&&error.code!=='RECOVERY_REGISTRY_COMMITTED_OUTPUT_FAILED'){const failed=new Error('Recovery registry committed; subsequent cleanup failed. Reconcile read-only, do not retry writes.',{cause:error});failed.code='RECOVERY_REGISTRY_COMMITTED_CLEANUP_FAILED';throw failed;}throw error;});
