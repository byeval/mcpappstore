export const PUBLIC_EXCLUDED_APP_IDS=Object.freeze(['viator']);
export function sanitizeCatalog(input) {
 if (!Array.isArray(input?.apps) || !Array.isArray(input?.categories)) throw Error('Invalid public catalog input');
 const fields=['heroKey','mcpEndpoint','mcpTransport','installCmd','authType','isFeatured','source','createdAt','tags','id','name','tagline','description','publisher','homepageUrl','repoUrl','publisherUrl','privacyUrl','termsUrl','supportUrl','version','iconKey','capabilities','examplePrompts','categories','updatedAt','publishedAt','status'];
 const pick=(obj,keys)=>Object.fromEntries(keys.filter(k=>obj[k]!=null).map(k=>[k,obj[k]]));
 const inputById=new Map(input.apps.map(a=>[a.id,a]));
 const previewKeys=['sort','prompt','caption','imageKey','imageUrl','ctaLabel','ctaUrl'];
 const apps=input.apps.filter(a=>a.status==='published'&&!PUBLIC_EXCLUDED_APP_IDS.includes(String(a.id).toLowerCase())).map(a=>Object.fromEntries(fields.filter(k=>a[k]!=null).map(k=>[k,a[k]])));
 if(apps.some(a=>!a.id || !a.name || !Array.isArray(a.categories))) throw Error('Invalid published app');
 if(new Set(apps.map(a=>a.id)).size!==apps.length) throw Error('Duplicate public app id');
 for(const a of apps){const original=inputById.get(a.id);
 a.previews=(original.previews??[]).map(p=>pick(p,previewKeys));
 a.tools=(original.tools??[]).map(t=>pick(t,['name','description']));
 a.surfaces=(original.surfaces??[]).map(s=>({...pick(s,['externalId','displayName','mcpEndpoint','mcpTransport','installCmd','authType','isPrimary','platform','type','url','status','tagline','description','capabilities','examplePrompts']),tools:(s.tools??[]).map(t=>pick(t,['name','description'])),previews:(s.previews??[]).map(p=>pick(p,previewKeys))}));}
 const skills=(input.skills??[]).filter(s=>s.status==='available').map(s=>pick(s,['id','name','displayName','description','sourceType','sourceUrl','installUrl','platforms','categories','tags','status']));
 const skillAssociations=(input.skillAssociations??[]).filter(a=>apps.some(p=>p.id===a.appId)&&skills.some(s=>s.id===a.skillId)).map(a=>pick(a,['appId','skillId','relationType','reason','confidence']));
 return {apps,skills,skillAssociations,categories:input.categories.map(({slug,name,sort})=>({slug,name,sort}))};
}
