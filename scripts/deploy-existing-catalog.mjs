import {validateCiPreparedPointer,runCanonicalPhase} from './ci-prepared-pointer.mjs';
import {inspectPublicBaseline} from './public-baseline-preflight.mjs';
import {preflightExistingCatalog} from './preflight-existing-catalog.mjs';
import {releaseExitCode} from './pending-release.mjs';
import {generatePrivateLegacy} from './private-legacy.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';import {createWranglerD1} from './wrangler-d1.mjs';import {readPublicationState} from './publication-state.mjs';
// Explicit bridge for already-deployed private legacy backend and authoritative D1 data.
// Does not silently build/deploy legacy under frontend name and does not apply migrations.
const phase=process.env.MCPAPP_DEPLOY_PHASE??'all';if(!['all','prepare','activate'].includes(phase))throw Error('Invalid canonical deployment phase');
const pointer=path.resolve('reports/ci-prepared-pointer.json');
async function run(args){return await new Promise((ok,no)=>{const p=spawn(process.execPath,['scripts/astro-publisher.mjs',...args],{stdio:'inherit'});p.once('error',no);p.once('exit',code=>{try{ok(releaseExitCode(code));}catch(error){no(error);}});});}
await runCanonicalPhase(phase,{prepare:async()=>{
await preflightExistingCatalog();
const baselinePreflight=await inspectPublicBaseline();await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/public-baseline-preflight.json',JSON.stringify(baselinePreflight,null,2));if(!baselinePreflight.allChecksAccepted)throw Error('Public baseline preflight failed before build; see safe report');
await new Promise((ok,no)=>{const p=spawn('npm',['run','build'],{stdio:'inherit'});p.once('error',no);p.once('exit',code=>code===0?ok():no(Error('Private backend build failed')));});
for(const testFile of ['tests/backend-publication.integration.mjs','tests/backend-release.integration.mjs','tests/backend-removals.integration.mjs']) {
 await new Promise((ok,no)=>{const p=spawn(process.execPath,[testFile],{stdio:'inherit'});p.once('error',no);p.once('exit',code=>code===0?ok():no(Error('Built backend integration failed: '+testFile)));});
}
await generatePrivateLegacy(process.cwd(),process.env.GITHUB_SHA??'');
const current=await readPublicationState(createWranglerD1());if(current.phase!=='ready')throw Error('Current catalog is not ready; retry after writer completion');
await fs.mkdir('reports',{recursive:true});
const temporary=pointer+'.raw';
const preparedStatus=await run(['prepare','--marker-id',current.id,'--receipt-out',temporary]);if(preparedStatus!==0)throw Error('Preparation did not produce a deployable artifact');
const prepared={...JSON.parse(await fs.readFile(temporary)),sourceSha:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT};
validateCiPreparedPointer(prepared,{repo:process.cwd(),sourceSha:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT});
await fs.writeFile(pointer,JSON.stringify(prepared,null,2),{flag:'wx'});await fs.rm(temporary);
},activate:async()=>{
const prepared=validateCiPreparedPointer(JSON.parse(await fs.readFile(pointer)),{repo:process.cwd(),sourceSha:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT});
process.exitCode=await run(['activate','--marker-id',prepared.markerId,'--receipt',prepared.receiptPath]);
}});
