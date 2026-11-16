#!/usr/bin/env node
import {spawnSync} from 'node:child_process';import path from 'node:path';
// Workers Builds is validation-only. GitHub is the single canonical deployment owner.
if(process.env.WORKERS_CI==='1'){
 const sha=process.env.WORKERS_CI_COMMIT_SHA;if(!/^[a-f0-9]{40}$/.test(sha??''))throw Error('Workers Builds commit identity missing');
 const result=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});if(result.status!==0||result.stdout.trim()!==sha)throw Error('Workers Builds checkout mismatch');
 console.log('Validation only: checkout identity verified. Deployment belongs to canonical GitHub workflow; this Workers Builds success is NOT a deployment receipt.');
 process.exit(0);
}
if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REF!=='refs/heads/main'||!process.env.GITHUB_SHA)throw Error('Deployment entry is restricted to canonical GitHub main workflow; use reviewed explicit release CLI for manual activation');
const config=process.env.ASTRO_PUBLICATION_CONFIG;if(!config||!path.isAbsolute(config))throw Error('Reviewed ASTRO_PUBLICATION_CONFIG required');
// Full catalog synchronization belongs to daily ingestion, not a second CI writer.
// CI builds the already-authoritative public snapshot. No seed/import is repeated here.
const result=spawnSync(process.execPath,['scripts/deploy-existing-catalog.mjs'],{stdio:'inherit'});if(result.error||result.status!==0)throw Error('Canonical release failed; no deployment success claimed');
