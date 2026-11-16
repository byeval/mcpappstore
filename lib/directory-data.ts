import {getDb} from './cloudflare';
import type {AppPlatform,CatalogApp} from './types';
export type DirectoryIndexApp=Pick<CatalogApp,'id'|'name'|'tagline'|'publisher'|'publishedAt'|'updatedAt'> & {surfaces:Array<{platform:AppPlatform}>};
const publicWhere="a.status='published' AND lower(a.id)!='viator'";
const has=(platform:string)=>`(EXISTS(SELECT 1 FROM app_surfaces s WHERE s.app_id=a.id AND s.platform='${platform}') OR (NOT EXISTS(SELECT 1 FROM app_surfaces s WHERE s.app_id=a.id) AND CASE WHEN a.source='claude_seed' THEN 'claude' ELSE 'chatgpt' END='${platform}'))`;
const platformsSql=`CASE WHEN NOT EXISTS(SELECT 1 FROM app_surfaces s WHERE s.app_id=a.id) THEN json_array(CASE WHEN a.source='claude_seed' THEN 'claude' ELSE 'chatgpt' END) ELSE (SELECT json_group_array(platform) FROM (SELECT platform FROM app_surfaces s WHERE s.app_id=a.id ORDER BY is_primary DESC,platform,surface_type,external_id)) END`;
function platforms(value:unknown):Array<{platform:AppPlatform}>{const parsed=JSON.parse(String(value));if(!Array.isArray(parsed)||parsed.some(x=>x!=='chatgpt'&&x!=='claude'))throw Error('Invalid authoritative platforms');return parsed.map(platform=>({platform}));}
export async function listDirectoryIndex():Promise<DirectoryIndexApp[]>{
 const db=await getDb();if(!db){const {listPublishedApps}=await import('./data');return (await listPublishedApps()).map(({id,name,tagline,publisher,publishedAt,updatedAt,surfaces})=>({id,name,tagline,publisher,publishedAt,updatedAt,surfaces:surfaces.map(({platform})=>({platform}))}));}
 const rows=await db.prepare(`SELECT a.id,a.name,a.tagline,a.publisher,a.published_at,a.updated_at,${platformsSql} AS platforms FROM apps a WHERE ${publicWhere} ORDER BY a.is_featured DESC,COALESCE(a.published_at,a.updated_at) DESC,a.id`).all<Record<string,unknown>>();
 if(!rows.success)throw Error('Authoritative directory index unavailable');
 return rows.results.map(r=>({id:String(r.id),name:String(r.name),tagline:String(r.tagline),publisher:String(r.publisher??'Unknown'),publishedAt:r.published_at?Number(r.published_at):null,updatedAt:Number(r.updated_at),surfaces:platforms(r.platforms)}));
}
export async function getDirectoryCount():Promise<number>{const db=await getDb();if(!db)return (await listDirectoryIndex()).length;const row=await db.prepare(`SELECT COUNT(*) AS total FROM apps a WHERE ${publicWhere}`).first<{total:number}>();if(!row)throw Error("Authoritative directory count unavailable");return Number(row.total);}
export interface DirectoryStats {total:number;latestUpdatedAt:number;latestTimestamp:number;chatgpt:number;claude:number;overlap:number;http:number;sse:number;oauth:number;noAuth:number;interactive:number;withToolsCount:number;withExamplePromptsCount:number;withRepoCount:number;withPreviewsCount:number}
export async function getDirectoryStats():Promise<DirectoryStats>{
 const db=await getDb();if(!db){const {listPublishedApps,getCatalogQualityStats}=await import('./data');const apps=await listPublishedApps(),quality=await getCatalogQualityStats();const has=(a:CatalogApp,p:string)=>a.surfaces.some(s=>s.platform===p);return {total:apps.length,latestUpdatedAt:Math.max(0,...apps.map(a=>a.updatedAt)),latestTimestamp:Math.max(0,...apps.map(a=>Math.max(a.updatedAt,a.publishedAt??0))),chatgpt:apps.filter(a=>has(a,'chatgpt')).length,claude:apps.filter(a=>has(a,'claude')).length,overlap:apps.filter(a=>has(a,'chatgpt')&&has(a,'claude')).length,http:apps.filter(a=>a.mcpTransport==='http').length,sse:apps.filter(a=>a.mcpTransport==='sse').length,oauth:apps.filter(a=>a.authType==='oauth').length,noAuth:apps.filter(a=>a.authType==='none').length,interactive:apps.filter(a=>a.previews.length>0||a.categories.includes('design')).length,...quality};}
 const row=await db.prepare(`SELECT COUNT(*) AS total,MAX(a.updated_at) AS latestUpdatedAt,MAX(MAX(a.updated_at,COALESCE(a.published_at,0))) AS latestTimestamp,
 SUM(${has('chatgpt')}) AS chatgpt,SUM(${has('claude')}) AS claude,SUM(${has('chatgpt')} AND ${has('claude')}) AS overlap,
 SUM(COALESCE(a.mcp_transport,'http')='http') AS http,SUM(COALESCE(a.mcp_transport,'http')='sse') AS sse,SUM(COALESCE(a.auth_type,'none')='oauth') AS oauth,SUM(COALESCE(a.auth_type,'none')='none') AS noAuth,
 SUM(EXISTS(SELECT 1 FROM app_categories ac WHERE ac.app_id=a.id AND ac.category_slug='design')) AS interactive,
 SUM(EXISTS(SELECT 1 FROM app_tools t WHERE t.app_id=a.id) OR EXISTS(SELECT 1 FROM app_surfaces s WHERE s.app_id=a.id AND s.tools IS NOT NULL AND s.tools!='[]')) AS withToolsCount,
 SUM((a.example_prompts IS NOT NULL AND a.example_prompts!='[]') OR EXISTS(SELECT 1 FROM app_surfaces s WHERE s.app_id=a.id AND s.example_prompts IS NOT NULL AND s.example_prompts!='[]')) AS withExamplePromptsCount,
 SUM(a.repo_url IS NOT NULL AND a.repo_url!='') AS withRepoCount,
 SUM(EXISTS(SELECT 1 FROM app_previews p WHERE p.app_id=a.id) OR EXISTS(SELECT 1 FROM app_surfaces s WHERE s.app_id=a.id AND s.previews IS NOT NULL AND s.previews!='[]')) AS withPreviewsCount
 FROM apps a WHERE ${publicWhere}`).first<Record<keyof DirectoryStats,number|null>>();
 if(!row)throw Error('Authoritative directory statistics unavailable');return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,Number(v??0)])) as unknown as DirectoryStats;
}
export interface DirectoryExample {id:string;name:string;tagline:string;mcpTransport:string;authType:string;platformLabel:string;metadataSignal:string}
export async function listDirectoryExamples(limit:number):Promise<DirectoryExample[]>{
 const safeLimit=Math.max(1,Math.min(Math.floor(limit),24));const db=await getDb();if(!db){const {listMetadataRichApps}=await import('./data');const {appPlatformLabel,appMetadataSignal}=await import('./directory-content');return (await listMetadataRichApps(safeLimit)).map(a=>({id:a.id,name:a.name,tagline:a.tagline,mcpTransport:a.mcpTransport,authType:a.authType,platformLabel:appPlatformLabel(a),metadataSignal:appMetadataSignal(a)}));}
 const rows=await db.prepare(`SELECT a.id,a.name,a.tagline,a.mcp_transport,a.auth_type,a.repo_url,a.install_cmd,a.mcp_endpoint,${platformsSql} AS platforms,
 (SELECT COUNT(*) FROM app_tools t WHERE t.app_id=a.id) AS tools,
 CASE WHEN json_valid(a.example_prompts) THEN CASE WHEN json_type(a.example_prompts)='array' THEN json_array_length(a.example_prompts) ELSE 0 END ELSE 0 END AS prompts,
 (SELECT COUNT(*) FROM app_previews p WHERE p.app_id=a.id) AS previews
 FROM apps a WHERE ${publicWhere} AND (EXISTS(SELECT 1 FROM app_tools t WHERE t.app_id=a.id) OR EXISTS(SELECT 1 FROM app_previews p WHERE p.app_id=a.id) OR a.repo_url IS NOT NULL OR a.install_cmd IS NOT NULL OR a.mcp_endpoint IS NOT NULL OR (a.example_prompts IS NOT NULL AND a.example_prompts!='[]') OR EXISTS(SELECT 1 FROM app_surfaces s WHERE s.app_id=a.id AND ((s.tools IS NOT NULL AND s.tools!='[]') OR (s.example_prompts IS NOT NULL AND s.example_prompts!='[]'))))
 ORDER BY a.is_featured DESC,COALESCE(a.published_at,a.updated_at) DESC LIMIT ?`).bind(safeLimit).all<Record<string,unknown>>();
 if(!rows.success)throw Error('Authoritative directory examples unavailable');return rows.results.map(r=>{const ps=platforms(r.platforms);return {id:String(r.id),name:String(r.name),tagline:String(r.tagline),mcpTransport:String(r.mcp_transport??'http'),authType:String(r.auth_type??'none'),platformLabel:[ps.some(s=>s.platform==='chatgpt')?'ChatGPT':'',ps.some(s=>s.platform==='claude')?'Claude':''].filter(Boolean).join(' + '),metadataSignal:Number(r.tools)>0?`${r.tools} tools`:Number(r.prompts)>0?`${r.prompts} prompts`:Number(r.previews)>0?`${r.previews} previews`:r.repo_url?'GitHub repo':r.install_cmd?'install command':r.mcp_endpoint?'endpoint listed':'metadata available'};});
}
