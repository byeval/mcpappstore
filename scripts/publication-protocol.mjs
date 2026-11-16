import {randomUUID} from 'node:crypto';
export function makeMarker(id,phase,paths=['/'],at=Date.now()){
 if(!/^[a-z0-9-]{20,}$/i.test(id)||!['updating','ready','failed'].includes(phase))throw Error('Invalid publication marker');
 return {version:1,id,phase,paths,at};
}
export function assertProtectedUnchanged(before,after){
 if(!before||!after||!Array.isArray(before.nonSeed)||!Array.isArray(after.nonSeed)||![before.submissionCount,after.submissionCount].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('Invalid protected inventory');
 const stable=rows=>JSON.stringify([...rows].sort((a,b)=>a.id.localeCompare(b.id)));
 if(stable(before.nonSeed)!==stable(after.nonSeed))throw Error('Nonseed app records changed during publication; stop and investigate');
 if(after.submissionCount<before.submissionCount)throw Error('Submission records decreased; stop and investigate');
}
// Every effect is injected; tests never call Wrangler or a remote service.
export async function publishCatalog(steps,{target='astro',id=randomUUID()}={}){
 if(!['astro','legacy'].includes(target))throw Error('Invalid publication target');
 await steps.preflight(target);
 const before=await steps.inventory();
 await steps.marker(makeMarker(id,'updating'));
 let mutationStarted=false;
 try{
  mutationStarted=true;
  await steps.applySchema();await steps.applySeed();
  assertProtectedUnchanged(before,await steps.inventory());
  await steps.purge();
  if(target==='legacy')await steps.deployLegacy();
  await steps.assertMarker(id);
  // ready refers to DB/cache readiness, NOT confirmation that Astro has deployed.
  await steps.marker(makeMarker(id,'ready'));
  if(target==='astro'){
   await steps.prepareAstro(id);await steps.assertMarker(id,'ready');
   await steps.activateAstro(id);await steps.assertMarker(id,'ready');
  }
  return {id,target};
 }catch(error){
  if(error?.code==='PUBLIC_BROWSER_VERIFICATION_REQUIRED')throw error; // Valid published data stays ready while operator verifies the deployed release.
  const cleanupErrors=[];
  if(mutationStarted){try{await steps.purge();}catch(e){cleanupErrors.push(`purge: ${e.message}`);}}
  // D1 transition is a real revision/phase CAS; never clobber another owner.
  try{await steps.assertMarker(id);await steps.marker(makeMarker(id,'failed'));}catch(e){cleanupErrors.push(`marker: ${e.message}`);}
  if(cleanupErrors.length)error.message+=`; cleanup incomplete (${cleanupErrors.join('; ')})`;
  throw error;
 }
}
