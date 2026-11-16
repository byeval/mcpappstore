import {generatePrivateLegacy} from './private-legacy.mjs';
import {spawnSync} from 'node:child_process';import {access,mkdir,readFile,rmdir,writeFile} from 'node:fs/promises';import {constants} from 'node:fs';import {isAbsolute,resolve} from 'node:path';
import {publishCatalog} from './publication-protocol.mjs';
import {createWranglerD1} from './wrangler-d1.mjs';
import {transitionPublication,assertPublicationOwner} from './publication-state.mjs';
const DB=createWranglerD1();
const target=process.env.PUBLICATION_TARGET??'astro';
const publisher=process.env.ASTRO_PUBLISHER_SCRIPT??resolve('scripts/astro-publisher.mjs');
process.env.ASTRO_PUBLICATION_CONFIG??=resolve('scripts/publication.config.json');
function run(command,args,{capture=false}={}){const result=spawnSync(command,args,{encoding:'utf8',stdio:capture?'pipe':'inherit',env:process.env});if(result.error||result.status!==0)throw Error(`${command} ${args.slice(0,3).join(' ')} failed (${result.status??result.error?.message})`);return result.stdout;}
const wrangler=(args,options)=>run('npx',['--no-install','wrangler',...args],options);
async function preflight(){if(!['astro','legacy'].includes(target))throw Error('PUBLICATION_TARGET must be astro or legacy');if(target==='astro'){if(!publisher||!isAbsolute(publisher))throw Error('ASTRO_PUBLISHER_SCRIPT must be an explicit absolute executable; refusing legacy deploy by default');await access(publisher,constants.X_OK);const config=JSON.parse(await readFile(process.env.ASTRO_PUBLICATION_CONFIG,'utf8'));if(config.activationEnabled!==true||config.remoteHealthEnabled!==true||!Array.isArray(config.frontendRoutes))throw Error('Reviewed activation config required before catalog writes');}await access('reports/public-cache-keys.json');await access('migrations/0002_seed.sql');}
if(process.argv.includes('--preflight')){await preflight();console.log(`Publication target validated: ${target}`);}else{
 if(!process.argv.includes('--remote'))throw Error('Explicit --remote required; no implicit remote mutation');
 const lock='.publication-lock';await mkdir(lock);let ownsLock=true;
 try{
 let preparedReceipt;
 const steps={preflight,
 async inventory(){const sql="SELECT 'app' kind,json_object('id',id,'source',source,'status',status,'updated_at',updated_at) payload FROM apps WHERE source NOT IN ('chatgpt_seed','claude_seed') UNION ALL SELECT 'submissions',CAST(COUNT(*) AS TEXT) FROM submissions ORDER BY kind,payload";const result=JSON.parse(wrangler(['d1','execute','mcpapp','--remote','--json','--command',sql],{capture:true}));if(result.length!==1||!result[0].success)throw Error('Protected inventory failed');const rows=result[0].results;return {nonSeed:rows.filter(r=>r.kind==='app').map(r=>JSON.parse(r.payload)),submissionCount:Number(rows.find(r=>r.kind==='submissions')?.payload)};},
 async marker(value){await transitionPublication(DB,value);},
 async assertMarker(id,phase){await assertPublicationOwner(DB,id,phase);},
 async applySchema(){wrangler(['d1','execute','mcpapp','--remote','--yes','--file','migrations/0006_skills.sql']);},
 async applySeed(){wrangler(['d1','execute','mcpapp','--remote','--yes','--file','migrations/0002_seed.sql']);},
 async purge(){wrangler(['kv','bulk','delete','reports/public-cache-keys.json','--binding','KV','--remote','--force']);},
 async deployLegacy(){run('npm',['run','deploy']);},
 async prepareAstro(id){await generatePrivateLegacy(process.cwd(),run('git',['rev-parse','HEAD'],{capture:true}).trim());const pointer=resolve('reports',`prepared-${id}.json`);run(publisher,['prepare','--marker-id',id,'--receipt-out',pointer]);const saved=JSON.parse(await readFile(pointer,'utf8'));if(saved.markerId!==id||!isAbsolute(saved.receiptPath))throw Error('Invalid prepared receipt pointer');preparedReceipt=saved.receiptPath;},
 async activateAstro(id){if(!preparedReceipt)throw Error('No prepared receipt');run(publisher,['activate','--marker-id',id,'--receipt',preparedReceipt]);}
 };
 console.log(JSON.stringify(await publishCatalog(steps,{target})));
 }finally{if(ownsLock)await rmdir(lock);}
}
