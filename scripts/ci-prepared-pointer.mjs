import path from 'node:path';
export function validateCiPreparedPointer(pointer,{repo,sourceSha,runId,runAttempt}){
 if(!/^[a-f0-9]{40}$/.test(sourceSha??'')||!/^\d+$/.test(runId??'')||!/^\d+$/.test(runAttempt??'')||pointer?.sourceSha!==sourceSha||pointer.runId!==runId||pointer.runAttempt!==runAttempt)throw Error('Prepared CI identity mismatch');
 const root=path.join(repo,'.astro-releases')+path.sep;
 if(typeof pointer.receiptPath!=='string'||!path.isAbsolute(pointer.receiptPath)||path.resolve(pointer.receiptPath)!==pointer.receiptPath||!pointer.receiptPath.startsWith(root)||path.basename(pointer.receiptPath)!=='prepared.json'||typeof pointer.markerId!=='string'||!pointer.markerId)throw Error('Exact local prepared receipt required');
 return pointer;
}
export async function runCanonicalPhase(phase,{prepare,activate}){if(!['all','prepare','activate'].includes(phase))throw Error('Invalid canonical deployment phase');if(phase!=='activate')await prepare();if(phase!=='prepare')return await activate();}
