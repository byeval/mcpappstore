-- Immutable per-frontend release verification metadata. No catalog/user rows touched.
CREATE TABLE astro_verified_releases (
 front_version TEXT PRIMARY KEY NOT NULL CHECK(length(front_version)>0),
 backend_version TEXT NOT NULL CHECK(length(backend_version)>0),
 source_commit TEXT NOT NULL CHECK(length(source_commit)=40 AND source_commit NOT GLOB '*[^0-9a-f]*'),
 slot TEXT NOT NULL CHECK(slot IN ('blue','green')),
 public_policy TEXT NOT NULL CHECK(length(public_policy)>0),
 proof_digest TEXT NOT NULL CHECK(length(proof_digest)=64 AND proof_digest NOT GLOB '*[^0-9a-f]*'),
 method TEXT NOT NULL CHECK(method IN ('normal-browser-dom-plus-version-bound-service-http','public-https-plus-version-bound-service-http')),
 verified_at INTEGER NOT NULL CHECK(typeof(verified_at)='integer' AND verified_at>0)
);
CREATE TRIGGER astro_verified_release_no_replace BEFORE INSERT ON astro_verified_releases
WHEN EXISTS(SELECT 1 FROM astro_verified_releases WHERE front_version=NEW.front_version)
BEGIN
 SELECT RAISE(ABORT,'Verified release is immutable');
END;
CREATE TRIGGER astro_verified_release_no_update BEFORE UPDATE ON astro_verified_releases
BEGIN
 SELECT RAISE(ABORT,'Verified release is immutable');
END;
CREATE TRIGGER astro_verified_release_no_delete BEFORE DELETE ON astro_verified_releases
BEGIN
 SELECT RAISE(ABORT,'Verified release is immutable');
END;
