export type PublicationPhase = "updating" | "ready" | "failed";
export interface PublicationState {revision:string;content_revision:string;phase:PublicationPhase;updated_at:number}
export class PublicationConflictError extends Error {constructor(){super('Publication changed or is currently updating');this.name='PublicationConflictError';}}
export class PublicationUnavailableError extends Error {constructor(){super('Authoritative publication state unavailable');this.name='PublicationUnavailableError';}}
export async function readPublicationState(db:D1Database):Promise<PublicationState>{
 const row=await db.prepare('SELECT revision, content_revision, phase, updated_at FROM astro_publication_state WHERE id=1').first<PublicationState>();
 if(!row||typeof row.revision!=='string'||!row.revision||typeof row.content_revision!=='string'||!row.content_revision||!['ready','updating','failed'].includes(row.phase)||!Number.isFinite(row.updated_at))throw new PublicationUnavailableError();
 return row;
}
export async function readyCacheRevision(db:D1Database|null):Promise<string|null>{
 if(!db)return null;try{const state=await readPublicationState(db);return state.phase==='ready'?`${state.revision}:${state.content_revision}`:null;}catch{return null;}
}
