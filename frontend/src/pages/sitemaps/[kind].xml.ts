import {sitemapEndpointKinds,sitemapShard} from '../../lib/feed-parity';
export function getStaticPaths(){return sitemapEndpointKinds().map(kind=>({params:{kind}}));}
export function GET({params}:{params:{kind?:string}}){return new Response(sitemapShard(params.kind??''),{headers:{'Content-Type':'application/xml; charset=utf-8'}});}
