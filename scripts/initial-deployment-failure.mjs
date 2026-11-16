// An initial migration with no prior private backend has no prior pair to restore
// until the public frontend actually changes. Never roll back an unrelated writer.
export async function preserveUnswitchedInitialFrontend({frontWasDeployed,previousLegacy,assertActiveUnchanged}){
 if(typeof frontWasDeployed!=='boolean'||typeof assertActiveUnchanged!=='function')throw Error('Exact deployment state required');
 if(frontWasDeployed||previousLegacy)return false;
 await assertActiveUnchanged();
 return true;
}
