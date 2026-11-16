import crypto from 'node:crypto';
import {EXPORT_SQL} from '../publishing/export.mjs';
import {sanitizeCatalog} from '../publishing/sanitize.mjs';
// Reuse only the existing public-table SELECT arms, not the experimental state arm.
// CTE names the columns after removing the old state's aliases. Entire export is
// ONE read statement, so apps/categories/skills/associations share one DB snapshot.
const separator='UNION ALL';
const start=EXPORT_SQL.indexOf(separator);
if(start<0||!EXPORT_SQL.slice(0,start).includes("'state'"))throw Error('Public export SQL structure changed; review required');
const baseBody=EXPORT_SQL.slice(start+separator.length).replace(/ORDER BY kind,payload\s*$/,'').trim();
const body=baseBody.replace("json_object('prompt',prompt","json_object('sort',sort,'prompt',prompt").replace("'publisher',a.publisher","'heroKey',a.hero_key,'mcpEndpoint',a.mcp_endpoint,'mcpTransport',a.mcp_transport,'installCmd',a.install_cmd,'authType',a.auth_type,'isFeatured',a.is_featured,'source',a.source,'createdAt',a.created_at,'tags',json(COALESCE((SELECT json_group_array(tag_slug) FROM app_tags WHERE app_id=a.id),'[]')),'publisher',a.publisher").replace("'platform',platform,'type',surface_type","'tools',json(COALESCE(tools,'[]')),'externalId',external_id,'displayName',display_name,'mcpEndpoint',mcp_endpoint,'mcpTransport',mcp_transport,'installCmd',install_cmd,'authType',auth_type,'isPrimary',is_primary,'platform',platform,'type',surface_type");
export const EXPORT_V3_SQL=`WITH public_rows(kind,payload) AS (${body}) SELECT kind,payload FROM public_rows ORDER BY kind,payload`;
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 return value;
}
export function validateBlockedPolicy(blockedPaths){
 if(!Array.isArray(blockedPaths)||blockedPaths.some(p=>typeof p!=='string'||!p.startsWith('/')||/[?#%\\\x00-\x1f\x7f]/.test(p)||p.includes('//')||(p.length>1&&p.endsWith('/'))||p.split('/').some(s=>s==='.'||s==='..')))throw Error('Explicit canonical blockedPaths policy required');
 return [...new Set(blockedPaths)].sort();
}
export function snapshotFromPublicRows(rows,{blockedPaths,now=Date.now(),allowEmpty=false}={}){
 const policy=validateBlockedPolicy(blockedPaths);
 if(!Array.isArray(rows))throw Error('D1 export returned no rows');
 const kinds=new Set(['app','category','skill','association']);
 const records=rows.map(row=>{
  if(!row||!kinds.has(row.kind)||typeof row.payload!=='string')throw Error('Unexpected public export record');
  const value=JSON.parse(row.payload);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid public export payload');
  return {kind:row.kind,value};
 });
 const data=sanitizeCatalog({apps:records.filter(r=>r.kind==='app').map(r=>r.value),categories:records.filter(r=>r.kind==='category').map(r=>r.value),skills:records.filter(r=>r.kind==='skill').map(r=>r.value),skillAssociations:records.filter(r=>r.kind==='association').map(r=>r.value)});
 if(!allowEmpty&&(!data.apps.length||!data.categories.length))throw Error('Empty authoritative catalog refused');
 data.apps.sort((a,b)=>a.id.localeCompare(b.id));data.categories.sort((a,b)=>a.slug.localeCompare(b.slug));data.skills.sort((a,b)=>a.id.localeCompare(b.id));
 data.skillAssociations.sort((a,b)=>`${a.appId}\0${a.skillId}`.localeCompare(`${b.appId}\0${b.skillId}`));
 const catalog=canonical(data);
 const content=JSON.stringify(catalog),sha256=digest(content);
 const policySha256=digest(JSON.stringify(policy));
 // Includes policy as well as visible data. Timestamp deliberately excluded.
 const revision=`snapshot-${digest(JSON.stringify({version:3,sha256,policySha256}))}`;
 return {catalog,manifest:{mode:'authoritative-d1',schemaVersion:1,publicationProtocol:3,revision,blockedPaths:policy,createdAt:new Date(now).toISOString(),sha256,policySha256,apps:catalog.apps.length,categories:catalog.categories.length,skills:catalog.skills.length}};
}
export async function exportPublicSnapshotV3(DB,options){
 // Validate explicit policy before touching DB. A caller cannot silently omit removals.
 validateBlockedPolicy(options?.blockedPaths);
 if(!DB?.prepare)throw Error('Authoritative D1 binding required; no seed fallback');
 const result=await DB.prepare(EXPORT_V3_SQL).all();
 if(result?.success!==true)throw Error('D1 public export failed');
 return snapshotFromPublicRows(result.results,options);
}
