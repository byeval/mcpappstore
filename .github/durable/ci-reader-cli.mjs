import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {collectDurableScans} from './ci-reader.mjs';
const [input]=process.argv.slice(2);if(!input||process.argv.length!==3)throw Error('Usage: node ci-reader-cli.mjs pinned-plan.json');
const digest=b=>createHash('sha256').update(b).digest('hex');
const raw=await fs.readFile(input),sha=digest(raw);if(sha!==process.env.EXPECTED_PLAN_SHA256)throw Error('External plan hash required');
const workflowCommit=process.env.GITHUB_SHA,runId=process.env.GITHUB_RUN_ID;
if(!/^[a-f0-9]{40}$/.test(workflowCommit??'')||!/^\d{1,20}$/.test(runId??''))throw Error('CI provenance required');
const provenance={workflowCommit,runId,inputPlanSha256:sha,readerSourceSha256:digest(await fs.readFile(new URL('ci-reader.mjs',import.meta.url))),readerCliSha256:digest(await fs.readFile(new URL('ci-reader-cli.mjs',import.meta.url))),validatorSourceSha256:digest(await fs.readFile(new URL('validator.mjs',import.meta.url)))};
// Fixed output, exclusively created before queries; no existing file or symlink accepted.
const out=await fs.open('report.json','wx',0o600);let result;
try{result={...await collectDurableScans(JSON.parse(raw),{accountId:process.env.CLOUDFLARE_ACCOUNT_ID,apiToken:process.env.CLOUDFLARE_API_TOKEN}),...provenance};}
catch(e){result={kind:'durable-query-receipts-v2',qualification:false,complete:false,...provenance,failure:typeof e.code==='string'&&/^[A-Z0-9_]+$/.test(e.code)?e.code:'FAILED',attemptsSummary:e.attemptsSummary??[],attemptReceipts:e.attemptReceipts??[]};process.exitCode=1;}
finally{await out.writeFile(JSON.stringify(result,null,2));await out.sync();await out.close();}
console.log(JSON.stringify({written:true,qualification:false,failed:!!result.failure}));
