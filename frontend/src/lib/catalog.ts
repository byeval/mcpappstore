import manifest from '../data/manifest.json';
import catalog from '../data/catalog.json';
import {supportedLocales, type Locale} from './i18n';
import {isRemovedContentPath} from './content-removals';
export {supportedLocales};
export type App = typeof catalog.apps[number];
export const blockedPaths: string[] = (manifest as {blockedPaths?:string[]}).blockedPaths ?? [];
export const apps=catalog.apps;
export const categories=catalog.categories;
export const pageSize=36;
export function pathFor(locale:Locale,path:string){return `${locale==='en'?'':`/${locale}`}${path}` || '/';}
const visibleCache=new Map<Locale,App[]>();
const categoryCache=new Map<Locale,Map<string,App[]>>();
const rankCache=new Map<Locale,Map<string,number>>();
const rawCategoryCache=new Map<Locale,Map<string,App[]>>();
export function visibleApps(locale:Locale){let cached=visibleCache.get(locale);if(cached)return cached;cached=apps.filter(a=>a.status==='published'&&!isRemovedContentPath(pathFor(locale,`/app/${a.id}`))&&!blockedPaths.includes(pathFor(locale,`/app/${a.id}`)));visibleCache.set(locale,cached);return cached;}
function ensureCategoryIndex(locale:Locale){if(categoryCache.has(locale))return;const raw=new Map<string,App[]>(),rank=new Map<string,number>();visibleApps(locale).forEach((a,i)=>{rank.set(a.id,i);for(const slug of a.categories){const list=raw.get(slug)??[];list.push(a);raw.set(slug,list);}});rawCategoryCache.set(locale,raw);rankCache.set(locale,rank);categoryCache.set(locale,new Map([...raw].map(([slug,list])=>[slug,[...list].sort((a,b)=>a.name.localeCompare(b.name))])));}
export function categoryApps(locale:Locale,slug:string){ensureCategoryIndex(locale);return categoryCache.get(locale)!.get(slug)??[];}
export function relatedApps(locale:Locale,app:App){ensureCategoryIndex(locale);const candidates=new Map<string,App>();for(const slug of app.categories){if(slug==='featured')continue;for(const other of (rawCategoryCache.get(locale)!.get(slug)??[]).slice(0,7)){if(other.id!==app.id)candidates.set(other.id,other);}}return [...candidates.values()].sort((a,b)=>rankCache.get(locale)!.get(a.id)!-rankCache.get(locale)!.get(b.id)!).slice(0,6);}
export function safeLink(value:unknown){try{const u=new URL(String(value));return ['http:','https:'].includes(u.protocol)?u.href:undefined;}catch{return undefined;}}
