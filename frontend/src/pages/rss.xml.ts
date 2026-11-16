import {buildRss} from '../lib/feed-parity';
export function GET(){return new Response(buildRss(),{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});}
