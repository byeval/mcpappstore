// Explicit expiring manual browser attestation. NOT live subscription API verification.
// Hash pin changes require separate source review; never derive this constant from supplied evidence.
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
const TRUSTED_ATTESTATION_SHA256='069421dc9f9dfffd3bebb4a8c6a3fd09c8ad2b9cf13f4377aa903b94da777374';
export const MAX_ATTESTATION_AGE_MS=7*24*60*60*1000;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyManualPaidAttestation({attestationBytes,evidenceBytes,accountId,now=Date.now()}){
 if(!/^[a-f0-9]{32}$/.test(accountId??'')||!Number.isFinite(now))throw Error('Exact account and clock required');
 if(hash(attestationBytes)!==TRUSTED_ATTESTATION_SHA256)throw Error('Missing or changed reviewed attestation');
 const p=JSON.parse(attestationBytes),e=JSON.parse(evidenceBytes);
 if(p.version!==1||p.mode!=='manual-browser-paid-attestation'||p.accountId!==accountId||p.plan!=='Workers Paid'||p.projectCeiling!==450||p.reviewState!=='approved')throw Error('Unapproved or wrong-account manual plan proof');
 if(p.evidenceSha256!==hash(evidenceBytes))throw Error('Browser evidence changed');
 const observed=Date.parse(p.observedAt),expires=Date.parse(p.expiresAt);
 if(!Number.isFinite(observed)||!Number.isFinite(expires)||observed>now||expires<=observed||expires-observed>MAX_ATTESTATION_AGE_MS||now>=expires)throw Error('Manual plan proof missing, future, or expired');
 const url=new URL(e.url);
 if(e.kind!=='browser-observed-account-workers-plan'||e.accountId!==accountId||e.observedAt!==p.observedAt||e.proofMethod!=='Direct authenticated browser AX observation'||e.isRuntimeSubscriptionApiProof!==false||e.credentialPermissionsChanged!==false||!Array.isArray(e.visibleEvidence)||!e.visibleEvidence.includes('有效订阅')||!e.visibleEvidence.includes('Workers 付费计划')||e.settingsChanged!==false||url.origin!=='https://dash.cloudflare.com'||url.pathname.split('/')[1]!==accountId)throw Error('Unsupported browser evidence');
 return {ceiling:450,mode:p.mode,accountId,observedAt:p.observedAt,expiresAt:p.expiresAt,evidenceSha256:p.evidenceSha256,attestationSha256:TRUSTED_ATTESTATION_SHA256,runtimeApiPlanVerified:false};
}

export async function loadWorkerCapacityPolicy(accountId,now=Date.now()){
 const [attestationBytes,evidenceBytes]=await Promise.all([fs.readFile(new URL('../release-evidence/workers-capacity-attestation-20261116.json',import.meta.url)),fs.readFile(new URL('../release-evidence/workers-paid-browser-20261116.json',import.meta.url))]);
 return verifyManualPaidAttestation({accountId,now,attestationBytes,evidenceBytes});
}
