import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {countAppsByTopic,listTopicApps,mcpTopics,type McpTopic} from '../lib/topics';import type {DiscoveryCandidate} from '../lib/discovery-data';
const app=(extra:Partial<DiscoveryCandidate>={}):DiscoveryCandidate=>({id:'plain',name:'Plain',tagline:'',description:'',publisher:'Unknown',categories:[],capabilities:[],surfaces:[],tags:[],tools:[],previews:[],examplePrompts:[],authType:'none',mcpTransport:'http',source:'user',isFeatured:false,publishedAt:null,updatedAt:1,...extra});
const topic=(extra:Partial<McpTopic>={}):McpTopic=>({slug:'test',title:'Test',shortTitle:'Test',description:'',summary:'',keywords:[],categorySlugs:[],matchTerms:[],checks:[],prompts:[],...extra});
const parity=(topics:McpTopic[],apps:DiscoveryCandidate[])=>assert.deepEqual(countAppsByTopic(topics,apps),topics.map(t=>listTopicApps(t,apps).length));
test('count membership preserves substring, Unicode, categories, duplicates, empty terms and metadata-only inclusion',()=>{
 const topics=[topic(),topic({categorySlugs:['data','data']}),topic({matchTerms:['design','DESIGN','é','K','', 'C++']}),topic({matchTerms:['NEVER']})];
 const apps=[app(),app({id:'x',description:'redesign É K C++'}),app({categories:['data']}),app({repoUrl:'https://example.org'}),app({mcpEndpoint:'https://example.org/mcp'}),app({tools:[{name:'tool'}]}),app({surfaces:[{platform:'chatgpt',type:'app',isPrimary:true,status:'available',description:'design',examplePrompts:['C++'],tools:[{name:'é',description:'K'}]}]})];
 parity(topics,apps);assert.deepEqual(countAppsByTopic([topic({matchTerms:['NEVER']})],apps),[3]);parity([],apps);parity(topics,[]);
});
test('one app search-text construction instead of one per topic',()=>{let reads=0;const a=app();Object.defineProperty(a,'description',{get(){reads++;return 'browser';}});const topics=mcpTopics.map(t=>({...t,categorySlugs:[]}));parity(topics,[a]);assert.equal(reads,topics.length+1);reads=0;countAppsByTopic(topics,[a]);assert.equal(reads,1);});
test('does not mutate inputs or cache across calls',()=>{const a=app({description:'browser'}),topics=[topic({matchTerms:['browser']})],apps=[a];const before=JSON.stringify({topics,apps});assert.deepEqual(countAppsByTopic(topics,apps),[1]);assert.equal(JSON.stringify({topics,apps}),before);a.description='unrelated';assert.deepEqual(countAppsByTopic(topics,apps),[0]);});
test('deterministic varied fixtures match existing score > 0 exactly',()=>{const apps=Array.from({length:300},(_,i)=>app({id:'id'+i,name:i%3?'Normal':'Browser',description:i%7?'':'中design文 K',categories:i%11?[]:['data','testing'],capabilities:i%5?[]:['rag'],repoUrl:i%13?undefined:'https://example.org',mcpEndpoint:i%17?undefined:'https://example.org/mcp',updatedAt:i%2}));parity(mcpTopics,apps);});
test('published catalog snapshot count parity', {skip:!process.env.PUBLIC_SNAPSHOT},()=>{const apps=JSON.parse(readFileSync(process.env.PUBLIC_SNAPSHOT!,'utf8')).apps.filter((a:DiscoveryCandidate&{status:string})=>a.status==='published'&&a.id.toLowerCase()!=='viator').map((a:DiscoveryCandidate)=>({...a,tags:[],tools:[],previews:[]}));parity(mcpTopics,apps);});
test('literal union preserves metacharacters, whitespace, empty and Unicode terms without regex meaning',()=>{
 const terms=['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\', 'C++', 'a|b', '[x]', '\\d+', 'a.b', '', '\n', '\r\n', '\u0000', 'É', 'K', 'İ', '😀', '\ud800'];
 const apps=[app({id:'nothing',name:'unrelated'}),...terms.map((term,i)=>app({id:'literal'+i,name:'Value',description:term}))];
 for(const term of terms)parity([topic({matchTerms:[term]})],apps);
 parity([topic({matchTerms:terms}),topic({matchTerms:[]})],apps);
});
