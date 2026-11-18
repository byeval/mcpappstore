import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const roots=['prepared.json','audited-assets','work/src','work/worker/edge-entry.mjs','work/sharding/asset-binding.mjs','work/sharding/split.mjs','work/package.json','work/package-lock.json','work/astro.config.mjs','work/tsconfig.json','work/evidence/current-source-audited-routes.json','work/backend-memory-proof.json'];
const forbidden=/(^|\/)(?:\.[^/]+|node_modules|dist[^/]*|activation[^/]*|[^/]*credentials[^/]*|[^/]*secrets?[^/]*|[^/]*token[^/]*)(\/|$)|\.(?:pem|key|p12|pfx|sqlite|db)$/i;
async function digest(file,{scan=false}={}){const h=createHash('sha256');let tail='';for await(const b of createReadStream(file)){h.update(b);if(scan){const text=tail+b.toString('utf8');if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:sk-proj-|gh[pousr]_)[A-Za-z0-9_-]{20,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}/.test(text))throw Error('Credential-shaped content refused');tail=text.slice(-256);}}return h.digest('hex');}
async function safePath(file){const absolute=path.resolve(file);let current=path.parse(absolute).root;for(const part of absolute.slice(current.length).split(path.sep)){current=path.join(current,part);if((await fs.lstat(current)).isSymbolicLink())throw Error('Symlink refused');}return absolute;}
export async function preservePrepared(receiptPath,{outputDir,sourceSha,runId,runAttempt,maxBytes=5*1024**3,maxFiles=200000,timeoutMs=600000}={}){
 if(!/^[a-f0-9]{40}$/.test(sourceSha??'')||!/^\d+$/.test(runId??'')||!/^\d+$/.test(runAttempt??''))throw Error('Exact source/run/attempt identity required');
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>5*1024**3||!Number.isSafeInteger(maxFiles)||maxFiles<1||maxFiles>200000||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>600000)throw Error('Invalid preservation limits');
 const started=Date.now(),deadline=()=>{if(Date.now()-started>timeoutMs)throw Error('Preservation deadline exceeded');};
 receiptPath=await safePath(receiptPath);if(path.basename(receiptPath)!=='prepared.json')throw Error('Expected prepared.json');
 const root=path.dirname(receiptPath),receipt=JSON.parse(await fs.readFile(receiptPath,'utf8'));
 if(receipt.buildCommit!==sourceSha||receipt.activationAllowed!==false||receipt.releaseDir!==root||receipt.receiptPath!==receiptPath||receipt.assets!==path.join(root,'audited-assets'))throw Error('Prepared receipt identity/path mismatch');
 outputDir=path.resolve(outputDir??'reports');if(outputDir===root||outputDir.startsWith(root+path.sep))throw Error('Output must be outside release');
 await fs.mkdir(outputDir,{recursive:true});await safePath(outputDir);
 const archive=path.join(outputDir,'prepared-release.tar.gz'),manifestPath=path.join(outputDir,'prepared-release.manifest.json');
 for(const f of [archive,manifestPath]){try{await fs.lstat(f);throw Error('Preservation output already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
 const files=[];let totalBytes=0;
 async function walk(relative){deadline();if(relative.includes('\\')||/[\0\r\n]/.test(relative)||relative.split('/').some(p=>p.startsWith('.'))||(relative.startsWith('work/')&&forbidden.test(relative)))throw Error('Unsafe archive path');
  const absolute=path.join(root,relative),st=await fs.lstat(absolute);if(st.isSymbolicLink())throw Error('Symlink refused');
  if(st.isDirectory()){for(const entry of (await fs.readdir(absolute)).sort())await walk(relative+'/'+entry);return;}
  if(!st.isFile()||st.nlink!==1)throw Error('Only unlinked regular files permitted');
  totalBytes+=st.size;if(totalBytes>maxBytes||files.length>=maxFiles)throw Error('Preservation size/count limit exceeded');
  const sha256=await digest(absolute,{scan:true}),after=await fs.stat(absolute);if(after.size!==st.size||after.mtimeMs!==st.mtimeMs||after.ino!==st.ino)throw Error('Prepared file changed');
  files.push({path:relative,size:st.size,sha256});
 }
 for(const relative of roots){await safePath(path.join(root,relative));await walk(relative);}
 files.sort((a,b)=>a.path<b.path?-1:1);
 const aggregate=createHash('sha256');const assets=files.filter(f=>f.path.startsWith('audited-assets/'));for(const f of assets)aggregate.update(f.path.slice('audited-assets/'.length)+'\0').update(f.sha256);
 if(receipt.digest?.files!==assets.length||receipt.digest?.sha256!==aggregate.digest('hex'))throw Error('Audited assets digest mismatch');
 const temp=await fs.mkdtemp(path.join(outputDir,'.preserve-'));const list=path.join(temp,'files'),partial=path.join(temp,'archive.tar.gz');
 try{
  await fs.writeFile(list,files.map(f=>f.path).join('\0')+'\0',{flag:'wx'});deadline();
  await new Promise((resolve,reject)=>{const child=spawn('tar',['-czf',partial,'-C',root,'--null','-T',list],{stdio:['ignore','ignore','pipe'],env:{...process.env,COPYFILE_DISABLE:'1',GZIP:'-1'}});let stderr='';child.stderr.on('data',b=>{stderr=(stderr+b).slice(-1000);});const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Archive deadline exceeded'));},Math.max(1,timeoutMs-(Date.now()-started)));child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error('Archive command failed'));});});
  deadline();const size=(await fs.stat(partial)).size;if(size>maxBytes)throw Error('Archive size limit exceeded');
  const archiveSha256=await digest(partial);
  // Fail rather than publishing a receipt for material changed during packaging.
  for(const f of files){deadline();if(await digest(path.join(root,f.path))!==f.sha256)throw Error('Prepared file changed during archive');}
  const manifest={version:1,purpose:'prepared-diagnostic-material-only',activationAllowed:false,automaticRestoreSupported:false,sourceSha,runId:String(runId),runAttempt:String(runAttempt),artifactId:receipt.artifactId,markerId:receipt.markerId,createdAt:new Date().toISOString(),totalBytes,fileCount:files.length,archive:{name:path.basename(archive),size,sha256:archiveSha256},files};
  await fs.copyFile(partial,archive,1);await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2),{flag:'wx'});return {archive,manifestPath,fileCount:files.length,totalBytes,elapsedMs:Date.now()-started};
 }catch(error){await fs.rm(archive,{force:true});await fs.rm(manifestPath,{force:true});throw error;}finally{await fs.rm(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const value=k=>process.argv[process.argv.indexOf(k)+1];if(!process.argv.includes('--receipt'))throw Error('--receipt required');console.log(JSON.stringify(await preservePrepared(value('--receipt'),{outputDir:process.argv.includes('--output')?value('--output'):'reports',sourceSha:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT})));}
