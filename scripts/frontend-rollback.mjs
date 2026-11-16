// Parse the actual current deployment, refusing ambiguous gradual rollouts.
export function captureRollbackMetadata(deployments,version){
 if(!Array.isArray(deployments)||!deployments.length)throw Error('Current frontend deployment unavailable');
 const latest=[...deployments].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0];
 if(!Number.isFinite(Date.parse(latest.created_on))||latest.versions?.length!==1||latest.versions[0].percentage!==100)throw Error('Ambiguous current frontend rollout; manual rollback plan required');
 const versionId=latest.versions[0].version_id;if(!/^[a-f0-9-]{36}$/.test(versionId)||version?.id!==versionId)throw Error('Rollback version metadata mismatch');
 const bindings=version.resources?.bindings;if(!Array.isArray(bindings))throw Error('Previous binding metadata unavailable');
 return {deploymentId:latest.id,versionId,createdOn:latest.created_on,bindings:bindings.map(b=>({name:b.name,type:b.type,...(b.type==='service'?{service:b.service}:{}),...(b.type==='d1'?{id:b.id}:{}),...(b.type==='kv_namespace'?{namespaceId:b.namespace_id}:{}),...(b.type==='r2_bucket'?{bucketName:b.bucket_name}:{})}))};
}
export async function restoreDeploymentPair(pair,{assertOwned,rollback}){for(const [service,record] of [['mcpapp',pair.front],['mcpapp-legacy',pair.legacy]]){if(!record)continue;await assertOwned();await rollback(service,record.versionId);}await assertOwned();}
