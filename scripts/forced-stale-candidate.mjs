import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Local temporary config only: no D1 writes, no prepared artifact mutation, no deployment.
export async function withForcedStaleCandidate(frontConfig,{expectedSha256,assertStable},work){
 await assertStable();const original=await fs.readFile(frontConfig);if(hash(original)!==expectedSha256)throw Error('Candidate source config digest mismatch');const config=JSON.parse(original);
 if(config.name!=='mcpapp'||config.workers_dev!==false||config.preview_urls!==false||!path.isAbsolute(config.main)||!Array.isArray(config.services)||!config.services.some(b=>b.binding==='LEGACY')||!config.vars?.SNAPSHOT_MARKER_ID)throw Error('Exact private candidate runtime required');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mcpapp-forced-stale-'));const temporary=path.join(directory,'front.json');const derived={...config,vars:{...config.vars,SNAPSHOT_MARKER_ID:'forced-stale-'+randomUUID()}};
 try{await fs.writeFile(temporary,JSON.stringify(derived),{flag:'wx',mode:0o600});await assertStable();const result=await work(temporary);await assertStable();if(hash(await fs.readFile(frontConfig))!==expectedSha256)throw Error('Prepared frontend config changed during forced fallback proof');if(JSON.stringify(JSON.parse(await fs.readFile(temporary)))!==JSON.stringify(derived))throw Error('Forced fallback config mutated');return result;}finally{await fs.rm(directory,{recursive:true,force:true});}
}
