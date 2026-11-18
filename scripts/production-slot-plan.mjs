// Production transport is reusable; prepared artifact bytes and manifests remain immutable.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
export const SLOT_LOCALES=Object.freeze(['en','es','fr','de','ru','zh-hans','ja','ko']);
const bindingFor=key=>'STATIC_'+key.toUpperCase().replaceAll('-','_');
export function selectProductionSlot(current){
 if(!current?.versionId||!Array.isArray(current.bindings))throw Error('Exact current frontend version/bindings required');
 const services=current.bindings.filter(b=>b.type==='service');if(services.some(b=>b.environment!==undefined&&b.environment!=='production'))throw Error('Unexpected external service environment');const modes=current.bindings.filter(b=>b.name==='STATIC_SHARD_MODE');if(modes.length>1||modes.some(b=>b.type!=='plain_text'||b.text!=='eight'))throw Error('Unexpected static shard mode');const statics=current.bindings.filter(b=>b.name?.startsWith('STATIC_')&&b.name!=='STATIC_SHARD_MODE');
 if(!services.length&&!statics.length)return {activeSlot:null,targetSlot:'blue',protectedServices:[],previousFrontVersion:current.versionId};
 if(services.length!==9||statics.length!==8||services.filter(b=>b.name==='LEGACY'&&b.service==='mcpapp-legacy').length!==1)throw Error('Unexpected/mixed frontend service topology; refuse slot overwrite');
 let activeSlot;const protectedServices=[];
 for(const key of SLOT_LOCALES){const rows=statics.filter(b=>b.name===bindingFor(key));if(rows.length!==1||rows[0].type!=='service')throw Error('Incomplete/duplicate static binding set');const match=rows[0].service?.match(new RegExp('^mcpapp-static-(blue|green)-'+key+'$'));if(!match||(activeSlot&&activeSlot!==match[1]))throw Error('Unknown/mixed static slot binding');activeSlot=match[1];protectedServices.push(rows[0].service);}
 return {activeSlot,targetSlot:activeSlot==='blue'?'green':'blue',protectedServices,previousFrontVersion:current.versionId};
}
export function assertCurrentSlotUnchanged(expected,current){
 const fingerprint=value=>JSON.stringify([...value.bindings].sort((a,b)=>a.name.localeCompare(b.name)));
 if(current.versionId!==expected.versionId||fingerprint(current)!==fingerprint(expected)){const error=Error('External frontend change; refuse overwriting active/rollback slot or reverting another release');error.code='EXTERNAL_FRONTEND_CHANGED';throw error;}
 selectProductionSlot(current);
}
export async function deriveProductionSlotPlan(plan,receipt,current){
 const selection=selectProductionSlot(current);if(receipt.shards?.mode!=='eight'||plan.shardConfigs.length!==8)throw Error('Production slots require exactly eight immutable shards');
 const directory=path.join(receipt.releaseDir,'production-slot-activation');await fs.mkdir(directory,{recursive:false});
 const mapping=[];const shardConfigs=[];
 for(const key of SLOT_LOCALES){const original=plan.shardConfigs.find(file=>path.basename(path.dirname(file))===key);if(!original)throw Error('Missing immutable locale config');const config=JSON.parse(await fs.readFile(original));const expected=receipt.shards.shards[key];if(config.name!==expected.service||config.workers_dev!==false||config.preview_urls!==false||config.routes?.length||config.main||config.services?.length||!config.assets?.directory)throw Error('Prepared shard config changed or not assets-only');const target='mcpapp-static-'+selection.targetSlot+'-'+key;if(selection.protectedServices.includes(target))throw Error('Cannot overwrite protected active shard');
  const assets=path.resolve(path.dirname(original),config.assets.directory);if(assets!==path.join(receipt.shardDir,key,'assets'))throw Error('Shard asset path differs from immutable receipt');
  const folder=path.join(directory,key);await fs.mkdir(folder);const file=path.join(folder,'wrangler.json');await fs.writeFile(file,JSON.stringify({...config,name:target,assets:{...config.assets,directory:assets}},null,2),{flag:'wx'});shardConfigs.push(file);mapping.push({locale:key,binding:bindingFor(key),artifactService:expected.service,targetService:target,sha256:expected.sha256,files:expected.files,config:file});
 }
 const front=JSON.parse(await fs.readFile(plan.frontConfig));if(front.services.length!==9)throw Error('Prepared frontend service topology changed');for(const item of mapping){const matches=front.services.filter(s=>s.binding===item.binding&&s.service===item.artifactService);if(matches.length!==1)throw Error('Prepared frontend shard binding mismatch');matches[0].service=item.targetService;}
 front.main=path.resolve(path.dirname(plan.frontConfig),front.main);const frontConfig=path.join(directory,'front.wrangler.json');await fs.writeFile(frontConfig,JSON.stringify(front,null,2),{flag:'wx'});
 const selectionReceipt={version:1,artifactId:receipt.artifactId,sourceCommit:receipt.buildCommit,...selection,createdAt:new Date().toISOString(),mapping,frontendConfigSha256:createHash('sha256').update(await fs.readFile(frontConfig)).digest('hex'),preparedArtifactsModified:false};await fs.writeFile(path.join(directory,'slot-selection.json'),JSON.stringify(selectionReceipt,null,2),{flag:'wx'});
 return {...plan,frontConfig,shardConfigs,slotSelection:selectionReceipt,productionServices:mapping.map(m=>m.targetService)};
}
