import {robotsPolicy} from '../lib/feed-parity';
export function GET(){return new Response(robotsPolicy(import.meta.env.PRODUCTION_BUILD==='true'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});}
