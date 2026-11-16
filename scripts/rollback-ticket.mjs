export function validateRollbackTicket(ticket, reason, proof, now=Date.now()) {
 if(ticket.state!=='awaiting-browser'||!ticket.previousPair?.front?.versionId||ticket.publicPolicy!=='viator-global-v1'||!Number.isFinite(ticket.expiresAt))throw Error('Scoped global-removal release ticket required');
 if(reason==='expired'){if(now<=ticket.expiresAt)throw Error('Ticket has not expired');return;}
 if(reason!=='browser-failed')throw Error('Explicit rollback reason required');
 for(const key of ['nonce','artifactId','buildCommit','frontVersion','backendVersion','phase'])if(!proof||proof[key]!==ticket[key])throw Error('Failed browser proof identity mismatch');
 if(proof.method!=='normal-browser'||proof.result!=='failed'||!Number.isFinite(proof.observedAt)||proof.observedAt<ticket.createdAt||proof.observedAt>now||now-proof.observedAt>300000)throw Error('Fresh actual browser failure required');
}
export function assertTicketCurrent(ticket,frontVersion,backendVersion){if(frontVersion!==ticket.frontVersion||backendVersion!==ticket.backendVersion)throw Error('Another release superseded ticket; rollback refused');}
