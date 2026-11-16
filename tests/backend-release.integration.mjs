import {readdirSync} from 'node:fs';import {resolve} from 'node:path';import assert from 'node:assert/strict';import {Miniflare} from 'miniflare';
const modules=['index.js',...readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js'&&!p.startsWith('.wrangler'))].map(p=>({type:'ESModule',path:resolve('dist/server',p)}));
const commit='948eb77'+'a'.repeat(33);
for(const [bindings,status] of [[{},404],[{MCPAPP_PRIVATE_BACKEND:'true',MCPAPP_BUILD_COMMIT:'invalid'},503],[{MCPAPP_PRIVATE_BACKEND:'true',MCPAPP_BUILD_COMMIT:commit},200]]){
 const mf=new Miniflare({modulesRoot:resolve('dist/server'),modules,compatibilityDate:'2026-04-23',compatibilityFlags:['nodejs_compat'],bindings});
 try{const response=await mf.dispatchFetch('https://mcpapp.net/__mcpapp-release');assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'no-store');if(status===200){assert.deepEqual(await response.json(),{commit});const post=await mf.dispatchFetch('https://mcpapp.net/__mcpapp-release',{method:'POST'});assert.equal(post.status,405);assert.equal(post.headers.get('allow'),'GET');}}finally{await mf.dispose();}
}
console.log('PASS actual built Worker private release boundary: no DB/assets/secrets bindings required, 404/503/200/405 verified');
