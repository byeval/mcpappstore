// Pure orchestration only: no credentials, network transport, CLI or default arming.
import {createHash} from 'node:crypto';
import {assertOwnedRollback,rollbackOwnedDeployment} from './anchor-ownership.mjs';
export const BASELINE='5f756bc7-a86a-4a61-8b8e-8be868794696';
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x);
const need=(v,m)=>{if(!v)throw Error(m);};
export function validateWatchdogPlan(p,policy={service:'mcpapp',baseline:BASELINE}){
 need(policy.service==='mcpapp'&&policy.baseline===BASELINE||/^mcpapp-watchdog-fixture-[0-9]+-[0-9]+$/.test(policy.service)&&uuid(policy.baseline),'Fixed public or explicit private fixture policy required');
 need(p?.kind==='owned-front-watchdog-v1'&&p.service===policy.service&&p.baseline===policy.baseline,'Fixed frontend/baseline required');
 need(/^[a-f0-9]{40}$/.test(p.sourceCommit??'')&&p.inputSha256===undefined,'Pinned source and input required');
 need(uuid(p.nonce)&&p.tag==='viator-global-'+p.sourceCommit.slice(0,7)&&p.message==='owned-anchor:'+p.sourceCommit+':'+p.nonce,'Exact tag/message nonce required');
 need([p.armFrom,p.deployStartUntil,p.maxDeployMs,p.armUntil,p.deadline,p.stopAt].every(Number.isSafeInteger)&&p.armFrom<=p.deployStartUntil&&p.maxDeployMs>0&&p.deployStartUntil+p.maxDeployMs<=p.armUntil&&p.armUntil<p.deadline&&p.deadline<p.stopAt,'Absolute server deadlines required');
 need(p.armUntil-p.armFrom<=10*60_000&&p.deadline-p.armUntil<=20*60_000&&p.stopAt-p.deadline<=5*60_000&&p.stopAt-p.armFrom<=30*60_000,'Bounded arming/verification/recovery windows required');
 return p;
}
function currentFact(c){need(c&&uuid(c.versionId)&&c.percentage===100&&c.versionCount===1&&Number.isFinite(c.createdAt),'Unambiguous current deployment required');return c;}
function match(c,p){return c.versionId!==p.baseline&&c.versionTag===p.tag&&c.versionMessage===p.message;}
class Verified extends Error{}
// Effects must use authenticated primary server time and the reviewed durable browser-proof validator.
// The future transport adapter must refuse execution until an independently approved arm input is installed.
export async function watchOwnedFrontend(raw,e,policy){
 need(typeof raw==='string'&&/^[a-f0-9]{64}$/.test(e.expectedPlanSha256??''),'External plan bytes pin required');const inputSha256=createHash('sha256').update(raw).digest('hex');need(inputSha256===e.expectedPlanSha256,'Plan bytes changed');
 const p=validateWatchdogPlan(JSON.parse(raw),policy);const pollMs=e.pollMs??5000;need(Number.isInteger(pollMs)&&pollMs>=1000&&pollMs<=30000,'Bounded poll interval');let owned=null,writeAttempted=false;let lastClock=-Infinity;
 const monotonic=e.monotonicNow??(()=>performance.now()),localStop=monotonic()+(p.stopAt-p.armFrom);
 const read=async fn=>{for(;;){need(monotonic()<=localStop,'Local total watchdog budget exhausted');try{return await fn();}catch(error){if(error.code!=='READ_UNAVAILABLE')throw error;await e.saveObservation({state:'read-temporarily-unavailable'});await e.sleep(pollMs);}}};
 const now=async()=>{const t=await read(()=>e.serverNow());need(Number.isSafeInteger(t)&&t>=lastClock,'Uncertain/nonmonotonic server clock');lastClock=t;return t;};
 const result=async(state,extra={})=>{const r={kind:'owned-front-watchdog-result-v1',state,sourceCommit:p.sourceCommit,nonce:p.nonce,ownedVersion:owned,baseline:p.baseline,writeAttempted,...extra};await e.saveResult(r);return r;};
 const verified=async()=>{if(!owned)return false;let proof;try{proof=await read(()=>e.readDisarm());if(!proof)return false;need(proof.nonce===p.nonce&&proof.sourceCommit===p.sourceCommit&&proof.frontVersion===owned&&proof.kind==='verified-browser-disarm-v1','Disarm identity mismatch');need(await e.validateBrowserProof(proof,p,owned)===true,'Actual browser proof required');}catch(error){if(error.message==='Local total watchdog budget exhausted')throw error;await e.saveObservation({at:await now(),state:'disarm-invalid'});return false;}const c=currentFact(await read(()=>e.readCurrent()));assertOwnedRollback({ownedVersion:owned,ownedTag:p.tag,ownedMessage:p.message,currentVersion:c.versionId,currentTag:c.versionTag,currentMessage:c.versionMessage});return true;};
 try{
  const t=await now();need(t>=p.armFrom&&t<p.deployStartUntil,'Arming window unavailable');const first=currentFact(await read(()=>e.readCurrent()));need(first.versionId===p.baseline,'Baseline changed before armed handshake');await read(()=>e.assertBaselineAvailable(p.baseline));const armedTime=await now();need(armedTime<p.deployStartUntil,'Upload start budget expired before handshake');
  await e.saveArmed({kind:'owned-front-watchdog-armed-v1',sourceCommit:p.sourceCommit,inputSha256,nonce:p.nonce,baseline:p.baseline,serverTime:armedTime,deployStartUntil:p.deployStartUntil,maxDeployMs:p.maxDeployMs,armUntil:p.armUntil,deadline:p.deadline,stopAt:p.stopAt});
  for(;;){
   const t=await now();if(t>=p.stopAt)return result('expired-unresolved');
   let c;try{c=currentFact(await read(()=>e.readCurrent()));}catch{await e.saveObservation({at:t,state:'current-unknown'});await e.sleep(pollMs);continue;}
   if(!owned){
    if(c.versionId===p.baseline){if(await e.readCancel())return result('canceled-before-switch');await e.sleep(pollMs);continue;}
    if(!match(c,p)||c.createdAt<p.armFrom||c.createdAt>=p.armUntil)return result('superseded-or-outside-window');
    owned=c.versionId;await e.saveOwned({version:owned,tag:p.tag,message:p.message,nonce:p.nonce,observedAt:t,createdAt:c.createdAt});
   }
   try{assertOwnedRollback({ownedVersion:owned,ownedTag:p.tag,ownedMessage:p.message,currentVersion:c.versionId,currentTag:c.versionTag,currentMessage:c.versionMessage});}catch{return result('superseded');}
   if(await verified())return result('verified-disarmed');
   if(t<p.deadline){await e.sleep(pollMs);continue;}
   try{
    await e.withLease(async lease=>{
     await lease.assertOwned();const clock=await now();need(clock>=p.deadline&&clock<p.stopAt,'Rollback outside absolute deadline window');if(await verified())throw new Verified();
     await read(()=>e.assertBaselineAvailable(p.baseline));
     await rollbackOwnedDeployment({ownedVersion:owned,tag:p.tag,message:p.message,previousVersion:p.baseline,readCurrent:async()=>currentFact(await read(()=>(e.readCurrentFresh??e.readCurrent)())),assertLease:()=>lease.assertOwned(),rollback:async baseline=>{
      const time=await now();need(time>=p.deadline&&time<p.stopAt,'Rollback deadline window ended');if(await verified())throw new Verified();writeAttempted=true;await e.rollback(baseline);
     }});
    });
   }catch(error){if(error instanceof Verified)return result('verified-disarmed');if(!writeAttempted&&error.code==='LEASE_BUSY'){await e.sleep(pollMs);continue;}return result(writeAttempted?'rollback-write-unknown':'rollback-refused',{errorCode:error.code??'FAILED'});}
   const restored=currentFact(await read(()=>e.readCurrent()));if(restored.versionId!==p.baseline)return result('rollback-not-confirmed');return result('rolled-back',{restoredVersion:p.baseline});
  }
 }catch{return result(writeAttempted?'rollback-write-unknown':'failed-closed');}
}
