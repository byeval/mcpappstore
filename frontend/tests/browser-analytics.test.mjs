import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import ts from 'typescript';

function harness({hostname='mcpapp.net',href='https://mcpapp.net/app/canva?q=private#secret',disabled=false,webdriver=false,marker=true,token=''}={}){
 const sent=[],scripts=[],listeners=new Map(),windowListeners=new Map(),frames=[];
 class FakeElement{constructor(dataset={}){this.dataset=dataset;}closest(){return this;}}
 const document={title:'Canva',referrer:'https://mcpapp.net/search?q=private&utm_source=test#secret',cookie:'',head:{appendChild:s=>scripts.push(s)},getElementById:id=>id==='mcpapp-production-analytics'?(marker?{dataset:{measurementId:'G-17PKWX92D6',cloudflareToken:token}}:null):scripts.find(s=>s.id===id),querySelector:()=>scripts.find(s=>s.src?.includes('cloudflareinsights')),createElement:()=>({dataset:{}}),addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:(k,f)=>{if(listeners.get(k)===f)listeners.delete(k);}};
 const window={location:{hostname,href},navigator:{webdriver},sessionStorage:{getItem:()=>disabled?'1':null},history:{pushState(){},replaceState(){}},addEventListener:(k,f)=>windowListeners.set(k,f),removeEventListener:k=>windowListeners.delete(k),requestAnimationFrame:f=>{frames.push(f);return frames.length;},cancelAnimationFrame:()=>{},gtag:(...args)=>sent.push(args)};
 const context=vm.createContext({window,document,URL,Date,Element:FakeElement});
 const source=fs.readFileSync('src/lib/browser-analytics.ts','utf8').replace(/export /g,'');
 const entry=fs.readFileSync('src/lib/analytics-entry.ts','utf8').replace(/^import .*;$/m,'').replace(/export /g,'');
 const js=ts.transpileModule(source+'\n'+entry,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 vm.runInContext(js+'\nglobalThis.api={analyticsAllowed,analyticsUrl,startGoogleAnalytics,startCloudflareAnalytics,trackCatalogEvent,initializeProductionAnalytics};',context);
 return {api:context.api,window,document,sent,scripts,listeners,FakeElement,frames};
}

test('browser analytics logic is byte-for-byte current production source',()=>{
 assert.equal(createHash('sha256').update(fs.readFileSync('src/lib/browser-analytics.ts')).digest('hex'),'3c0db9f0eb58c176e371cbacacbeaada80ae9da5463d54517da37cb437dafeba');
});
test('preview without production marker never initializes trackers or sends events',()=>{
 const h=harness({marker:false,token:'optional'});h.api.initializeProductionAnalytics();assert.equal(h.scripts.length,0);assert.equal(h.sent.length,0);
});
test('hostname, webdriver, session and explicit optout all suppress both trackers',()=>{
 for(const options of [{hostname:'candidate.workers.dev'},{webdriver:true},{disabled:true}]){const h=harness({...options,token:'optional'});h.api.initializeProductionAnalytics();assert.equal(h.scripts.length,0);assert.equal(h.sent.length,0);}
 const h=harness();h.window.__MCPAPP_DISABLE_ANALYTICS__=true;h.api.startGoogleAnalytics('G-17PKWX92D6');assert.equal(h.sent.length,0);
});
test('page views strip private query, fragment, credentials and sanitize referrer',()=>{
 const h=harness();h.api.initializeProductionAnalytics();assert.equal(h.scripts.length,1);
 const view=h.sent.find(s=>s[0]==='event'&&s[1]==='page_view')[2];assert.equal(view.page_location,'https://mcpapp.net/app/canva');assert.equal(view.page_referrer,'https://mcpapp.net/search?utm_source=test');
 assert.equal(h.api.analyticsUrl('https://user:pass@mcpapp.net/mcp-inspector?token=secret&q=secret&id=secret&page=2&utm_campaign=safe#secret'),'https://mcpapp.net/mcp-inspector?page=2&utm_campaign=safe');
 h.api.startGoogleAnalytics('G-17PKWX92D6');assert.equal(h.sent.filter(s=>s[1]==='page_view').length,1);assert.equal(h.scripts.length,1);
});
test('trusted outbound app clicks only, optional CF and cleanup preserve existing behavior',()=>{
 const h=harness({token:'existing-token'});const stop=h.api.initializeProductionAnalytics();assert.equal(h.scripts.length,2);assert.equal(h.scripts.find(s=>s.src.includes('cloudflareinsights')).dataset.cfBeacon,'{"token":"existing-token"}');
 const target=new h.FakeElement({analyticsApp:'canva',analyticsPlatform:'chatgpt'});
 h.listeners.get('click')({isTrusted:false,target,type:'click'});assert.equal(h.sent.some(s=>s[1]==='app_open'),false);
 h.listeners.get('click')({isTrusted:true,target,type:'click'});const event=h.sent.find(s=>s[1]==='app_open')[2];assert.equal(event.app_id,'canva');assert.equal(event.platform,'chatgpt');assert.equal(event.page_location,'https://mcpapp.net/app/canva');
 stop();assert.equal(h.listeners.size,0);
});
test('successful submission lead requires receipt cookie rather than thank-you URL alone',()=>{
 const a=harness({href:'https://mcpapp.net/submit/success?id=secret'});a.api.initializeProductionAnalytics();assert.equal(a.sent.some(s=>s[1]==='generate_lead'),false);
 const b=harness({href:'https://mcpapp.net/submit/success?id=secret'});b.document.cookie='mcpapp_submission_received=1';b.api.initializeProductionAnalytics();assert.equal(b.sent.filter(s=>s[1]==='generate_lead').length,1);assert.match(b.document.cookie,/Max-Age=0/);
});
