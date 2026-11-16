import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
const env:Record<string,unknown>={};(globalThis as typeof globalThis & {__mcpTestEnv?:Record<string,unknown>}).__mcpTestEnv=env;
registerHooks({resolve(specifier,context,next){if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__mcpTestEnv',shortCircuit:true};return next(specifier,context);}});
const data=await import('../lib/data');
function fixture(status='hidden'){
 const sql=new DatabaseSync(':memory:');for(const name of ['0001_init.sql','0003_app_surfaces.sql','0004_allow_claude_seed_source.sql','0005_expand_claude_connectors.sql','0006_skills.sql','0007_astro_publication_state.sql','0008_astro_content_revision.sql'])sql.exec(readFileSync('migrations/'+name,'utf8'));
 sql.prepare("INSERT INTO apps(id,name,tagline,status,source,created_at,updated_at) VALUES('canva','D1 Canva','D1 detail',?,'chatgpt_seed',1,1)").run(status);
 sql.prepare("INSERT INTO submissions(app_id,raw_payload,created_at) VALUES('canva','{}',1)").run();
 sql.prepare("UPDATE astro_publication_state SET revision='revision1',content_revision='content1'").run();
 let queryCount=0,maxRows=0; function prepare(query:string){queryCount++;let args:unknown[]=[];return {bind(...values:unknown[]){args=values;return this;},async first(){return sql.prepare(query).get(...args as [])??null;},async all(){const results=sql.prepare(query).all(...args as []);maxRows=Math.max(maxRows,results.length);return {success:true,results};},async run(){const before=Number(sql.prepare('SELECT total_changes() AS n').get()?.n);sql.prepare(query).run(...args as []);const after=Number(sql.prepare('SELECT total_changes() AS n').get()?.n);return {success:true,meta:{changes:after-before}};}};}
 const DB={prepare,async batch(statements:Array<ReturnType<typeof prepare>>){sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const values=new Map<string,string>();env.DB=DB;env.KV={get:async(key:string,type?:string)=>{const v=values.get(key)??null;return type==='json'&&v?JSON.parse(v):v;},put:async(key:string,value:string)=>{values.set(key,value);}};
 return {sql,DB,values,metrics:()=>({queryCount,maxRows}),state:()=>sql.prepare('SELECT revision,content_revision,phase FROM astro_publication_state WHERE id=1').get() as {revision:string;content_revision:string;phase:string}};
}

const {relatedAppScore}=await import('../lib/related-app-score');
test('real public catalog: exact top4 ranking, bounded cold/warm D1 queries, hidden and removed excluded',async()=>{
 const f=fixture('published');try{
 const snapshot=JSON.parse(readFileSync(process.env.PUBLIC_SNAPSHOT!, 'utf8'));
 const apps=snapshot.apps as any[];
 const columns=(f.sql.prepare('PRAGMA table_info(apps)').all() as any[]).map(r=>r.name);
 const snake=(s:string)=>s.replace(/[A-Z]/g,m=>'_'+m.toLowerCase());
 f.sql.exec('BEGIN');
 for(const a of apps){
 const record:any={};for(const [key,value] of Object.entries(a)){const column=snake(key);if(columns.includes(column)&&value!==undefined)record[column]=Array.isArray(value)?JSON.stringify(value):typeof value==='boolean'?Number(value):value;}
 record.updated_at??=record.created_at??1;record.created_at??=1;record.tagline??='';record.status??='published';
 const keys=Object.keys(record);f.sql.prepare(`INSERT OR REPLACE INTO apps(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>record[k]));
 for(const category of a.categories){f.sql.prepare('INSERT OR IGNORE INTO categories(slug,name) VALUES(?,?)').run(category,category);f.sql.prepare('INSERT OR IGNORE INTO app_categories(app_id,category_slug) VALUES(?,?)').run(a.id,category);}
 for(const surface of a.surfaces??[]){f.sql.prepare('INSERT INTO app_surfaces(app_id,platform,surface_type,external_id,is_primary,status) VALUES(?,?,?,?,?,?)').run(a.id,surface.platform,surface.type,surface.externalId??'',Number(surface.isPrimary??false),surface.status??'available');}
 }
 f.sql.exec('COMMIT');
 const subject=await data.getAppById('canva');assert.ok(subject);
 // Reference uses old whole-catalog ranking on the same D1-normalized data.
 const all=await data.listPublishedApps();
 const expected=all.filter(a=>a.id!==subject.id).map(app=>({app,score:relatedAppScore(subject,app)})).filter(a=>a.score>0).sort((a,b)=>b.score-a.score||Number(b.app.isFeatured)-Number(a.app.isFeatured)||a.app.name.localeCompare(b.app.name)).slice(0,4).map(a=>a.app.id);
 for(const platform of ['chatgpt','claude'] as const){const expected=all.filter(a=>a.surfaces.some(s=>s.platform===platform));assert.deepEqual((await data.listAppsByPlatformPage(platform,{offset:7,limit:24})).map(a=>a.id),expected.slice(7,31).map(a=>a.id));assert.equal(await data.countAppsByPlatform(platform),expected.length);assert.equal(await data.latestPlatformAppTimestamp(platform),expected.reduce((n,a)=>Math.max(n,a.publishedAt??0,a.updatedAt),0));}
 for(const category of ['creativity','developer-tools'])assert.deepEqual((await data.listAppsByCategoryPage(category,{offset:3,limit:24})).map(a=>a.id),all.filter(a=>a.categories.includes(category)).slice(3,27).map(a=>a.id));
 assert.deepEqual((await data.listHomeApps()).map(a=>a.id),all.slice(0,36).map(a=>a.id));
 assert.ok((await data.searchApps('canva')).some(a=>a.id==='canva'));
 f.values.clear();const before=f.metrics();const memory=process.memoryUsage().heapUsed;
 const actual=await data.getRelatedApps(subject);
 assert.deepEqual(actual.map(a=>a.id),expected);assert.ok(!actual.some(a=>a.id==='viator'));
 const coldQueries=f.metrics().queryCount-before.queryCount;assert.ok(coldQueries<250,`queries ${coldQueries}`);
 assert.deepEqual((await data.getRelatedApps(subject)).map(a=>a.id),expected);
 if(actual.length){f.sql.prepare("UPDATE apps SET status='hidden' WHERE id=?").run(actual[0].id);assert.ok(!(await data.getRelatedApps(subject)).some(a=>a.id===actual[0].id));}
 console.log(JSON.stringify({apps:apps.length,coldQueries,nodeHeapDelta:process.memoryUsage().heapUsed-memory,note:'Node source test, not workerd memory proof'}));
 }finally{f.sql.close();}
});
test('Unicode prefilter never excludes JS case-fold matches; failed associations fail closed',async()=>{
 const f=fixture('published');try{
 f.sql.exec(`UPDATE apps SET capabilities='["ÉCRIRE"]' WHERE id='canva'; INSERT INTO apps(id,name,tagline,status,source,created_at,updated_at,capabilities) VALUES('unicode','Unicode','Unicode fixture','published','chatgpt_seed',1,1,'["écrire"]'); INSERT INTO apps(id,name,tagline,status,source,created_at,updated_at,capabilities) VALUES('irrelevant','Irrelevant','Unicode false positive','published','chatgpt_seed',1,1,'["中文"]');`);
 const subject=await data.getAppById('canva');assert.ok(subject);
 assert.deepEqual((await data.getRelatedApps(subject)).map(a=>a.id),['unicode']);
 const prepare=f.DB.prepare;f.DB.prepare=(query:string)=>{const statement=prepare(query);if(query.startsWith('SELECT app_id,category_slug'))statement.all=async()=>({success:false,results:[]});return statement;};
 await assert.rejects(data.getRelatedApps(subject),/Authoritative related associations/);
 }finally{f.sql.close();}
});

test('complete related ties use stable ID only after existing score featured name date fields',async()=>{
 const f=fixture('published');try{
 f.sql.exec(`UPDATE apps SET capabilities='["edit"]' WHERE id='canva'`);
 for(const id of ['tie-z','tie-b','tie-x','tie-a','tie-c'])f.sql.prepare(`INSERT INTO apps(id,name,tagline,status,source,created_at,updated_at,capabilities) VALUES(?,'Same','Tie','published','chatgpt_seed',1,1,'["edit"]')`).run(id);
 const subject=await data.getAppById('canva');assert.ok(subject);
 assert.deepEqual((await data.getRelatedApps(subject)).map(a=>a.id),['tie-a','tie-b','tie-c','tie-x']);
 }finally{f.sql.close();}
});

test('homepage bounded D1 failure cannot become an empty success or seed fallback',async()=>{
 const f=fixture('published');try{
 const prepare=f.DB.prepare;f.DB.prepare=(query:string)=>{const statement=prepare(query);if(query.startsWith('SELECT * FROM apps WHERE status=?')&&query.includes('LIMIT ?'))statement.all=async()=>({success:false,results:[]});return statement;};
 await assert.rejects(data.listHomeApps(),/Authoritative bounded catalog unavailable/);
 assert.equal(f.values.size,0);
 }finally{f.sql.close();}
});
test('correlated search retains category tag tool surface and skill matches without duplicate apps',async()=>{
 const f=fixture('published');try{
 f.sql.exec(`INSERT INTO categories(slug,name) VALUES('catneedle','Category'); INSERT INTO app_categories VALUES('canva','catneedle'); INSERT INTO tags VALUES('tagneedle','Tag'); INSERT INTO app_tags VALUES('canva','tagneedle'); INSERT INTO app_tools VALUES('canva','toolneedle','tool-description-needle'); INSERT INTO app_surfaces(app_id,platform,surface_type,external_id,is_primary,status,description) VALUES('canva','claude','connector','',1,'available','surface-needle'); INSERT INTO skills(id,name,display_name,description,source_type,categories,tags,created_at,updated_at) VALUES('skillneedle','Skill','Skill','skill-description-needle','bundled','["skillcategoryneedle"]','["skilltagneedle"]',1,1); INSERT INTO app_skills(app_id,skill_id,created_at,updated_at) VALUES('canva','skillneedle',1,1);`);
 for(const term of ['catneedle','tagneedle','toolneedle','tool-description-needle','surface-needle','skillneedle','skill-description-needle','skillcategoryneedle','skilltagneedle'])assert.deepEqual((await data.searchApps(term,'claude')).map(a=>a.id),['canva'],term);
 assert.deepEqual(await data.searchApps('skillneedle','chatgpt'),[]);
 }finally{f.sql.close();}
});

test('search D1 failure cannot become an empty success or seed fallback',async()=>{
 const f=fixture('published');try{
 const prepare=f.DB.prepare;f.DB.prepare=(query:string)=>{const statement=prepare(query);if(query.includes('SELECT DISTINCT a.*'))statement.all=async()=>({success:false,results:[]});return statement;};
 await assert.rejects(data.searchApps('canva'),/Authoritative search unavailable/);
 assert.equal(f.values.size,0);
 }finally{f.sql.close();}
});
