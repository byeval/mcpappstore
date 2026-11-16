import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {spawn} from 'node:child_process';
export async function runBackendMemoryGate({repo,snapshotPath,run=runLocal}){
 if(!path.isAbsolute(snapshotPath))throw Error('Absolute authoritative public snapshot required');
 const bytes=await fs.readFile(snapshotPath);const snapshot=JSON.parse(bytes);
 if(!Array.isArray(snapshot.apps)||!snapshot.apps.length||!snapshot.apps.some(a=>a.id==='canva')||!Array.isArray(snapshot.categories))throw Error('Complete authoritative public catalog fixture required');
 for(const file of ['tests/backend-related-scale.test.ts','tests/backend-directory-parity.test.ts','tests/backend-memory.integration.mjs','scripts/rendered-body-health.mjs','dist/server/index.js'])await fs.access(path.join(repo,file));
 const options={cwd:repo,env:{...process.env,PUBLIC_SNAPSHOT:snapshotPath},timeoutMs:15*60000};
 await run(process.execPath,['--import','tsx','--test','tests/backend-related-scale.test.ts','tests/backend-directory-parity.test.ts'],options);
 await run(process.execPath,['tests/backend-memory.integration.mjs'],options);
 if(!bytes.equals(await fs.readFile(snapshotPath)))throw Error('Public snapshot changed during memory gate');
 return {kind:'local-authoritative-scale-and-native-body',publicAppCount:snapshot.apps.length,snapshotSha256:createHash('sha256').update(bytes).digest('hex'),remoteColdVerified:false};
}
function runLocal(command,args,{cwd,env,timeoutMs}){return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd,env,stdio:'inherit',timeout:timeoutMs,killSignal:'SIGTERM'});child.once('error',reject);child.once('exit',(code,signal)=>code===0&&!signal?resolve():reject(Error('Required local backend memory gate failed: '+args.at(-1))));});}
