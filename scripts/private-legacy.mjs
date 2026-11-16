import fs from 'node:fs/promises';import path from 'node:path';
export async function generatePrivateLegacy(repo,buildCommit){
 if(!/^[a-f0-9]{40}$/.test(buildCommit))throw Error('Exact backend build commit required');
 const original=JSON.parse(await fs.readFile(path.join(repo,'dist/server/wrangler.json'),'utf8'));if(original.name!=='mcpapp'||original.main!=='index.js'||original.assets?.directory!=='../client')throw Error('Unexpected compiled legacy worker layout');
 for(const [key,binding] of [['d1_databases','DB'],['kv_namespaces','KV'],['r2_buckets','BUCKET']])if(!original[key]?.some(v=>v.binding===binding))throw Error('Required backend binding missing');
 const result={...original,name:'mcpapp-legacy',topLevelName:'mcpapp-legacy',workers_dev:false,preview_urls:false,routes:[],vars:{...original.vars,MCPAPP_BUILD_COMMIT:buildCommit,MCPAPP_PRIVATE_BACKEND:'true'}};
 delete result.configPath;delete result.userConfigPath;delete result.definedEnvironments;
 const filename=path.join(repo,'dist/server/wrangler.private.json');await fs.writeFile(filename,JSON.stringify(result,null,2));return filename;
}
export function assertNoSourceSecrets(raw){let value;try{value=JSON.parse(raw);}catch{throw Error('Source worker secrets inventory unavailable');}if(!Array.isArray(value)||value.length)throw Error('Private backend deployment needs separately authorized secret migration; no values read or copied');}
