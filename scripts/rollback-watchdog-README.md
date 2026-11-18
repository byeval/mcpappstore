# Initial-anchor watchdog: reviewed code, separately authorized arming

This branch now contains a restricted production entry point, `rollback-watchdog-production.mjs`, and `.github/workflows/watchdog-production.yml`. Its presence is not permission to arm. Only a root-approved exact arm commit on the fixed watchdog branch can run it; ordinary private fixture markers skip it. `rollback-watchdog-fixture.mjs` only accepts the fixed GitHub repository/ref, approved fixture mode, and a service name derived from the real numeric run ID and attempt. Its Worker has no routes, workers.dev, preview URLs, or production data bindings. The shared transport uses existing account secrets inside the runner; credentials are not saved or sent to another service. The only shared production-side write is the existing D1 deployment-lease metadata, not catalog/user records. Do not run alongside a production deployment or directory writer.

Local verification: `node --test scripts/rollback-watchdog*.test.mjs`. Independent review is required before pushing/running the workflow. The fixture workflow creates a tiny baseline private Worker, starts the actual core in the background, waits for its guarded armed receipt, uploads that receipt while the monitor lives, then deploys the nonce-bearing private candidate. The monitor owns and rolls back the exact private version at its deadline, under the real existing lease, and confirms the actual baseline 100% deployment. A second approved `superseded` scenario must observe a different private version without rolling it back. The fixture is not a test of actual browser acceptance and cannot authorize production.

Plan bytes are externally pinned by `expectedPlanSha256` in an envelope, not a self-referential property inside the plan. Fields include service, baseline, sourceCommit, tag, message/nonce, armFrom, deployStartUntil, maxDeployMs, armUntil, deadline, stopAt. `deployStartUntil + maxDeployMs <= armUntil`; the deployment adapter must refuse starting after deployStartUntil. An exact nonce/tag/source version created during [armFrom,stopAt) remains claimable even if its remote deployment completed after armUntil; lateness is recorded and it is rolled back at/after deadline while the monitor remains active. Baseline observations do not terminate monitoring early. Total lifetime is at most 30 minutes.

Default poll is 5 seconds: one primary D1 clock read and one deployments GET per ordinary poll, with immutable version metadata cached. A 30-minute stable run is at most 360 normal polls (roughly 720 requests plus startup/transition/lease/disarm requests). Current/version metadata are freshly read for both ownership checks before rollback. Read-only 429 attempts are limited to 3 per call with at most 2 seconds per delay; read-only network/5xx/429 exhaustion waits bounded by an independent monotonic total budget. Writes are never automatically retried. An uncertain write is not treated as failure-to-write and is never replayed.

The production wrapper and adapter require independent review and actual new-code evidence before arming: authenticated dedicated control ref and ancestry/source guards; exact real ticket/observations/ticket.verified.json/anchor package; main queued/running writer guards; verified GitHub run/head/attempt/job/artifact handshake and actual monitor liveness immediately before deployment. No hand-written success Boolean and no cancellation-as-disarm. Public wrapper must fix service=mcpapp and baseline=5f756bc7-a86a-4a61-8b8e-8be868794696. Final Astro release follows canonical CI, not this initial-anchor mechanism.

Limits: GitHub runner failure, cancellation, outage, revoked credentials, unavailable CF/D1 APIs, or expired job can defeat this protection. It protects against loss of the Mac/coordinator only while the independent monitor remains operational. CF has no atomic compare-and-swap used here: the lease and source/main queue guards coordinate participating writers, but a noncooperating administrator can race the last ownership check. Do not claim protection against arbitrary disconnects or all external writers. Keep failure artifacts and report unresolved outcomes; do not silently delete fixture services or change security/permissions.

Read recovery hardening: optional disarm READ_UNAVAILABLE is one bounded poll,
recorded as unverified, not a retry loop that consumes the rollback window.
Disarm identity mismatch is separately recorded invalid. A production reader must
bound its entire authenticated package fetch (not each file independently).
Lease clock READ_UNAVAILABLE before any rollback attempt returns to the main
absolute-deadline loop; ambiguous lease writes are not retried. After the final
proof check, lease, fresh current ownership and server clock are checked again
before POST. A clock outage during heartbeat may conservatively mark the lease
lost; no claim of continuous protection during sustained authority outages.


Production arm protocol: the code commit (`monitorCommit`) is distinct from the
arm run's head (`workflowCommit`) and fixed deployment source 044e375. The arm
commit's sole parent must be the reviewed monitor commit; its only changed path
is the regular `.github/watchdog-arm/plan.json`. Its complete message is
`[arm-initial-anchor:<nonce>:<SHA256 original plan bytes>]`. These bytes, actual
run/attempt 1/job/artifact, immutable parent/code and fresh primary clock/baseline
must be independently authenticated by the adapter. The real control package is
read from one dedicated ref with a shared two-second bounded poll, immutable
commit ancestry and byte-hashed original verifier outputs. Ticket backend service
and version must equal the plan's fixed runtime evidence. The full pinned
Canva/docs/CSS/admin/Viator check set cannot be replaced with a docs-only ticket.
Only a confirmed server-side `verified-disarmed` terminal result permits moving
on to push main / canonical Astro CI. A local browser verifier success alone, a
control-ref push, missing result, canceled job, expired timer, or rolled-back
result does not authorize that next step.

Late-write limitation: killing Wrangler (including its process group) does not
cancel an already submitted Cloudflare request. The service-side monitor now
recognizes an exact nonce deployment appearing late before stopAt, but cannot
protect a remote write that first becomes visible after stopAt or after runner
failure. No finite CLI timeout proves a remote completion bound. Public execution
must remain blocked if this residual uncertainty is not explicitly resolved by
the reviewed release protocol. Uploading a version without activation, then using
a short owned activation under the armed monitor, is an alternative to assess;
it still has a remote-write outcome window and must not be claimed atomic.
