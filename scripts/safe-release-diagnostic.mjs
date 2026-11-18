import fs from 'node:fs/promises';
import path from 'node:path';
const codes = new Set(['D1_COMMAND_FAILED','ENOENT','EACCES','ENOSPC','ENOMEM','ETIMEDOUT','ENOBUFS','EXTERNAL_FRONTEND_CHANGED','PUBLIC_BROWSER_VERIFICATION_PENDING','PUBLIC_BROWSER_VERIFICATION_REQUIRED']);
const names = new Set(['Error','TypeError','SyntaxError','RangeError','AggregateError','AssertionError']);
const stages = new Set(['prepare','activate','plan']);
// Deliberately no message, stack, arguments, SQL, stdout/stderr or raw cause.
export function safeReleaseDiagnostic(error,{stage,sourceCommit,frontWasDeployed=false}={}) {
  const chain=[];const seen=new Set();
  for(let e=error;e&&chain.length<4&&!seen.has(e);e=e.cause){seen.add(e);chain.push({name:names.has(e.name)?e.name:'Error',code:codes.has(e.code)?e.code:null,...(Number.isInteger(e.releaseExitCode)?{exitCode:e.releaseExitCode}:{}),...(Number.isFinite(e.releaseElapsedMs)&&e.releaseElapsedMs>=0?{elapsedMs:e.releaseElapsedMs}:{})});}
  return {version:1,kind:'release-failure-diagnostic',verified:false,stage:stages.has(stage)?stage:'unknown',sourceCommit:/^[a-f0-9]{40}$/.test(sourceCommit??'')?sourceCommit:null,frontDeployCommandCompleted:frontWasDeployed===true,errors:chain,at:new Date().toISOString()};
}
export async function writeSafeReleaseDiagnostic(root,error,context){const report=safeReleaseDiagnostic(error,context);const dir=path.join(root,'reports');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'release-failure-diagnostic.json'),JSON.stringify(report,null,2),{mode:0o600});return report;}
