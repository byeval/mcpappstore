import catalog from '../data/catalog.json';
const fixture={skills:catalog.skills,associations:catalog.skillAssociations};
import manifest from '../data/manifest.json';
import {blockedPaths,pathFor,visibleApps,safeLink} from './catalog';
import type {Locale} from './i18n';
// Never silently substitute this historical fixture for authoritative live skills.
if(!['local-fixture-not-live-D1','authoritative-d1'].includes(manifest.mode)||!Array.isArray(catalog.skills)||!Array.isArray(catalog.skillAssociations))throw new Error('Public skills snapshot missing; refusing fixture fallback');
export type Skill=typeof fixture.skills[number];
export function skillPath(id:string){if(!id||id.split('/').some(s=>!s||s==='.'||s==='..'||/[\\?#\x00-\x1f]/.test(s)))throw new Error('Unsafe skill id');return `/skills/${id.split('/').map(encodeURIComponent).join('/')}`;}
export function visibleSkills(locale:Locale){return fixture.skills.filter(s=>!blockedPaths.some(p=>decodeURIComponent(p)===decodeURIComponent(pathFor(locale,skillPath(s.id)))));}
export function pairedApps(id:string,locale:Locale){const pairs=fixture.associations.filter(a=>a.skillId===id);return visibleApps(locale).flatMap(app=>{const pair=pairs.find(p=>p.appId===app.id);return pair?[{app,relationType:pair.relationType,reason:pair.reason}]:[];});}
export function skillSource(skill:Skill){return safeLink((skill as Skill&{sourceUrl?:string}).sourceUrl);}
export function installCommand(skill:Skill){const install=(skill as Skill&{installUrl?:string}).installUrl;if(install)return safeLink(install);if(skill.id.startsWith('skills-sh:')){const parts=skill.id.slice('skills-sh:'.length).split('/');const name=parts.pop();const source=parts.join('/');if(source&&name)return `npx skills add ${source}@${name}`;}return undefined;}
export function skillFaq(skill:Skill,locale:Locale){const apps=pairedApps(skill.id,locale);return [{question:`When should I use the ${skill.displayName} skill?`,answer:`${skill.displayName} is useful when an agent needs workflow-specific guidance before using paired MCP apps or related tools.`},{question:`Which MCP apps pair with ${skill.displayName}?`,answer:apps.length?`${skill.displayName} is currently paired with ${apps.slice(0,6).map(p=>p.app.name).join(', ')}.`:`${skill.displayName} does not have curated MCP app pairings yet.`}];}
