import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import path from 'node:path';import {pathToFileURL} from 'node:url';
const source=process.env.CURRENT_SOURCE_REPO??path.resolve('..');
const {relatedAppScore}=await import(pathToFileURL(path.join(source,'lib/related-app-score.ts')).href);
import {indexedRelatedApps,productionRelatedScore} from '../src/production/lib/related-apps.ts';
const raw=JSON.parse(fs.readFileSync(new URL('../src/data/catalog.json',import.meta.url)));
const binary=(a,b)=>a<b?-1:a>b?1:0;
const apps=raw.apps.filter(a=>a.status==='published'&&a.id!=='viator').map(a=>({...a,categories:[...a.categories].sort(binary),capabilities:a.capabilities??[],surfaces:a.surfaces?.length?a.surfaces:[{platform:a.source==='claude_seed'?'claude':'chatgpt',type:a.source==='claude_seed'?'connector':'app'}]}));
const compare=(a,b)=>b.score-a.score||Number(b.app.isFeatured)-Number(a.app.isFeatured)||a.app.name.localeCompare(b.app.name)||(b.app.publishedAt??b.app.updatedAt)-(a.app.publishedAt??a.app.updatedAt)||a.app.id.localeCompare(b.app.id);
const reference=(app,list)=>list.filter(a=>a.id!==app.id).map(a=>({app:a,score:relatedAppScore(app,a)})).filter(a=>a.score>0).sort(compare).slice(0,4).map(a=>a.app.id);
test('indexed full public14k snapshot recommendations equal bounded backend reference',()=>{assert.ok(apps.length>14000);const selected=[apps.find(a=>a.id==='canva'),...Array.from({length:30},(_,i)=>apps[(i*487)%apps.length])];for(const app of selected){assert.deepEqual(indexedRelatedApps(app,apps).map(a=>a.id),reference(app,apps),app.id);for(const b of apps.slice(0,30))assert.equal(productionRelatedScore(app,b),relatedAppScore(app,b));}});
test('complete score featured name ties resolve date then ID including Unicode and duplicate terms',()=>{const base={...apps[0],name:'Éclair',categories:['ÉCOLE','école'],capabilities:['東京','東京'],surfaces:[{platform:'chatgpt',type:'app'}],isFeatured:false,publishedAt:null,updatedAt:1};const app={...base,id:'origin'};const list=['東京','é','a','z','ß','b'].map((id,i)=>({...base,id,publishedAt:i<2?10:null,updatedAt:5})).reverse();assert.deepEqual(indexedRelatedApps(app,list).map(a=>a.id),reference(app,list));assert.deepEqual(indexedRelatedApps(app,[...list].reverse()).map(a=>a.id),reference(app,list));for(const b of list)assert.equal(productionRelatedScore(app,b),relatedAppScore(app,b));});

test('reference tie contract remains present in actual bounded backend',()=>{const code=fs.readFileSync(path.join(source,'lib/data.ts'),'utf8').replace(/\s+/g,'');assert.ok(code.includes('a.app.name.localeCompare(b.app.name)||(b.app.publishedAt??b.app.updatedAt)-(a.app.publishedAt??a.app.updatedAt)||a.app.id.localeCompare(b.app.id)'));});
