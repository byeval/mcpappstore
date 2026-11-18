import {createHash} from 'node:crypto';
import {validateVerifiedHybridRecord} from './verified-hybrid-registry.mjs';
export function releaseExitCode(status){if(status===0||status===78)return status;throw Error('Release stage failed; not a verified pending outcome');}
export async function awaitPendingRelease(ticket,{failurePolicy,readCurrent,readRecord,rollback,frontMetadata,readFrontMetadata=async()=>frontMetadata,verifyBrowser=async()=>null,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),pollMs=30000,onDiagnostic=()=>{}}){
 if(ticket?.kind!=='astro-release'||ticket.state!=='awaiting-browser'||ticket.publicPolicy!=='viator-global-v1'||!Number.isFinite(ticket.createdAt)||!Number.isFinite(ticket.expiresAt)||ticket.expiresAt-ticket.createdAt>1800000||ticket.expiresAt<=ticket.createdAt||!ticket.previousPair?.front?.versionId)throw Error('Exact bounded pending Astro ticket required');
 const stopAt=ticket.expiresAt+10*60000;
 const pause=()=>sleep(Math.min(pollMs,15000,Math.max(1,stopAt-now())));
 const current=async()=>{const live=await readCurrent();if(live.frontVersion!==ticket.frontVersion||live.backendVersion!==ticket.backendVersion){const e=Error('Pending release superseded; never revert newer versions');e.code='PENDING_RELEASE_SUPERSEDED';throw e;}if(now()>stopAt)throw Error('Release resolution deadline exhausted; intervention required');};
 async function verifiedRecord(){
  let record,metadata;
  try{record=await readRecord();if(record)metadata=await readFrontMetadata();}catch{return {unavailable:true};}
  if(!record)return null;
  validateVerifiedHybridRecord(record,metadata,ticket.backendVersion);if(record.sourceCommit!==ticket.buildCommit)throw Error('Verification record source differs from pending ticket');
  try{await current();}catch(e){if(e.code==='PENDING_RELEASE_SUPERSEDED')throw e;return {unavailable:true};}
  return {verified:true,frontVersion:ticket.frontVersion,method:record.method};
 }
 for(;;){
  if(now()>stopAt)throw Error('Release resolution deadline exhausted; intervention required');
  try{await current();}catch(e){if(e.code==='PENDING_RELEASE_SUPERSEDED')throw e;onDiagnostic('current-read-unavailable');await pause();continue;}
  const record=await verifiedRecord();if(record?.verified)return record;
  if(now()<=ticket.expiresAt){
   let delivery;try{delivery=await verifyBrowser({allowNew:true});}catch(e){if(e.code==='PENDING_RELEASE_SUPERSEDED')throw e;onDiagnostic('browser-proof-unavailable-or-rejected');}
   if(delivery){const delivered=await verifiedRecord();if(delivered?.verified)return delivered;}
  }
  if(now()<=ticket.expiresAt){if(record?.unavailable)onDiagnostic('verification-read-unavailable');await sleep(Math.min(pollMs,Math.max(1,ticket.expiresAt-now()+1)));continue;}
  try{await current();}catch(e){if(e.code==='PENDING_RELEASE_SUPERSEDED')throw e;onDiagnostic('rollback-current-read-unavailable');await pause();continue;}
  if(failurePolicy==='retain-unverified')return {verified:false,rolledBack:false,retained:true,reason:'browser-verification-expired',frontVersion:ticket.frontVersion,backendVersion:ticket.backendVersion};
  try{await rollback();}
  catch(error){
   try{await current();const raced=await verifiedRecord();if(raced?.verified)return raced;}catch(e){if(e.code==='PENDING_RELEASE_SUPERSEDED')throw e;}
   if(['ROLLBACK_BUSY','ROLLBACK_PREFLIGHT_RETRY'].includes(error.code)&&now()<stopAt){onDiagnostic('rollback-deferred');await pause();continue;}throw error;
  }
  return {verified:false,rolledBack:true,reason:'browser-verification-expired',frontVersion:ticket.frontVersion};
 }
}

// Initial corrected legacy uses the same bounded ticket/rollback lifecycle, but
// has a private preview backend and no hybrid slot/registry entry yet.
export async function awaitPendingAnchor(ticket,{failurePolicy,readCurrent,verifyBrowser,rollback,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),pollMs=10000,onDiagnostic=()=>{}}){
 if(ticket?.kind!=='legacy-anchor'||ticket.state!=='awaiting-browser'||ticket.publicPolicy!=='viator-global-v1'||!/^[a-f0-9]{40}$/.test(ticket.buildCommit??'')||!ticket.privateBackendService?.startsWith('mcpapp-preview-legacy-')||!ticket.backendVersion||!ticket.frontVersion||!ticket.previousPair?.front?.versionId||ticket.previousPair.legacy!==null||!Number.isFinite(ticket.createdAt)||!Number.isFinite(ticket.expiresAt)||ticket.expiresAt<=ticket.createdAt||ticket.expiresAt-ticket.createdAt>1800000)throw Error('Exact bounded pending legacy ticket required');
 const stopAt=ticket.expiresAt+10*60000;
 const current=async()=>{const live=await readCurrent();if(live.frontVersion!==ticket.frontVersion||live.backendVersion!==ticket.backendVersion){const e=Error('Pending anchor superseded; never revert newer versions');e.code='PENDING_RELEASE_SUPERSEDED';throw e;}if(now()>stopAt)throw Error('Anchor resolution deadline exhausted; intervention required');};
 for(;;){
  if(now()>stopAt)throw Error('Anchor resolution deadline exhausted; intervention required');
  try{await current();}catch(e){if(e.code==='PENDING_RELEASE_SUPERSEDED')throw e;onDiagnostic('current-read-unavailable');await sleep(Math.min(pollMs,Math.max(1,stopAt-now())));continue;}
  {
   try{const verified=await verifyBrowser({allowNew:now()<=ticket.expiresAt});if(verified){if(verified.verified!==true||verified.nonce!==ticket.nonce||verified.artifactId!==ticket.artifactId||verified.buildCommit!==ticket.buildCommit||verified.frontVersion!==ticket.frontVersion||verified.anchor?.method!=='normal-browser'||verified.anchor?.publicPolicy!=='viator-global-v1'||!/^[a-f0-9]{64}$/.test(verified.anchor?.proofDigest??'')||verified.anchor?.frontVersion!==ticket.frontVersion||verified.anchor?.sourceCommit!==ticket.buildCommit||verified.anchor?.kind!=='verified-legacy-anchor'||verified.serviceHttpVerified!==true||verified.backendVersion!==ticket.backendVersion||verified.privateBackendService!==ticket.privateBackendService||verified.ticketSha256!==createHash('sha256').update(JSON.stringify(ticket)).digest('hex')||!Number.isFinite(verified.anchor.verifiedAt)||verified.anchor.verifiedAt<ticket.createdAt||verified.anchor.verifiedAt>ticket.expiresAt)throw Error('Legacy verification output identity mismatch');await current();return {verified:true,frontVersion:ticket.frontVersion,anchor:verified.anchor,method:verified.method};}}
   catch(e){if(e.code==='PENDING_RELEASE_SUPERSEDED')throw e;onDiagnostic('browser-proof-unavailable-or-rejected');}
   if(now()<=ticket.expiresAt){await sleep(Math.min(pollMs,Math.max(1,ticket.expiresAt-now()+1)));continue;}
  }
  // Missing/invalid/unavailable browser evidence never extends the ticket.
  try{await current();}catch(e){if(e.code==='PENDING_RELEASE_SUPERSEDED')throw e;onDiagnostic('rollback-current-read-unavailable');await sleep(Math.min(pollMs,Math.max(1,stopAt-now())));continue;}
  if(failurePolicy==='retain-unverified')return {verified:false,rolledBack:false,retained:true,reason:'browser-verification-expired',frontVersion:ticket.frontVersion,backendVersion:ticket.backendVersion};
  try{await rollback();return {verified:false,rolledBack:true,reason:'browser-verification-expired',frontVersion:ticket.frontVersion};}
  catch(e){if(e.code==='PENDING_RELEASE_SUPERSEDED')throw e;if(!['ROLLBACK_BUSY','ROLLBACK_PREFLIGHT_RETRY'].includes(e.code))throw e;onDiagnostic(e.code==='ROLLBACK_BUSY'?'rollback-lease-busy':'rollback-preflight-unavailable');await sleep(Math.min(pollMs,Math.max(1,stopAt-now())));}
 }
}
