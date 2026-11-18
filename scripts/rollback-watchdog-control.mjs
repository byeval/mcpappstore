// Authenticated read-only dedicated-ref fetch. One whole-poll deadline; no retries.
const need=(v,m)=>{if(!v)throw Error(m);};
const unavailable=()=>Object.assign(Error('Control read unavailable'),{code:'READ_UNAVAILABLE'});
export function createControlReader({plan,token,fetcher=fetch,timeoutMs=2000}){
 need(plan.repository==='byeval/mcpappstore'&&/^refs\/heads\/anchor-watchdog-control-[a-f0-9]{32}$/.test(plan.controlRef)&&/^[a-f0-9]{40}$/.test(plan.controlBase),'Fixed control identity required');
 need(Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=2000,'Bounded control poll required');let cache=null;
 return async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);let total=0;
  const request=async(endpoint,{missing=false}={})=>{
   let r;try{r=await fetcher('https://api.github.com/repos/byeval/mcpappstore/'+endpoint,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},redirect:'error',signal:controller.signal});}catch(error){if(controller.signal.aborted||error.name==='TypeError'||error.code==='ECONNRESET')throw unavailable();throw error;}
   if(missing&&r.status===404){await r.body?.cancel();return null;}
   if(r.status===429||r.status>=500){await r.body?.cancel();throw unavailable();}need(r.ok,'Control authentication/status rejected');
   const chunks=[];let n=0;const reader=r.body.getReader();try{for(;;){const part=await reader.read();if(part.done)break;n+=part.value.byteLength;total+=part.value.byteLength;need(n<=400000&&total<=2000000,'Control response size rejected');chunks.push(Buffer.from(part.value));}}finally{await reader.cancel().catch(()=>{});}
   need(!controller.signal.aborted,'Control poll deadline exceeded');return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  };
  try{
   const ref=await request('git/ref/'+plan.controlRef.slice(5),{missing:true});if(!ref)return null;
   need(ref.ref===plan.controlRef&&ref.object?.type==='commit'&&/^[a-f0-9]{40}$/.test(ref.object.sha),'Control ref identity mismatch');const commit=ref.object.sha;
   if(cache?.commit===commit)return cache;
   const compare=await request('compare/'+plan.controlBase+'...'+commit+'?per_page=1');need(['ahead','identical'].includes(compare.status)&&compare.base_commit?.sha===plan.controlBase&&compare.merge_base_commit?.sha===plan.controlBase,'Control ancestry rejected');
   const names=['manifest.json','ticket.json','observations.json','ticket.verified.json','anchor.json'];const entries=await Promise.all(names.map(async name=>{
    const pathname='watchdog-disarm/'+name,b=await request('contents/'+pathname+'?ref='+commit,{missing:true});if(!b)return [name,null];
    need(b.type==='file'&&b.path===pathname&&b.name===name&&b.encoding==='base64'&&Number.isInteger(b.size)&&b.size>=0&&b.size<=262144&&/^[a-f0-9]{40}$/.test(b.sha),'Control file metadata rejected');
    need(typeof b.content==='string'&&/^[A-Za-z0-9+/=\r\n]*$/.test(b.content),'Control content encoding rejected');const bytes=Buffer.from(b.content,'base64');need(bytes.length===b.size,'Control file byte count mismatch');return [name,bytes.toString('utf8')];
   }));if(entries.some(([,v])=>v===null))return null;
   const files=Object.fromEntries(entries),manifest=JSON.parse(files['manifest.json']);delete files['manifest.json'];need(Object.values(files).reduce((n,s)=>n+Buffer.byteLength(s),0)<=1048576,'Control package too large');
   need(!controller.signal.aborted,'Control poll deadline exceeded');cache={ref:plan.controlRef,commit,descendsFromControlBase:true,manifest,files};return cache;
  }catch(error){controller.abort();if(error.name==='AbortError'||error.name==='TimeoutError'||error.message==='Control poll deadline exceeded')throw unavailable();throw error;}finally{clearTimeout(timer);}
 };
}
