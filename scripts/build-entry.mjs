import {spawn} from 'node:child_process';
if(process.env.WORKERS_CI==='1')throw Error('Workers Builds cannot build deployable legacy output: its configured direct Wrangler deploy can bypass the canonical release bridge. Verify external build/deploy settings before enabling this job.');
const child=spawn('npx',['--no-install','vinext','build'],{stdio:'inherit'});child.once('error',()=>process.exitCode=1);child.once('exit',code=>process.exitCode=code??1);
