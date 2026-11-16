// Clean-checkout gate: only PUBLIC_SNAPSHOT and an already-built dist/server are required.
// Original serializers are checked-in immutable fixtures, not git-history/macOS paths.
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
if(!process.env.PUBLIC_SNAPSHOT)throw Error('PUBLIC_SNAPSHOT required');
if(!existsSync(resolve('dist/server/index.js')))throw Error('Build combined candidate before native export gate');
const dir=mkdtempSync(join(tmpdir(),'mcpapp-export-gate-'));
try{
 const env={...process.env,SITE_URL:'https://mcpapp.net',PUBLIC_SNAPSHOT:resolve(process.env.PUBLIC_SNAPSHOT),EXPORT_EXPECTATIONS:join(dir,'expected-bodies.json')};
 for(const args of [['--import','tsx','--test','tests/backend-export-parity.test.ts'],['tests/backend-export.integration.mjs']]){
  const result=spawnSync(process.execPath,args,{env,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw Error(`Export gate subprocess failed (${result.status??result.signal}): ${args.join(' ')}`);
 }
 console.log('PASS clean-checkout native export gate: original-source expectations generated in-run, exact cold/warm bodies');
}finally{rmSync(dir,{recursive:true,force:true});}
