import {inspectRenderedBody} from './rendered-body-health.mjs';
import {parseEntities} from 'parse-entities';
// A focused HTML tokenizer, not an href substring match. Attribute values use the
// existing locked Markdown dependency's HTML character-reference parser.
export function hasExactCanonicalLink(html,expected){
 const links=[];let offset=0,head=true;const inert=[];
 const headTags=new Set(['html','head','base','basefont','bgsound','link','meta','title','noscript','noframes','style','script','template']);
 const rawTags=new Set(['script','style','title','textarea','xmp','iframe','noembed','noframes']);
 const inertTags=new Set([...rawTags,'template','noscript','svg','math']);
 while(offset<html.length){
  const start=html.indexOf('<',offset);if(start<0)break;if(!inert.length&&html.slice(offset,start).trim())head=false;
  if(html.startsWith('<!--',start)){const end=html.indexOf('-->',start+4);if(end<0)break;offset=end+3;continue;}
  let cursor=start+1,quote=null;for(;cursor<html.length;cursor++){const ch=html[cursor];if(quote){if(ch===quote)quote=null;}else if(ch==='"'||ch==="'")quote=ch;else if(ch==='>')break;}
  if(cursor===html.length)break;const token=html.slice(start+1,cursor);offset=cursor+1;
  if(/^!|^\?/.test(token))continue;
  const tagMatch=/^(\/)?([A-Za-z][A-Za-z0-9:-]*)(?=[\s/]|$)/.exec(token);if(!tagMatch)continue;const closing=!!tagMatch[1],tag=tagMatch[2].toLowerCase();
  if(closing){if(inert.length){if(inert.at(-1)===tag)inert.pop();}else if(tag==='head'||tag==='body')head=false;continue;}
  if(inert.length){if(inertTags.has(tag))inert.push(tag);}else{if(!headTags.has(tag))head=false;if(inertTags.has(tag))inert.push(tag);}
  if(rawTags.has(tag)){const close=new RegExp('</'+tag+'(?=[\\s>])[^>]*>','ig');close.lastIndex=offset;const end=close.exec(html);if(!end)break;offset=close.lastIndex;if(inert.at(-1)===tag)inert.pop();continue;}
  if(inert.length||!head||tag!=='link')continue;
  const attrs=new Map();let index=tagMatch[0].length,valid=true;
  while(index<token.length){while(/\s/.test(token[index]??'')&&index<token.length)index++;if(index>=token.length||token.slice(index).trim()==='/')break;const name=/^[^\s"'<>/=]+/.exec(token.slice(index));if(!name){valid=false;break;}const key=name[0].toLowerCase();index+=name[0].length;while(/\s/.test(token[index]??'')&&index<token.length)index++;let value='';if(token[index]==='='){index++;while(/\s/.test(token[index]??'')&&index<token.length)index++;if(token[index]==='"'||token[index]==="'"){const delimiter=token[index++],end=token.indexOf(delimiter,index);if(end<0){valid=false;break;}value=token.slice(index,end);index=end+1;}else{const unquoted=/^[^\s"'=<>`]+/.exec(token.slice(index));if(!unquoted){valid=false;break;}value=unquoted[0];index+=value.length;}}
   if(attrs.has(key)){valid=false;break;}attrs.set(key,parseEntities(value,{attribute:true}));
  }
  if(valid&&(attrs.get('rel')??'').trim().toLowerCase()==='canonical')links.push(attrs.get('href')??'');
 }
 return links.length===1&&links[0]===expected;
}
export class PublicBrowserVerificationRequiredError extends Error {constructor(message,{challengeConfirmed=false,challengeEvidence=null}={}){super(message);this.code='PUBLIC_BROWSER_VERIFICATION_REQUIRED';this.challengeConfirmed=challengeConfirmed;this.challengeEvidence=challengeEvidence;}}
// Real HTTPS/DNS smoke: no service binding, credentials, cookies or redirect following.
export function assertPublicSmokeChecks(checks){
 if(!Array.isArray(checks)||!checks.length)throw Error('Explicit public domain checks required');
 for(const check of checks){const host=check?.host??'mcpapp.net';if(!['mcpapp.net','cdn.mcpapp.net'].includes(host)||typeof check?.path!=='string'||!/^\/[a-zA-Z0-9_.~/-]*$/.test(check.path)||check.path.split('/').some(segment=>segment==='.'||segment==='..')||check.path.includes('//')||!Number.isInteger(check.status))throw Error('Invalid public domain smoke target');}return checks;
}
export function publicSmokeError(error,reason,check,host,actualStatus){if(Number.isInteger(actualStatus))error.actualStatus=actualStatus;error.publicSmokeReason=reason;error.checkPath=check.path;error.checkHost=host;error.expectedStatus=check.status;return error;}
export async function verifyPublicDomainSmoke(checks,{fetcher=fetch,timeoutMs=15000}={}){
 assertPublicSmokeChecks(checks);const results=[];
 for(const check of checks){const host=check.host??'mcpapp.net';
  const url='https://'+host+check.path;let response;try{response=await fetcher(url,{method:'GET',redirect:'manual',credentials:'omit',headers:{Accept:check.contentTypePrefix?.endsWith('/')?check.contentTypePrefix+'*':check.contentTypePrefix??'text/html','Cache-Control':'no-cache'},signal:AbortSignal.timeout(timeoutMs)});}catch{throw publicSmokeError(Error('Public domain HTTPS request failed: '+host+check.path),'transport',check,host);}
  const delivery=response.headers.get('x-mcp-delivery');
  if(response.status===403&&(response.headers.get('content-type')??'').toLowerCase().includes('text/html')){const body=await response.text();const challenge=response.headers.get('cf-mitigated')==='challenge'||/\/cdn-cgi\/challenge-platform\/|window\._cf_chl_opt/.test(body);throw publicSmokeError(new PublicBrowserVerificationRequiredError('Public HTTPS client received '+(challenge?'a confirmed challenge':'an unclassified HTML403')+' at '+host+check.path+'; browser verification required, not proof of a rollout regression',{challengeConfirmed:challenge,challengeEvidence:response.headers.get('cf-mitigated')==='challenge'?'cf-mitigated':challenge?'html-marker':null}),'challenge',check,host,response.status);}
if(response.status!==check.status){const error=new Error('Public domain status mismatch: '+host+check.path+' expected '+check.status+' got '+response.status);error.actualStatus=response.status;error.checkPath=check.path;error.expectedStatus=check.status;throw publicSmokeError(error,'status',check,host);}
  if(check.delivery&&delivery!==check.delivery)throw publicSmokeError(Error('Public domain delivery mismatch: '+host+check.path),'delivery',check,host,response.status);
  if(check.contentTypePrefix&&!(response.headers.get('content-type')??'').toLowerCase().startsWith(check.contentTypePrefix))throw publicSmokeError(Error('Public domain content type mismatch: '+host+check.path),'content-type',check,host,response.status);
  if(check.canonical||check.renderedBody){const html=await response.text();if(check.canonical&&!hasExactCanonicalLink(html,check.canonical))throw publicSmokeError(Error('Public domain canonical mismatch: '+host+check.path),'canonical',check,host,response.status);if(check.renderedBody&&inspectRenderedBody(html,check.requiredText??[]).ok!==true)throw publicSmokeError(Error('Public domain rendered body mismatch: '+host+check.path),'rendered-body',check,host,response.status);}else await response.body?.cancel();
  results.push({host,path:check.path,status:response.status,delivery});
 }return results;
}
export async function verifyPublicCutover({checks,readRouting,assertRouting,fetcher,timeoutMs}){const routing=assertRouting(await readRouting());const responses=await verifyPublicDomainSmoke(checks,{fetcher,timeoutMs});return {routing,responses};}
