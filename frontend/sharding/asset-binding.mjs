/** Drop-in env.ASSETS replacement AFTER the existing publication/removal guard. */
export function shardForPath(pathname, mode = 'two') {
  const locale = pathname.match(/^\/(es|fr|de|ru|zh-hans|ja|ko)(?=\/|$)/)?.[1] || 'en';
  if(mode === 'eight') return locale;
  if(mode !== 'two') throw Error('Unknown shard topology');
  return ['ru','zh-hans','ja','ko'].includes(locale) ? 'east' : 'west';
}
export function createShardedAssets(env, mode = 'two') {
  return { async fetch(input, init) {
    const request = input instanceof Request && !init ? input : new Request(input,init);
    const shard = shardForPath(new URL(request.url).pathname,mode);
    const service = env[`STATIC_${shard.toUpperCase().replaceAll('-', '_')}`];
    if(!service) return new Response('Static release unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
    // No hostname/prefix rewriting; services see the same public URL, headers,
    // method and conditional request fields. They never see a public origin URL.
    return service.fetch(request);
  }};
}
