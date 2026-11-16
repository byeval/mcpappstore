// Local native workerd only. Supply an already-exported public snapshot; never remote D1.
import {createHash} from 'node:crypto';
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
for(const t of a.tools??[])await add('app_tools',{app_id:a.id,tool_name:t.name,description:t.description??null});
for(const p of a.previews??[])await add('app_previews',{app_id:a.id,sort:p.sort??0,prompt:p.prompt??'',image_key:p.imageKey??''});
if(++count%2000===0)console.log('Seeded',count);
}await flush();
const skillCols=await cols('skills');for(const skill of snapshot.skills??[]){const record={created_at:1,updated_at:1};for(const[k,v]of Object.entries(skill)){const col=snake(k);if(skillCols.has(col)&&v!==undefined)record[col]=Array.isArray(v)?JSON.stringify(v):v;}await add('skills',record);}await flush();
for(const link of snapshot.skillAssociations??[])await add('app_skills',{app_id:link.appId,skill_id:link.skillId,relation_type:link.relationType,reason:link.reason??null,confidence:link.confidence??null,created_at:1,updated_at:1});await flush();
console.log('Seed complete',count,'skills',snapshot.skills?.length,'associations',snapshot.skillAssociations?.length);console.log('Publication state',JSON.stringify(await db.prepare('SELECT revision,content_revision,phase FROM astro_publication_state WHERE id=1').first()));

const expected=JSON.parse(readFileSync(process.env.EXPORT_EXPECTATIONS,'utf8'));
for(const [path,body] of Object.entries(expected))for(const round of ['cold','warm']){
 if(round==='cold'){const kv=await mf.getKVNamespace('KV');let cursor;do{const page=await kv.list({cursor});for(const key of page.keys)await kv.delete(key.name);cursor=page.list_complete?undefined:page.cursor;}while(cursor);}
 const started=performance.now();const response=await mf.dispatchFetch('https://mcpapp.net'+path);const actual=await response.text();const bytes=Buffer.byteLength(actual);assert.equal(response.status,200,path);assert.ok(actual===body,path+' exact full body mismatch: actualBytes='+bytes+' expectedBytes='+Buffer.byteLength(body)+' actualSha256='+createHash('sha256').update(actual).digest('hex')+' expectedSha256='+createHash('sha256').update(body).digest('hex'));assert.ok((response.headers.get('content-type')??'').startsWith(path.endsWith('.xml')?'application/xml':'text/markdown'),path+' MIME');assert.ok(!actual.includes('/app/viator'),path+' removed URL');console.log(JSON.stringify({path,round,status:response.status,bytes,ms:Math.round(performance.now()-started),exact:true}));
}
console.log('PASS native workerd full-catalog exact export bodies; local latency is not deployed CPU measurement');
}finally{await mf.dispose();}
