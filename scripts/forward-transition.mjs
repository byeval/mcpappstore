import {createHash} from 'node:crypto';
// This is an explicitly unverified predecessor, never a substitute verification record.
export function validateForwardTransition(record,live,{isAncestor,diagnostic}={}){
 if(record?.version!==1||record.kind!=='unverified-forward-transition'||record.verified!==false||record.failurePolicy!=='retain-unverified'||!/^[a-f0-9]{40}$/.test(record.sourceCommit??'')||!/^[a-f0-9]{64}$/.test(record.diagnosticSha256??'')||!record.instruction||!record.observedFailure)throw Error('Explicit unverified forward transition required');
 if(record.frontVersion!==live.versionId||live.versionTag!=='viator-global-'+record.sourceCommit.slice(0,7)||live.bindings?.some(b=>b.type==='service'))throw Error('Unverified predecessor changed or is not initial legacy');
 if(typeof isAncestor!=='function'||!isAncestor(record.sourceCommit))throw Error('Forward predecessor source is not an ancestor');
 if(!diagnostic||createHash('sha256').update(diagnostic).digest('hex')!==record.diagnosticSha256)throw Error('Original failure diagnostic mismatch');
 return {verified:false,frontVersion:record.frontVersion,failurePolicy:record.failurePolicy};
}
