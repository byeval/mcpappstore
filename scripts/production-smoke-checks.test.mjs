import test from 'node:test';import assert from 'node:assert/strict';
import {productionSmokeChecks} from './production-smoke-checks.mjs';
import {verifyPublicDomainSmoke} from './public-domain-smoke.mjs';
import {samplePublicBaseline,comparePublicAfterSwitch} from './public-baseline-policy.mjs';
const input={appPath:'/app/canva',appName:'Canva',css:'_..BNw4dc6b.css',icon:'icons/canva.png'};
test('publisher checks accept actual Astro dotted CSS name through baseline and cutover without weakening content/status gates',async()=>{
 const {publicChecks,baselineChecks}=productionSmokeChecks(input);assert.equal(publicChecks.length,6);
 const seen=[];const baseline=await samplePublicBaseline(baselineChecks,{fetcher:async url=>{seen.push(url);const c=baselineChecks.find(c=>'https://'+(c.host??'mcpapp.net')+c.path===url);return new Response('',{status:c.path.startsWith('/_astro/')?404:c.status,headers:{'content-type':c.contentTypePrefix?.startsWith('image/')?'image/png':c.contentTypePrefix??'text/html'}});}});
 assert.equal(seen.length,6);assert.equal(baseline.samples[2].outcome,'asset-not-yet-published');assert.equal(baseline.samples[2].httpVerified,false);
 const fetcher=async url=>{const c=publicChecks.find(c=>'https://'+(c.host??'mcpapp.net')+c.path===url);return new Response(c.canonical?`<link rel="canonical" href="${c.canonical}">`:'body',{status:c.status,headers:{'content-type':c.contentTypePrefix?.startsWith('image/')?'image/png':c.contentTypePrefix??'text/html','x-mcp-delivery':c.delivery??''}});};
 assert.equal((await comparePublicAfterSwitch(publicChecks,baseline,{fetcher})).httpVerified,true);
 await assert.rejects(comparePublicAfterSwitch(publicChecks,baseline,{fetcher:async url=>url.includes('/_astro/')?new Response('missing',{status:404}):fetcher(url)}),e=>e.code==='PUBLIC_POSTDEPLOY_VERIFICATION_FAILED');
});
test('normal filenames with consecutive dots are not traversal, while dot segments, encodings and host escapes remain rejected before any request',async()=>{
 let requests=0;for(const path of ['/../docs','/./docs','/_astro/../x.css','/_astro/./x.css','/_astro/%2e%2e/x.css','/_astro/%252e%252e/x.css','//other.test/x','/x\\y','/x?y','/x#y'])await assert.rejects(verifyPublicDomainSmoke([{path:'/docs',status:200},{path,status:200}],{fetcher:async()=>{requests++;return new Response('');}}),/Invalid/);assert.equal(requests,0);
 for(const css of ['../x.css','foo/bar.css','%2e%2e.css'])assert.throws(()=>productionSmokeChecks({...input,css}));
});
test('unversioned dotted CSS cannot be excused as missing before switch',async()=>{for(const path of ['/_astro/_..css','/_astro/plain.css','/_astro/a..short.css'])await assert.rejects(samplePublicBaseline([{path,status:200,baselineMayBeMissing:true}],{fetcher:async()=>new Response('',{status:404})}));});
