import {readdirSync,readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {Miniflare} from 'miniflare';
const mf=new Miniflare({modulesRoot:resolve('dist/server'),modules:['index.js',...readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js'&&!p.startsWith('.wrangler'))].map(p=>({type:'ESModule',path:resolve('dist/server',p)})),compatibilityDate:'2026-04-23',compatibilityFlags:['nodejs_compat'],kvNamespaces:['KV'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{ADMIN_USER:'local-reviewer',ADMIN_PASS_HASH:createHash('sha256').update('local-only-password').digest('hex'),SITE_URL:'https://mcpapp.net',ASSET_CDN_URL:'https://cdn.mcpapp.net'}});
const auth='Basic '+Buffer.from('local-reviewer:local-only-password').toString('base64');
const fetch=async(p,o)=>{console.log('request',o?.method??'GET',p);const r=await mf.dispatchFetch('https://mcpapp.net'+p,{redirect:'manual',...o});console.log('response',r.status,p);return r;};
try{
 const db=await mf.getD1Database('DB'),kv=await mf.getKVNamespace('KV');
 for(const migration of ['0001_init.sql','0003_app_surfaces.sql','0004_allow_claude_seed_source.sql','0005_expand_claude_connectors.sql','0006_skills.sql','0007_astro_publication_state.sql','0008_astro_content_revision.sql'])await db.exec(readFileSync('migrations/'+migration,'utf8').replace(/--[^\n]*/g,'').replace(/\n/g,' '));
 await db.prepare("INSERT INTO apps(id,name,tagline,status,source,created_at,updated_at) VALUES('viator','Viator','Permitted locale fixture','published','chatgpt_seed',1,1)").run();
 await db.prepare("INSERT INTO submissions(app_id,raw_payload,created_at) VALUES('viator','{}',1)").run();


 for(const path of ['/app/viator','/en/app/viator','/es/app/viator','/ja/app/viator','/fr/app/viator','/de/app/viator','/ru/app/viator','/zh-hans/app/viator','/ko/app/viator','/en-US/apps/Viator/?x=1','/zh-CN/app/%76iator','/app/viator.rsc','/api/og/viator']){const r=await fetch(path);assert.equal(r.status,410,path);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('x-robots-tag'),'noindex');}
 // An unrelated published app remains visible and renders normally.
 await db.prepare("INSERT INTO apps(id,name,tagline,status,source,created_at,updated_at) VALUES('canva','Canva','Unrelated fixture','published','chatgpt_seed',1,1)").run();
 const allowed=await fetch('/fr/app/canva');assert.equal(allowed.status,200);
 for(const path of ['/store','/es/store','/ja/store','/fr/store','/search?q=viator','/fr/search?q=viator','/rss.xml']){const r=await fetch(path);assert.equal(r.status,200);const text=await r.text();assert.ok(!/href="[^" ]*\/app\/viator(?:"|\/)/.test(text),path);if(path==='/rss.xml')assert.ok(!text.includes('/app/viator'));}
 const sitemap=await fetch('/sitemaps/apps.xml');assert.equal(sitemap.status,200);const xml=await sitemap.text();assert.ok(!xml.includes('/app/viator'));assert.ok(xml.includes('/fr/app/canva'));
 assert.equal((await db.prepare("SELECT status FROM apps WHERE id='viator'").first()).status,'published');
 console.log('PASS global Viator removals410 including aliases/RSC/OG; unrelated French app200; every directory/search/feed/sitemap excludes Viator; D1 still published');
}finally{await mf.dispose();}
