import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
const env:Record<string,unknown>={};(globalThis as typeof globalThis & {__mcpTestEnv?:Record<string,unknown>}).__mcpTestEnv=env;
registerHooks({resolve(specifier,context,next){if(specifier==='next/og')return {url:'data:text/javascript,export class ImageResponse { constructor(){throw Error("OG rendering is outside this serializer test")} }',shortCircuit:true};if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__mcpTestEnv',shortCircuit:true};return next(specifier,context);}});
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

const discovery=await import('../lib/discovery-data');
const {localizedAppCollections}=await import('../lib/content-i18n');const {supportedLocales}=await import('../lib/i18n');
const {listCollectionApps,collectionMatchesApp}=await import('../lib/collections');
const {listTopicApps,mcpTopics,popularSearches}=await import('../lib/topics');
const {serializeCollectionMarkdown,buildLlmsTxt,buildLlmsFullTxt}=await import('../lib/llms');
function baselineCollection(collection:any,apps:any[]){const explicit=new Map((collection.appIds??[]).map((id:string,index:number)=>[id,index]));return apps.filter(a=>collectionMatchesApp(collection,a)).sort((a,b)=>(Number(explicit.get(a.id)??Number.MAX_SAFE_INTEGER)-Number(explicit.get(b.id)??Number.MAX_SAFE_INTEGER))||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));}
function normalized(a:any){const keys=['id','name','tagline','publisher','categories','capabilities','description','homepageUrl','repoUrl','mcpEndpoint','installCmd','authType','mcpTransport','examplePrompts','source','isFeatured','publishedAt','updatedAt','tags','tools','previews'];const surfaces=a.surfaces.map((s:any)=>Object.fromEntries(['platform','type','displayName','tagline','description','externalId','isPrimary','status','capabilities','tools','examplePrompts'].map(k=>[k,s[k]])));return {...Object.fromEntries(keys.map(k=>[k,a[k]])),surfaces};}
test('actual catalog: all localized collection counts/order/cards/markdown and topics/discovery consumers preserve baseline',async()=>{
 const f=fixture('published');try{
 const snapshot=JSON.parse(readFileSync(process.env.PUBLIC_SNAPSHOT!,'utf8'));const cols=(table:string)=>(f.sql.prepare('PRAGMA table_info('+table+')').all() as any[]).map(r=>r.name);const appCols=cols('apps'),surfaceCols=cols('app_surfaces');const snake=(s:string)=>s.replace(/[A-Z]/g,m=>'_'+m.toLowerCase());
 f.sql.exec('BEGIN');
 for(const a of snapshot.apps){const record:any={};for(const[k,v]of Object.entries(a)){const col=snake(k);if(appCols.includes(col)&&v!==undefined)record[col]=Array.isArray(v)?JSON.stringify(v):typeof v==='boolean'?Number(v):v;}record.created_at??=1;record.updated_at??=record.created_at;record.tagline??='';const keys=Object.keys(record);f.sql.prepare(`INSERT OR REPLACE INTO apps(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>record[k]));
 for(const c of a.categories??[]){f.sql.prepare('INSERT OR IGNORE INTO categories(slug,name) VALUES(?,?)').run(c,c);f.sql.prepare('INSERT OR IGNORE INTO app_categories VALUES(?,?)').run(a.id,c);}
 for(const s of a.surfaces??[]){const r:any={app_id:a.id};for(const[k,v]of Object.entries(s)){const col=k==='type'?'surface_type':k==='url'?'surface_url':snake(k);if(surfaceCols.includes(col)&&v!==undefined)r[col]=Array.isArray(v)?JSON.stringify(v):typeof v==='boolean'?Number(v):v;}r.external_id??='';r.is_primary??=0;r.status??='available';const keys=Object.keys(r);f.sql.prepare(`INSERT INTO app_surfaces(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>r[k]));}
 for(const t of a.tools??[])f.sql.prepare('INSERT OR IGNORE INTO app_tools VALUES(?,?,?)').run(a.id,t.name,t.description??null);
 for(const p of a.previews??[])f.sql.prepare('INSERT INTO app_previews(app_id,sort,prompt,image_key) VALUES(?,?,?,?)').run(a.id,p.sort??0,p.prompt??'',p.imageKey??'');
 }
 f.sql.exec('COMMIT');
 const all=await data.listPublishedApps(),before=f.metrics();const candidates=await discovery.listCollectionCandidates(),rich=await discovery.listDiscoveryCandidates();
 assert.equal(f.metrics().rpcCount-before.rpcCount,2);assert.deepEqual(rich.map(normalized),all.map(normalized));
 for(const locale of supportedLocales)for(const collection of localizedAppCollections(locale)){
 const expected=baselineCollection(collection,all),actual=listCollectionApps(collection,await discovery.listCollectionCandidatesFor(collection));
 assert.deepEqual(listCollectionApps(collection,candidates).map(a=>a.id),expected.map(a=>a.id));
 assert.deepEqual(actual.map(a=>a.id),expected.map(a=>a.id),`${locale}/${collection.slug}`);
 assert.equal(serializeCollectionMarkdown(collection,actual,locale),serializeCollectionMarkdown(collection,expected,locale));
 const cards=await data.getPublishedListAppsByIds(actual.slice(0,24).map(a=>a.id));assert.deepEqual(cards,expected.slice(0,24));
 }
 for(const topic of mcpTopics)assert.deepEqual(listTopicApps(topic,rich).map(a=>a.id),listTopicApps(topic,all).map(a=>a.id),topic.slug);
 for(const term of popularSearches){const match=(a:any)=>[a.name,a.tagline,a.description,a.publisher,...a.categories,...a.tags].join(' ').toLowerCase().includes(term.toLowerCase());assert.deepEqual(rich.filter(match).map(a=>a.id),all.filter(match).map(a=>a.id));}
 assert.deepEqual(await data.listSitemapAppEntries(),all.map(a=>({id:a.id,name:a.name,updatedAt:a.updatedAt})));
 const design=localizedAppCollections("en").find(c=>c.slug==="chatgpt-apps-for-design")!;const filtered=await discovery.listCollectionCandidatesFor(design);assert.deepEqual((await data.getPublishedListAppsByIds((await discovery.listCollectionCandidates(24)).map(a=>a.id))),all.slice(0,24));await assert.rejects(data.getPublishedListAppsByIds(Array.from({length:101},(_,i)=>String(i))),/exceeds100/);
 console.log(JSON.stringify({designCandidateCount:filtered.length,designCandidateBytes:Buffer.byteLength(JSON.stringify(filtered)),apps:all.length,collectionBytes:Buffer.byteLength(JSON.stringify(candidates)),discoveryBytes:Buffer.byteLength(JSON.stringify(rich)),fullBytes:Buffer.byteLength(JSON.stringify(all)),projectionRpc:2}));
 f.sql.exec("UPDATE apps SET status='hidden' WHERE id='canva'");assert.ok(!(await discovery.listCollectionCandidates()).some(a=>a.id==='canva'||a.id==='viator'));assert.deepEqual(await data.getPublishedListAppsByIds(['canva','viator','missing']),[]);
 }finally{f.sql.close();}
});
test('word boundaries, Unicode, escaped regex, platform prerequisite and missing-D1 failures remain exact',async()=>{
 const f=fixture('published');try{
 const base=await data.getAppById('canva');assert.ok(base);const apps=[{...base,id:'explicit',name:'Wrong host',surfaces:[{platform:'claude',type:'connector',isPrimary:true,status:'available'}]},{...base,id:'exact',name:'Édit C++ design'},{...base,id:'substring',name:'redesign'},{...base,id:'unicode',name:'中design文'}] as any[];
 for(const term of ['design','Édit','C++','中design文']){const collection={slug:'test',platform:'chatgpt',appIds:['explicit'],categorySlugs:[],matchTerms:[term]} as any;assert.deepEqual(listCollectionApps(collection,apps).map(a=>a.id),baselineCollection(collection,apps).map(a=>a.id));assert.ok(!listCollectionApps(collection,apps).some(a=>a.id==='explicit'));}
 const prepare=f.DB.prepare;f.DB.prepare=(q:string)=>{const statement=prepare(q);statement.all=async()=>({success:false,results:[]});return statement;};await assert.rejects(discovery.listCollectionCandidates(),/unavailable/);await assert.rejects(discovery.listDiscoveryCandidates(),/unavailable/);await assert.rejects(data.listSitemapAppEntries(),/unavailable/);
 }finally{f.sql.close();}
});

test('SQL prefilter is a conservative superset for Unicode, escaped JSON, punctuation, default and explicit platforms',async()=>{
 const f=fixture('hidden');try{
 const rows=[['unicode','K DESIGN','chatgpt_seed',null],['punctuation','C++ design','chatgpt_seed',null],['substring','redesign','chatgpt_seed',null],['escaped','Plain','chatgpt_seed','["\\u0064esign"]'],['irrelevant','Other','chatgpt_seed',null],['explicit','Forced','chatgpt_seed',null],['wrong','Design wrong host','claude_seed',null]];
 for(const [id,name,source,capabilities]of rows)f.sql.prepare("INSERT INTO apps(id,name,tagline,status,source,capabilities,created_at,updated_at) VALUES(?,?,'','published',?,?,1,1)").run(id,name,source,capabilities);
 const all=await discovery.listCollectionCandidates();
 for(const platform of [undefined,'chatgpt'])for(const matchTerms of [['design'],['unknown'],['app'],['chatgpt'],['connector'],['claude'],['k'],['C++'],['中'],['design','中'],[]]){
  const collection={slug:'test',platform,appIds:['explicit','wrong'],categorySlugs:[],matchTerms} as any;
  const candidates=await discovery.listCollectionCandidatesFor(collection);
  assert.deepEqual(listCollectionApps(collection,candidates).map(a=>a.id),baselineCollection(collection,all).map(a=>a.id),JSON.stringify(matchTerms));
  if(platform)assert.ok(!candidates.some(a=>a.id==='wrong'));
  if(matchTerms.length===1&&matchTerms[0]==='design'){assert.ok(candidates.some(a=>a.id==='escaped'));assert.ok(!candidates.some(a=>a.id==='irrelevant'));assert.ok(!listCollectionApps(collection,candidates).some(a=>a.id==='substring'));}
 }
 }finally{f.sql.close();}
});
