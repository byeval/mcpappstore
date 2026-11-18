import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createBrowserTicket,validateBrowserObservations} from './public-baseline-policy.mjs';import {validateWatchdogDisarm} from './rollback-watchdog-disarm.mjs';import {BASELINE} from './rollback-watchdog-core.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
import {browserFixture as fixture} from './rollback-watchdog-test-fixtures.mjs';
test('actual-shaped verifier output and original observation hash validate',()=>assert.equal(validateWatchdogDisarm(fixture()).kind,'verified-browser-disarm-v1'));
for(const [name,mutate]of [['wrong ref',f=>f.ref+='x'],['untrusted ancestry',f=>f.descendsFromControlBase=false],['wrong nonce',f=>f.manifest.armNonce='wrong'],['superseded',f=>f.current.versionId=BASELINE],['tampered bytes',f=>f.files['observations.json']+=' '],['boolean only',f=>{f.files={};f.manifest.files={};}],['wrong digest',f=>f.manifest.proofDigest='0'.repeat(64)],['after lifetime',f=>f.serverNow=20000]])test(name+' cannot disarm',()=>{const f=fixture();mutate(f);assert.throws(()=>validateWatchdogDisarm(f));});
for(const [name,mutate,pattern] of [
 ['different backend version',t=>t.backendVersion='different',/qualified backend/],
 ['different backend service',t=>t.privateBackendService='different',/qualified backend/],
 ['docs only acceptance',t=>t.checks=t.checks.filter(c=>c.path==='/docs'),/fixed anchor checks/],
 ['missing Viator',t=>t.checks=t.checks.filter(c=>c.path!=='/app/viator'),/fixed anchor checks/],
 ['different CSS bytes',t=>t.checks.find(c=>c.contentTypePrefix==='text/css').sha256='0'.repeat(64),/fixed anchor checks/],
 ['weakened Canva requirements',t=>t.checks.find(c=>c.path==='/app/canva').requiredText=[],/fixed anchor checks/]
])test(name+' rejected even with updated package file hash',()=>{const f=fixture(),t=JSON.parse(f.files['ticket.json']);mutate(t);f.files['ticket.json']=JSON.stringify(t);f.manifest.files['ticket.json']=sha(f.files['ticket.json']);assert.throws(()=>validateWatchdogDisarm(f),pattern);});
