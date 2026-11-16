import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export function resolvePublisherConfig(c,configDirectory){
 const out={...c};for(const key of ['astroProject','releaseRoot','auditRoutesFile','actualSourceRepo'])if(typeof out[key]==='string')out[key]=path.resolve(configDirectory,out[key]);return validatePublisherConfig(out);
}
export function validatePublisherConfig(c){
 for(const key of ['astroProject','releaseRoot','auditRoutesFile','actualSourceRepo'])if(typeof c?.[key]!=='string'||!path.isAbsolute(c[key]))throw Error(`Absolute ${key} required`);
 if(c.releaseRoot===c.astroProject||c.releaseRoot.startsWith(c.astroProject+path.sep))throw Error('Release root must be outside Astro source');
 if(typeof c.sourceCommit!=='string'||!/^[a-f0-9]{7,40}$/.test(c.sourceCommit)||!Array.isArray(c.blockedPaths))throw Error('Reviewed sourceCommit and blockedPaths required');
 if(![undefined,'two','eight'].includes(c.shardMode))throw Error('Invalid shard mode');return c;
}
export async function fileDigest(root){const files=[];async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Symlink in artifact');if(e.isDirectory())await walk(f);else if(e.isFile())files.push(f);}}await walk(root);const digest=crypto.createHash('sha256');for(const f of files.sort()){digest.update(path.relative(root,f).split(path.sep).join('/')+'\0');digest.update(hash(await fs.readFile(f)));}return {sha256:digest.digest('hex'),files:files.length};}
export async function stageAuditedAssets(buildDir,outputDir,audit,blockedPaths){
 if(!Array.isArray(audit.explicitUrls)||!audit.explicitUrls.length||new Set(audit.explicitUrls).size!==audit.explicitUrls.length)throw Error('Explicit audited URL list required');
 await fs.mkdir(outputDir);for(const p of audit.explicitUrls){if(typeof p!=='string'||!p.startsWith('/')||p.includes('..')||/[?#%\\\0]/.test(p)||blockedPaths.includes(p))throw Error('Invalid or removed audited route');const rel=p.replace(/^\//,'');const file=path.join(buildDir,rel,'index.html');const html=await fs.readFile(file,'utf8');if(!html.includes(`href="https://mcpapp.net${p}"`))throw Error(`Canonical mismatch ${p}`);const out=path.join(outputDir,rel,'index.html');await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,html,{flag:'wx'});}
 for(const item of ['_astro','favicon.ico','icon.svg','apple-touch-icon.png','404.html']){try{await fs.cp(path.join(buildDir,item),path.join(outputDir,item),{recursive:true,errorOnExist:true,force:false});}catch(e){if(e.code!=='ENOENT')throw e;}}
 return fileDigest(outputDir);
}
// Explicit dependency-injected I/O enables testing without credentials or deployments.
export async function prepareRelease(config,markerId,effects){
 validatePublisherConfig(config);if(!/^[a-z0-9-]{20,}$/i.test(markerId))throw Error('Invalid marker id');
 let audit=JSON.parse(await fs.readFile(config.auditRoutesFile,'utf8'));if(audit.sourceCommit!==config.sourceCommit)throw Error('Audit source revision mismatch');
 await effects.assertReady(markerId);
 const snapshot=await effects.exportSnapshot();if(snapshot.manifest.publicationMarkerId!==markerId||snapshot.manifest.mode!=='authoritative-d1'||snapshot.manifest.sourceCommit!==config.sourceCommit||!snapshot.manifest.publicationContentRevision)throw Error('Snapshot identity mismatch');
 if(effects.expandAudit)audit=await effects.expandAudit(audit,snapshot);
 const artifactId=`${markerId.slice(0,12)}-${crypto.randomUUID()}`;
 const releaseDir=path.join(config.releaseRoot,artifactId);await fs.mkdir(config.releaseRoot,{recursive:true});await fs.mkdir(releaseDir); // immutable; no overwrite
 const work=path.join(releaseDir,'work');
 try{
  await effects.stageProject(work);
  await fs.mkdir(path.join(work,'evidence'),{recursive:true});await fs.writeFile(path.join(work,'evidence/current-source-audited-routes.json'),JSON.stringify(audit));
  const dataDir=path.join(work,'src/data');await fs.mkdir(dataDir,{recursive:true});await fs.writeFile(path.join(dataDir,'catalog.json'),JSON.stringify(snapshot.catalog));await fs.writeFile(path.join(dataDir,'manifest.json'),JSON.stringify(snapshot.manifest,null,2));
  await effects.build(work);
  const assets=path.join(releaseDir,'audited-assets');const digest=await stageAuditedAssets(path.join(work,'dist-audited'),assets,audit,snapshot.manifest.blockedPaths??[]);
  await effects.assertReady(markerId,snapshot.manifest.publicationContentRevision);
  const releaseName=hash(artifactId).slice(0,24);const shardDir=path.join(releaseDir,'shards');await effects.split(work,assets,shardDir,releaseName);
  const shards=JSON.parse(await fs.readFile(path.join(shardDir,'release.json'),'utf8'));
  if(shards.release!==releaseName)throw Error('Shard release identity mismatch');
  for(const value of Object.values(shards.shards))if(!value.service.startsWith(`mcpapp-static-${releaseName}-`))throw Error('Mutable/unexpected shard service');
  const frontendCodeSha256=hash(Buffer.concat([await fs.readFile(path.join(work,'worker/edge-entry.mjs')),Buffer.from('\0'),await fs.readFile(path.join(work,'sharding/asset-binding.mjs'))]));
  const receipt={version:1,frontendCodeSha256,artifactId,releaseDir,receiptPath:path.join(releaseDir,'prepared.json'),markerId,sourceCommit:config.sourceCommit,buildCommit:config.buildCommit??null,snapshot:snapshot.manifest,auditSha256:hash(JSON.stringify(audit)),auditedUrlCount:audit.explicitUrls.length,assets,digest,shardDir,shards,preparedAt:new Date().toISOString(),activationAllowed:false};
  await fs.writeFile(path.join(releaseDir,'prepared.json'),JSON.stringify(receipt,null,2),{flag:'wx'});return receipt;
 }catch(e){await fs.writeFile(path.join(releaseDir,'FAILED.txt'),String(e));throw e;}
}
