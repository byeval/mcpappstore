import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import crypto from 'node:crypto';
const data=fs.readFileSync(new URL('./src/data/catalog.json',import.meta.url));
const manifest=JSON.parse(fs.readFileSync(new URL('./src/data/manifest.json',import.meta.url)));
if(crypto.createHash('sha256').update(data).digest('hex')!==manifest.sha256) throw Error('Snapshot integrity failed; no fallback');
if(process.env.PRODUCTION_BUILD==='true') {
 if(manifest.mode!=='authoritative-d1'||manifest.publicationProtocol!==3||!manifest.publicationMarkerId||!manifest.publicationContentRevision||!/^[a-f0-9]{7,40}$/.test(manifest.sourceCommit??'')) throw Error('Production requires an authoritative snapshot with publisher and content revisions plus reviewed source commit');
 if(process.env.ASTRO_AUDITED_ONLY!=='true'&&process.env.ASTRO_CURRENT_RELEASE!=='true') throw Error('Production requires an explicitly audited route build mode');
 const audit=JSON.parse(fs.readFileSync(new URL('./evidence/current-source-audited-routes.json',import.meta.url)));
 if(audit.sourceCommit!==manifest.sourceCommit||!Array.isArray(audit.explicitUrls)||!audit.explicitUrls.length) throw Error('Production source audit identity mismatch');
}

export default defineConfig({integrations:[react()],site:'https://mcpapp.net',output:'static',trailingSlash:'never',build:{format:'directory'}});
