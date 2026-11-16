import {sitemapIndex,sitemapIndexKinds} from '../lib/feed-parity';
export function GET(){return new Response(sitemapIndex(sitemapIndexKinds()),{headers:{'Content-Type':'application/xml; charset=utf-8'}});}
