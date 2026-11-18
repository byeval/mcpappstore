import {randomUUID} from 'node:crypto';
export async function withDeploymentLease(DB,work,{owner=randomUUID(),ttlMs=120000,now}={}){
 if(ttlMs<10000||ttlMs>300000)throw Error('Invalid short deployment lease TTL');
 const clock=now??(async()=>{const row=await DB.prepare("SELECT unixepoch()*1000 AS now").first();if(!Number.isFinite(row?.now))throw Error('Authoritative deployment lease clock unavailable');return row.now;});
 const started=await clock();
 const acquire=await DB.prepare('UPDATE astro_deployment_lease SET owner=?,expires_at=? WHERE id=1 AND expires_at<? RETURNING owner').bind(owner,started+ttlMs,started).first();if(acquire?.owner!==owner)throw Error('Frontend deployment busy; retry current HEAD later');
 let lost=false,lostError;const renew=async()=>{if(lost)throw new Error('Deployment lease lost',{cause:lostError});const at=await clock();const row=await DB.prepare('UPDATE astro_deployment_lease SET expires_at=? WHERE id=1 AND owner=? AND expires_at>? RETURNING owner').bind(at+ttlMs,owner,at).first();if(row?.owner!==owner){lost=true;throw Error('Deployment lease expired/lost');}};
 const timer=setInterval(()=>renew().catch(error=>{lost=true;lostError=error;}),Math.floor(ttlMs/3));timer.unref();
 let result,workError,workFailed=false;
 try{result=await work({owner,assertOwned:renew});}catch(error){workFailed=true;workError=error;}
 clearInterval(timer);
 try{await DB.prepare("UPDATE astro_deployment_lease SET owner='',expires_at=0 WHERE id=1 AND owner=?").bind(owner).run();}
 catch(cleanupError){if(workFailed)throw new AggregateError([workError,cleanupError],'Deployment lease work and cleanup both failed',{cause:workError});throw cleanupError;}
 if(workFailed)throw workError;return result;
}
