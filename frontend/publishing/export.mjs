import {validateState} from './state.mjs';
import crypto from 'node:crypto';
import {sanitizeCatalog} from './sanitize.mjs';
// One SQLite statement: state, app rows and categories share a single read snapshot.
// Never select submissions, submitter IP/email or review notes.
export const EXPORT_SQL = `
SELECT 'state' kind, json_object('revision',revision,'blockedPaths',json(blocked_paths),'updatedAt',updated_at) payload FROM astro_publication_state WHERE id=1
UNION ALL
SELECT 'app', json_object(
 'id',a.id,'name',a.name,'tagline',a.tagline,'description',a.description,
 'publisher',a.publisher,'homepageUrl',a.homepage_url,'repoUrl',a.repo_url,
 'publisherUrl',a.publisher_url,'privacyUrl',a.privacy_url,'termsUrl',a.terms_url,'supportUrl',a.support_url,
 'version',a.version,'iconKey',a.icon_key,'capabilities',json(COALESCE(a.capabilities,'[]')),
 'examplePrompts',json(COALESCE(a.example_prompts,'[]')),
 'categories',json(COALESCE((SELECT json_group_array(category_slug) FROM app_categories WHERE app_id=a.id),'[]')),
 'previews',json(COALESCE((SELECT json_group_array(json_object('prompt',prompt,'caption',caption,'imageKey',image_key,'ctaLabel',cta_label,'ctaUrl',cta_url)) FROM app_previews WHERE app_id=a.id),'[]')),
 'surfaces',json(COALESCE((SELECT json_group_array(json_object('platform',platform,'type',surface_type,'url',surface_url,'status',status,'tagline',tagline,'description',description,'capabilities',json(COALESCE(capabilities,'[]')),'examplePrompts',json(COALESCE(example_prompts,'[]')),'previews',json(COALESCE(previews,'[]')))) FROM app_surfaces WHERE app_id=a.id),'[]')),
 'tools',json(COALESCE((SELECT json_group_array(json_object('name',tool_name,'description',description)) FROM app_tools WHERE app_id=a.id),'[]')),
 'updatedAt',a.updated_at,'publishedAt',a.published_at,'status',a.status
) FROM apps a WHERE a.status='published'
UNION ALL
SELECT 'category',json_object('slug',slug,'name',name,'sort',sort) FROM categories
UNION ALL
SELECT 'skill',json_object('id',id,'name',name,'displayName',display_name,'description',description,'sourceType',source_type,'sourceUrl',source_url,'installUrl',install_url,'platforms',json(COALESCE(platforms,'[]')),'categories',json(COALESCE(categories,'[]')),'tags',json(COALESCE(tags,'[]')),'status',status) FROM skills WHERE status='available'
UNION ALL
SELECT 'association',json_object('appId',a.app_id,'skillId',a.skill_id,'relationType',a.relation_type,'reason',a.reason,'confidence',a.confidence) FROM app_skills a JOIN apps p ON p.id=a.app_id JOIN skills s ON s.id=a.skill_id WHERE p.status='published' AND s.status='available' ORDER BY kind,payload`;
export function snapshotFromRows(rows,{now=Date.now(),allowEmpty=false}={}){
 if(!Array.isArray(rows))throw Error('D1 export returned no rows');
 const records=rows.map(r=>({kind:r.kind,value:JSON.parse(r.payload)}));
 const states=records.filter(r=>r.kind==='state');if(states.length!==1)throw Error('Exactly one publication state required');
 const state=validateState(states[0].value);
 const catalog=sanitizeCatalog({apps:records.filter(r=>r.kind==='app').map(r=>r.value),categories:records.filter(r=>r.kind==='category').map(r=>r.value),skills:records.filter(r=>r.kind==='skill').map(r=>r.value),skillAssociations:records.filter(r=>r.kind==='association').map(r=>r.value)});
 if(!allowEmpty&&(catalog.apps.length===0||catalog.categories.length===0))throw Error('Empty authoritative catalog refused; require explicit reviewed empty-site workflow');
 const content=JSON.stringify(catalog);const sha256=crypto.createHash('sha256').update(content).digest('hex');
 return {catalog,manifest:{mode:'authoritative-d1',schemaVersion:1,revision:state.revision,blockedPaths:state.blockedPaths,createdAt:new Date(now).toISOString(),sha256,apps:catalog.apps.length,categories:catalog.categories.length,skills:catalog.skills.length}};
}
export async function exportPublicSnapshot(DB,options){
 if(!DB?.prepare)throw Error('Authoritative D1 binding required; no seed fallback');
 const result=await DB.prepare(EXPORT_SQL).all();
 if(result.success!==true)throw Error('D1 read unsuccessful');
 return snapshotFromRows(result.results,options);
}
