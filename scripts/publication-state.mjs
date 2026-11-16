export async function readPublicationState(DB){
 const primary=typeof DB.withSession==='function'?DB.withSession('first-primary'):DB;
 const row=await primary.prepare('SELECT revision,phase,updated_at,content_revision FROM astro_publication_state WHERE id=1').first();
 if(!row||typeof row.revision!=='string'||!row.revision||typeof row.content_revision!=='string'||!row.content_revision||!['ready','updating','failed'].includes(row.phase)||!Number.isFinite(row.updated_at))throw Error('Authoritative D1 publication state missing or invalid');
 return {version:1,id:row.revision,phase:row.phase,at:row.updated_at,contentRevision:row.content_revision};
}
export async function transitionPublication(DB,marker){
 let row;
 if(marker.phase==='updating'){
  const before=await readPublicationState(DB);if(before.phase!=='ready')throw Error('Publication not ready; reconcile prior operation before retry');
  row=await DB.prepare("UPDATE astro_publication_state SET revision=?,phase='updating',updated_at=? WHERE id=1 AND revision=? AND phase='ready' RETURNING revision").bind(marker.id,marker.at,before.id).first();
 }else if(marker.phase==='ready'){
  row=await DB.prepare("UPDATE astro_publication_state SET phase='ready',updated_at=? WHERE id=1 AND revision=? AND phase='updating' RETURNING revision").bind(marker.at,marker.id).first();
 }else if(marker.phase==='failed'){
  row=await DB.prepare("UPDATE astro_publication_state SET phase='failed',updated_at=? WHERE id=1 AND revision=? AND phase IN ('updating','ready') RETURNING revision").bind(marker.at,marker.id).first();
 }else throw Error('Invalid publication phase');
 if(row?.revision!==marker.id)throw Error('Publication ownership changed; stale transition refused');
 return marker;
}
export async function assertPublicationOwner(DB,id,phase){const current=await readPublicationState(DB);if(current.id!==id||(phase&&current.phase!==phase))throw Error('Publication changed; refusing stale activation');return current;}
