// Lightweight production candidate: no catalog/React/D1 hydration in this bundle.
import {createShardedAssets} from '../sharding/asset-binding.mjs';
const locales=new Set(['en','es','fr','de','ru','zh-hans','ja','ko']);
function localeFor(segment){const value=segment.toLowerCase();if(locales.has(value))return value;if(['zh','zh-cn','zh-sg'].includes(value)||value.startsWith('zh-hans'))return 'zh-hans';if(['jp','ja-jp'].includes(value))return 'ja';if(['kr','ko-kr'].includes(value))return 'ko';}
function configuredList(value){try{const list=JSON.parse(value??'[]');return Array.isArray(list)&&list.every(x=>typeof x==='string')?list:[];}catch{return [];}}
// No route is migrated implicitly. Only exact paths or explicitly audited families.
function audited(path,env){if(env.ASTRO_ROUTE_SET instanceof Set)return env.ASTRO_ROUTE_SET.has(path);return configuredList(env.ASTRO_ROUTE_FAMILIES).some(rule=>rule.endsWith('/*')?(path===rule.slice(0,-2)||path.startsWith(rule.slice(0,-1))):path===rule);}
function fail(status,message){return new Response(message,{status,headers:{'Cache-Control':'private, no-store','Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex'}});}
function redirect(url){return new Response(null,{status:308,headers:{Location:url.href,'Cache-Control':'private, no-store'}});}
async function legacy(request,env){if(!env.LEGACY?.fetch)return fail(503,'Compatibility backend unavailable');const headers=new Headers(request.headers);for(const key of [...headers.keys()])if(key.startsWith('x-mcp-')||['x-forwarded-proto','x-forwarded-host','x-forwarded-for','x-real-ip'].includes(key))headers.delete(key);try{return await env.LEGACY.fetch(new Request(request,{headers,redirect:'manual'}));}catch{return fail(502,'Compatibility backend unavailable');}}
export default {async fetch(request,env){
 const url=new URL(request.url);let pathname;try{pathname=decodeURIComponent(url.pathname).replace(/\/+$/,'')||'/';}catch{return fail(400,'Malformed path');}
 // Durable public identity removal also covers normalized locale/alias/RSC/OG variants.
 const removedPath=pathname.replace(/\\/g,'/').replace(/\/+/g,'/');
 if(/(?:^|\/)(?:apps?|api\/og)\/viator(?:\/|\.rsc$|$)/i.test(removedPath))return fail(410,'Gone');
 if(pathname.includes('\\')||pathname.includes('\0')||/%[0-9a-f]{2}/i.test(pathname)||pathname.includes('//')||pathname.split('/').some(p=>p==='.'||p==='..'))return fail(400,'Ambiguous path');
 // Backend release attestation is private-service-only, never a new public front route.
 if(/(?:^|\/)__mcpapp-release$/i.test(pathname))return fail(404,'Not found');
 if(configuredList(env.DENIED_PATHS).includes(pathname))return fail(410,'Gone');
 const preview=env.PREVIEW_MODE==='true';
 if(preview&&!['GET','HEAD'].includes(request.method))return fail(405,'Writes disabled in migration preview');
 if(!preview&&(['mcpapp.net','www.mcpapp.net'].includes(url.hostname))&&(url.hostname==='www.mcpapp.net'||url.protocol!=='https:')){url.hostname='mcpapp.net';url.protocol='https:';return redirect(url);}
 const segment=pathname.split('/')[1];const locale=localeFor(segment);const prefix=locale?`/${segment}`:'';const internal=pathname.slice(prefix.length)||'/';
 const rsc=request.headers.get('rsc')==='1'||request.headers.get('accept')?.includes('text/x-component')||pathname.endsWith('.rsc');
 // Dynamic routes precede all snapshot freshness decisions; POSTs never enter HTML fallback.
 if(/^\/(admin|api|submit)(\/|$)/.test(internal)||internal==='/_revalidate'||/^\/(assets|_next)\//.test(pathname)||rsc||!['GET','HEAD'].includes(request.method)){
  if(preview&&/^\/admin(?:\/|$)/.test(internal))return fail(401,'Admin unavailable in migration preview');
  return legacy(request,env);
 }
 const staticFile=/\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|map)$/.test(pathname);
 // Current production locale selection is URL-only, never cookie or Accept-Language.
 if(!staticFile&&locale&&(segment!==locale||locale==='en')){url.pathname=(locale==='en'?'':`/${locale}`)+(internal==='/'?(locale==='en'?'/':''):internal);return redirect(url);}
 if(!audited(internal,env)&&!pathname.startsWith('/_astro/'))return legacy(request,env);
 // Preserve query-dependent behavior unless its exact semantics were ported.
 const safeQuery=new Set(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid']);
 const isPaged=/^\/category\/[^/]+$/.test(internal)||['/chatgpt-apps','/claude-connectors'].includes(internal);
 if([...url.searchParams.keys()].some(key=>!safeQuery.has(key)&&!(isPaged&&key==='page')))return legacy(request,env);
 if(!staticFile){
  if(!env.DB?.prepare)return legacy(request,env);
  try{
   const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
   const marker=await db.prepare('SELECT revision,content_revision,phase,updated_at FROM astro_publication_state WHERE id=1').first();
   const created=Number(env.SNAPSHOT_CREATED_AT);const expired=!Number.isFinite(created)||created<=0||created>Date.now()+300000||Date.now()-created>Number(env.SNAPSHOT_MAX_AGE_MS??86400000);
   if(expired||marker?.phase!=='ready'||typeof marker.revision!=='string'||!marker.revision||marker.revision!==env.SNAPSHOT_MARKER_ID||typeof marker.content_revision!=='string'||!marker.content_revision||marker.content_revision!==env.SNAPSHOT_CONTENT_REVISION)return legacy(request,env);
  }catch{return legacy(request,env);}
 }
 if(isPaged){const pages=url.searchParams.getAll('page');if(pages.length>1||(pages.length===1&&!/^[1-9]\d{0,3}$/.test(pages[0])))return fail(404,'Page not found');if(Number(pages[0]??1)>1)pathname+=`/page/${pages[0]}`;}
 url.pathname=pathname;url.search='';
 const headers=new Headers();for(const h of ['accept','if-none-match','if-modified-since','range'])if(request.headers.has(h))headers.set(h,request.headers.get(h));
 let response;try{response=await createShardedAssets(env,env.STATIC_SHARD_MODE??'two').fetch(new Request(url,{method:request.method,headers}));}catch{return legacy(request,env);}
 if(response.status===404||response.status>=500)return legacy(request,env); // Preserve unported routes, never a false success.
 const out=new Headers(response.headers);out.set('X-Mcp-Delivery','astro-static');
 if(pathname.endsWith('/markdown'))out.set('Content-Type','text/markdown; charset=utf-8');
 if(pathname.endsWith('/rss.xml'))out.set('Content-Type','application/rss+xml; charset=utf-8');
 if(pathname.endsWith('.txt'))out.set('Content-Type','text/plain; charset=utf-8');
 if(preview){out.set('X-Robots-Tag','noindex, nofollow');out.set('Cache-Control','private, no-store');}
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers:out});
}};
