import {loadWorkerCapacityPolicy} from './worker-capacity-policy.mjs';
// Pure arithmetic defaults conservative; production reader must verify the expiring policy.
export function assessWorkerCapacity(workers,plannedNames,{ceiling=99,reservedNames=[],reservedNewWorkers=0}={}){
 if(!Array.isArray(workers)||!Array.isArray(plannedNames)||!plannedNames.length||!Array.isArray(reservedNames)||workers.some(w=>!w||typeof(w.id??w.name)!=='string'||!(w.id??w.name).length)||[...plannedNames,...reservedNames].some(n=>typeof n!=='string'||!/^mcpapp[a-z0-9-]*$/.test(n))||!Number.isInteger(ceiling)||ceiling<1||!Number.isInteger(reservedNewWorkers)||reservedNewWorkers<0)throw Error('Complete Worker inventory and planned reservations required');
 const names=new Set(workers.map(w=>w.id??w.name));if(names.size!==workers.length)throw Error('Duplicate Worker inventory; capacity uncertain');
 const planned=[...new Set(plannedNames)],reserved=[...new Set(reservedNames)];const additional=[...new Set([...planned,...reserved])].filter(n=>!names.has(n));
 const result={workersBefore:names.size,newWorkersRequired:additional.length,reservedNewWorkers,conservativeCeiling:ceiling,remainingAfter:ceiling-names.size-additional.length-reservedNewWorkers,plannedServices:planned,reservedServices:reserved};
 if(result.remainingAfter<0){const error=Error('Insufficient conservative Worker capacity; preserve current frontend, no automatic deletion or upgrade');error.capacity=result;throw error;}return result;
}
export function completeWorkerInventory(body,headers){
 if(body?.success!==true||!Array.isArray(body.result)||!Array.isArray(body.errors??[])||(body.errors??[]).length)throw Error('Worker capacity inventory incomplete');
 const n=body.result.length,info=body.result_info??{};
 if(typeof info!=='object'||Array.isArray(info)||info===null)throw Error('Worker inventory pagination invalid');
 for(const o of [body,info]){
  for(const k of ['total_count','count'])if(o[k]!==undefined&&(!Number.isInteger(o[k])||o[k]!==n))throw Error('Worker capacity inventory incomplete');
  if(o.page!==undefined&&o.page!==1)throw Error('Worker inventory page is not first');
  if(o.total_pages!==undefined&&o.total_pages!==(n===0?0:1)&&!(n===0&&o.total_pages===1))throw Error('Worker inventory has multiple pages');
  if(o.per_page!==undefined&&(!Number.isInteger(o.per_page)||o.per_page<n||o.per_page<1))throw Error('Worker inventory page size inconsistent');
  for(const k of ['cursor','cursors','next_cursor','next_page','has_more','has_next','has_next_page','continuation_token','pagination','next','nextCursor','nextPage','hasMore','hasNext','page_count','totalPages'])if(o[k]!==undefined&&o[k]!==null&&o[k]!==false&&o[k]!==''&&o[k]!==0)throw Error('Worker inventory continuation is unsupported');
  if(o.links?.next)throw Error('Worker inventory has next link');
 }
 if((headers?.get?.('link')??'').trim())throw Error('Worker inventory has next link');
 return body.result;
}
export async function readWorkerCapacity({accountId,token,plannedNames,reservedNames=[],reservedNewWorkers=0,assertLease,fetcher=fetch,clock=Date.now}){
 if(!/^[a-f0-9]{32}$/.test(accountId??'')||!token)throw Error('Cloudflare account/credential required for capacity guard');
 if(assertLease!==undefined&&typeof assertLease!=='function')throw Error('Invalid lease assertion');
 await assertLease?.();await loadWorkerCapacityPolicy(accountId,clock());
 const r=await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`,{method:'GET',headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Worker capacity inventory unavailable');const workers=completeWorkerInventory(await r.json(),r.headers);
 await assertLease?.();const proof=await loadWorkerCapacityPolicy(accountId,clock());
 return {...assessWorkerCapacity(workers,plannedNames,{ceiling:proof.ceiling,reservedNames,reservedNewWorkers}),planProof:proof};
}
