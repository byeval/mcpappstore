import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {shardForPath} from './asset-binding.mjs';
const [sourceArg,outputArg,release,mode='two']=process.argv.slice(2);
if(!sourceArg||!outputArg||!release||!/^[a-z0-9-]{1,24}$/.test(release)||!['two','eight'].includes(mode))throw Error('Usage: node sharding/split.mjs DIST OUTPUT NEW_RELEASE_ID [two|eight]');
const source=path.resolve(sourceArg),output=path.resolve(outputArg);
if(output===source||output.startsWith(source+'/')||source.startsWith(output+'/'))throw Error('Source and output must be separate non-nested directories');
await fs.mkdir(output); // Refuse to mutate an existing immutable release.
const keys=mode==='two'?['west','east']:['en','es','fr','de','ru','zh-hans','ja','ko'];
const report={release,mode,source,createdAt:new Date().toISOString(),shards:{},totalSourceFiles:0,totalSourceBytes:0};
for(const key of keys){report.shards[key]={service:`mcpapp-static-${release}-${key}`,files:0,bytes:0,sha256:''};await fs.mkdir(path.join(output,key,'assets'),{recursive:true});}
const hashes=Object.fromEntries(keys.map(k=>[k,createHash('sha256')]));
async function walk(dir){let results=[];for(const e of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const f=path.join(dir,e.name);if(e.isSymbolicLink())throw Error(`Symlink refused ${f}`);if(e.isDirectory())results.push(...await walk(f));else if(e.isFile())results.push(f);}return results;}
try{
 for(const file of await walk(source)){
  const relative=path.relative(source,file).split(path.sep).join('/');
  if(relative==='zh'||relative.startsWith('zh/'))throw Error('Obsolete /zh output: rebuild with the actual zh-hans locale before sharding');
  if(relative.split('/').some(p=>p.startsWith('.')))throw Error(`Unexpected hidden build file ${relative}`);
  const bytes=await fs.readFile(file);if(bytes.length>25*1024*1024)throw Error(`Asset exceeds 25 MiB: ${relative}`);
  const destinations=['404.html','_headers','_redirects'].includes(relative)?keys:[shardForPath('/'+relative,mode)];
  report.totalSourceFiles++;report.totalSourceBytes+=bytes.length;
  for(const key of destinations){const out=path.join(output,key,'assets',relative);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,bytes,{flag:'wx'});const stat=report.shards[key];stat.files++;stat.bytes+=bytes.length;if(stat.files>90000)throw Error(`Shard ${key} exceeds safety threshold 90,000 files`);hashes[key].update(relative+'\0').update(createHash('sha256').update(bytes).digest());}
 }
 for(const key of keys){report.shards[key].sha256=hashes[key].digest('hex');await fs.writeFile(path.join(output,key,'wrangler.json'),JSON.stringify({name:report.shards[key].service,compatibility_date:'2026-11-16',workers_dev:false,preview_urls:false,assets:{directory:'./assets',html_handling:'drop-trailing-slash',not_found_handling:'404-page'}},null,2));}
 await fs.writeFile(path.join(output,'front-bindings.fragment.json'),JSON.stringify({services:keys.map(key=>({binding:`STATIC_${key.toUpperCase().replaceAll('-', '_')}`,service:report.shards[key].service}))},null,2));
 await fs.writeFile(path.join(output,'release.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){await fs.writeFile(path.join(output,'FAILED.txt'),String(error));throw error;}
