import fs from 'node:fs/promises';import path from 'node:path';import ts from 'typescript';
// Extend reviewed route families using only this exact authoritative public snapshot.
// Canonical alias decisions come from the same checked-in helper as the renderer.
export async function expandPublicAudit(base,snapshot,astroProject){
 if(snapshot.manifest.mode!=='authoritative-d1'||!snapshot.manifest.publicationContentRevision)throw Error('Authoritative content revision required for app allowlist');
 const source=await fs.readFile(path.join(astroProject,'src/production/lib/catalog-identity.ts'),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {canonicalAppId}=await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));
 const removalSource=await fs.readFile(path.join(astroProject,'src/lib/content-removals.ts'),'utf8');
 const removalOutput=ts.transpileModule(removalSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {isRemovedContentPath}=await import('data:text/javascript;base64,'+Buffer.from(removalOutput).toString('base64'));
 const blocked=new Set(snapshot.manifest.blockedPaths??[]),urls=new Set([...base.explicitUrls,'/',...['es','fr','de','ru','zh-hans','ja','ko'].map(locale=>'/'+locale)]);let count=0;
 for(const app of snapshot.catalog.apps){if(app.status!=='published')throw Error('Nonpublic app in snapshot');if(canonicalAppId(app)!==app.id)continue;if(typeof app.id!=='string'||!app.id||/[?#%\\\0/]/.test(app.id)||app.id==='.'||app.id==='..')throw Error('Unsupported app path needs review');count++;for(const locale of ['en','es','fr','de','ru','zh-hans','ja','ko']){const p=(locale==='en'?'':'/'+locale)+'/app/'+app.id;if(!blocked.has(p)&&!isRemovedContentPath(p))urls.add(p);}}
 return {...base,families:[...new Set([...(base.families??[]),'canonical-public-app-detail','homepage'])],publicationContentRevision:snapshot.manifest.publicationContentRevision,snapshotSha256:snapshot.manifest.sha256,canonicalAppCount:count,explicitUrls:[...urls].filter(p=>!blocked.has(p)&&!isRemovedContentPath(p)).sort()};
}
