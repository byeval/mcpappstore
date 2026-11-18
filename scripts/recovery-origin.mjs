import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const repo='byeval/mcpappstore',runId='44301051564',artifactId=14432370516;
export function assertRecoveryOrigin(expected,{run,artifact,diagnostic,retained}){
 if(expected.originalRunId!==runId||String(run.id)!==runId||run.repository?.full_name!==repo||run.head_sha!==expected.sourceCommit||run.path!=='.github/workflows/deploy.yml'||run.status!=='completed'||run.conclusion!=='failure')throw Error('Original deployment run identity mismatch');
 if(artifact.id!==artifactId||artifact.expired!==false||artifact.name!=='browser-resolution-'+expected.sourceCommit||artifact.workflow_run?.id!==Number(runId)||artifact.workflow_run?.head_sha!==expected.sourceCommit)throw Error('Original deployment artifact identity mismatch');
 if(diagnostic.sourceCommit!==expected.sourceCommit||diagnostic.stage!=='activate'||diagnostic.releasePhase!=='public-verification'||diagnostic.frontDeployCommandCompleted!==true||retained.sourceCommit!==expected.sourceCommit||retained.observedFrontVersion!==expected.frontVersion||retained.frontWasDeployed!==true||retained.verified!==false||retained.rolledBack!==false||retained.uploadedVersions?.['mcpapp-legacy']!==expected.backendVersion)throw Error('Original deployment artifact evidence mismatch');
 if(Object.keys(retained.uploadedVersions).length!==9||expected.shards.some(s=>retained.uploadedVersions[s.service]!==s.versionId))throw Error('Original deployment shard evidence mismatch');
 return {repository:repo,runId,artifactId,artifactDigest:artifact.digest,sourceCommit:run.head_sha,diagnostic,retained};
}
export function readRecoveryOrigin(expected,{command=spawnSync}={}){
 function gh(endpoint,binary=false){const r=command('gh',['api',`repos/${repo}/${endpoint}`],{encoding:binary?undefined:'utf8',timeout:60000,maxBuffer:1024*1024});if(r.error||r.status!==0)throw Error('Original deployment evidence unavailable');return binary?r.stdout:JSON.parse(r.stdout);}
 const run=gh(`actions/runs/${runId}`),artifact=gh(`actions/artifacts/${artifactId}`),archive=gh(`actions/artifacts/${artifactId}/zip`,true);
 if(artifact.digest!=='sha256:'+createHash('sha256').update(archive).digest('hex'))throw Error('Original artifact archive digest mismatch');
 const python=`import sys,io,zipfile,json\nz=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))\nnames=['release-failure-diagnostic.json','retained-unverified-failure.json']\nif sorted(z.namelist())!=sorted(names) or any(i.file_size>65536 for i in z.infolist()): raise ValueError('Unexpected artifact')\nprint(json.dumps({'diagnostic':json.loads(z.read(names[0])),'retained':json.loads(z.read(names[1]))}))`;
 const parsed=command('python3',['-c',python],{input:archive,encoding:'utf8',timeout:10000,maxBuffer:131072});if(parsed.error||parsed.status!==0)throw Error('Original artifact parsing failed');
 return assertRecoveryOrigin(expected,{run,artifact,...JSON.parse(parsed.stdout)});
}
