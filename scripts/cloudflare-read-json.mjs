// Fixed-origin, GET-only inventories. Never retry writes, authorization failures,
// malformed JSON or semantic/schema validation (which remains with the caller).
export const CF_READ_TIMEOUT_MS=30000;
const operations=new Set(['cdn-mapping','workers-domains','worker-routes']);
const transportCodes=new Set(['ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAI_AGAIN','ENETUNREACH','EHOSTUNREACH','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET']);
function endpoint(operation,accountId,zoneId){
 if(!operations.has(operation)||!/^[a-f0-9]{32}$/.test(accountId??'')||!/^[a-f0-9]{32}$/.test(zoneId??''))throw Error('Exact Cloudflare read inventory required');
 return operation==='cdn-mapping'?`/accounts/${accountId}/r2/buckets/mcpapp-assets/domains/custom`:operation==='workers-domains'?`/accounts/${accountId}/workers/domains`:`/zones/${zoneId}/workers/routes`;
}
export async function readCloudflareJson({operation,accountId,zoneId,token,fetcher=fetch,timeoutMs=CF_READ_TIMEOUT_MS}){
 const url='https://api.cloudflare.com/client/v4'+endpoint(operation,accountId,zoneId);
 if(!token||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>CF_READ_TIMEOUT_MS)throw Error('Bounded authenticated Cloudflare read required');
 for(let attempt=1;attempt<=2;attempt++){
  const controller=new AbortController(),started=Date.now();let phase='fetch',status=null,timer;
  try{
   const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{const error=new DOMException('Read deadline exceeded','TimeoutError');controller.abort(error);reject(error);},timeoutMs);});
   const request=(async()=>{const response=await fetcher(url,{method:'GET',redirect:'error',headers:{Authorization:'Bearer '+token},signal:controller.signal});status=response.status;
    if(!response.ok){controller.abort();const error=Error('Cloudflare inventory HTTP failure');error.retryableInventoryStatus=[500,502,503,504].includes(status);throw error;}
    phase='body';return await response.json();})();
   return await Promise.race([request,deadline]);
  }catch(cause){
   const retryable=cause?.name==='TimeoutError'||transportCodes.has(cause?.code)||transportCodes.has(cause?.cause?.code)||cause?.retryableInventoryStatus===true;
   if(retryable&&attempt<2)continue;
   const error=new Error('Cloudflare read inventory unavailable',{cause});Object.assign(error,{code:'CF_READ_FAILED',releaseOperation:operation,releasePhase:phase,releaseAttempt:attempt,releaseTimeoutMs:timeoutMs,releaseElapsedMs:Date.now()-started});
   if(Number.isInteger(status)&&status>=100&&status<=599)error.releaseHttpStatus=status;
   throw error;
  }finally{clearTimeout(timer);controller.abort();}
 }
}
