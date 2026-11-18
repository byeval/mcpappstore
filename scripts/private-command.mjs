import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {redactProbeLog} from './remote-public-health.mjs';
// Single attempt, bounded diagnostics; raw child output never reaches CI logs.
export async function runPrivateCommand(command,args,{cwd=process.cwd(),env=process.env,limit=65536,timeoutMs=20*60*1000,label=path.basename(command),graceMs=5000}={}) {
 const started=Date.now();let timedOut=false;const tails={stdout:'',stderr:''},truncated={stdout:false,stderr:false};
 if(!Number.isFinite(timeoutMs)||timeoutMs<1)throw Error('Invalid private command deadline');
 const append=stream=>chunk=>{const next=tails[stream]+String(chunk);truncated[stream] ||= next.length>limit;tails[stream]=next.slice(-limit);};
 const outcome=await new Promise(resolve=>{
  const child=spawn(command,args,{cwd,env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
  let closed,escalated=false,killTimer;
  const stop=signal=>{try{if(process.platform!=='win32'&&child.pid)process.kill(-child.pid,signal);else child.kill(signal);}catch(error){if(error.code!=='ESRCH')closed={code:null,signal,error:error.message};}};
  const finish=()=>{if(closed&&(!timedOut||escalated)){clearTimeout(timer);resolve(closed);}};
  const timer=setTimeout(()=>{timedOut=true;stop('SIGTERM');killTimer=setTimeout(()=>{stop('SIGKILL');escalated=true;finish();},graceMs);},timeoutMs);
  child.stdout.on('data',append('stdout'));child.stderr.on('data',append('stderr'));
  child.once('error',error=>{closed={code:null,signal:null,error:error.message};finish();});
  child.once('close',(code,signal)=>{closed??={code,signal};finish();});
 });
 for(const stream of ['stdout','stderr'])if(truncated[stream])tails[stream]=tails[stream].includes('\n')?tails[stream].slice(tails[stream].indexOf('\n')+1):'';
 const tail='STDOUT\n'+tails.stdout+'\nSTDERR\n'+tails.stderr;
 const scrub=text=>redactProbeLog(text,[env.CLOUDFLARE_API_TOKEN,env.GH_TOKEN,env.GITHUB_TOKEN]);
 if(outcome.code===0&&!timedOut){console.log(scrub(`${label} completed in ${Date.now()-started}ms\n`+tail));return;}
 const dir=path.join(cwd,'reports/private-preview-logs');await fs.mkdir(dir,{recursive:true});
 const file=path.join(dir,'command-'+randomUUID()+'.log');
 await fs.writeFile(file,scrub(JSON.stringify({command:path.basename(command),args,label,elapsedMs:Date.now()-started,timedOut,...outcome})+'\n'+tail),{mode:0o600,flag:'wx'});
 throw new Error(`Private service command failed (exit ${outcome.code}, signal ${outcome.signal??'none'}; bounded redacted log: ${file})`);
}
