// Pure validation of an authenticated dedicated-ref package. Never fetches or writes.
import {createHash} from 'node:crypto';import {validateBrowserObservations} from './public-baseline-policy.mjs';import {validateVerifiedAnchor} from './verified-anchor.mjs';import {assertOwnedRollback} from './anchor-ownership.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),need=(v,m)=>{if(!v)throw Error(m);};
export const REQUIRED_ANCHOR_CHECKS=Object.freeze([
 {path:'/docs',status:200,contentTypePrefix:'text/html',canonical:'https://mcpapp.net/docs'},
 {path:'/app/canva',status:200,renderedBody:true,requiredText:['Canva','Platform surfaces','Information'],contentTypePrefix:'text/html',canonical:'https://mcpapp.net/app/canva'},
 {path:'/assets/index-Cx1yK4AS.css',status:200,contentTypePrefix:'text/css',sha256:'c75457d33c7752954deaa89c2cfdf8dddad7a383acfb91608f1df0c37c708b90'},
 {path:'/admin',status:401}, {path:'/app/viator',status:410}
].map(c=>Object.freeze({...c,url:'https://mcpapp.net'+c.path})));
const stable=x=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function validateWatchdogDisarm({plan,ownedVersion,current,ref,commit,descendsFromControlBase,manifest,files,serverNow}){
 need(ref===plan.controlRef&&/^refs\/heads\/anchor-watchdog-control-[a-f0-9]{32}$/.test(ref)&&/^[a-f0-9]{40}$/.test(commit)&&descendsFromControlBase===true,'Authenticated dedicated control lineage required');
 need(manifest.kind==='anchor-watchdog-browser-package-v1'&&manifest.armNonce===plan.nonce&&manifest.sourceCommit===plan.sourceCommit&&manifest.frontVersion===ownedVersion&&manifest.baseline===plan.baseline&&manifest.tag===plan.tag&&manifest.message===plan.message,'Control package identity mismatch');
 need(serverNow>=plan.armFrom&&serverNow<plan.stopAt,'Control package outside guard lifetime');
 const names=['ticket.json','observations.json','ticket.verified.json','anchor.json'];need(Object.keys(manifest.files??{}).sort().join('|')===names.sort().join('|'),'Exact browser evidence package required');
 const parsed={};for(const n of names){need(typeof files[n]==='string'&&sha(files[n])===manifest.files[n],'Original browser file hash mismatch');parsed[n]=JSON.parse(files[n]);}
 const ticket=parsed['ticket.json'],proof=parsed['observations.json'],verified=parsed['ticket.verified.json'],anchor=parsed['anchor.json'];
 need(plan.runtimeEvidence?.version&&plan.runtimeEvidence?.service&&ticket.backendVersion===plan.runtimeEvidence.version&&ticket.privateBackendService===plan.runtimeEvidence.service,'Exact qualified backend required');
 need(Array.isArray(ticket.checks)&&stable([...ticket.checks].sort((a,b)=>String(a.url).localeCompare(String(b.url))))===stable([...REQUIRED_ANCHOR_CHECKS].sort((a,b)=>a.url.localeCompare(b.url))),'Complete fixed anchor checks required');
 need(ticket.kind==='legacy-anchor'&&ticket.buildCommit===plan.sourceCommit&&ticket.frontVersion===ownedVersion&&ticket.previousPair?.front?.versionId===plan.baseline,'Exact initial anchor browser ticket required');
 need(ticket.createdAt>=plan.armFrom&&ticket.createdAt<plan.deadline&&proof.observedAt<plan.deadline&&anchor.verifiedAt<plan.deadline&&anchor.verifiedAt>=proof.observedAt,'Browser acceptance must precede rollback deadline');
 // Validate at the recorded actual acceptance time, not at a later polling time.
 const accepted=validateBrowserObservations(ticket,proof,{now:anchor.verifiedAt});
 for(const[k,v]of Object.entries(accepted))if(!['serviceHttpVerificationRequired'].includes(k))need(JSON.stringify(verified[k])===JSON.stringify(v),'Actual verifier result mismatch');
 need(verified.serviceHttpVerified===true&&verified.serviceHttpVerificationRequired===false&&JSON.stringify(verified.anchor)===JSON.stringify(anchor),'Verifier continuation and anchor record required');
 need(anchor.proofDigest===sha(JSON.stringify(proof))&&manifest.proofDigest===anchor.proofDigest,'Original browser observation digest required');
 assertOwnedRollback({ownedVersion,ownedTag:plan.tag,ownedMessage:plan.message,currentVersion:current.versionId,currentTag:current.versionTag,currentMessage:current.versionMessage});
 validateVerifiedAnchor(anchor,current,{isAncestor:source=>source===plan.sourceCommit,now:serverNow});
 return {kind:'verified-browser-disarm-v1',sourceCommit:plan.sourceCommit,frontVersion:ownedVersion,nonce:plan.nonce,controlCommit:commit,proofDigest:anchor.proofDigest};
}
