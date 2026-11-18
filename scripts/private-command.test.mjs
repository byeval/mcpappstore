import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {runPrivateCommand} from './private-command.mjs';
test('successful command has no failure artifact',async()=>{const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'private-command-'));try{await runPrivateCommand(process.execPath,['-e','process.exit(0)'],{cwd});await assert.rejects(fs.access(path.join(cwd,'reports')));}finally{await fs.rm(cwd,{recursive:true,force:true});}});
test('failure preserves bounded scrubbed diagnostics and exit code without retry',async()=>{const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'private-command-'));try{await assert.rejects(runPrivateCommand(process.execPath,['-e',"console.error('sample-secret-credential');process.exit(7)"],{cwd,env:{...process.env,GH_TOKEN:'sample-secret-credential'},limit:128}),/exit 7/);const dir=path.join(cwd,'reports/private-preview-logs');const files=await fs.readdir(dir);assert.equal(files.length,1);const body=await fs.readFile(path.join(dir,files[0]),'utf8');assert.ok(!body.includes('sample-secret-credential'));assert.match(body,/REDACTED/);assert.match(body,/"code":7/);}finally{await fs.rm(cwd,{recursive:true,force:true});}});
for(const [name,args,options,pattern] of [
 ['signal',['-e',"process.kill(process.pid,'SIGTERM')"],{},/signal SIGTERM/],
 ['timeout',['-e','setInterval(()=>{},1000)'],{timeoutMs:50,graceMs:100},/signal SIGTERM/],
])test(name+' fails closed',async()=>{const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'private-command-'));try{await assert.rejects(runPrivateCommand(process.execPath,args,{cwd,...options}),pattern);}finally{await fs.rm(cwd,{recursive:true,force:true});}});
test('spawn error fails closed',async()=>{const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'private-command-'));try{await assert.rejects(runPrivateCommand('/nonexistent-mcpapp-command',[],{cwd}),/exit null/);}finally{await fs.rm(cwd,{recursive:true,force:true});}});

test('timeout kills a TERM-resistant grandchild after the parent closes', {skip:process.platform==='win32'}, async()=>{
 const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'private-command-grandchild-'));const pidFile=path.join(cwd,'grandchild.pid');let pid;
 const grandchild=`process.on('SIGTERM',()=>{});require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>{},1000)`;
 const parent=`require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{stdio:'ignore'});setInterval(()=>{},1000)`;
 try{
  await assert.rejects(runPrivateCommand(process.execPath,['-e',parent],{cwd,timeoutMs:1000,graceMs:100}),/signal SIGTERM/);
  pid=Number(await fs.readFile(pidFile,'utf8'));assert.ok(Number.isSafeInteger(pid)&&pid>1);
  let alive=true;for(let i=0;i<20&&alive;i++){try{process.kill(pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}if(alive)await new Promise(r=>setTimeout(r,50));}
  assert.equal(alive,false,'grandchild must not survive timeout cleanup');
 }finally{if(!pid)try{pid=Number(await fs.readFile(pidFile,'utf8'));}catch{}if(pid)try{process.kill(pid,'SIGKILL');}catch{}await fs.rm(cwd,{recursive:true,force:true});}
});

for(const exitCode of [0,7])test(`split credentials and interleaved streams stay out of console and artifacts (exit ${exitCode})`,async()=>{
 const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'private-command-split-'));const secret='synthetic-cross-chunk-credential';let output='';const stdout=process.stdout.write,stderr=process.stderr.write;
 // Each stream contains a complete secret across chunks; the two streams deliberately interleave.
 const code=`process.stdout.write(process.env.GH_TOKEN.slice(0,10));setTimeout(()=>{process.stderr.write(process.env.GH_TOKEN.slice(0,12));setTimeout(()=>{process.stdout.write(process.env.GH_TOKEN.slice(10)+'\\n');setTimeout(()=>{process.stderr.write(process.env.GH_TOKEN.slice(12)+'\\n');process.exit(${exitCode})},20)},20)},20)`;
 try{
  process.stdout.write=process.stderr.write=function(chunk,encoding,callback){output+=String(chunk);if(typeof encoding==='function')encoding();else if(typeof callback==='function')callback();return true;};
  try{const promise=runPrivateCommand(process.execPath,['-e',code],{cwd,env:{...process.env,GH_TOKEN:secret}});if(exitCode)await assert.rejects(promise,/exit 7/);else await promise;}finally{process.stdout.write=stdout;process.stderr.write=stderr;}
  if(exitCode){const dir=path.join(cwd,'reports/private-preview-logs');const files=await fs.readdir(dir);assert.equal(files.length,1);output+=await fs.readFile(path.join(dir,files[0]),'utf8');}
  assert.ok(!output.includes(secret));assert.ok(!output.includes(secret.slice(0,10)));assert.ok(!output.includes(secret.slice(12)));assert.match(output,/REDACTED/);
 }finally{process.stdout.write=stdout;process.stderr.write=stderr;await fs.rm(cwd,{recursive:true,force:true});}
});
