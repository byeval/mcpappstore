// A failed CLI may have completed the remote rollback. Reconcile once, never
// blindly issue the write again. The caller still verifies restored service health.
export async function reconcileRollbackCommand({write,readCurrent,targetVersion}) {
  try { await write(); return {reconciled:false}; }
  catch (cause) {
    let live;
    try { live=await readCurrent(); }
    catch { throw new Error('Rollback write outcome unknown; read-only reconciliation failed; intervention required',{cause}); }
    if(live===targetVersion)return {reconciled:true};
    throw new Error('Rollback write outcome unresolved or superseded; no retry; intervention required',{cause});
  }
}
