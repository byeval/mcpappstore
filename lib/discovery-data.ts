import type {AppCollection} from "./collections";
import {getDb} from './cloudflare';
import {safeJsonParse} from './utils';
import type {CatalogApp,AppSurface} from './types';
export type CollectionCandidate=Pick<CatalogApp,'id'|'name'|'tagline'|'publisher'|'categories'|'capabilities'|'surfaces'>;
export type DiscoveryCandidate=CollectionCandidate & Pick<CatalogApp,'description'|'homepageUrl'|'repoUrl'|'mcpEndpoint'|'installCmd'|'authType'|'mcpTransport'|'examplePrompts'|'source'|'isFeatured'|'publishedAt'|'updatedAt'|'tags'|'tools'|'previews'>;
async function readCandidates(rich:boolean,limit?:number,collection?:AppCollection):Promise<Array<Record<string,unknown>>>{
 const db=await getDb();if(!db)throw Error('Discovery projection requires D1');
 const fields=rich?",a.description,a.homepage_url,a.repo_url,a.mcp_endpoint,a.install_cmd,a.auth_type,a.mcp_transport,a.example_prompts,a.is_featured,a.published_at,a.updated_at":"";
 const surfaceFields=rich?",'description',s.description,'examplePrompts',s.example_prompts":"";
 const tokens=collection?.matchTerms.map(term=>term.toLowerCase().match(/[a-z0-9]+/)?.[0]);
 const canFilter=Boolean(collection&&tokens?.length&&tokens.every(Boolean));
 // Substring is only a conservative candidate condition. Unicode/JSON-escaped
 // candidates always survive; the exact JS word-boundary matcher decides.
 const blob=`COALESCE(a.name,'')||' '||COALESCE(a.tagline,'')||' '||COALESCE(a.publisher,'Unknown')||' '||COALESCE(a.capabilities,'')||' '||COALESCE((SELECT group_concat(category_slug,' ') FROM app_categories WHERE app_id=a.id),'')||' '||COALESCE((SELECT group_concat(platform||' '||surface_type||' '||COALESCE(display_name,'')||' '||COALESCE(tagline,'')||' '||COALESCE(capabilities,'')||' '||COALESCE(tools,''),' ') FROM app_surfaces WHERE app_id=a.id),CASE WHEN a.source='claude_seed' THEN 'claude connector' ELSE 'chatgpt app' END)`;
 const platformWhere=collection?.platform?" AND (EXISTS(SELECT 1 FROM app_surfaces ps WHERE ps.app_id=a.id AND ps.platform=?) OR (NOT EXISTS(SELECT 1 FROM app_surfaces ps WHERE ps.app_id=a.id) AND CASE WHEN a.source='claude_seed' THEN 'claude' ELSE 'chatgpt' END=?))":"";
 const candidateWhere=canFilter?` AND (a.id IN (SELECT value FROM json_each(?)) OR EXISTS(SELECT 1 FROM app_categories ac WHERE ac.app_id=a.id AND ac.category_slug IN (SELECT value FROM json_each(?))) OR a.id IN (SELECT id FROM candidate_text WHERE blob GLOB '*[^ -~]*' OR instr(blob,char(92)||'u')>0 OR EXISTS(SELECT 1 FROM json_each(?) term WHERE instr(lower(blob),term.value)>0)))`:'';
 const params:Array<string|number>=[...(collection?.platform?[collection.platform,collection.platform]:[]),...(canFilter?[JSON.stringify(collection!.appIds??[]),JSON.stringify(collection!.categorySlugs),JSON.stringify(tokens)]:[])];if(limit!==undefined)params.push(limit);
 const cte=canFilter?`WITH candidate_text AS MATERIALIZED (SELECT a.id,${blob} AS blob FROM apps a WHERE a.status='published' AND lower(a.id)!='viator') `:'';
 const statement=db.prepare(`${cte}SELECT a.id,a.name,a.tagline,a.publisher,a.source,a.capabilities${fields},
 (SELECT json_group_array(category_slug) FROM (SELECT category_slug FROM app_categories WHERE app_id=a.id ORDER BY category_slug)) AS categories,
 (SELECT json_group_array(json(surface)) FROM (SELECT json_object('platform',s.platform,'type',s.surface_type,'displayName',s.display_name,'tagline',s.tagline,'externalId',s.external_id,'isPrimary',s.is_primary,'status',s.status,'capabilities',s.capabilities,'tools',s.tools${surfaceFields}) AS surface FROM app_surfaces s WHERE s.app_id=a.id ORDER BY s.is_primary DESC,s.platform,s.surface_type,s.external_id)) AS surfaces
 FROM apps a WHERE a.status='published' AND lower(a.id)!='viator'${platformWhere}${candidateWhere} ORDER BY CASE WHEN a.is_featured=1 THEN 1 ELSE 0 END DESC,COALESCE(NULLIF(a.published_at,0),a.updated_at) DESC,a.id${limit===undefined?'':' LIMIT ?'}`);
 const result=await (params.length?statement.bind(...params):statement).all<Record<string,unknown>>();
 if(!result.success)throw Error('Authoritative discovery projection unavailable');return result.results;
}
function base(r:Record<string,unknown>):CollectionCandidate{
 const parsed=JSON.parse(String(r.surfaces));if(!Array.isArray(parsed))throw Error('Invalid authoritative discovery surfaces');
 const surfaces:AppSurface[]=parsed.length?parsed.map(s=>({platform:s.platform,type:s.type,displayName:s.displayName,tagline:s.tagline,description:s.description,externalId:s.externalId,isPrimary:Number(s.isPrimary??0)===1,status:s.status??'available',capabilities:s.capabilities?safeJsonParse(String(s.capabilities),[]):undefined,tools:s.tools?safeJsonParse(String(s.tools),[]):undefined,examplePrompts:s.examplePrompts?safeJsonParse(String(s.examplePrompts),[]):undefined})):[{platform:r.source==='claude_seed'?'claude':'chatgpt',type:r.source==='claude_seed'?'connector':'app',displayName:String(r.name),isPrimary:true,status:'available'}];
 return {id:String(r.id),name:String(r.name),tagline:String(r.tagline),publisher:String(r.publisher??'Unknown'),categories:JSON.parse(String(r.categories)),capabilities:safeJsonParse(String(r.capabilities??'[]'),[]),surfaces};
}
export async function listCollectionCandidates(limit?:number):Promise<CollectionCandidate[]>{const safeLimit=limit===undefined?undefined:Math.max(1,Math.min(100,Math.floor(limit)));const db=await getDb();if(!db){const {listPublishedApps}=await import('./data');return (await listPublishedApps()).slice(0,safeLimit);}return (await readCandidates(false,safeLimit)).map(base);}
export async function listDiscoveryCandidates():Promise<DiscoveryCandidate[]>{const db=await getDb();if(!db){const {listPublishedApps}=await import('./data');return listPublishedApps();}return (await readCandidates(true)).map(r=>({...base(r),description:String(r.description??''),homepageUrl:r.homepage_url?String(r.homepage_url):undefined,repoUrl:r.repo_url?String(r.repo_url):undefined,mcpEndpoint:r.mcp_endpoint?String(r.mcp_endpoint):undefined,installCmd:r.install_cmd?String(r.install_cmd):undefined,authType:String(r.auth_type??'none') as CatalogApp['authType'],mcpTransport:String(r.mcp_transport??'http') as CatalogApp['mcpTransport'],examplePrompts:safeJsonParse(String(r.example_prompts??'[]'),[]),source:String(r.source??'user') as CatalogApp['source'],isFeatured:Number(r.is_featured??0)===1,publishedAt:r.published_at?Number(r.published_at):null,updatedAt:Number(r.updated_at),tags:[],tools:[],previews:[]}));}

export async function listCollectionCandidatesFor(collection:AppCollection):Promise<CollectionCandidate[]>{const db=await getDb();if(!db)return listCollectionCandidates();return (await readCandidates(false,undefined,collection)).map(base);}
