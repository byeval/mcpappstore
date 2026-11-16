// Provisioning readiness only. Never retries HTTP/content/business qualification.
export const BINDING_ABSENT='static-service-binding-absent';
export function assertStaticChecks(checks){if(!Array.isArray(checks)||checks.length!==1||!/^mcpapp-static-[a-z0-9-]+$/.test(checks[0].service)||checks[0].status!==200||checks[0].renderedBody||checks[0].commit)throw Error('Exactly one new static shard readiness check required');}
export function bindingReadinessSource(){return `const bm=u.pathname.match(/^\\/binding-ready\\/(\\d+)$/);if(bm){const i=Number(bm[1]),c=checks[i];if(!c)return new Response('not found',{status:404});try{const r=await env['SERVICE_'+i].fetch(new Request('https://mcpapp.net'+c.path,{method:'HEAD',redirect:'manual'}));return Response.json({nonce,kind:'static-service-binding-ready',status:r.status});}catch(error){if(error instanceof Error&&error.message==='Worker not found.')return Response.json({nonce,kind:'static-service-binding-absent'});throw error;}}`;}
export async function waitForStaticBindingReady(url,check,nonce,{fetcher=fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,timeoutMs=60000,maxAttempts=8,onObservation=()=>{}}={}){
 assertStaticChecks([check]);if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>8||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw Error('Invalid bounded binding readiness budget');const startedAt=now(),deadline=startedAt+timeoutMs;const observations=[];
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  const remaining=deadline-now();if(remaining<=0)throw Error('Static binding readiness timed out');
  // Unknown transport/auth/HTTP/JSON errors fail immediately; never body-sniff1101.
  const response=await fetcher(url,{signal:AbortSignal.timeout(Math.max(1,Math.min(5000,remaining)))});
  if(!response.ok)throw Error('Static binding readiness probe HTTP '+response.status);
  const got=await response.json();if(got.nonce!==nonce)throw Error('Static binding readiness nonce mismatch');
  const evidence={attempt,elapsedMs:now()-startedAt,service:check.service,path:check.path,kind:got.kind,status:got.status??null};observations.push(evidence);onObservation(evidence);if(now()>=deadline)throw Error('Static binding readiness timed out after response');
  if(got.kind==='static-service-binding-ready'){if(got.status!==200)throw Error('Static binding readiness HTTP status mismatch');return {kind:'new-static-binding-ready',attempts:attempt,observations,qualification:false};}
  if(got.kind!==BINDING_ABSENT)throw Error('Unknown static binding readiness result');
  if(attempt===maxAttempts)throw Error('Static service binding remained absent');
  const delay=Math.min(1000*attempt,5000);if(now()+delay>=deadline)throw Error('Static binding readiness timed out');await sleep(delay);
 }throw Error('Unreachable binding readiness state');
}
export function singleStaticDeploymentVersion(deployments){if(!Array.isArray(deployments)||!deployments.length)throw Error('Static deployment inventory missing');const latest=[...deployments].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0];if(!Number.isFinite(Date.parse(latest?.created_on)))throw Error('Invalid static deployment timestamp');const versions=latest?.versions;if(versions?.length!==1||versions[0].percentage!==100||!/^[a-f0-9-]{36}$/.test(versions[0].version_id??''))throw Error('Exact100% static version required');return versions[0].version_id;}
