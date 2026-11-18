import {assertPublicSmokeChecks} from './public-domain-smoke.mjs';
// One construction path shared by the production publisher and CI regression.
export function productionSmokeChecks({appPath,appName,css,icon}){
 if(typeof appName!=='string'||!appName||typeof appPath!=='string'||!appPath.startsWith('/app/')||typeof css!=='string'||!css.endsWith('.css')||css.includes('/')||typeof icon!=='string'||! /^(icons|previews)\//.test(icon))throw Error('Production smoke inputs required');
 const fallbackChecks=[{path:appPath,status:200,contentTypePrefix:'text/html',canonical:'https://mcpapp.net'+appPath,renderedBody:true,requiredText:[appName]}];
 const publicChecks=[{path:'/docs',status:200,delivery:'astro-static',contentTypePrefix:'text/html',canonical:'https://mcpapp.net/docs'},{...fallbackChecks[0],delivery:'astro-static'},{path:'/_astro/'+css,status:200,contentTypePrefix:'text/css'},{host:'cdn.mcpapp.net',path:'/'+icon,status:200,contentTypePrefix:'image/'},{path:'/admin',status:401},{path:'/app/viator',status:410}];
 assertPublicSmokeChecks(publicChecks);
 const baselineChecks=publicChecks.map(c=>({...c,delivery:undefined,canonical:undefined,...(c.path.startsWith('/_astro/')?{baselineMayBeMissing:true}:{})}));
 return {fallbackChecks,publicChecks,baselineChecks};
}
