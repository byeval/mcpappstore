import {buildLlmsFullTxt} from '../lib/feed-parity';
export async function GET(){return new Response(await buildLlmsFullTxt(),{headers:{'Content-Type':'text/plain; charset=utf-8'}});}
