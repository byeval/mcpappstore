import {randomUUID} from 'node:crypto';import {verifyPublicDomainSmoke,PublicBrowserVerificationRequiredError} from './public-domain-smoke.mjs';
const urlFor=c=>'https://'+(c.host??'mcpapp.net')+c.path;
// Samples every exact check. Only the explicit Cloudflare response header proves
// a challenge for baseline equivalence. Body resemblance is not enough here.
export async function samplePublicBaseline(checks,options={}){const samples=[];for(const check of checks){try{const [result]=await verifyPublicDomainSmoke([{...check,delivery:undefined}],options);samples.push({...result,url:urlFor(check),outcome:'http-verified',httpVerified:true});}catch(error){if(error?.code==='PUBLIC_BROWSER_VERIFICATION_REQUIRED'&&error.challengeEvidence==='cf-mitigated')samples.push({url:urlFor(check),status:403,outcome:'confirmed-challenge',evidence:'cf-mitigated: challenge',httpVerified:false});else if(check.baselineMayBeMissing&&/^\/(?:_astro|assets)\/[A-Za-z0-9_-]+[.-][A-Za-z0-9_-]{6,}\.css$/.test(check.path)&&error.actualStatus===404)samples.push({url:urlFor(check),status:404,outcome:'asset-not-yet-published',httpVerified:false});else throw error;}}return {sampledAt:new Date().toISOString(),samples};}
export async function comparePublicAfterSwitch(checks,baseline,options={}){const samples=[];for(const check of checks){try{const [result]=await verifyPublicDomainSmoke([check],options);samples.push({...result,url:urlFor(check),outcome:'http-verified',httpVerified:true});}catch(error){const before=baseline.samples.find(s=>s.url===urlFor(check));if(error?.code==='PUBLIC_BROWSER_VERIFICATION_REQUIRED'&&error.challengeEvidence==='cf-mitigated'&&before?.outcome==='confirmed-challenge')samples.push({url:urlFor(check),status:403,outcome:'same-confirmed-challenge',httpVerified:false});else {const failed=new Error('Post-switch public verification changed or failed; rollback required',{cause:error});failed.code='PUBLIC_POSTDEPLOY_VERIFICATION_FAILED';throw failed;}}}const challenged=samples.some(s=>!s.httpVerified);return {state:challenged?'awaiting-browser':'http-verified',httpVerified:!challenged,sampledAt:new Date().toISOString(),samples};}
export function createBrowserTicket({artifactId,buildCommit,markerId,contentRevision,frontVersion,backendVersion,previousPair,checks,services,publicResult,createdAt=Date.now()}){if(publicResult?.state!=='awaiting-browser'||!artifactId||!/^[a-f0-9]{40}$/.test(buildCommit)||!frontVersion||!backendVersion||!checks?.length)throw Error('Scoped post-switch verification metadata required');return {version:1,kind:'astro-release',publicPolicy:'viator-global-v1',state:'awaiting-browser',phase:'after-deployment',nonce:randomUUID(),artifactId,buildCommit,markerId,contentRevision,frontVersion,backendVersion,previousPair,services,checks:checks.map(c=>({...c,url:urlFor(c)})),createdAt,expiresAt:createdAt+30*60*1000,httpVerified:false,publicResult};}
// Browser observations attest DOM/visual facts, not unavailable network headers.
// Exact status/delivery/content type are independently rechecked by the
// verification continuation through the exact live service/version bindings.
export function browserObservableChecks(checks){return checks.filter(check=>!(check.path==='/admin'&&check.status===401&&(check.host===undefined||check.host==='mcpapp.net')));}
export function validateBrowserObservations(ticket,proof,{now=Date.now()}={}){
 if(ticket?.state!=='awaiting-browser'||ticket.phase!=='after-deployment'||now>ticket.expiresAt||ticket.createdAt>now+60000)throw Error('Verification ticket expired or invalid');
 for(const key of ['nonce','artifactId','buildCommit','frontVersion','backendVersion','phase'])if(proof?.[key]!==ticket[key])throw Error('Browser proof identity mismatch: '+key);
 if(proof.method!=='normal-browser'||!Number.isFinite(proof.observedAt)||proof.observedAt<ticket.createdAt||proof.observedAt>now+60000||now-proof.observedAt>5*60*1000)throw Error('Fresh normal-browser observations required');
 const requiredChecks=browserObservableChecks(ticket.checks);
 if(proof.navigationVerified!==true||proof.stylesApplied!==true||!Array.isArray(proof.observations)||proof.observations.length!==requiredChecks.length)throw Error('Browser navigation/style and every required observation must be established');
 const urls=new Set();for(const observed of proof.observations){
  if(urls.has(observed.url))throw Error('Duplicate browser observation');urls.add(observed.url);const expected=requiredChecks.find(c=>c.url===observed.url);
  if(!expected||observed.challengeVisible!==false||(expected.canonical&&observed.canonical!==expected.canonical))throw Error('Browser URL/canonical or unobstructed content not verified');
  if(['status','delivery','contentType'].some(key=>key in observed))throw Error('Browser DOM proof must not claim HTTP headers/status; service verification owns those');
  const text=observed.visibleText??'';
  if(/just a moment|checking (?:your )?browser|verify (?:that )?you are human|attention required|enable javascript and cookies/i.test(text))throw Error('Challenge content is not a successful browser observation');
  if(expected.contentTypePrefix==='text/css'){
   const page=ticket.checks.find(c=>c.url===observed.appliedOnUrl&&c.status===200&&!c.contentTypePrefix?.startsWith('image/')&&c.contentTypePrefix!=='text/css');
   if(observed.kind!=='stylesheet'||observed.stylesheetApplied!==true||!page)throw Error('Stylesheet must be visibly applied on a checked page');
  }else if(expected.contentTypePrefix?.startsWith('image/')){
   if(observed.kind!=='image'||observed.imageVisible!==true||!(observed.naturalWidth>0)||!(observed.naturalHeight>0))throw Error('Expected image must visibly load with dimensions');
  }else if(expected.status===410){
   if(observed.kind!=='gone'||observed.appDetailVisible!==false||!/(?:\bgone\b|no longer available|removed|已下线|已移除)/i.test(text))throw Error('Removal page must visibly say Gone/removed, not show app details');
  }else if(expected.status===401){
   if(observed.kind!=='authentication'||observed.authenticationRequired!==true)throw Error('Protected admin must visibly require authentication');
  }else if(expected.status===200){
   if(observed.kind!=='content'||observed.contentVisible!==true||typeof text!=='string'||text.trim().length<8||/(?:^\s*gone\s*$|page not found)/i.test(text))throw Error('Expected real page content must be visible');
  }else throw Error('Unsupported browser observation contract');
 }
 const text=JSON.stringify(proof);if(/"(?:cookies?|authorization|clearance|accessToken|apiToken)"\s*:/i.test(text))throw Error('Browser proof must not contain cookies or credentials');
 return {verified:true,method:'normal-browser-dom-plus-version-bound-service-http',nonce:ticket.nonce,artifactId:ticket.artifactId,buildCommit:ticket.buildCommit,frontVersion:ticket.frontVersion,backendVersion:ticket.backendVersion,observedAt:proof.observedAt,verifiedAt:now,browserDomVerified:true,browserHttpHeadersVerified:false,nodeHttpsVerified:false,serviceHttpVerificationRequired:true};
}
