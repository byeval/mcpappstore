-- Short cross-CI frontend activation lease; never blocks moderation/content writers.
CREATE TABLE IF NOT EXISTS astro_deployment_lease (
 id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT NOT NULL, expires_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO astro_deployment_lease(id,owner,expires_at) VALUES(1,'',0);
