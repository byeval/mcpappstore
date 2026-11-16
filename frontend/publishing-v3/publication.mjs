import {exportPublicSnapshotV3} from './export.mjs';
export function parseReadyMarker(raw){
 let marker;try{marker=typeof raw==='string'?JSON.parse(raw):raw;}catch{throw Error('Invalid publication marker');}
 if(marker?.version!==1||marker.phase!=='ready'||typeof marker.id!=='string'||!marker.id||typeof marker.contentRevision!=='string'||!marker.contentRevision||!((typeof marker.at==='number'&&Number.isFinite(marker.at)&&marker.at>0)||(typeof marker.at==='string'&&Number.isFinite(Date.parse(marker.at)))))throw Error('Publication is not ready');
 return marker;
}
export async function readReadyMarker(DB){
 if(!DB?.prepare)throw Error('Authoritative publication DB required');
 const db=DB.withSession?DB.withSession('first-primary'):DB;
 const row=await db.prepare('SELECT revision,content_revision,phase,updated_at FROM astro_publication_state WHERE id=1').first();
 return parseReadyMarker(row?{version:1,id:row.revision,contentRevision:row.content_revision,phase:row.phase,at:row.updated_at}:null);
}
export async function assertCurrentPublication(DB,expected,expectedContentRevision){
 const current=await readReadyMarker(DB);
 if(current.id!==expected||(expectedContentRevision!==undefined&&current.contentRevision!==expectedContentRevision))throw Error('Publication changed; rebuild required');
 return current;
}
// One D1 snapshot bracketed by primary publication state. Publisher CAS ownership
// must cover activation; artifact must be rebuilt if any committed revision changes.
export async function exportReadySnapshot({DB},options){
 const marker=await readReadyMarker(DB);
 const result=await exportPublicSnapshotV3(DB,options);
 await assertCurrentPublication(DB,marker.id,marker.contentRevision);
 return {...result,manifest:{...result.manifest,publicationMarkerId:marker.id,publicationContentRevision:marker.contentRevision,sourceCommit:options.sourceCommit}};
}
export async function activateVerifiedRelease({DB,manifest,verifyArtifact,activate}){
 if(manifest?.mode!=='authoritative-d1'||manifest.publicationProtocol!==3||!manifest.publicationMarkerId||!manifest.publicationContentRevision||!manifest.sourceCommit)throw Error('Verified production snapshot metadata required');
 if(typeof verifyArtifact!=='function'||typeof activate!=='function')throw Error('Explicit artifact verification and activation required');
 await verifyArtifact(manifest);
 await assertCurrentPublication(DB,manifest.publicationMarkerId,manifest.publicationContentRevision);
 // Caller must hold exclusive publisher lock through this operation. This helper
 // never changes DNS, credentials, bindings, D1, or the marker on its own.
 return activate(manifest);
}
