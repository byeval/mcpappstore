// Pure receipt validator. Caller must independently pin checks, identity and receipt provenance.
const fail=(ok,msg)=>{if(!ok)throw Error(msg);};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const bodyOnly=c=>/^\/(?:assets|_astro)\//.test(c.path);
const time=x=>{const n=Date.parse(x);fail(Number.isFinite(n),'Invalid receipt time');return n;};
function queryScope(r,service,version,view,window){
 fail(r.http===200&&r.success===true&&r.status==='COMPLETED','Incomplete query');
 fail(r.service===service&&r.version===version,'Query identity');
 fail(r.abrLevel===1&&r.runAbrLevel===1,'Query sampling missing/nonunit');
 const q=r.query;fail(q?.dry===true&&q.view===view&&eq(q.timeframe,window),'Query scope/window');
 fail(q.parameters?.filterCombination==='and','Query filters');
 const filters=q.parameters.filters;
 fail(Array.isArray(filters)&&filters.length===1&&eq(filters[0],{key:'$metadata.service',operation:'eq',type:'string',value:service}),'Expected exact service-only scan');
 fail(!r.errorCodes?.length,'Query errors');return time(r.receivedAt);
}
export function validateDurableEvidence(bundle,{service,version,checks,cpuPolicy}){
 fail(bundle?.kind==='durable-evidence-v2','Distinct evidence kind required');
 fail(bundle.service===service&&bundle.version===version,'Bundle identity');
 fail(Array.isArray(checks)&&checks.length>0&&checks.length<=80,'Pinned expected checks');
 fail(cpuPolicy&&['outcome-only','configured-limit'].includes(cpuPolicy.kind),'Explicit CPU policy required');
 if(cpuPolicy.kind==='configured-limit')fail(finite(cpuPolicy.maxCpuTimeMs)&&cpuPolicy.maxCpuTimeMs>0&&typeof cpuPolicy.source==='string'&&cpuPolicy.source.length>0,'Configured CPU limit provenance required');
 else fail(cpuPolicy.maxCpuTimeMs===undefined,'Outcome-only cannot imply a limit');
 const journal=bundle.journal;fail(Array.isArray(journal)&&journal.length===checks.length,'Exact HTTP journal coverage');
 const ids=new Set(),expected=new Map();let end=0,start=Infinity;
 for(let i=0;i<checks.length;i++){
  const c=checks[i],j=journal[i],r=j?.result;
  fail(c.service===service&&j?.index===i&&j.service===service&&j.path===c.path,'Ordered check identity');
  fail(j.attempt===1&&j.state==='passed'&&finite(j.startedAt)&&finite(j.finishedAt)&&j.finishedAt>=j.startedAt&&j.startedAt>=end,'First-attempt ordered HTTP success');
  fail(uuid(j.probeId)&&!ids.has(j.probeId),'Unique HTTP UUID');ids.add(j.probeId);
  fail(r?.probeId===j.probeId&&r.service===service&&r.path===c.path&&r.status===c.status&&(r.host??'mcpapp.net')===(c.host??'mcpapp.net'),'HTTP result identity');
  fail(typeof r.sha256==='string'&&/^[a-f0-9]{64}$/.test(r.sha256),'Every HTTP response requires SHA256 evidence');
  for(const key of ['sha256','canonical','delivery','commit'])if(c[key]!==undefined)fail(r[key]===c[key],'HTTP '+key);
  if(c.contentTypePrefix){const t=String(r.contentType??'').split(';')[0].trim().toLowerCase(),p=c.contentTypePrefix.toLowerCase();fail(p.endsWith('/')?t.startsWith(p):t===p,'HTTP content type');}
  if(c.renderedBody)fail(r.renderedBody?.ok===true&&Array.isArray(r.renderedBody.errors)&&!r.renderedBody.errors.length,'Rendered body');
  if(c.completeExport)fail(r.exportBody?.ok===true&&r.exportBody.bytes===c.completeExport.expectedBytes&&Array.isArray(r.exportBody.errors)&&!r.exportBody.errors.length,'Complete export');
  fail(j.evidenceClass===(bodyOnly(c)?'static-body-only':'durable-invocation'),'Explicit evidence class');
  if(!bodyOnly(c))expected.set(j.probeId,{c,j});
  end=j.finishedAt;start=Math.min(start,j.startedAt);
 }
 fail(expected.size>0,'No invocation coverage');
 const window=bundle.timeframe;fail(finite(window?.from)&&finite(window?.to)&&window.from<=start&&window.to>=end&&window.to-window.from<=30*60*1000,'Fixed bounded full-run window');
 fail(Array.isArray(bundle.scans)&&bundle.scans.length===2,'Exactly two independent complete scans');
 const signatures=[];let previousEnd,cpuMeasurements;
 for(const scan of bundle.scans){
  fail(Array.isArray(scan.pages)&&scan.pages.length>0&&scan.pages.length<=100,'Bounded pages');
  const found=new Map(),events=new Map(),requests=new Set();let total,prevCursor,firstTime,lastTime;
  for(let p=0;p<scan.pages.length;p++){
   const r=scan.pages[p],received=queryScope(r,service,version,'events',window);
   firstTime??=received;fail(received>=end&&(lastTime===undefined||received>=lastTime),'Query after HTTP and ordered');lastTime=received;
   const q=r.query;fail(Number.isInteger(q.limit)&&q.limit>0&&q.limit<=2000&&Array.isArray(r.events)&&r.events.length<=q.limit,'Page shape');
   fail(p===0?q.offset===undefined:q.offset===prevCursor&&q.offsetDirection==='next','Cursor continuity');
   fail(Number.isSafeInteger(r.count)&&r.count>=0&&(total===undefined||total===r.count),'Stable total count');total=r.count;
   // Sampling is assessed independently by the mandatory count query, too.
   if(r.sampleIntervals?.length)fail(r.sampleIntervals.every(x=>x===1),'Event ingestion sampling');
   for(const e of r.events){
    fail(typeof e.metadataId==='string'&&e.metadataId.length>0&&e.metadataId.length<=160&&!events.has(e.metadataId),'Unique event IDs/pages');events.set(e.metadataId,e);
    fail(e.service===service&&finite(e.timestamp)&&e.timestamp>=window.from&&e.timestamp<=window.to,'Event scope');
    fail(!('headers' in e)&&!('source' in e),'No raw headers/source');
    if(e.probeId==null)continue; // Uncorrelated rows still count in page reconciliation.
    fail(ids.has(e.probeId),'Unexpected correlated UUID');
    if(!expected.has(e.probeId))continue; // Static route has no CPU claim.
    fail(e.metadataType==='cf-worker-event'&&e.eventType==='fetch','Invocation event type');
    fail(!found.has(e.probeId),'Duplicate token invocation');
    const {c}=expected.get(e.probeId),requestId=e.metadataRequestId??e.requestId;
    fail(typeof requestId==='string'&&/^[a-f0-9]{16,64}$/i.test(requestId)&&!requests.has(requestId),'Unique invocation request ID');
    if(e.requestId!=null&&e.metadataRequestId!=null)fail(e.requestId===e.metadataRequestId,'Conflicting request IDs');requests.add(requestId);
    fail(e.version===version&&e.versionMatches===true,'Exact event version');
    fail(e.path==='https://'+(c.host??'mcpapp.net')+c.path&&e.method==='GET'&&e.responseStatus===c.status,'Invocation URL/method/status');
    fail(e.outcome==='ok'&&e.truncated===false&&finite(e.cpuTimeMs)&&(cpuPolicy.kind==='outcome-only'||e.cpuTimeMs<=cpuPolicy.maxCpuTimeMs)&&finite(e.wallTimeMs),'Invocation runtime health');
    found.set(e.probeId,{metadataId:e.metadataId,requestId,version:e.version,path:e.path,status:e.responseStatus,cpu:e.cpuTimeMs,wall:e.wallTimeMs,timestamp:e.timestamp});
   }
   prevCursor=r.events.at(-1)?.metadataId;
   if(p<scan.pages.length-1)fail(r.events.length===q.limit,'Premature pagination');
   else fail(r.events.length<q.limit,'Terminal page/exhaustion required');
  }
  fail(events.size===total&&found.size===expected.size,'Complete exact event/invocation coverage');
  const calc=scan.calculation,ct=queryScope(calc,service,version,'calculations',window);fail(ct>=lastTime,'Count after page scan');
  fail(calc.query.ignoreSeries===true&&eq(calc.query.parameters.calculations,[{operator:'count',alias:'log_rows'}]),'Count semantics');
  fail(calc.calculations?.length===1&&calc.calculations[0].aggregates?.length===1,'Single ungrouped aggregate');
  const a=calc.calculations[0].aggregates[0];fail(a.sampleInterval===1&&a.count===total&&a.value===total,'Unsampled reconciled log rows');
  if(previousEnd!==undefined)fail(firstTime-previousEnd>=5000,'Two scans separated by >=5 seconds');previousEnd=ct;
  cpuMeasurements=[...expected].map(([probeId,{c,j}])=>({index:j.index,path:c.path,probeId,cpuTimeMs:found.get(probeId).cpu,wallTimeMs:found.get(probeId).wall}));
  signatures.push(JSON.stringify([...found].sort(([a],[b])=>a.localeCompare(b))));
 }
 fail(signatures[0]===signatures[1],'New or changed invocation conflict');
 return {kind:'durable-evidence-v2',httpChecks:checks.length,durableInvocations:expected.size,staticBodyOnly:checks.length-expected.size,cpuPolicy:{...cpuPolicy},cpuMeasurements,performanceQualified:false,complete:true};
}
