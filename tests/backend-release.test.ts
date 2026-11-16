import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseHealth} from '../worker/release-health';
const commit='948eb77'+'a'.repeat(33);
const request=(method='GET')=>new Request('https://mcpapp.net/__mcpapp-release',{method});
test('release health is private-config-only, GET-only and fails closed without valid exact commit',async()=>{
 for(const flag of [undefined,'false','TRUE']){const r=releaseHealth(request(),{MCPAPP_PRIVATE_BACKEND:flag,MCPAPP_BUILD_COMMIT:commit});assert.equal(r.status,404);assert.equal(r.headers.get('cache-control'),'no-store');}
 for(const value of [undefined,'short','g'.repeat(40),'a'.repeat(41),commit+'\n'])assert.equal(releaseHealth(request(),{MCPAPP_PRIVATE_BACKEND:'true',MCPAPP_BUILD_COMMIT:value}).status,503);
 for(const method of ['POST','HEAD','OPTIONS']){const r=releaseHealth(request(method),{MCPAPP_PRIVATE_BACKEND:'true',MCPAPP_BUILD_COMMIT:commit});assert.equal(r.status,405);assert.equal(r.headers.get('allow'),'GET');}
 const r=releaseHealth(request(),{MCPAPP_PRIVATE_BACKEND:'true',MCPAPP_BUILD_COMMIT:commit});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{commit});
});
