import {generatePrivateLegacy} from './private-legacy.mjs';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import {createWranglerD1} from './wrangler-d1.mjs';import {readPublicationState} from './publication-state.mjs';
// Explicit bridge for already-deployed private legacy backend and authoritative D1 data.
// Does not silently build/deploy legacy under frontend name and does not apply migrations.
await new Promise((ok,no)=>{const p=spawn('npm',['run','build'],{stdio:'inherit'});p.once('error',no);p.once('exit',code=>code===0?ok():no(Error('Private backend build failed')));});
for(const testFile of ['tests/backend-publication.integration.mjs','tests/backend-release.integration.mjs']) {
 await new Promise((ok,no)=>{const p=spawn(process.execPath,[testFile],{stdio:'inherit'});p.once('error',no);p.once('exit',code=>code===0?ok():no(Error('Built backend integration failed: '+testFile)));});
}
await generatePrivateLegacy(process.cwd(),process.env.GITHUB_SHA??'');
const current=await readPublicationState(createWranglerD1());if(current.phase!=='ready')throw Error('Current catalog is not ready; retry after writer completion');
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mcpapp-release-receipt-'));const pointer=path.join(directory,'pointer.json');
async function run(args){await new Promise((ok,no)=>{const p=spawn(process.execPath,['scripts/astro-publisher.mjs',...args],{stdio:'inherit'});p.once('error',no);p.once('exit',code=>code===0?ok():no(Error('Release stage failed')));});}
try{await run(['prepare','--marker-id',current.id,'--receipt-out',pointer]);const prepared=JSON.parse(await fs.readFile(pointer));await run(['activate','--marker-id',current.id,'--receipt',prepared.receiptPath]);}finally{await fs.rm(directory,{recursive:true,force:true});}
