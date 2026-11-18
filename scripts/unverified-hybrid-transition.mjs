// Scoped authorization to move forward from an explicitly UNVERIFIED hybrid.
// This does not produce verification evidence or authorize any rollback.
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {evidenceHash} from './data-only-verification.mjs';
import {validateRecoveryExpected,assertRecoveryState} from './verification-only-core.mjs';
import {selectProductionSlot} from './production-slot-plan.mjs';
export const TRANSITION_PATH='release-evidence/unverified-hybrid-transition.json';
export function reviewedTreeDigest(repo,ref='HEAD',{command=spawnSync}={}){
 if(!/^(?:HEAD|[a-f0-9]{40})$/.test(ref))throw Error('Exact source tree required');
 const r=command('git',['ls-tree','-r','-z',ref],{cwd:repo,encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024});if(r.error||r.status!==0)throw Error('Reviewed source tree unavailable');
 const entries=r.stdout.split('\0').filter(Boolean);if(!entries.length||entries.some(row=>!/^\d{6} (?:blob|commit) [a-f0-9]{40}\t[^\0]+$/.test(row)))throw Error('Malformed source tree');
 // Exactly one metadata file excluded, not a directory or path-prefix exemption.
 const included=entries.filter(row=>row.slice(row.indexOf('\t')+1)!==TRANSITION_PATH);
 return createHash('sha256').update(included.join('\0')+'\0').digest('hex');
}
export function validateUnverifiedHybridTransition(record,{expected,origin,diagnostic,live,front,sourceCommit,targetTreeDigest,isAncestor,now=Date.now()}){
 validateRecoveryExpected(expected);
 if(record?.version!==1||record.kind!=='unverified-hybrid-forward-transition'||record.verified!==false||record.failurePolicy!=='retain-unverified'||record.expectedDigest!==evidenceHash(expected)||record.targetTreeDigest!==targetTreeDigest||!/^[a-f0-9]{64}$/.test(targetTreeDigest??'')||!/^[a-f0-9]{40}$/.test(sourceCommit??'')||sourceCommit===expected.sourceCommit||typeof isAncestor!=='function'||!isAncestor(expected.sourceCommit)||!record.instruction)throw Error('Exact reviewed unverified hybrid transition required');
 if(!Number.isFinite(record.createdAt)||!Number.isFinite(record.expiresAt)||record.createdAt>now||record.expiresAt<=now||record.expiresAt-record.createdAt>24*60*60*1000)throw Error('Forward transition expired or invalid');
 if(origin?.runId!==expected.originalRunId||origin.sourceCommit!==expected.sourceCommit||record.originDigest!==evidenceHash(origin)||!/^[a-f0-9]{64}$/.test(record.originDigest??''))throw Error('Original deployment evidence mismatch');
 if(!diagnostic||createHash('sha256').update(diagnostic).digest('hex')!==record.diagnosticSha256)throw Error('Actual failed verification diagnostic required');
 const failure=JSON.parse(diagnostic);if(failure.verified!==false||failure.url!=='https://mcpapp.net/en/app/viator'||failure.actualStatus!==451||failure.expectedStatus!==410||failure.deployedSourceCommit!==expected.sourceCommit||failure.frontVersion!==expected.frontVersion||!/^\d+$/.test(failure.runId??''))throw Error('Scoped observed external failure mismatch');
 assertRecoveryState(expected,live);if(front?.versionId!==expected.frontVersion)throw Error('Current front identity mismatch');
 selectProductionSlot(front);const services=front.bindings.filter(b=>b.type==='service');for(const shard of expected.shards)if(!services.some(b=>b.name===shard.binding&&b.service===shard.service))throw Error('Current shard binding mismatch');
 return {verified:false,kind:record.kind,sourceCommit:expected.sourceCommit,targetSourceCommit:sourceCommit,targetTreeDigest,frontVersion:expected.frontVersion,backendVersion:expected.backendVersion,expectedDigest:record.expectedDigest,diagnosticSha256:record.diagnosticSha256,limitedFailure:failure,verificationInheritanceAllowed:false};
}
