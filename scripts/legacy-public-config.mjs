import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

// Only transforms the original compiled public config, never a private or Astro config.
export function publicLegacyConfig(compiled, source) {
 if(compiled?.name!=='mcpapp'||source?.name!=='mcpapp'||compiled.main!=='index.js'||compiled.no_bundle!==true)throw Error('Original compiled mcpapp backend required');
 if(compiled.vars?.MCPAPP_PRIVATE_BACKEND!==undefined||compiled.vars?.MCPAPP_BUILD_COMMIT!==undefined)throw Error('Refuse private backend config as public baseline');
 for(const key of ['routes','workers_dev','compatibility_date','compatibility_flags','d1_databases','kv_namespaces','r2_buckets','images','observability'])if(JSON.stringify(compiled[key])!==JSON.stringify(source[key]))throw Error('Compiled/source binding or route mismatch: '+key);
 if(compiled.assets?.directory!=='../client'||compiled.services?.length)throw Error('Original compiled client assets without service bindings required');
 const result=structuredClone(compiled);
 // Explicit false overrides any previous public-worker variable accidentally left on service.
 result.vars={...compiled.vars,MCPAPP_PRIVATE_BACKEND:'false'};
 delete result.vars.MCPAPP_BUILD_COMMIT;
 return result;
}
async function treeDigest(root){
 const records=[];
 async function walk(dir){for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('Build symlink refused');if(entry.isDirectory()){if(entry.name==='.wrangler')continue;await walk(file);}else if(entry.isFile()){const rel=path.relative(root,file);if(/wrangler.*\.json$/.test(rel))continue;records.push([rel,createHash('sha256').update(await fs.readFile(file)).digest('hex')]);}}}
 await walk(root);if(!records.length)throw Error('Compiled build missing');return {sha256:createHash('sha256').update(JSON.stringify(records)).digest('hex'),files:records.length};
}
export async function generatePublicLegacy(repo,sourceCommit){
 if(!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('Exact source commit required');
 repo=path.resolve(repo);const head=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();if(head!==sourceCommit)throw Error('Source commit does not match checkout');
 const dirty=execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:repo,encoding:'utf8'}).trim();if(dirty)throw Error('Committed clean source required for rollback anchor');
 const configPath=path.join(repo,'dist/server/wrangler.public-legacy.json');
 const compiled=JSON.parse(await fs.readFile(path.join(repo,'dist/server/wrangler.json'),'utf8'));
 const source=JSON.parse(await fs.readFile(path.join(repo,'wrangler.jsonc'),'utf8'));
 const config=publicLegacyConfig(compiled,source);
 const server=await treeDigest(path.join(repo,'dist/server')),client=await treeDigest(path.join(repo,'dist/client'));
 const serialized=JSON.stringify(config,null,2)+'\n';
 await fs.writeFile(configPath,serialized);
 await fs.writeFile(configPath+'.receipt.json',JSON.stringify({version:1,kind:'corrected-public-legacy',sourceCommit,server,client,configSha256:createHash('sha256').update(serialized).digest('hex'),createdAt:new Date().toISOString(),deployed:false},null,2)+'\n');
 return configPath;
}
