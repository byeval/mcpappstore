import {appCollections} from './collections';
import {visibleSkills,skillPath} from './skills';
import {blockedPaths,apps,categories,categoryApps,pageSize,pathFor,safeLink} from './catalog';
import {isRemovedContentPath} from './content-removals';
import {learnArticles} from './learn';
import type {Locale} from './i18n';
export interface PublicPreview {prompt?:string;caption?:string;imageKey?:string;imageUrl?:string;ctaLabel?:string;ctaUrl?:string}
export interface PublicSurface {platform?:string;type?:string;url?:string;status?:string;previews?:PublicPreview[]}
export interface RichApp {id:string;name:string;tagline?:string;description?:string;publisher?:string;categories:string[];iconKey?:string;iconUrl?:string;surfaces?:PublicSurface[];previews?:PublicPreview[];publisherUrl?:string;privacyUrl?:string;termsUrl?:string;supportUrl?:string;version?:string;tools?:Array<{name?:string;tool_name?:string;description?:string}>}
export function mediaUrl(key?:string,url?:string){
 if(key){if(!/^(icons|previews)\/[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g|gif|avif)$/i.test(key)||key.split('/').some(p=>p==='.'||p==='..'))return undefined;return `https://cdn.mcpapp.net/${key}`;}
 if(!url)return undefined;try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='cdn.mcpapp.net'&&!u.username&&!u.password&&!u.search?u.href:undefined;}catch{return undefined;}
}
export function appTitle(app:RichApp){const platforms=Array.from(new Set((app.surfaces??[]).map(s=>s.platform).filter(p=>p==='chatgpt'||p==='claude')));const kind=platforms.length===2?'MCP app and connector':platforms[0]==='claude'?'MCP connector':'MCP app';return `${app.name} ${/\bmcp\b/i.test(app.name)?kind.replace(/^MCP /,''):kind}${platforms.length?` for ${platforms.map(p=>p==='claude'?'Claude':'ChatGPT').join(' and ')}`:''}`;}
export function metaDescription(text:string){const s=text.replace(/\s+/g,' ').trim();return s.length<=160?s:`${s.slice(0,157).trimEnd()}…`;}
export function categoryIndexable(slug:string,count:number){return slug!=='featured'&&count>=3;}
export function breadcrumb(items:Array<{name:string;path:string}>,locale:Locale){return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((i,n)=>({'@type':'ListItem',position:n+1,name:i.name,item:`https://mcpapp.net${pathFor(locale,i.path)}`}))};}
export function faqSchema(items:Array<{question:string;answer:string}>){return {'@context':'https://schema.org','@type':'FAQPage',mainEntity:items.map(i=>({'@type':'Question',name:i.question,acceptedAnswer:{'@type':'Answer',text:i.answer}}))};}
export function implementedPath(href:string,locale:Locale):string|undefined{
 if(!href.startsWith('/')||href.startsWith('//'))return undefined;
 const u=new URL(href,'https://mcpapp.net');if(u.origin!=='https://mcpapp.net')return undefined;
 const p=u.pathname.replace(/\/$/,'')||'/';
 if(isRemovedContentPath(pathFor(locale,p))||blockedPaths.includes(decodeURIComponent(pathFor(locale,p))))return undefined;
 const app=p.match(/^\/app\/([^/]+)$/),category=p.match(/^\/category\/([^/]+)$/),learn=p.match(/^\/learn\/([^/]+)$/);
 const supported=p==='/collections'||p==='/skills'||appCollections.some(c=>p===`/collections/${c.slug}`)||visibleSkills(locale).some(s=>p===skillPath(s.id))||p==='/'||p==='/learn'||(app&&apps.some(a=>a.id===app[1]&&a.status==='published'))||(learn&&learnArticles.some(a=>a.slug===learn[1]))||(category&&categories.some(c=>c.slug===category[1]));
 if(!supported)return undefined;
 if(u.search){if(!category||[...u.searchParams.keys()].some(k=>k!=='page')||u.searchParams.getAll('page').length!==1)return undefined;const page=u.searchParams.get('page')!;if(!/^[1-9]\d*$/.test(page)||Number(page)>Math.max(1,Math.ceil(categoryApps(locale,category[1]).length/pageSize)))return undefined;}
 return pathFor(locale,`${p}${u.search}${u.hash}`);
}
export function publicSources(app:RichApp){return [['Publisher',app.publisherUrl],['Privacy',app.privacyUrl],['Terms',app.termsUrl],['Support',app.supportUrl]].flatMap(([label,url])=>{const href=safeLink(url);return href?[{label,href}]:[];});}
export function appPreviews(app:RichApp){const seen=new Set<string>();return [...(app.previews??[]),...(app.surfaces??[]).flatMap(s=>s.previews??[])].flatMap(p=>{const image=mediaUrl(p.imageKey,p.imageUrl);if(!image||seen.has(image))return [];seen.add(image);return [{...p,image}];}).slice(0,12);}
