import {createHash} from 'node:crypto';
export class ReadFailure extends Error{constructor(code,retry=false){super(code);this.code=code;this.retry=retry;}}
const need=(v,c,retry=false)=>{if(!v)throw new ReadFailure(c,retry);};
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(x);
const id=x=>typeof x==='string'&&/^(?:[0-9A-HJKMNP-TV-Z]{26}|[a-f0-9]{16,64}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(x);
const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;
const hash=x=>createHash('sha256').update(x).digest('hex');
const SERVICE='mcpapp-preview-legacy-044e3757926e-bec4bf09';
export function validateReadPlan(p){
 need(p?.kind==='durable-log-read-plan-v2'&&p.service===SERVICE,'PLAN_SERVICE');
 need(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(p.version??'')&&/^[a-f0-9]{40}$/.test(p.sourceCommit??''),'PLAN_IDENTITY');
 need(['httpPlanSha256','journalSha256'].every(k=>/^[a-f0-9]{64}$/.test(p[k]??'')),'PLAN_PINS');
 need(num(p.timeframe?.from)!==null&&num(p.timeframe?.to)!==null&&p.timeframe.to>p.timeframe.from&&p.timeframe.to-p.timeframe.from<=1800000,'PLAN_WINDOW');
 need(p.cpuPolicy?.kind==='outcome-only'&&Array.isArray(p.probes)&&p.probes.length>0&&p.probes.length<=80,'PLAN_PROBES');
 const ids=new Set();for(const [i,c]of p.probes.entries()){
  need(c.index===i&&uuid(c.probeId)&&!ids.has(c.probeId),'PLAN_UUID');ids.add(c.probeId);
  need(c.method==='GET'&&c.host==='mcpapp.net'&&Number.isInteger(c.status)&&c.status>=200&&c.status<=499,'PLAN_REQUEST');
  need(typeof c.path==='string'&&( /^\/[a-zA-Z0-9_.~/-]*$/.test(c.path)||c.path==='/search?q=canva')&&!c.path.split('/').some(x=>x==='.'||x==='..'),'PLAN_PATH');
  need(c.evidenceClass===(/^\/(assets|_astro)\//.test(c.path)?'static-body-only':'durable-invocation'),'PLAN_CLASS');
 }return p;
}
export function sanitizeEvent(e,p){
 need(e&&typeof e==='object'&&e.$metadata?.service===p.service&&id(e.$metadata.id),'EVENT_IDENTITY');
 const w=e.$workers??e.$cloudflare;need(w&&typeof w==='object','EVENT_WORKER');
 const h=w.event?.request?.headers;const hs=h&&typeof h==='object'&&!Array.isArray(h)?Object.entries(h).filter(([k])=>k.toLowerCase()==='x-mcpapp-probe-id'):[];
 need(hs.length<=1,'HEADER_DUPLICATE');need(hs.length===0||uuid(hs[0][1]),'HEADER_INVALID');
 const probeId=hs[0]?.[1]??null,req=e.$metadata.requestId??null,wr=w.requestId??null;
 need(req===null||id(req),'REQUEST_ID');need(wr===null||id(wr),'REQUEST_ID');
 need(!(req&&wr)||req===wr,'REQUEST_ID_CONFLICT');
 const v=w.scriptVersion?.id;need(v===undefined||typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v),'EVENT_VERSION_SCHEMA');
 const urls=p.probes.map(c=>'https://'+c.host+c.path);
 const truncated=w.truncated===true||e.$cloudflare?.truncated===true?true:w.truncated===false||e.$cloudflare?.truncated===false?false:null;
 return {metadataId:e.$metadata.id,metadataRequestId:req,requestId:wr,service:p.service,probeId,
 metadataType:['cf-worker-event','cf-worker-log','cf-worker-exception','invocation','console'].includes(e.$metadata.type)?e.$metadata.type:null,
 eventType:['fetch','http','request'].includes(w.eventType)?w.eventType:null,
 timestamp:num(e.timestamp),version:v??null,versionMatches:v===p.version,
 path:urls.includes(w.event?.request?.url)?w.event.request.url:null,method:w.event?.request?.method==='GET'?'GET':null,responseStatus:num(w.event?.response?.status),
 outcome:['ok','exception','exceededCpu','exceededMemory','canceled','unknown','cpuTimeExceeded','memoryLimitExceeded'].includes(w.outcome)?w.outcome:null,
 cpuTimeMs:num(w.cpuTimeMs),wallTimeMs:num(w.wallTimeMs),truncated};
}
function coverage(events,p){
 const expected=new Map(p.probes.filter(c=>c.evidenceClass==='durable-invocation').map(c=>[c.probeId,c])),all=new Set(p.probes.map(c=>c.probeId)),found=new Map(),requests=new Set();
 for(const e of events){
  need(e.timestamp!==null&&e.timestamp>=p.timeframe.from&&e.timestamp<=p.timeframe.to,'EVENT_WINDOW');
  if(e.probeId===null)continue;need(all.has(e.probeId),'UNEXPECTED_TOKEN');if(!expected.has(e.probeId))continue;
  need(!found.has(e.probeId),'DUPLICATE_INVOCATION');const c=expected.get(e.probeId),r=e.metadataRequestId??e.requestId;
  need(e.metadataType==='cf-worker-event'&&e.eventType==='fetch','INVOCATION_TYPE');
  need(typeof r==='string'&&/^[a-f0-9]{16,64}$/i.test(r)&&!requests.has(r),'INVOCATION_ID');requests.add(r);
  need(e.version===p.version&&e.versionMatches,'INVOCATION_VERSION');
  need(e.path==='https://'+c.host+c.path&&e.method===c.method&&e.responseStatus===c.status,'INVOCATION_REQUEST');
  need(e.outcome==='ok'&&e.truncated===false&&e.cpuTimeMs!==null&&e.wallTimeMs!==null,'INVOCATION_HEALTH');found.set(e.probeId,e);
 }
 need(found.size===expected.size,'MISSING_INVOCATION',true);
 return JSON.stringify([...found].sort(([a],[b])=>a.localeCompare(b)));
}
export async function collectDurableScans(plan,{fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=Date.now,apiToken,accountId,deadlineMs=120000,maxAttempts=3,pageLimit=100,maxPages=100}={}){
 validateReadPlan(plan);need(/^[a-f0-9]{32}$/.test(accountId??'')&&typeof apiToken==='string'&&apiToken.length>0,'CREDENTIALS');
 need(deadlineMs>0&&deadlineMs<=120000&&Number.isInteger(maxAttempts)&&maxAttempts>=1&&maxAttempts<=3&&Number.isInteger(pageLimit)&&pageLimit>=1&&pageLimit<=100&&Number.isInteger(maxPages)&&maxPages>=1&&maxPages<=100,'BOUNDS');
 const end=now()+deadlineMs,attemptsSummary=[],receipts=[];let totalBytes=0,calls=0;
 const remaining=()=>{need(now()<end,'DEADLINE');return end-now();};
 const wait=async ms=>{need(remaining()>ms,'DEADLINE');await sleep(ms);remaining();};
 const query=async(view,offset)=>{
  const q={queryId:'private-044-durable-v2',dry:true,view,limit:pageLimit,timeframe:plan.timeframe,parameters:{filterCombination:'and',filters:[{key:'$metadata.service',operation:'eq',type:'string',value:plan.service}]}};
  if(offset!==undefined){q.offset=offset;q.offsetDirection='next';}if(view==='calculations'){q.ignoreSeries=true;q.parameters.calculations=[{operator:'count',alias:'log_rows'}];}
  let response,body;try{
   response=await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/observability/telemetry/query`,{method:'POST',headers:{Authorization:`Bearer ${apiToken}`,'Content-Type':'application/json'},body:JSON.stringify(q),redirect:'error',signal:AbortSignal.timeout(Math.max(1,Math.min(30000,remaining())))});calls++;
   need(response.status===200,'HTTP_'+response.status);
   const reader=response.body?.getReader();need(reader,'BODY_MISSING');let size=0;const chunks=[];
   try{for(;;){remaining();const {value,done}=await reader.read();if(done)break;size+=value.byteLength;totalBytes+=value.byteLength;need(size<=1048576&&totalBytes<=10485760,'BODY_LIMIT');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
   body=JSON.parse(Buffer.concat(chunks).toString('utf8'));remaining();
  }catch(e){if(e instanceof ReadFailure)throw e;throw new ReadFailure('FETCH_OR_JSON');}
  need(body?.success===true&&(!body.errors||Array.isArray(body.errors)&&body.errors.length===0),'API_ERROR');const d=body.result;need(d&&typeof d==='object','SCHEMA');
  need(['STARTED','COMPLETED'].includes(d.run?.status),'STATUS_SCHEMA');if(d.run.status==='STARTED')need(!(Array.isArray(d.events?.events)&&d.events.events.length>0),'STARTED_WITH_EVENTS');need(d.run.status==='COMPLETED','STARTED',true);
  const abr=num(d.statistics?.abr_level),runAbr=num(d.run?.statistics?.abr_level);need(abr===1&&runAbr===1,'QUERY_SAMPLING');
  const r={http:200,success:true,service:plan.service,version:plan.version,query:q,status:d.run.status,receivedAt:new Date(now()).toISOString(),abrLevel:abr,runAbrLevel:runAbr,errorCodes:[]};
  if(view==='events'){
   need(Array.isArray(d.events?.events)&&Number.isSafeInteger(d.events.count)&&d.events.count>=0&&d.events.events.length<=pageLimit,'EVENT_SCHEMA');
   const intervals=[];if(d.events.series!==undefined){need(Array.isArray(d.events.series),'SERIES_SCHEMA');for(const s of d.events.series){need(Array.isArray(s.data),'SERIES_SCHEMA');for(const a of s.data){need(a.sampleInterval===1,'INGESTION_SAMPLING');intervals.push(1);}}}
   return {...r,count:d.events.count,events:d.events.events.map(e=>sanitizeEvent(e,plan)),sampleIntervals:intervals,seriesPresent:Array.isArray(d.events.series)};
  }
  need(Array.isArray(d.calculations)&&d.calculations.length===1&&Array.isArray(d.calculations[0].aggregates)&&d.calculations[0].aggregates.length===1,'CALC_SCHEMA');
  const a=d.calculations[0].aggregates[0];need(a.sampleInterval===1,'INGESTION_SAMPLING');need(num(a.count)!==null&&num(a.value)!==null,'CALC_NUMBER');
  return {...r,calculations:[{aggregates:[{sampleInterval:a.sampleInterval,count:a.count,value:a.value}]}]};
 };
 const scan=async()=>{
  const pages=[],events=[],seen=new Set();let offset,total;
  for(let i=0;i<maxPages;i++){
   const r=await query('events',offset);receipts.push(r);pages.push(r);
   for(const e of r.events){need(!seen.has(e.metadataId),'CURSOR_REPEAT');seen.add(e.metadataId);events.push(e);}
   // Detect positive unhealthy/conflict evidence before deciding to rescan missing rows.
   try{coverage(events,plan);}catch(e){if(e.code!=='MISSING_INVOCATION')throw e;}
   need(total===undefined||total===r.count,'COUNT_DRIFT',true);total=r.count;
   if(r.events.length<pageLimit){need(seen.size===total,'COUNT_DRIFT',true);const fingerprint=coverage(events,plan);const calculation=await query('calculations');receipts.push(calculation);const a=calculation.calculations[0].aggregates[0];need(a.count===total&&a.value===total,'COUNT_DRIFT',true);return {receipt:{pages,calculation},fingerprint};}
   offset=r.events.at(-1).metadataId;
  }throw new ReadFailure('PAGE_CAP');
 };
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  try{const a=await scan();await wait(5000);const b=await scan();need(a.fingerprint===b.fingerprint,'CHANGED_INVOCATION');return {kind:'durable-query-receipts-v2',qualification:false,planSha256:hash(JSON.stringify(plan)),scans:[a.receipt,b.receipt],attemptsSummary,attemptReceipts:receipts,calls};}
  catch(e){const code=e instanceof ReadFailure?e.code:'INTERNAL';attemptsSummary.push({attempt,code,at:new Date(now()).toISOString()});if(!(e instanceof ReadFailure)||!e.retry||attempt===maxAttempts){const failure=new ReadFailure(code);failure.attemptsSummary=attemptsSummary;failure.attemptReceipts=receipts;throw failure;}await wait(1000);}
 }
}
