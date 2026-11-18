// Local-prepared production entry. Executing arm requires a separately approved, externally pinned plan.
import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
import {watchOwnedFrontend,validateWatchdogPlan,BASELINE} from './rollback-watchdog-core.mjs';import {createWatchdogTransport} from './rollback-watchdog-transport.mjs';import {createControlReader} from './rollback-watchdog-control.mjs';import {validateWatchdogDisarm} from './rollback-watchdog-disarm.mjs';
const need=(v,m)=>{if(!v)throw Error(m);};const sha=s=>createHash('sha256').update(s).digest('hex');
export const SOURCE='044e3757926ec36daa22af34605daa034c45a078';
export const RUNTIME=Object.freeze({sourceCommit:SOURCE,service:'mcpapp-preview-legacy-044e3757926e-bec4bf09',version:'7bc1cece-b1e1-4c1b-a1a5-ec65134a78c3',exactReviewSha256:'64bfd7b6b458096107328e219f318dbd00187f2a28f1dbccd6007769f9f9fa7d',nativeReceiptSha256:'0b33f37cd3b1454fa13c82aadebf9fb1703e83bffaf211260b3a254ae0732ef6'});
export function validateProductionInput(raw,env){
 need(env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='byeval/mcpappstore'&&env.GITHUB_REF==='refs/heads/rollback-watchdog-20261118'&&env.GITHUB_EVENT_NAME==='push'&&env.WATCHDOG_PUBLIC_ARM_APPROVED==='true','Explicit approved production workflow only');
 need(/^[a-f0-9]{64}$/.test(env.EXPECTED_PLAN_SHA256??'')&&sha(raw)===env.EXPECTED_PLAN_SHA256,'External production plan pin mismatch');
 const p=validateWatchdogPlan(JSON.parse(raw));need(p.sourceCommit===SOURCE&&p.repository==='byeval/mcpappstore'&&p.sourceMain==='56fbb80375358828abc4d0eeea149e586ffa3a05','Fixed candidate/main identity required');
 need(p.monitorCommit===env.WATCHDOG_MONITOR_COMMIT&&/^[a-f0-9]{40}$/.test(p.monitorCommit)&&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')&&env.GITHUB_SHA!==p.monitorCommit&&p.monitorCommit!==p.sourceCommit,'Separate reviewed monitor commit required');
 need(/^\d+$/.test(env.GITHUB_RUN_ID??'')&&/^\d+$/.test(env.GITHUB_RUN_ATTEMPT??''),'Actual run identity required');
 need(/^refs\/heads\/anchor-watchdog-control-[a-f0-9]{32}$/.test(p.controlRef)&&/^[a-f0-9]{40}$/.test(p.controlBase),'Dedicated control ref/base required');
 need(Object.keys(p.runtimeEvidence??{}).sort().join()===Object.keys(RUNTIME).sort().join()&&Object.entries(RUNTIME).every(([k,v])=>p.runtimeEvidence[k]===v),'Candidate runtime provenance mismatch');
 need(p.stopAt-p.armFrom<=25*60000&&p.deployStartUntil+p.maxDeployMs+30000<=p.armUntil,'Runner and upload safety margins required');return p;
}
export function createProductionEffects({plan,transport,readControl,save,append,identity,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 let current=null,serverTime=null,ownedVersion=null,accepted=null;
 const currentRead=async fresh=>{current=await(fresh?transport.readCurrentFresh():transport.readCurrent());return current;};
 return {...transport,expectedPlanSha256:identity.inputSha256,sleep,serverNow:async()=>{serverTime=await transport.serverNow();return serverTime;},readCurrent:()=>currentRead(false),readCurrentFresh:()=>currentRead(true),readCancel:async()=>false,
 saveArmed:r=>save('armed.json',{...r,...identity,service:plan.service,runtimeEvidence:plan.runtimeEvidence,monitorPid:process.pid}),saveOwned:async r=>{ownedVersion=r.version;await save('owned.json',r);},saveResult:r=>save('result.json',r),saveObservation:r=>append('observations.jsonl',r),
 readDisarm:async()=>{accepted=null;if(!ownedVersion)return null;const pkg=await readControl();if(!pkg)return null;const proof=validateWatchdogDisarm({...pkg,plan,ownedVersion,current,serverNow:serverTime});accepted={pkg,proof};return proof;},
 validateBrowserProof:async proof=>{need(accepted&&proof===accepted.proof,'No authenticated package associated with proof');const checked=validateWatchdogDisarm({...accepted.pkg,plan,ownedVersion,current,serverNow:serverTime});return JSON.stringify(checked)===JSON.stringify(proof);}};
}

export function validatePushEnvelope({env,raw,head,parent,changed,subject}){
 need(env.GITHUB_EVENT_NAME==='push'&&env.GITHUB_REF==='refs/heads/rollback-watchdog-20261118'&&head===env.GITHUB_SHA,'Exact arm push required');
 need(typeof raw==='string'&&Buffer.byteLength(raw)<=16384,'Small original plan input required');
 const p=JSON.parse(raw);need(/^[a-f0-9]{40}$/.test(parent)&&parent===p.monitorCommit&&changed.length===1&&changed[0]==='.github/watchdog-arm/plan.json','Arm commit may only change pinned plan after reviewed monitor commit');
 need(subject==='[arm-initial-anchor:'+p.nonce+':'+sha(raw)+']','Explicit nonce and external plan pin required');
 return {...env,WATCHDOG_MONITOR_COMMIT:parent,EXPECTED_PLAN_SHA256:sha(raw)};
}
export async function loadPushArmInput(env){
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8',timeout:5000}).trim();
 git('diff','--exit-code');git('diff','--cached','--exit-code');
 const ancestry=git('rev-list','--parents','-n','1','HEAD').split(' ');need(ancestry.length===2,'Single-parent arm commit required');
 need(git('ls-tree','HEAD','--','.github/watchdog-arm/plan.json').startsWith('100644 blob '),'Regular committed arm plan required');const info=await fs.lstat('.github/watchdog-arm/plan.json');need(info.isFile()&&!info.isSymbolicLink(),'Arm plan symlink forbidden');
 const raw=await fs.readFile('.github/watchdog-arm/plan.json','utf8');
 const armEnv=validatePushEnvelope({env,raw,head:ancestry[0],parent:ancestry[1],changed:git('diff','--name-only',ancestry[1],ancestry[0]).split('\n'),subject:git('show','-s','--format=%B','HEAD')});return {raw,armEnv};
}

export async function main(env=process.env){
 const {raw,armEnv}=await loadPushArmInput(env);env=armEnv;const p=validateProductionInput(raw,env);
 const dir=path.resolve('reports/production-watchdog');await fs.mkdir(dir,{recursive:true});const save=(name,v)=>fs.writeFile(path.join(dir,name),JSON.stringify(v,null,2)+'\n',{flag:'wx',mode:0o600}),append=(name,v)=>fs.appendFile(path.join(dir,name),JSON.stringify(v)+'\n',{mode:0o600});
 const github=async endpoint=>{let r;try{r=await fetch('https://api.github.com/repos/byeval/mcpappstore/'+endpoint,{headers:{Authorization:'Bearer '+env.GH_TOKEN},redirect:'error',signal:AbortSignal.timeout(5000)});}catch{throw Object.assign(Error('GitHub guard read unavailable'),{code:'READ_UNAVAILABLE'});}if(r.status===429||r.status>=500)throw Object.assign(Error('GitHub guard read unavailable'),{code:'READ_UNAVAILABLE'});need(r.ok,'GitHub guard authentication/status rejected');return r.json();};
 const queueGuard=async()=>{const main=await github('git/ref/heads/main'),candidate=await github('git/ref/heads/astro-runtime-20261118');need(main.object?.sha===p.sourceMain&&candidate.object?.sha===p.sourceCommit,'Main/candidate guard changed');for(const status of ['queued','in_progress','waiting','pending']){const b=await github('actions/runs?branch=main&status='+status+'&per_page=1');need(Array.isArray(b.workflow_runs)&&Number.isInteger(b.total_count)&&b.total_count>=0,'Main work response invalid');if(b.total_count||b.workflow_runs.length)throw Object.assign(Error('Main work active'),{code:'LEASE_BUSY'});}};
 await queueGuard();const t=createWatchdogTransport({service:'mcpapp',baseline:BASELINE,accountId:env.CLOUDFLARE_ACCOUNT_ID,databaseId:'5274f5ec-43c2-435f-8867-66f72f1a10a6',token:env.CLOUDFLARE_API_TOKEN});
 const identity={runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT,workflowCommit:env.GITHUB_SHA,monitorCommit:p.monitorCommit,inputSha256:sha(raw),sourceCommit:p.sourceCommit};await fs.writeFile(path.join(dir,'plan.json'),raw,{flag:'wx',mode:0o600});await save('monitor.json',{...identity,pid:process.pid});
 const effects=createProductionEffects({plan:p,transport:{...t,withLease:async fn=>{await queueGuard();return t.withLease(fn);}},readControl:createControlReader({plan:p,token:env.GH_TOKEN}),save,append,identity});
 const result=await watchOwnedFrontend(raw,effects);return ['rolled-back','verified-disarmed'].includes(result.state)?0:1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){main().then(code=>{process.exitCode=code;}).catch(()=>{console.error('Production watchdog refused or failed; inspect saved bounded evidence.');process.exitCode=1;});}
