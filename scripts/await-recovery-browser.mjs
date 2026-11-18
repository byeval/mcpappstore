// Verification-only delivery. Never invokes a deployment or rollback.
import fs from 'node:fs/promises';
import path from 'node:path';
import {readAnchorBrowserObservations} from './anchor-browser-delivery.mjs';
import {validateBrowserObservations} from './public-baseline-policy.mjs';
import {runPrivateCommand} from './private-command.mjs';
const args=process.argv.slice(2);
function arg(name){const i=args.indexOf(name),value=args[i+1];if(i<0||!path.isAbsolute(value??''))throw Error('Explicit absolute '+name+' required');return value;}
const ticketFile=arg('--ticket'),expected=arg('--expected'),output=arg('--output');
const ticket=JSON.parse(await fs.readFile(ticketFile));
if(ticket.kind!=='current-state-recovery'||process.env.GITHUB_ACTIONS!=='true')throw Error('Exact recovery CI required');
// Proof branch descends from verifier code, while ticket pins original deployed source.
while(Date.now()<ticket.expiresAt){
 const delivery=await readAnchorBrowserObservations({repository:process.env.GITHUB_REPOSITORY,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,sourceCommit:process.env.GITHUB_SHA,kind:'astro-release',token:process.env.GH_TOKEN});
 if(delivery){
  validateBrowserObservations(ticket,delivery.proof);
  const proof=output+'.observations.json';
  await fs.writeFile(proof,JSON.stringify(delivery.proof),{flag:'wx',mode:0o600});
  await fs.writeFile(output+'.delivery.json',JSON.stringify({commit:delivery.commit,ref:delivery.ref,verifierCommit:process.env.GITHUB_SHA,deployedSource:ticket.buildCommit}),{flag:'wx'});
  await runPrivateCommand(process.execPath,['scripts/verify-current-release.mjs','--expected',expected,'--ticket',ticketFile,'--observations',proof,'--output',output],{cwd:process.cwd(),timeoutMs:Math.min(20*60*1000,ticket.expiresAt-Date.now()),label:'current-release-verification'});
  const result=JSON.parse(await fs.readFile(output));if(result.verified!==true)throw Error('Recovery verification not confirmed');
  console.log(JSON.stringify({verified:true,deploy:false,rollback:false}));process.exit(0);
 }
 await new Promise(resolve=>setTimeout(resolve,10000));
}
throw Error('Recovery browser ticket expired; current release retained unverified');
