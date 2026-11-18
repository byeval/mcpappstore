import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {redactProbeLog} from './remote-public-health.mjs';
// Keep only a bounded in-memory tail. Never persist unsanitized credentials.
export async function runPrivateCommand(command,args,{cwd=process.cwd(),env=process.env,limit=65536,timeoutMs=20*60*1000,label=path.basename(command)}={}) {
 const started=Date.now();let tail='',truncated=false,timedOut=false;
 if(!Number.isFinite(timeoutMs)||timeoutMs<1)throw Error('Invalid private command deadline');
 const append=chunk=>{const next=tail+String(chunk);truncated ||= next.length>limit;tail=next.slice(-limit);};
 const outcome=await new Promise(resolve=>{
  const child=spawn(command,args,{cwd,env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
  child.stdout.on('data',chunk=>{process.stdout.write(chunk);append(chunk);});
  child.stderr.on('data',chunk=>{process.stderr.write(chunk);append(chunk);});
  const stop=signal=>{try{if(process.platform!=='win32'&&child.pid)process.kill(-child.pid,signal);else child.kill(signal);}catch(error){if(error.code!=='ESRCH')throw error;}};
  const timer=setTimeout(()=>{timedOut=true;stop('SIGTERM');},timeoutMs);
  const killTimer=setTimeout(()=>{if(timedOut)stop('SIGKILL');},timeoutMs+5000);
  const done=result=>{clearTimeout(timer);clearTimeout(killTimer);resolve(result);};
  child.once('error',error=>done({code:null,signal:null,error:error.message}));
  child.once('close',(code,signal)=>done({code,signal}));
 });
 if(outcome.code===0&&!timedOut)return;
 // Discard a truncated first line so a sliced credential suffix is never saved.
 if(truncated)tail=tail.includes('\n')?tail.slice(tail.indexOf('\n')+1):'';
 const dir=path.join(cwd,'reports/private-preview-logs');await fs.mkdir(dir,{recursive:true});
 const file=path.join(dir,'command-'+randomUUID()+'.log');
 const scrub=text=>redactProbeLog(text,[env.CLOUDFLARE_API_TOKEN,env.GH_TOKEN,env.GITHUB_TOKEN]);
 await fs.writeFile(file,scrub(JSON.stringify({command:path.basename(command),args,label,elapsedMs:Date.now()-started,timedOut, ...outcome})+'\n'+tail),{mode:0o600,flag:'wx'});
 throw new Error(`Private service command failed (exit ${outcome.code}, signal ${outcome.signal??'none'}; bounded redacted log: ${file})`);
}
