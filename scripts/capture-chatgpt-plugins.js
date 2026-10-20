// Run in the console of the signed-in public ChatGPT Plugins directory.
(async () => {
  const categories = [...new Set([...document.querySelectorAll('a[href]')]
    .map((link) => new URL(link.href, location.href))
    .filter((url) => url.origin === location.origin && url.pathname === '/plugins')
    .map((url) => url.searchParams.get('category'))
    .filter(Boolean))];
  if (!categories.length) throw new Error('Open the public Plugins home page first.');
  const capture = { capturedAt: new Date().toISOString(), source: location.origin + '/plugins', categories: {} };
  for (const slug of categories) {
    const plugins = new Map();
    const seenTokens = new Set();
    let token = null;
    let pages = 0;
    try {
      do {
        const url = new URL('/backend-api/ps/plugin-categories/' + encodeURIComponent(slug) + '/plugins', location.origin);
        url.searchParams.set('scope', 'GLOBAL');
        url.searchParams.set('limit', '700');
        if (token) url.searchParams.set('page_token', token);
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        if (!Array.isArray(data.plugins)) throw new Error('Missing plugins array');
        const previousCount = plugins.size;
        for (const plugin of data.plugins) plugins.set(plugin.id, plugin);
        pages += 1;
        token = data.pagination?.next_page_token ?? null;
        if (token && (seenTokens.has(token) || plugins.size === previousCount || pages >= 100)) {
          throw new Error('Pagination did not advance');
        }
        if (token) seenTokens.add(token);
      } while (token);
      capture.categories[slug] = { status: 200, pages, complete: true, data: { plugins: [...plugins.values()], pagination: { next_page_token: null } } };
    } catch (error) {
      capture.categories[slug] = { status: 0, pages, complete: false, error: String(error), data: { plugins: [...plugins.values()] } };
    }
    console.log(slug, plugins.size, capture.categories[slug].complete);
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(capture)], { type: 'application/json' }));
  link.download = 'chatgpt-plugins-' + Date.now() + '.json';
  link.click();
  return Object.fromEntries(Object.entries(capture.categories).map(([slug, result]) => [slug, { count: result.data.plugins.length, complete: result.complete }]));
})();
