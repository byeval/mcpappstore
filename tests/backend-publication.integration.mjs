import {readdirSync,readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {Miniflare} from 'miniflare';
const mf=new Miniflare({modulesRoot:resolve('dist/server'),modules:['index.js',...readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js'&&!p.startsWith('.wrangler'))].map(p=>({type:'ESModule',path:resolve('dist/server',p)})),compatibilityDate:'2026-04-23',compatibilityFlags:['nodejs_compat'],kvNamespaces:['KV'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{ADMIN_USER:'local-reviewer',ADMIN_PASS_HASH:createHash('sha256').update('local-only-password').digest('hex'),SITE_URL:'https://mcpapp.net',ASSET_CDN_URL:'https://cdn.mcpapp.net'}});
const auth='Basic '+Buffer.from('local-reviewer:local-only-password').toString('base64');
const fetch=async(p,o)=>{console.log('request',o?.method??'GET',p);const r=await mf.dispatchFetch('https://mcpapp.net'+p,{redirect:'manual',...o});console.log('response',r.status,p);return r;};
try{
 const db=await mf.getD1Database('DB'),kv=await mf.getKVNamespace('KV');
 for(const migration of ['0001_init.sql','0003_app_surfaces.sql','0004_allow_claude_seed_source.sql','0005_expand_claude_connectors.sql','0006_skills.sql','0007_astro_publication_state.sql','0008_astro_content_revision.sql'])await db.exec(readFileSync('migrations/'+migration,'utf8').replace(/--[^\n]*/g,'').replace(/\n/g,' '));
 await db.prepare("INSERT INTO apps(id,name,tagline,status,source,created_at,updated_at) VALUES('canva','Canva','Hidden fixture','hidden','chatgpt_seed',1,1)").run();
 await db.prepare("INSERT INTO submissions(app_id,raw_payload,created_at) VALUES('canva','{}',1)").run();
 // Much newer published seed must never win against explicit D1 hidden status.
 assert.equal((await fetch('/app/canva')).status,404);
 assert.equal((await fetch('/api/og/canva')).status,404);
 assert.equal((await fetch('/app/figma')).status,404); // published in seed, absent in authoritative DB
 const denied=await fetch('/admin/canva/review',{method:'POST',body:new URLSearchParams({decision:'approve'})});assert.equal(denied.status,401);
 const approve=await fetch('/admin/canva/review',{method:'POST',headers:{Authorization:auth},body:new URLSearchParams({decision:'approve'})});assert.equal(approve.status,303);
 let marker=await db.prepare('SELECT revision,content_revision,phase FROM astro_publication_state WHERE id=1').first();assert.equal(marker.phase,'ready');const approved=marker.revision;
 assert.equal((await db.prepare("SELECT status FROM apps WHERE id='canva'").first()).status,'published');
 assert.equal((await fetch('/api/og/canva')).status,200);
 const hide=await fetch('/admin/canva/review',{method:'POST',headers:{Authorization:auth},body:new URLSearchParams({decision:'hide'})});assert.equal(hide.status,303);marker=await db.prepare('SELECT revision,content_revision,phase FROM astro_publication_state WHERE id=1').first();assert.equal(marker.phase,'ready');assert.notEqual(marker.revision,approved);const beforeFailure=marker.revision;const contentBeforeFailure=marker.content_revision;
 assert.equal((await fetch('/api/og/canva')).status,404);
 // Local DB trigger proves review notes failure rolls status and revision back atomically.
 await db.exec("CREATE TRIGGER local_test_failure BEFORE UPDATE ON submissions BEGIN SELECT RAISE(ABORT,'local-only test failure'); END;");
 const failed=await fetch('/admin/canva/review',{method:'POST',headers:{Authorization:auth},body:new URLSearchParams({decision:'approve'})});assert.equal(failed.status,500);assert.equal((await db.prepare("SELECT status FROM apps WHERE id='canva'").first()).status,'hidden');assert.equal((await db.prepare('SELECT revision FROM astro_publication_state WHERE id=1').first()).revision,beforeFailure);
 assert.equal((await db.prepare('SELECT content_revision FROM astro_publication_state WHERE id=1').first()).content_revision,contentBeforeFailure);
 assert.equal((await fetch('/_revalidate',{method:'POST'})).status,401);
 assert.equal((await fetch('/_revalidate')).status,405);
 await db.exec("DROP TRIGGER local_test_failure; UPDATE astro_publication_state SET phase='updating';");
 const conflict=await fetch('/admin/canva/review',{method:'POST',headers:{Authorization:auth},body:new URLSearchParams({decision:'approve'})});assert.equal(conflict.status,409);assert.equal((await db.prepare("SELECT status FROM apps WHERE id='canva'").first()).status,'hidden');
 const beforeDirect=await db.prepare('SELECT revision,content_revision,phase FROM astro_publication_state WHERE id=1').first();await db.exec("UPDATE apps SET tagline='Uncoordinated import' WHERE id='canva'");const afterDirect=await db.prepare('SELECT revision,content_revision,phase FROM astro_publication_state WHERE id=1').first();assert.equal(afterDirect.revision,beforeDirect.revision);assert.equal(afterDirect.phase,'updating');assert.notEqual(afterDirect.content_revision,beforeDirect.content_revision);
 assert.equal(await kv.get('catalog:revalidated'),null);
 assert.equal((await fetch('/api/import',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,400);
 const invalid=await fetch('/api/submit',{method:'POST',body:new FormData()});assert.equal(invalid.status,303);assert.match(invalid.headers.get('location'),/submit\?error=/);
 console.log('PASS actual948eb77 backend: hidden-over-seed, detail/OG, auth, atomic moderation/marker lifecycle, original invalid submit/import');
}finally{await mf.dispose();}
