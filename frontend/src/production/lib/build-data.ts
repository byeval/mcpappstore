import iconMetadata from './public-icon-metadata.json';
import snapshot from '../../data/catalog.json';
import {visibleApps,categories as publicCategories} from '../../lib/catalog';
import type {Locale} from '../../lib/i18n';
import type {CatalogApp,CategorySummary} from './types';
function media(key?:string){return key&&/^[a-zA-Z0-9_./-]+$/.test(key)&&!key.split('/').includes('..')?`https://cdn.mcpapp.net/${key}`:undefined;}
function publicIcon(row:any){
 if(row.source!=='chatgpt_seed'&&row.source!=='claude_seed')return undefined;
 const value=(iconMetadata.icons as Record<string,string>)[row.id];
 if(!value)return undefined;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?value:undefined;}catch{return undefined;}
}
export function productionApp(row:any):CatalogApp{
 if(row.status!=='published')throw new Error('Refusing unpublished static app');
 const preview=(p:any)=>({...p,imageUrl:media(p.imageKey)??p.imageUrl});
 const previews=(rows:any[])=>[...rows].sort((a,b)=>(a.sort??0)-(b.sort??0)).map(preview);
 const binary=(a:string,b:string)=>a<b?-1:a>b?1:0;
 const rank=(r:string)=>r==='required'?0:r==='recommended'?1:2;
 const skills=(snapshot.skillAssociations??[]).filter(a=>a.appId===row.id).flatMap(a=>{const skill=snapshot.skills.find(s=>s.id===a.skillId);return skill?[{...skill,relationType:a.relationType,reason:a.reason,confidence:a.confidence,surface:(a as any).surface}]:[];}).sort((a,b)=>rank(a.relationType)-rank(b.relationType)||(b.confidence??0)-(a.confidence??0)||binary(a.displayName,b.displayName));
 return {...row,mcpTransport:row.mcpTransport??'http',authType:row.authType??'none',publisher:row.publisher??'Unknown',source:row.source??'user',iconUrl:media(row.iconKey)??publicIcon(row),heroUrl:media(row.heroKey)??row.heroUrl,categories:[...(row.categories??[])].sort(binary),tags:[...(row.tags??[])].sort(binary),capabilities:row.capabilities??[],tools:[...(row.tools??[])].sort((a,b)=>binary(a.name,b.name)),previews:previews(row.previews??[]),examplePrompts:row.examplePrompts??[],surfaces:(row.surfaces?.length?row.surfaces:[{platform:row.source==='claude_seed'?'claude':'chatgpt',type:row.source==='claude_seed'?'connector':'app',displayName:row.name,url:row.homepageUrl,isPrimary:true,status:'available'}]).map((s:any)=>({...s,previews:s.previews?previews(s.previews):undefined})).sort((a:any,b:any)=>Number(b.isPrimary)-Number(a.isPrimary)||binary(a.platform,b.platform)||binary(a.type,b.type)||binary(a.externalId??'',b.externalId??'')),skills} as CatalogApp;
}
const cache=new Map<Locale,{apps:CatalogApp[];categories:CategorySummary[]}>();
export function productionData(locale:Locale){let data=cache.get(locale);if(data)return data;const apps=visibleApps(locale).map(productionApp).sort((a,b)=>Number(b.isFeatured)-Number(a.isFeatured)||(b.publishedAt??b.updatedAt)-(a.publishedAt??a.updatedAt));const counts=new Map<string,number>();for(const a of apps)for(const c of a.categories)counts.set(c,(counts.get(c)??0)+1);data={apps,categories:publicCategories.map(c=>({...c,count:counts.get(c.slug)??0}))};cache.set(locale,data);return data;}
