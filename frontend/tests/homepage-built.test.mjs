import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const out=process.env.AUDITED_DIST??'dist-audited';
test('built homes include exact canonical/hreflang, original search/filter navigation, schemas and bounded carousel island, never RSC',()=>{
 for(const locale of ['en','es','fr','de','ru','zh-hans','ja','ko']){
  const prefix=locale==='en'?'':'/'+locale,canonical='https://mcpapp.net'+(prefix||'/');const h=fs.readFileSync(path.join(out,prefix,'index.html'),'utf8');
  assert.ok(h.includes(`rel="canonical" href="${canonical}"`),locale);
  assert.ok(h.includes(`action="${prefix}/search"`),locale);assert.ok(h.includes('name="q"'));assert.ok(h.includes('id="home-search"'));
  assert.ok(h.includes('class="tabs"'));assert.ok(h.includes(`href="${prefix}/store"`));assert.ok(h.includes('name="keywords"'));
  assert.equal((h.match(/<astro-island/g)||[]).length,1);assert.ok(h.includes('hero-carousel'));assert.ok(!h.includes('self.__next'));assert.ok(!h.includes('/_next/'));
  const schemas=[...h.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1]));for(const kind of ['Organization','WebSite','ItemList'])assert.ok(schemas.some(s=>s['@type']===kind));
  const website=schemas.find(s=>s['@type']==='WebSite');assert.equal(website.potentialAction.target,`https://mcpapp.net${prefix}/search?q={search_term_string}`);
  const items=schemas.find(s=>s['@type']==='ItemList').itemListElement;assert.ok(items.length<=36);assert.ok(items.every(i=>i.url.startsWith(`https://mcpapp.net${prefix}/app/`)&&!i.url.toLowerCase().endsWith('/viator')));
 }
});
