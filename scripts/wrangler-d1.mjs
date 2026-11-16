import {spawnSync} from 'node:child_process';
function literal(value){if(value===null)return 'NULL';if(typeof value==='number'&&Number.isFinite(value))return String(value);if(typeof value==='string')return "'"+value.replaceAll("'","''")+"'";throw Error('Unsupported D1 parameter');}
// CLI adapter for internal fixed SQL only. No SQL received from web requests.
export function createWranglerD1({cwd=process.cwd(),database='mcpapp',execute}={}){
 const invoke=execute??(sql=>{const r=spawnSync('npx',['--no-install','wrangler','d1','execute',database,'--remote','--json','--command',sql],{cwd,encoding:'utf8',timeout:60000,maxBuffer:64*1024*1024});if(r.error||r.status!==0)throw Error('D1 command failed');const response=JSON.parse(r.stdout);if(!Array.isArray(response)||response.length!==1||response[0].success!==true)throw Error('D1 response unsuccessful');return response[0];});
 // Wrangler remote d1 execute uses the direct database query endpoint, not a read replica.
 // Match the binding Session API explicitly; unsupported replica modes are refused.
 const adapter={withSession(constraint){if(constraint!=='first-primary')throw Error('Only authoritative primary D1 sessions supported');return adapter;},prepare(sql){let params=[];const compiled=()=>{if(!params.length)return sql;let i=0;const result=sql.replace(/\?/g,()=>{if(i>=params.length)throw Error('Missing D1 parameter');return literal(params[i++]);});if(i!==params.length)throw Error('Extra D1 parameter');return result;};return {bind(...args){params=args;return this;},async all(){return invoke(compiled());},async first(){return (await invoke(compiled())).results?.[0]??null;},async run(){return invoke(compiled());}};}};return adapter;
}
