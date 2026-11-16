import test from 'node:test';import assert from 'node:assert/strict';import {Miniflare} from 'miniflare';import fs from 'node:fs/promises';
test('built edge uses primary D1 revision; direct-writer trigger hide immediately leaves static while APIs continue',async()=>{
 const helper=(await fs.readFile('sharding/asset-binding.mjs','utf8')).replaceAll('export function','function');
 const entry=(await fs.readFile('worker/edge-entry.mjs','utf8')).replace("import {createShardedAssets} from '../sharding/asset-binding.mjs';",'');
 const bundle=helper+'\n'+entry;
 let staticCalls=0,legacyCalls=0;const mf=new Miniflare({modules:true,script:bundle,compatibilityDate:'2026-04-23',d1Databases:['DB'],bindings:{ASTRO_ROUTE_FAMILIES:JSON.stringify(['/app/canva']),SNAPSHOT_CREATED_AT:String(Date.now()),SNAPSHOT_CONTENT_REVISION:'c1',SNAPSHOT_MARKER_ID:'r1'},serviceBindings:{STATIC_WEST:()=>{staticCalls++;return new Response('immutable static')},STATIC_EAST:()=>new Response('east'),LEGACY:async request=>{legacyCalls++;if(new URL(request.url).pathname==='/api/submit')return new Response('submission backend',{status:303});const DB=await mf.getD1Database('DB');const row=await DB.prepare("SELECT status FROM apps WHERE id='canva'").first();return row?.status==='published'?new Response('fresh backend'):new Response('not found',{status:404});}}});
 try{const DB=await mf.getD1Database('DB');await DB.exec("CREATE TABLE astro_publication_state(id INTEGER PRIMARY KEY,revision TEXT,content_revision TEXT,phase TEXT,updated_at INTEGER); CREATE TABLE apps(id TEXT PRIMARY KEY,status TEXT); INSERT INTO astro_publication_state VALUES(1,'r1','c1','ready',1); INSERT INTO apps VALUES('canva','published');");
 let r=await mf.dispatchFetch('https://mcpapp.net/app/canva',{headers:{cookie:'_ga=1; cf_clearance=2'}});assert.equal(r.status,200);assert.equal(r.headers.get('x-mcp-delivery'),'astro-static');assert.equal(staticCalls,1);
 await DB.exec("CREATE TRIGGER content_write AFTER UPDATE ON apps BEGIN UPDATE astro_publication_state SET content_revision=lower(hex(randomblob(16))) WHERE id=1; END;");
 await DB.prepare("UPDATE apps SET status='hidden' WHERE id='canva'").run();
 assert.equal((await DB.prepare('SELECT revision FROM astro_publication_state').first()).revision,'r1');
 r=await mf.dispatchFetch('https://mcpapp.net/app/canva');assert.equal(r.status,404);assert.equal(r.headers.get('x-mcp-delivery'),null);assert.equal(staticCalls,1);
 await DB.prepare("UPDATE astro_publication_state SET phase='updating'").run();r=await mf.dispatchFetch('https://mcpapp.net/api/submit',{method:'POST',body:'test',redirect:'manual'});assert.equal(r.status,303);assert.equal(await r.text(),'submission backend');
 assert.equal(legacyCalls,2);
 }finally{await mf.dispose();}
});
