import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {z} from 'zod';
import {parseSubmissionForm} from '../lib/submit';
const pkg=(name:string)=>JSON.parse(readFileSync(`node_modules/${name}/package.json`,'utf8'));
test('security-patched React runtime and vendored Flight stay aligned',()=>{
 for(const name of ['react','react-dom','react-server-dom-webpack','@vitejs/plugin-rsc/dist/vendor/react-server-dom'])assert.equal(pkg(name).version,'19.3.1');
 assert.equal(pkg('@vitejs/plugin-rsc').version,'0.5.39');
 assert.equal(pkg('zod').version,'4.6.6');
});
test('oversized constrained arrays stop before per-element error amplification',()=>{
 const result=z.array(z.string()).max(4).safeParse(Array(100).fill(0));
 assert.equal(result.success,false);assert.equal(result.error?.issues.length,1);assert.equal(result.error?.issues[0]?.code,'too_big');
});
test('patched validation preserves a normal multi-platform submission form',()=>{
 const form=new FormData();
 for(const [key,value] of Object.entries({name:'Local fixture',tagline:'A normal local submission fixture',description:'This local fixture checks ordinary submission parsing without sending anything or writing user data.',mcp_transport:'http',auth_type:'none',publisher:'Local tests',homepage_url:'https://example.com',capabilities_json:'["Search"]',categories_json:'["tools"]',surfaces_json:JSON.stringify([{platform:'chatgpt',type:'app',isPrimary:true,status:'available'},{platform:'claude',type:'connector',isPrimary:false,status:'available'}]),tools_json:'[{"name":"search","description":"Find a result"}]',previews_json:'[{"prompt":"Find a result","imageUrl":"https://example.com/preview.png"}]'}))form.set(key,value);
 const result=parseSubmissionForm(form);
 assert.equal(result.data.name,'Local fixture');assert.equal(result.data.surfaces.length,2);assert.equal(result.data.tools.length,1);assert.equal(result.data.previews.length,1);assert.equal(result.assets.iconFile,null);
});
