import {createD1HybridRegistry} from './verified-hybrid-registry.mjs';
// One attempted INSERT only. Unknown write outcomes are reconciled by read, never retried.
export async function saveRecoveryRegistry(DB,record,{leaseOwner,deadline,assertOwned,now=Date.now}){
 if(!Number.isFinite(deadline)||deadline<=now()||!leaseOwner)throw Error('Fresh recovery authorization required');
 const registry=createD1HybridRegistry(DB,{leaseOwner});
 const same=row=>row&&Object.keys(record).every(key=>JSON.stringify(row[key])===JSON.stringify(record[key]));
 await assertOwned();const prior=await registry.get(record.frontVersion);if(prior){if(!same(prior))throw Error('Immutable recovery verification differs');return {saved:false,reconciled:true};}
 await assertOwned();if(deadline<=now())throw Error('Recovery authorization expired');
 try{
 const result=await DB.prepare('INSERT INTO astro_verified_releases(front_version,backend_version,source_commit,slot,public_policy,proof_digest,method,verified_at) SELECT ?,?,?,?,?,?,?,? WHERE unixepoch()*1000 < ? AND EXISTS(SELECT 1 FROM astro_deployment_lease WHERE id=1 AND owner=? AND expires_at>unixepoch()*1000) RETURNING front_version').bind(record.frontVersion,record.backendVersion,record.sourceCommit,record.slot,record.publicPolicy,record.proofDigest,record.method,record.verifiedAt,deadline,leaseOwner).first();
 if(result?.front_version!==record.frontVersion)throw Error('Recovery authorization/lease expired; no insertion confirmed');return {saved:true};
 }catch(error){let observed;try{observed=await registry.get(record.frontVersion);}catch(readError){throw new AggregateError([error,readError],'Recovery registry write outcome unknown; read-only reconciliation required',{cause:error});}if(same(observed))return {saved:true,reconciled:true};throw new Error('Recovery registry write not confirmed; no retry performed',{cause:error});}
}
