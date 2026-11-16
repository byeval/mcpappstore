-- Proposed metadata only. Not approved/applied to production.
CREATE TABLE astro_direct_release_evidence (
 front_version TEXT PRIMARY KEY NOT NULL REFERENCES astro_verified_releases(front_version),
 proof_digest TEXT NOT NULL CHECK(length(proof_digest)=64 AND proof_digest NOT GLOB '*[^0-9a-f]*'),
 evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)),
 evidence_sha256 TEXT NOT NULL CHECK(length(evidence_sha256)=64 AND evidence_sha256 NOT GLOB '*[^0-9a-f]*'),
 created_at INTEGER NOT NULL CHECK(typeof(created_at)='integer' AND created_at>0)
);
CREATE TABLE astro_inherited_releases (
 front_version TEXT PRIMARY KEY NOT NULL CHECK(length(front_version)>0),
 backend_version TEXT NOT NULL CHECK(length(backend_version)>0),
 source_commit TEXT NOT NULL CHECK(length(source_commit)=40 AND source_commit NOT GLOB '*[^0-9a-f]*'),
 slot TEXT NOT NULL CHECK(slot IN ('blue','green')),
 method TEXT NOT NULL CHECK(method='data-only-inherited-direct-baseline'),
 baseline_front_version TEXT NOT NULL REFERENCES astro_direct_release_evidence(front_version),
 baseline_source_commit TEXT NOT NULL CHECK(length(baseline_source_commit)=40 AND baseline_source_commit NOT GLOB '*[^0-9a-f]*'),
 baseline_verified_at INTEGER NOT NULL CHECK(typeof(baseline_verified_at)='integer' AND baseline_verified_at>0),
 baseline_proof_digest TEXT NOT NULL CHECK(length(baseline_proof_digest)=64 AND baseline_proof_digest NOT GLOB '*[^0-9a-f]*'),
 evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)),
 evidence_sha256 TEXT NOT NULL CHECK(length(evidence_sha256)=64 AND evidence_sha256 NOT GLOB '*[^0-9a-f]*'),
 recorded_at INTEGER NOT NULL CHECK(typeof(recorded_at)='integer' AND recorded_at>0),
 CHECK(front_version<>baseline_front_version),
 CHECK(recorded_at>=baseline_verified_at AND recorded_at-baseline_verified_at<=604800000)
);
CREATE TRIGGER astro_direct_evidence_validate BEFORE INSERT ON astro_direct_release_evidence
WHEN NOT EXISTS(SELECT 1 FROM astro_verified_releases WHERE front_version=NEW.front_version AND proof_digest=NEW.proof_digest AND method IN ('normal-browser-dom-plus-version-bound-service-http','public-https-plus-version-bound-service-http'))
BEGIN SELECT RAISE(ABORT,'Original direct proof required'); END;
CREATE TRIGGER astro_inherited_release_validate BEFORE INSERT ON astro_inherited_releases
WHEN NOT EXISTS(SELECT 1 FROM astro_direct_release_evidence e JOIN astro_verified_releases v ON v.front_version=e.front_version WHERE e.front_version=NEW.baseline_front_version AND v.source_commit=NEW.baseline_source_commit AND v.verified_at=NEW.baseline_verified_at AND v.proof_digest=NEW.baseline_proof_digest AND e.proof_digest=v.proof_digest AND v.method IN ('normal-browser-dom-plus-version-bound-service-http','public-https-plus-version-bound-service-http')) OR EXISTS(SELECT 1 FROM astro_verified_releases WHERE front_version=NEW.front_version)
BEGIN SELECT RAISE(ABORT,'Exact original direct baseline required'); END;
CREATE TRIGGER astro_direct_evidence_no_replace BEFORE INSERT ON astro_direct_release_evidence
WHEN EXISTS(SELECT 1 FROM astro_direct_release_evidence WHERE front_version=NEW.front_version)
BEGIN SELECT RAISE(ABORT,'Direct evidence is immutable'); END;
CREATE TRIGGER astro_direct_evidence_no_update BEFORE UPDATE ON astro_direct_release_evidence
BEGIN SELECT RAISE(ABORT,'Direct evidence is immutable'); END;
CREATE TRIGGER astro_direct_evidence_no_delete BEFORE DELETE ON astro_direct_release_evidence
BEGIN SELECT RAISE(ABORT,'Direct evidence is immutable'); END;
CREATE TRIGGER astro_inherited_release_no_replace BEFORE INSERT ON astro_inherited_releases
WHEN EXISTS(SELECT 1 FROM astro_inherited_releases WHERE front_version=NEW.front_version)
BEGIN SELECT RAISE(ABORT,'Inherited release is immutable'); END;
CREATE TRIGGER astro_inherited_release_no_update BEFORE UPDATE ON astro_inherited_releases
BEGIN SELECT RAISE(ABORT,'Inherited release is immutable'); END;
CREATE TRIGGER astro_inherited_release_no_delete BEFORE DELETE ON astro_inherited_releases
BEGIN SELECT RAISE(ABORT,'Inherited release is immutable'); END;
