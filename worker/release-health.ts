export interface ReleaseHealthEnv {
  MCPAPP_PRIVATE_BACKEND?: string;
  MCPAPP_BUILD_COMMIT?: string;
}

/** Private service deployment attestation only. Never reads storage or credentials. */
export function releaseHealth(request: Request, env: ReleaseHealthEnv): Response {
  const headers = { 'Cache-Control': 'no-store' };
  if (env.MCPAPP_PRIVATE_BACKEND !== 'true') return new Response('Not found', { status: 404, headers });
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { ...headers, Allow: 'GET' } });
  const commit = env.MCPAPP_BUILD_COMMIT;
  if (typeof commit !== 'string' || !/^[0-9a-f]{40}$/i.test(commit)) return new Response('Release unavailable', { status: 503, headers });
  return Response.json({ commit }, { headers });
}
