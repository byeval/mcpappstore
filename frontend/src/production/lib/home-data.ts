import type {CatalogApp,CategorySummary} from './types';
// Match the authoritative home SQL: featured first, NULLIF(published_at,0), id.
const binary=(a:string,b:string)=>a<b?-1:a>b?1:0;
export function homeData(apps:CatalogApp[],categories:CategorySummary[]){
 const publicApps=apps.filter(a=>a.status==='published'&&a.id.toLowerCase()!=='viator');
 const ordered=[...publicApps].sort((a,b)=>Number(b.isFeatured)-Number(a.isFeatured)||((b.publishedAt||b.updatedAt)-(a.publishedAt||a.updatedAt))||binary(a.id,b.id));
 const featured=publicApps.filter(a=>a.isFeatured).sort((a,b)=>(b.publishedAt??b.updatedAt)-(a.publishedAt??a.updatedAt)||binary(a.id,b.id)).slice(0,3);
 return {apps:ordered.slice(0,36),featured,categories:[...categories].sort((a,b)=>a.sort-b.sort||binary(a.name,b.name))};
}
