// Advisory read-only preflight before expensive builds. Activation repeats all gates
// under its deployment lease; this result is never accepted as deployment evidence.
import fs from 'node:fs/promises';import path from 'node:path';import {spawnSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {resolvePublisherConfig} from './astro-publisher-core.mjs';
import {captureRollbackMetadata} from './frontend-rollback.mjs';
import {selectProductionSlot} from './production-slot-plan.mjs';
import {wranglerJson} from './release-control.mjs';
import {createWranglerD1} from './wrangler-d1.mjs';
import {readPublicationState} from './publication-state.mjs';
import {createWranglerHybridRegistry,requireVerifiedHybrid} from './verified-hybrid-registry.mjs';
import {captureReleaseRuntime} from './data-only-runtime.mjs';
import {evidenceHash} from './data-only-verification.mjs';
export function preflightLiveState(expected,runtime,publication,shards){return {sourceCommit:expected.sourceCommit,frontVersion:runtime.frontVersion,backendVersion:runtime.backendVersion,markerId:publication.id,contentRevision:publication.contentRevision,publicationPhase:publication.phase,shards,runtimeDigest:evidenceHash(runtime)};}
import {readRecoveryOrigin} from './recovery-origin.mjs';
import {reviewedTreeDigest,validateUnverifiedHybridTransition,TRANSITION_PATH} from './unverified-hybrid-transition.mjs';
export async function preflightExistingCatalog({configFile=process.env.ASTRO_PUBLICATION_CONFIG,effects={}}={}){
 if(!configFile)throw Error('Explicit publication config required');configFile=path.resolve(configFile);
 const readFile=effects.readFile??fs.readFile;
 const config=resolvePublisherConfig(JSON.parse(await readFile(configFile)),path.dirname(configFile)),repo=config.actualSourceRepo;
 const git=effects.git??(args=>{const r=spawnSync('git',args,{cwd:repo,encoding:'utf8',timeout:30000});if(r.status!==0)throw Error('Preflight source unavailable');return r.stdout.trim();});
 const sourceCommit=git(['rev-parse','HEAD']);if(git(['ls-remote','origin','refs/heads/main']).split(/\s+/)[0]!==sourceCommit)throw Error('Preflight source is not current main');
 const capture=effects.capture??(service=>{const deployments=wranglerJson(['deployments','list','--name',service,'--json'],repo);const latest=[...deployments].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0];const version=wranglerJson(['versions','view',latest?.versions?.[0]?.version_id??'invalid','--name',service,'--json'],repo);return captureRollbackMetadata(deployments,version);});
 const front=capture('mcpapp');selectProductionSlot(front);
 if(!front.bindings.some(b=>b.type==='service'&&b.service==='mcpapp-legacy'))return {advisory:true,kind:'legacy-prior',verified:false};
 const backend=capture('mcpapp-legacy'),registry=await (effects.registry??createWranglerHybridRegistry)(repo);
 if(await registry.get(front.versionId)){await requireVerifiedHybrid(registry,front,backend.versionId);return {advisory:true,kind:'verified-hybrid-prior'};}
 if(config.failurePolicy!=='retain-unverified')throw Error('Verified predecessor required');
 const expected=JSON.parse(await readFile(path.join(repo,'scripts/recovery-44301051564.expected.json'))),record=JSON.parse(await readFile(path.join(repo,TRANSITION_PATH))),origin=(effects.origin??readRecoveryOrigin)(expected);
 const publication=await (effects.publication??(()=>readPublicationState(createWranglerD1({cwd:repo}))))();
 const runtime=await (effects.runtime??captureReleaseRuntime)({repo,config,sourceCommit:expected.sourceCommit,publication});
 const shards=expected.shards.map(s=>({...s,versionId:capture(s.service).versionId}));
 validateUnverifiedHybridTransition(record,{expected,origin,diagnostic:await readFile(path.join(repo,'release-evidence/current-451-diagnostic.json')),front,sourceCommit,targetTreeDigest:(effects.treeDigest??reviewedTreeDigest)(repo,sourceCommit),isAncestor:effects.isAncestor??(commit=>spawnSync('git',['merge-base','--is-ancestor',commit,sourceCommit],{cwd:repo}).status===0),live:preflightLiveState(expected,runtime,publication,shards)});
 if(backend.versionId!==expected.backendVersion)throw Error('Preflight backend changed');
 return {advisory:true,kind:'unverified-hybrid-prior',verified:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await preflightExistingCatalog()));
