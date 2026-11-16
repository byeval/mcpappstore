// Durable ownership evidence for the standard committed anchor CLI.
export function assertOwnedRollback({ownedVersion,ownedTag,currentVersion,currentTag,ownedMessage,currentMessage}){if(!ownedVersion||!ownedTag||!ownedMessage)throw Error('Unknown/partial deployment ownership; no automatic rollback');if(currentVersion!==ownedVersion||currentTag!==ownedTag||currentMessage!==ownedMessage)throw Error('Frontend superseded; refuse reverting another writer');}

export async function reconcileOwnedDeployment({readCurrent,priorVersion,tag,message,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 const attempts=[];for(let attempt=0;attempt<4;attempt++){try{const current=await readCurrent();attempts.push({attempt:attempt+1,versionId:current.versionId,tag:current.versionTag??null,message:current.versionMessage??null});if(current.versionId!==priorVersion&&current.versionTag===tag&&current.versionMessage===message)return {outcome:'owned',versionId:current.versionId,attempts};if(current.versionId!==priorVersion)return {outcome:'superseded',versionId:current.versionId,attempts};if(attempt===3)return {outcome:'prior-unchanged',versionId:current.versionId,attempts};}catch{attempts.push({attempt:attempt+1,metadataUnavailable:true});if(attempt===3)return {outcome:'unknown',attempts};}await sleep([1000,2000,4000][attempt]);}throw Error('Unreachable reconciliation state');
}
export async function executeOwnedDeployment({intent,writeIntent,deploy,readCurrent,writeRecovery,onOwned,sleep}){
 await writeIntent(intent);let commandError;try{await deploy();}catch(error){commandError=error;}
 const resolution=await reconcileOwnedDeployment({readCurrent,priorVersion:intent.previousFront.versionId,tag:intent.tag,message:intent.message,sleep});
 await writeRecovery({...resolution,sourceCommit:intent.sourceCommit,targetService:intent.targetService,tag:intent.tag,message:intent.message,previousFront:intent.previousFront,commandSucceeded:!commandError,reconciledAt:Date.now()});
 if(resolution.outcome==='owned')await onOwned(resolution.versionId,resolution);
 if(commandError)throw commandError;
 if(resolution.outcome!=='owned')throw Error('Deployment ownership unresolved: '+resolution.outcome+'; durable recovery receipt retained');return resolution;
}
export async function rollbackOwnedDeployment({ownedVersion,tag,message,resolution,previousVersion,readCurrent,assertLease,rollback}){
 await assertLease();const current=await readCurrent();
 if(!ownedVersion&&resolution?.outcome==='prior-unchanged'){if(current.versionId!==previousVersion)throw Error('Frontend superseded after unchanged reconciliation; no rollback');return {rolledBack:false,priorUnchanged:true};}
 assertOwnedRollback({ownedVersion,ownedTag:tag,ownedMessage:message,currentVersion:current.versionId,currentTag:current.versionTag,currentMessage:current.versionMessage});
 await assertLease();const immediate=await readCurrent();assertOwnedRollback({ownedVersion,ownedTag:tag,ownedMessage:message,currentVersion:immediate.versionId,currentTag:immediate.versionTag,currentMessage:immediate.versionMessage});
 await rollback(previousVersion);return {rolledBack:true};
}
