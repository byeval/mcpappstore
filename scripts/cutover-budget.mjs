// CI starts this clock in its first step; reserve ten minutes of the210-minute
// job outside this200-minute budget, plus50 minutes at cutover for deployment,
// browser ticket/upload/poll and failure diagnostics. Never shorten the ticket.
export function assertCutoverBudget({startedAt,now=Date.now(),budgetMs=200*60000,reserveMs=50*60000}){if(!Number.isFinite(startedAt)||startedAt<=0||startedAt>now||!Number.isFinite(budgetMs)||budgetMs<=reserveMs||reserveMs<45*60000)throw Error('Valid bounded CI release clock required');const remaining=budgetMs-(now-startedAt);if(remaining<reserveMs)throw Error('Insufficient CI time for complete browser verification and failure diagnostics; frontend switch refused');return {remainingMs:remaining,reservedMs:reserveMs};}
