import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
const hash=b=>crypto.createHash('sha256').update(b).digest();
async function writeOnce(file,value){const text=JSON.stringify(value,null,2)+'\n';try{await fs.writeFile(file,text,{flag:'wx'});}catch(e){if(e.code!=='EEXIST'||await fs.readFile(file,'utf8')!==text)throw Error('Activation config already differs; refusing mutation');}}
export async function verifyShards(receipt){
 const keys=receipt.shards.mode==='eight'?['en','es','fr','de','ru','zh-hans','ja','ko']:receipt.shards.mode==='two'?['west','east']:[];if(!keys.length)throw Error('Explicit shard topology required');
 for(const [key,expected] of Object.entries(receipt.shards.shards)){
  if(!keys.includes(key)||expected.service!==`mcpapp-static-${receipt.shards.release}-${key}`)throw Error('Immutable shard identity invalid');
  const root=path.join(receipt.shardDir,key,'assets');const files=[];async function walk(p){for(const e of (await fs.readdir(p,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const f=path.join(p,e.name);if(e.isSymbolicLink())throw Error('Shard symlink refused');if(e.isDirectory())await walk(f);else if(e.isFile())files.push(f);}}await walk(root);const digest=crypto.createHash('sha256');for(const f of files){digest.update(path.relative(root,f).split(path.sep).join('/')+'\0');digest.update(hash(await fs.readFile(f)));}
  if(files.length>19000)throw Error('Shard exceeds conservative free-plan asset limit');
  if(digest.digest('hex')!==expected.sha256||files.length!==expected.files)throw Error(`Shard ${key} changed after preparation`);
  const c=JSON.parse(await fs.readFile(path.join(receipt.shardDir,key,'wrangler.json'),'utf8'));if(c.name!==expected.service||c.workers_dev!==false||c.preview_urls!==false||c.routes?.length)throw Error('Static shard is not private/immutable');
 }
 if(Object.keys(receipt.shards.shards).length!==keys.length)throw Error('Incomplete immutable shard topology');
}
export async function generateActivationPlan(config,receipt,audit){
 if(config.frontendName!=='mcpapp'||config.legacyService!=='mcpapp-legacy')throw Error('Explicit reviewed frontend/private-legacy names required');
 const db=config.frontendD1;if(!db||db.binding!=='DB'||typeof db.database_name!=='string'||!/^[a-f0-9-]{36}$/.test(db.database_id))throw Error('Reviewed frontend D1 resource binding required');
 if(typeof receipt.snapshot?.publicationContentRevision!=='string'||!receipt.snapshot.publicationContentRevision)throw Error('Content revision required');
 await verifyShards(receipt);
 const code=Buffer.concat([await fs.readFile(path.join(receipt.releaseDir,'work/worker/edge-entry.mjs')),Buffer.from('\0'),await fs.readFile(path.join(receipt.releaseDir,'work/sharding/asset-binding.mjs'))]);if(hash(code).toString('hex')!==receipt.frontendCodeSha256)throw Error('Frontend code changed after prepare');
 if(hash(JSON.stringify(audit)).toString('hex')!==receipt.auditSha256)throw Error('Audited routes changed after prepare');
 if(audit.sourceCommit!==receipt.sourceCommit||!Array.isArray(audit.explicitUrls))throw Error('Audit changed');
 const exact=[...new Set(audit.explicitUrls.map(p=>p.replace(/^\/(es|fr|de|ru|zh-hans|ja|ko)(?=\/|$)/,'')||'/'))].sort();
 const directory=path.join(receipt.releaseDir,'activation');await fs.mkdir(directory,{recursive:true});
 await writeOnce(path.join(directory,'internal-route-set.json'),exact);
 const entry="import edge from '../work/worker/edge-entry.mjs';\nimport exact from './internal-route-set.json' with {type:'json'};\nconst ASTRO_ROUTE_SET=new Set(exact);\nexport default {fetch(request,env,ctx){return edge.fetch(request,{...env,ASTRO_ROUTE_SET},ctx);}};\n";
 const entryFile=path.join(directory,'front-entry.mjs');try{await fs.writeFile(entryFile,entry,{flag:'wx'});}catch(e){if(e.code!=='EEXIST'||await fs.readFile(entryFile,'utf8')!==entry)throw e;}
 const front={name:'mcpapp',main:entryFile,compatibility_date:'2026-04-23',workers_dev:false,preview_urls:false,d1_databases:[db],services:[{binding:'LEGACY',service:'mcpapp-legacy'},...Object.entries(receipt.shards.shards).map(([key,value])=>({binding:`STATIC_${key.toUpperCase().replaceAll('-','_')}`,service:value.service}))],vars:{STATIC_SHARD_MODE:receipt.shards.mode,DENIED_PATHS:JSON.stringify(config.blockedPaths),SNAPSHOT_MARKER_ID:receipt.markerId,SNAPSHOT_CONTENT_REVISION:receipt.snapshot.publicationContentRevision,SNAPSHOT_CREATED_AT:String(Date.parse(receipt.snapshot.createdAt)),SNAPSHOT_MAX_AGE_MS:'86400000'}};
 if(config.frontendRoutes!==undefined){if(!Array.isArray(config.frontendRoutes))throw Error('Reviewed frontendRoutes must be explicit array');front.routes=config.frontendRoutes;}
 const frontConfig=path.join(directory,'front.wrangler.json');await writeOnce(frontConfig,front);
 await writeOnce(path.join(directory,'legacy-private.fragment.json'),{name:'mcpapp-legacy',workers_dev:false,preview_urls:false,routes:[],note:'Apply to separately built actual-source backend with preserved DB/KV/R2/secrets; not a deployable standalone config.'});
 const plan={frontConfig,shardConfigs:Object.keys(receipt.shards.shards).map(key=>path.join(receipt.shardDir,key,'wrangler.json')),frontendName:'mcpapp',legacyService:'mcpapp-legacy',markerId:receipt.markerId,contentRevision:receipt.snapshot.publicationContentRevision,artifactId:receipt.artifactId,activationEligible:config.activationEnabled===true&&config.privateLegacyDeploymentEnabled===true&&Array.isArray(config.frontendRoutes)};
 await writeOnce(path.join(directory,'plan.json'),plan);return plan;
}
// Effects injected for unit testing; real CLI invokes this only after explicit reviewed configuration.
export async function activatePlan(plan,effects){
 if(!plan.activationEligible)throw Error('Activation requires reviewed frontend routes and explicit private legacy deployment');
 await effects.assertReady(plan.markerId,plan.contentRevision);
 for(const file of plan.shardConfigs){await effects.deployShard(file);await effects.verifyShard(file);}
 await effects.assertReady(plan.markerId,plan.contentRevision);
 await effects.verifyCandidate(plan.frontConfig);
 await effects.assertReady(plan.markerId,plan.contentRevision);
 const previous=await effects.capturePrevious();
 try{
  await effects.deployFront(plan.frontConfig); // Front switches last.
  await effects.assertReady(plan.markerId,plan.contentRevision);
  await effects.verifyFront(plan.frontConfig);
 }catch(error){
  if(error?.code==='EXTERNAL_FRONTEND_CHANGED')throw error; // Never revert an external writer.
  if(error?.code==='PUBLIC_BROWSER_VERIFICATION_PENDING'&&error.sameConfirmedBaseline===true&&error.browserTicketCreated===true)throw error; // Exempt only a persisted exact-release ticket for the same confirmed baseline.
  try{await effects.rollbackFront(previous);await effects.verifyPrevious(previous);}catch(rollbackError){throw new AggregateError([error,rollbackError],'Frontend activation failed AND rollback verification failed; urgent intervention required');}
  throw new Error('Frontend activation failed; previous version restored; available health observations recorded',{cause:error});
 }
 return {activated:true,artifactId:plan.artifactId};
}
