import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {withForcedStaleCandidate} from './forced-stale-candidate.mjs';
import {verifyRemotePublic} from './remote-public-health.mjs';
import {verifyCdnR2Media,workerOriginChecks,verifyCdnMapping} from './cdn-r2-proof.mjs';
// Executes the exact prepared frontend module against deployed inactive shards and backend,
// without publishing that frontend. R2 object proofs never imply public CDN delivery.
export async function verifyCandidateFront({frontConfig,checks,cwd,zoneId,assertStable,captureVersions,fallbackChecks,probe=verifyRemotePublic,media=verifyCdnR2Media,mapping=verifyCdnMapping}){
 const options={cwd,zoneId,accountId:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN};
 await assertStable();const before=await captureVersions();const mappingBefore=await mapping(options);
 if(!Array.isArray(fallbackChecks)||!fallbackChecks.length||fallbackChecks.some(c=>c.renderedBody!==true||!c.requiredText?.length))throw Error('Rendered legacy fallback checks required');
 const configSha=createHash('sha256').update(await fs.readFile(frontConfig)).digest('hex');
 const fallbackResults=await withForcedStaleCandidate(frontConfig,{expectedSha256:configSha,assertStable},temporary=>probe(fallbackChecks.map(check=>({...check,service:'mcpapp',delivery:undefined})),{cwd,frontendConfig:temporary}));
 const serviceResults=await probe(workerOriginChecks(checks).map(check=>({...check,service:'mcpapp'})),{cwd,frontendConfig:frontConfig});
 const mediaProof=await media(checks.filter(check=>check.host==='cdn.mcpapp.net'),options);
 const mappingAfter=await mapping(options);await assertStable();const after=await captureVersions();
 if(JSON.stringify(before)!==JSON.stringify(after)){const error=Error('Candidate service versions changed during private frontend verification');error.code='EXTERNAL_FRONTEND_CHANGED';throw error;}
 if(mappingBefore.sha256!==mappingAfter.sha256||mediaProof.mapping.sha256!==mappingBefore.sha256)throw Error('Candidate CDN mapping changed during private frontend verification');
 return {kind:'private-candidate-frontend',frontConfig,versions:after,fallbackResults,serviceResults,mediaProof,publicDeliveryVerified:false};
}
