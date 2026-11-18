import test from 'node:test';import assert from 'node:assert/strict';
import {readCloudflareJson,CF_READ_TIMEOUT_MS} from './cloudflare-read-json.mjs';
import {verifyCdnMapping} from './cdn-r2-proof.mjs';import {readLiveRouting,assertUnchangedRouting} from './live-routing.mjs';import {safeReleaseDiagnostic} from './safe-release-diagnostic.mjs';
const input={operation:'cdn-mapping',accountId:'a'.repeat(32),zoneId:'b'.repeat(32),token:'SECRET_TOKEN'};
test('GET-only fixed origin uses bounded defaults and retries only selected transient errors at most twice',async()=>{
 assert.equal(CF_READ_TIMEOUT_MS,30000);
 for(const cause of [new DOMException('secret','TimeoutError'),Object.assign(new TypeError('secret'),{cause:{code:'ECONNRESET'}})]){let calls=0;assert.deepEqual(await readCloudflareJson({...input,fetcher:async(url,options)=>{assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.ok(url.startsWith('https://api.cloudflare.com/client/v4/'));if(++calls===1)throw cause;return Response.json({success:true});}}),{success:true});assert.equal(calls,2);}
 for(const status of [500,502,503,504]){let calls=0;await assert.rejects(readCloudflareJson({...input,fetcher:async()=>{calls++;return new Response('',{status});}}),e=>e.code==='CF_READ_FAILED'&&e.releaseHttpStatus===status&&e.releaseAttempt===2);assert.equal(calls,2);}
});
test('deadline bounds fetch AND body even if injected transport ignores abort; keeps cause and phase',async()=>{
 for(const phase of ['fetch','body']){let calls=0;await assert.rejects(readCloudflareJson({...input,timeoutMs:5,fetcher:async()=>{calls++;if(phase==='fetch')return new Promise(()=>{});return {ok:true,status:200,json:()=>new Promise(()=>{})};}}),e=>e.cause.name==='TimeoutError'&&e.releasePhase===phase&&e.releaseAttempt===2);assert.equal(calls,2);}
});
test('authorization, malformed JSON, unknown TypeError and external abort never retry',async()=>{
 for(const failure of [401,403,404,429,new SyntaxError('private payload'),new TypeError('unknown'),new DOMException('cancel','AbortError')]){let calls=0;await assert.rejects(readCloudflareJson({...input,fetcher:async()=>{calls++;if(typeof failure==='number')return new Response('',{status:failure});if(failure instanceof SyntaxError)return {ok:true,status:200,json:async()=>{throw failure}};throw failure;}}),e=>e.releaseAttempt===1);assert.equal(calls,1);}
});
test('schema/mapping changes fail closed without replay; routing semantics unchanged',async()=>{
 for(const body of [{success:false},{success:true,result:{domains:[]}}, {success:true,result:{domains:[{domain:'cdn.mcpapp.net',enabled:false}]}}]){let calls=0;await assert.rejects(verifyCdnMapping({...input,fetcher:async()=>{calls++;return Response.json(body)}}));assert.equal(calls,1);}
 let calls=0;await assert.rejects(readLiveRouting({...input,fetcher:async()=>{calls++;return Response.json({success:true,result:{}})}}));assert.equal(calls,1);
 assert.throws(()=>assertUnchangedRouting({domains:[{hostname:'other',service:'mcpapp'}],routes:[]},{frontendRoutes:[]}),/changed/);
});
test('safe diagnostic retains only bounded metadata, never credentials URLs or arbitrary phases',async()=>{
 const cause=new DOMException('SECRET_TOKEN private response','TimeoutError');let error;try{await readCloudflareJson({...input,fetcher:async()=>{throw cause}})}catch(e){error=e;}
 assert.equal(error.cause,cause);const d=safeReleaseDiagnostic(error,{});assert.equal(d.errors[0].operation,'cdn-mapping');assert.equal(d.errors[0].attempt,2);assert.equal(d.errors[1].name,'TimeoutError');assert.ok(!JSON.stringify(d).includes('SECRET_TOKEN'));
 error.releaseOperation='SECRET_TOKEN';error.releasePhase='SECRET_TOKEN';assert.ok(!JSON.stringify(safeReleaseDiagnostic(error,{})).includes('SECRET_TOKEN'));
 let calls=0;await assert.rejects(readCloudflareJson({...input,operation:'https://evil.test',fetcher:async()=>calls++}));assert.equal(calls,0);
});
test('candidate inventory timeout cannot trigger frontend deployment or rollback',async()=>{
 const {activatePlan}=await import('./astro-activation.mjs');const {verifyCandidateFront}=await import('./candidate-front-gate.mjs');
 await assert.rejects(activatePlan({activationEligible:true,shardConfigs:[]},{failurePolicy:'retain-unverified',assertReady:async()=>{},verifyCandidate:()=>verifyCandidateFront({assertStable:async()=>{},captureVersions:async()=>({}),mapping:()=>readCloudflareJson({...input,fetcher:async()=>{throw new DOMException('timeout','TimeoutError')}})}),capturePrevious:async()=>assert.fail('no switch'),deployFront:async()=>assert.fail('no deploy'),rollbackFront:async()=>assert.fail('no rollback')}),e=>e.code==='CF_READ_FAILED');
});
test('release phase accepts only reviewed pipeline constants',()=>{
 assert.equal(safeReleaseDiagnostic(Error('hidden'),{releasePhase:'candidate-verification'}).releasePhase,'candidate-verification');
 const result=safeReleaseDiagnostic(Error('hidden'),{releasePhase:'SECRET_TOKEN'});assert.equal(result.releasePhase,'unknown');assert.ok(!JSON.stringify(result).includes('SECRET_TOKEN'));
});
