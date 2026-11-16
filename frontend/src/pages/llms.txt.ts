import {buildLlmsTxt} from '../lib/feed-parity';
export async function GET(){return new Response(await buildLlmsTxt(),{headers:{'Content-Type':'text/plain; charset=utf-8'}});}
