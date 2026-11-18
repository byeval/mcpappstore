import {spawnSync} from 'node:child_process';
function literal(value){if(value===null)return 'NULL';if(typeof value==='number'&&Number.isFinite(value))return String(value);if(typeof value==='string')return "'"+value.replaceAll("'","''")+"'";throw Error('Unsupported D1 parameter');}
// CLI adapter for internal fixed SQL only. No SQL received from web requests.
export function createWranglerD1({cwd=process.cwd(),database='mcpapp',execute,runner=spawnSync,now=Date.now}={}){
 // Never attach raw SQL, CLI output or credentials to an error. Only fixed
 // diagnostic categories and numeric process/HTTP metadata leave the adapter.
 const failure=(stage,r,started,sql)=>{
  const output=String(r.stderr??'')+'\n'+String(r.stdout??'');
  const httpMatch=output.match(/(?:HTTP(?:\/\d(?:\.\d)?)?\s*|status(?:\s+code)?[\s:=]+)([45]\d{2})\b/i);
  const apiMatch=output.match(/\[code:\s*(\d{3,8})\]/i);
  const spawnCode=['ETIMEDOUT','ENOBUFS','ENOENT','EACCES','ECONNRESET','ENETUNREACH'].includes(r.error?.code)?r.error.code:null;
  const httpStatus=httpMatch?Number(httpMatch[1]):null,apiCode=apiMatch?Number(apiMatch[1]):null;
  const category=spawnCode==='ETIMEDOUT'?'timeout':httpStatus===429||/rate limit|too many requests/i.test(output)?'rate-limit':httpStatus===401||httpStatus===403||/authentication error|unauthorized/i.test(output)?'authentication':httpStatus>=500?'remote-server':/fetch failed|ECONNRESET|ENOTFOUND|ETIMEDOUT|network error/i.test(output)?'transport':stage==='parse'?'invalid-json':stage==='response'?'unsuccessful-response':'process';
  const verb=sql.trim().match(/^(SELECT|PRAGMA|WITH|UPDATE|INSERT|DELETE|CREATE|ALTER|DROP)\b/i)?.[1]?.toUpperCase()??'OTHER';
  const diagnostic={stage,category,operation:verb,exitCode:Number.isInteger(r.status)?r.status:null,signal:['SIGTERM','SIGKILL','SIGABRT'].includes(r.signal)?r.signal:null,spawnCode,httpStatus,apiCode,elapsedMs:Math.max(0,now()-started)};
  const error=new Error('D1 command failed: '+JSON.stringify(diagnostic));error.code='D1_COMMAND_FAILED';error.diagnostic=diagnostic;return error;
 };
 const invoke=execute??(sql=>{const started=now();let r;try{r=runner('npx',['--no-install','wrangler','d1','execute',database,'--remote','--json','--command',sql],{cwd,encoding:'utf8',timeout:60000,maxBuffer:64*1024*1024});}catch(error){throw failure('spawn',{error},started,sql);}if(r.error||r.status!==0)throw failure('process',r,started,sql);let response;try{response=JSON.parse(r.stdout);}catch{throw failure('parse',r,started,sql);}if(!Array.isArray(response)||response.length!==1||response[0].success!==true)throw failure('response',r,started,sql);return response[0];});
 // Wrangler remote d1 execute uses the direct database query endpoint, not a read replica.
 // Match the binding Session API explicitly; unsupported replica modes are refused.
 const adapter={withSession(constraint){if(constraint!=='first-primary')throw Error('Only authoritative primary D1 sessions supported');return adapter;},prepare(sql){let params=[];const compiled=()=>{if(!params.length)return sql;let i=0;const result=sql.replace(/\?/g,()=>{if(i>=params.length)throw Error('Missing D1 parameter');return literal(params[i++]);});if(i!==params.length)throw Error('Extra D1 parameter');return result;};return {bind(...args){params=args;return this;},async all(){return invoke(compiled());},async first(){return (await invoke(compiled())).results?.[0]??null;},async run(){return invoke(compiled());}};}};return adapter;
}
