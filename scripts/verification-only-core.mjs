import {randomUUID} from 'node:crypto';
import {evidenceHash,requireCandidateServiceProof} from './data-only-verification.mjs';
import {validateBrowserObservations} from './public-baseline-policy.mjs';
import {selectProductionSlot} from './production-slot-plan.mjs';
import {workerOriginChecks,assertR2ProbeResult} from './cdn-r2-proof.mjs';
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export function validateRecoveryExpected(e){
 if(e?.kind!=='current-state-recovery'||!/^\d+$/.test(e.originalRunId??'')||!/^[a-f0-9]{40}$/.test(e.sourceCommit??'')||!uuid.test(e.frontVersion??'')||!uuid.test(e.backendVersion??'')||!e.markerId||!e.contentRevision||!Array.isArray(e.shards)||e.shards.length!==8)throw Error('Exact original recovery identity required');
 const bindings=e.shards.map(s=>({type:'service',name:s.binding,service:s.service}));selectProductionSlot({versionId:e.frontVersion,bindings:[...bindings,{type:'service',name:'LEGACY',service:'mcpapp-legacy'}]});
 if(e.shards.some(s=>!uuid.test(s.versionId??'')))throw Error('All eight exact shard versions required');return e;
}
export function assertRecoveryState(expected,state){
 validateRecoveryExpected(expected);
 for(const key of ['sourceCommit','frontVersion','backendVersion','markerId','contentRevision'])if(state?.[key]!==expected[key])throw Error('Recovery runtime changed: '+key);
 if(state.publicationPhase!=='ready'||evidenceHash(state.shards)!==evidenceHash(expected.shards))throw Error('Recovery shards/publication changed');
 if(!/^[a-f0-9]{64}$/.test(state.runtimeDigest??''))throw Error('Complete runtime digest required');return state;
}
export async function runRecoveryVerification({expected,origin,ticket,proof,checks,effects,now=Date.now}){
 validateRecoveryExpected(expected);const expectedDigest=evidenceHash(expected);const started=now();let initial;
 const guard=async()=>{await effects.assertOwned();if(now()-started>20*60*1000)throw Error('Recovery verification deadline exceeded');if(ticket&&(!Number.isFinite(ticket.createdAt)||!Number.isFinite(ticket.expiresAt)||ticket.createdAt<0||ticket.expiresAt<=ticket.createdAt||ticket.kind!=='current-state-recovery'||ticket.expectedDigest!==expectedDigest||ticket.expiresAt<=now()||ticket.createdAt>now()||ticket.expiresAt-ticket.createdAt>30*60*1000||ticket.originalRunId!==expected.originalRunId||ticket.buildCommit!==expected.sourceCommit||ticket.frontVersion!==expected.frontVersion||ticket.backendVersion!==expected.backendVersion||evidenceHash(ticket.checks)!==evidenceHash(checks)))throw Error('Recovery ticket identity/expiry mismatch');const state=assertRecoveryState(expected,await effects.capture());if(initial&&state.runtimeDigest!==initial.runtimeDigest)throw Error('Recovery runtime changed during verification');initial??=state;await effects.assertOwned();if(now()-started>20*60*1000||(ticket&&ticket.expiresAt<=now()))throw Error('Recovery verification deadline exceeded');};
 await guard();
 const service=await effects.verifyService(checks);validateRecoveryService(checks,service,expected.sourceCommit);await guard();
 const media=await effects.verifyMedia(checks);validateRecoveryMedia(checks,media,initial);await guard();
 const publicResult=await effects.verifyPublic(checks);await guard();
 if(!Array.isArray(publicResult?.samples)||publicResult.samples.length!==checks.length||publicResult.samples.some((s,i)=>s.url!==checks[i].url||!['http-verified','confirmed-challenge'].includes(s.outcome)||(s.outcome==='http-verified'&&s.status!==checks[i].status)||(s.outcome==='confirmed-challenge'&&(s.status!==403||s.evidence!=='cf-mitigated: challenge'))))throw Error('Complete fresh public HTTPS observations required');
 const evidence={origin,kind:'current-state-recovery',originalRunId:expected.originalRunId,expectedDigest,runtime:initial,checks,service,media,publicResult,fullNonHtmlAssetDigestAvailable:false,dataOnlyInheritanceEligible:false};
 if(!ticket){const createdAt=now();return {ticket:{version:1,kind:'current-state-recovery',state:'awaiting-browser',phase:'after-deployment',publicPolicy:'viator-global-v1',nonce:randomUUID(),artifactId:'recovery-'+expected.originalRunId+'-'+randomUUID(),originalRunId:expected.originalRunId,expectedDigest,buildCommit:expected.sourceCommit,frontVersion:expected.frontVersion,backendVersion:expected.backendVersion,checks,createdAt,expiresAt:createdAt+30*60*1000,publicResult,runtimeDigest:initial.runtimeDigest},evidence};}
 if(ticket.runtimeDigest!==initial.runtimeDigest)throw Error('Runtime differs from ticket');
 const accepted=validateBrowserObservations(ticket,proof,{now:now()});await guard();validateBrowserObservations(ticket,proof,{now:now()});
 const complete={...evidence,proof,accepted};await effects.saveEvidence(complete);await guard();validateBrowserObservations(ticket,proof,{now:now()});
 await effects.saveRegistry({proofDigest:evidenceHash(complete),verifiedAt:now(),state:initial,deadline:Math.min(ticket.expiresAt,proof.observedAt+5*60*1000,started+20*60*1000)});return {verified:true,evidence:complete};
}

export function validateRecoveryService(checks,results,sourceCommit){
 const origin=workerOriginChecks(checks);if(!Array.isArray(results)||results.length!==origin.length+1)throw Error('Complete recovery service evidence required');
 const backend=results.filter(r=>r.service==='mcpapp-legacy'&&r.path==='/__mcpapp-release');if(backend.length!==1||backend[0].status!==200||backend[0].commit!==sourceCommit)throw Error('Actual backend commit evidence required');
 const front=results.filter(r=>r.service==='mcpapp');if(new Set(front.map(r=>(r.host??'mcpapp.net')+r.path)).size!==front.length)throw Error('Duplicate service evidence');requireCandidateServiceProof(origin,front);
 for(const check of origin){const row=front.find(r=>r.path===check.path&&(r.host??'mcpapp.net')===(check.host??'mcpapp.net'));if(!/^[a-f0-9]{64}$/.test(row?.sha256??'')||(check.renderedBody&&row.renderedBody?.ok!==true))throw Error('Missing served body evidence');}
}
export function validateRecoveryMedia(checks,media,state){
 const expected=checks.filter(c=>c.host==='cdn.mcpapp.net');if(!expected.length||media?.kind!=='cdn-mapping-and-r2-objects'||media.deliveryVerified!==false||!Array.isArray(media.objects)||media.objects.length!==expected.length||media.mapping?.sha256!==state.cdnMappingSha256||!/^[a-f0-9]{64}$/.test(state.cdnMappingSha256??''))throw Error('Complete recovery media/mapping evidence required');
 if(new Set(media.objects.map(r=>r.path)).size!==media.objects.length)throw Error('Duplicate media evidence');
 for(const check of expected){const row=media.objects.find(r=>r.path===check.path&&r.host===check.host);if(!row||row.kind!=='r2-object')throw Error('Missing media object');assertR2ProbeResult({...row,nonce:'recovery'},check,'recovery');}
}
