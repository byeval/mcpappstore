import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
const env:Record<string,unknown>={};(globalThis as typeof globalThis & {__mcpTestEnv?:Record<string,unknown>}).__mcpTestEnv=env;
registerHooks({resolve(specifier,context,next){if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__mcpTestEnv',shortCircuit:true};return next(specifier,context);}});
const data=await import('../lib/data');
function fixture(status='hidden'){
 const sql=new DatabaseSync(':memory:');for(const name of ['0001_init.sql','0003_app_surfaces.sql','0004_allow_claude_seed_source.sql','0005_expand_claude_connectors.sql','0006_skills.sql','0007_astro_publication_state.sql','0008_astro_content_revision.sql'])sql.exec(readFileSync('migrations/'+name,'utf8'));
 sql.prepare("INSERT INTO apps(id,name,tagline,status,source,created_at,updated_at) VALUES('canva','D1 Canva','D1 detail',?,'chatgpt_seed',1,1)").run(status);
 sql.prepare("INSERT INTO submissions(app_id,raw_payload,created_at) VALUES('canva','{}',1)").run();
 sql.prepare("UPDATE astro_publication_state SET revision='revision1',content_revision='content1'").run();
 let queryCount=0,maxRows=0,rpcCount=0,inBatch=false; function prepare(query:string){queryCount++;let args:unknown[]=[];return {query,bind(...values:unknown[]){args=values;return this;},async first(){if(!inBatch)rpcCount++;return sql.prepare(query).get(...args as [])??null;},async all(){if(!inBatch)rpcCount++;const results=sql.prepare(query).all(...args as []);maxRows=Math.max(maxRows,results.length);return {success:true,results};},async run(){const before=Number(sql.prepare('SELECT total_changes() AS n').get()?.n);sql.prepare(query).run(...args as []);const after=Number(sql.prepare('SELECT total_changes() AS n').get()?.n);return {success:true,meta:{changes:after-before}};}};}
 const DB={prepare,async batch(statements:Array<ReturnType<typeof prepare>>){rpcCount++;inBatch=true;sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(/^SELECT\b/i.test(statement.query)?await statement.all():await statement.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}finally{inBatch=false;}}};
 const values=new Map<string,string>();env.DB=DB;env.KV={get:async(key:string,type?:string)=>{const v=values.get(key)??null;return type==='json'&&v?JSON.parse(v):v;},put:async(key:string,value:string)=>{values.set(key,value);}};
 return {sql,DB,values,metrics:()=>({queryCount,maxRows,rpcCount}),state:()=>sql.prepare('SELECT revision,content_revision,phase FROM astro_publication_state WHERE id=1').get() as {revision:string;content_revision:string;phase:string}};
}

const directory=await import('../lib/directory-data');
const {groupAppsByIndexKey,activeAppIndexKeys}=await import('../lib/app-index');
const {appPlatformLabel,appMetadataSignal}=await import('../lib/directory-content');
const ts=await import('typescript');
const {supportedLocales,getMessages}=await import('../lib/i18n');
function labels(source:string){const start=source.indexOf('function appKindLabel('),end=source.indexOf('export default',start);const text=source.slice(start,end<0?undefined:end);const js=ts.transpile(text,{target:ts.ScriptTarget.ES2022});return new Function(js+'; return {appKindLabel,appPlatformLabel,appSummaryLine};')();}
const baselineLabels=labels(readFileSync('tests/fixtures/directory-labels-baseline.ts','utf8'));
const indexLabels=labels(readFileSync('app/apps/page.tsx','utf8')),letterLabels=labels(readFileSync('app/apps/[letter]/page.tsx','utf8'));
function compact(a:any){return {id:a.id,name:a.name,tagline:a.tagline,publisher:a.publisher,publishedAt:a.publishedAt,updatedAt:a.updatedAt,surfaces:a.surfaces.map((s:any)=>({platform:s.platform}))};}
function example(a:any){return {id:a.id,name:a.name,tagline:a.tagline,mcpTransport:a.mcpTransport,authType:a.authType,platformLabel:appPlatformLabel(a),metadataSignal:appMetadataSignal(a)};}
async function assertParity(f:ReturnType<typeof fixture>){
 const all=await data.listPublishedApps();const quality=await data.getCatalogQualityStats();const before=f.metrics();
 const index=await directory.listDirectoryIndex();assert.deepEqual(index,all.map(compact));assert.deepEqual(groupAppsByIndexKey(index),groupAppsByIndexKey(all.map(compact)));assert.deepEqual(activeAppIndexKeys(index),activeAppIndexKeys(all));assert.equal(await directory.getDirectoryCount(),all.length);
 for(let i=0;i<all.length;i++)for(const locale of supportedLocales){const messages=getMessages(locale);for(const current of [indexLabels,letterLabels]){assert.equal(current.appKindLabel(index[i],messages.appKind),baselineLabels.appKindLabel(all[i],messages.appKind));assert.equal(current.appPlatformLabel(index[i],locale),baselineLabels.appPlatformLabel(all[i],locale));assert.equal(current.appSummaryLine(index[i],locale,messages),baselineLabels.appSummaryLine(all[i],locale,messages));}}
 const stats=await directory.getDirectoryStats(),has=(a:any,p:string)=>a.surfaces.some((s:any)=>s.platform===p);
 assert.deepEqual(stats,{total:all.length,latestUpdatedAt:Math.max(0,...all.map(a=>a.updatedAt)),latestTimestamp:Math.max(0,...all.map(a=>Math.max(a.updatedAt,a.publishedAt??0))),chatgpt:all.filter(a=>has(a,'chatgpt')).length,claude:all.filter(a=>has(a,'claude')).length,overlap:all.filter(a=>has(a,'chatgpt')&&has(a,'claude')).length,http:all.filter(a=>a.mcpTransport==='http').length,sse:all.filter(a=>a.mcpTransport==='sse').length,oauth:all.filter(a=>a.authType==='oauth').length,noAuth:all.filter(a=>a.authType==='none').length,interactive:all.filter(a=>a.previews.length>0||a.categories.includes('design')).length,...quality});
 const sqlReads=f.metrics().queryCount-before.queryCount;assert.equal(sqlReads,3,'index,count,stats each one query');
 for(const n of [8,10])assert.deepEqual(await directory.listDirectoryExamples(n),(await data.listMetadataRichApps(n)).map(example));
 return {apps:all.length,compactBytes:Buffer.byteLength(JSON.stringify(index)),fullBytes:Buffer.byteLength(JSON.stringify(all)),indexCountStatsQueries:sqlReads};
}
test('authoritative actual catalog compact index, every grouped item, summary and bounded examples preserve baseline',async()=>{
 const f=fixture('published');try{
 const snapshot=JSON.parse(readFileSync(process.env.PUBLIC_SNAPSHOT!,'utf8'));const cols=(table:string)=>(f.sql.prepare('PRAGMA table_info('+table+')').all() as any[]).map(r=>r.name);const appCols=cols('apps'),surfaceCols=cols('app_surfaces');const snake=(s:string)=>s.replace(/[A-Z]/g,m=>'_'+m.toLowerCase());
 f.sql.exec('BEGIN');
 for(const a of snapshot.apps){const record:any={};for(const[k,v]of Object.entries(a)){const col=snake(k);if(appCols.includes(col)&&v!==undefined)record[col]=Array.isArray(v)?JSON.stringify(v):typeof v==='boolean'?Number(v):v;}record.created_at??=1;record.updated_at??=record.created_at;record.tagline??='';const keys=Object.keys(record);f.sql.prepare(`INSERT OR REPLACE INTO apps(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>record[k]));
 for(const c of a.categories??[]){f.sql.prepare('INSERT OR IGNORE INTO categories(slug,name) VALUES(?,?)').run(c,c);f.sql.prepare('INSERT OR IGNORE INTO app_categories VALUES(?,?)').run(a.id,c);}
 for(const s of a.surfaces??[]){const r:any={app_id:a.id};for(const[k,v]of Object.entries(s)){const col=k==='type'?'surface_type':k==='url'?'surface_url':snake(k);if(surfaceCols.includes(col)&&v!==undefined)r[col]=Array.isArray(v)?JSON.stringify(v):typeof v==='boolean'?Number(v):v;}r.external_id??='';r.is_primary??=0;r.status??='available';const keys=Object.keys(r);f.sql.prepare(`INSERT INTO app_surfaces(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>r[k]));}
 for(const t of a.tools??[])f.sql.prepare('INSERT OR IGNORE INTO app_tools VALUES(?,?,?)').run(a.id,t.name,t.description??null);
 for(const p of a.previews??[])f.sql.prepare('INSERT INTO app_previews(app_id,sort,prompt,image_key) VALUES(?,?,?,?)').run(a.id,p.sort??0,p.prompt??'',p.imageKey??'');
 }
 f.sql.exec('COMMIT');const metrics=await assertParity(f);assert.ok(metrics.compactBytes<metrics.fullBytes/3);console.log(JSON.stringify(metrics));
 f.sql.exec("UPDATE apps SET status='hidden' WHERE id='canva'");assert.ok(!(await directory.listDirectoryIndex()).some(a=>a.id==='canva'||a.id==='viator'));
 }finally{f.sql.close();}
});
test('empty, missing surface defaults, ordered duplicate platforms, signals and removal are preserved',async()=>{
 const f=fixture('published');try{f.sql.exec("DELETE FROM apps");await assertParity(f);
 f.sql.exec(`INSERT INTO apps(id,name,tagline,status,source,created_at,updated_at) VALUES('default','Default','Default','published','claude_seed',1,1),('multi','Multi','Multi','published','chatgpt_seed',1,2),('viator','Viator','Removed','published','chatgpt_seed',1,3),('hidden','Hidden','Hidden','hidden','chatgpt_seed',1,4);INSERT INTO app_surfaces(app_id,platform,surface_type,external_id,is_primary,status) VALUES('multi','claude','connector','a',1,'available'),('multi','chatgpt','app','b',0,'available'),('multi','claude','connector','c',0,'available');INSERT INTO app_tools VALUES('multi','edit','Edit');INSERT INTO categories(slug,name) VALUES('design','Design');INSERT INTO app_categories VALUES('multi','design');`);f.sql.exec(`INSERT INTO app_previews(app_id,sort,prompt,image_key) VALUES('default',0,'Preview','fixture.webp'); UPDATE apps SET example_prompts='["prompt"]',repo_url='https://example.com/repo' WHERE id='multi';`);f.values.clear();await assertParity(f);
 }finally{f.sql.close();}
});
test('directory read failures never become empty success or seed fallback',async()=>{
 const f=fixture('published');try{const prepare=f.DB.prepare;f.DB.prepare=(q:string)=>{const s=prepare(q);s.all=async()=>({success:false,results:[]});s.first=async()=>null;return s;};await assert.rejects(directory.listDirectoryIndex(),/unavailable/);await assert.rejects(directory.getDirectoryCount(),/unavailable/);await assert.rejects(directory.getDirectoryStats(),/unavailable/);await assert.rejects(directory.listDirectoryExamples(10),/unavailable/);}finally{f.sql.close();}
});
