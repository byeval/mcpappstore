// Local native workerd only. Supply an already-exported public snapshot; never remote D1.
import {readFileSync,readdirSync} from 'node:fs';import{resolve}from'node:path';import assert from'node:assert/strict';import{Miniflare}from'miniflare';import{inspectRenderedBody,boundedResponseBytes}from'../scripts/rendered-body-health.mjs';
if(!process.env.PUBLIC_SNAPSHOT)throw Error('PUBLIC_SNAPSHOT required');
const snapshot=JSON.parse(readFileSync(process.env.PUBLIC_SNAPSHOT,'utf8'));
const modules=['index.js',...readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js'&&!p.startsWith('.wrangler'))].map(p=>({type:'ESModule',path:resolve('dist/server',p)}));
const mf=new Miniflare({modulesRoot:resolve('dist/server'),modules,compatibilityDate:'2026-04-23',compatibilityFlags:['nodejs_compat'],kvNamespaces:['KV'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{SITE_URL:'https://mcpapp.net',ASSET_CDN_URL:'https://cdn.mcpapp.net'}});
try{
console.log('Starting local workerd');const db=await mf.getD1Database('DB');console.log('D1 ready');
for(const name of ['0001_init.sql','0003_app_surfaces.sql','0004_allow_claude_seed_source.sql','0005_expand_claude_connectors.sql','0006_skills.sql','0007_astro_publication_state.sql','0008_astro_content_revision.sql'])await db.exec(readFileSync('migrations/'+name,'utf8').replace(/--[^\n]*/g,'').replace(/\n/g,' '));
const cols=async table=>new Set((await db.prepare('PRAGMA table_info('+table+')').all()).results.map(x=>x.name));const appCols=await cols('apps'),surfaceCols=await cols('app_surfaces');
const snake=s=>s.replace(/[A-Z]/g,m=>'_'+m.toLowerCase());let queue=[];const flush=async()=>{if(queue.length){await db.batch(queue);queue=[];}};
const add=async(table,record)=>{const keys=Object.keys(record);queue.push(db.prepare(`INSERT OR REPLACE INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).bind(...keys.map(k=>record[k])));if(queue.length>=100)await flush();};
for(const c of snapshot.categories)await add('categories',{slug:c.slug,name:c.name,sort:c.sort??0});await flush();
let count=0;
for(const a of snapshot.apps){const record={};for(const[k,v]of Object.entries(a)){const col=snake(k);if(appCols.has(col)&&v!==undefined)record[col]=Array.isArray(v)?JSON.stringify(v):typeof v==='boolean'?Number(v):v;}
record.created_at??=1;record.updated_at??=record.created_at;record.tagline??='';await add('apps',record);
for(const c of a.categories??[])await add('app_categories',{app_id:a.id,category_slug:c});
for(const s of a.surfaces??[]){const row={app_id:a.id};for(const[k,v]of Object.entries(s)){const col=k==='type'?'surface_type':k==='url'?'surface_url':snake(k);if(surfaceCols.has(col)&&v!==undefined)row[col]=Array.isArray(v)?JSON.stringify(v):typeof v==='boolean'?Number(v):v;}row.external_id??='';row.is_primary??=0;row.status??='available';await add('app_surfaces',row);}
if(++count%2000===0)console.log('Seeded',count);
}await flush();
const skillCols=await cols('skills');for(const skill of snapshot.skills??[]){const record={created_at:1,updated_at:1};for(const[k,v]of Object.entries(skill)){const col=snake(k);if(skillCols.has(col)&&v!==undefined)record[col]=Array.isArray(v)?JSON.stringify(v):v;}await add('skills',record);}await flush();
for(const link of snapshot.skillAssociations??[])await add('app_skills',{app_id:link.appId,skill_id:link.skillId,relation_type:link.relationType,reason:link.reason??null,confidence:link.confidence??null,created_at:1,updated_at:1});await flush();
console.log('Seed complete',count,'skills',snapshot.skills?.length,'associations',snapshot.skillAssociations?.length);console.log('Publication state',JSON.stringify(await db.prepare('SELECT revision,content_revision,phase FROM astro_publication_state WHERE id=1').first()));
for(const path of ['/app/canva','/store','/apps','/mcp-servers','/collections/chatgpt-apps-for-design','/category/creativity','/chatgpt-apps','/search?q=canva'])for(const round of ['cold','warm']){
if(round==='cold'){const kv=await mf.getKVNamespace('KV');let cursor;do{const page=await kv.list({cursor});for(const key of page.keys)await kv.delete(key.name);cursor=page.list_complete?undefined:page.cursor;}while(cursor);}
const kv=await mf.getKVNamespace('KV');const keysBefore=(await kv.list()).keys.length;
const start=Date.now();const response=await mf.dispatchFetch('https://mcpapp.net'+path,{redirect:'manual'});if(path==='/apps'){assert.equal(response.status,308);assert.equal(new URL(response.headers.get('location'),'https://mcpapp.net').pathname,'/store');console.log(JSON.stringify({round,path,status:308,redirect:'/store'}));continue;}const bytes=await boundedResponseBytes(response,10000000);const html=new TextDecoder().decode(bytes);const body=inspectRenderedBody(html,path==='/app/canva'?['Canva','Platform surfaces','Information']:[]);console.log(JSON.stringify({round,path,status:response.status,bytes:bytes.length,ms:Date.now()-start,keysBefore,keysAfter:(await kv.list()).keys.length,...body}));assert.equal(response.status,200,path);assert.equal(body.ok,true,path+': '+body.errors.join(','));
}
console.log('PASS local full-catalog cold/warm complete rendered documents; local workerd is not deployed128MB peak measurement');
}finally{await mf.dispose();}
