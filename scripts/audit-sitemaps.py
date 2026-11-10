#!/usr/bin/env python3
"""Read-only sitemap discovery audit; curl matches production smoke transport.

Usage: python3 scripts/audit-sitemaps.py [https://mcpapp.net]
Checks main and stable legacy entry points without submitting URLs or touching D1.
"""
import subprocess
import sys
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit

base = (sys.argv[1] if len(sys.argv) > 1 else 'https://mcpapp.net').rstrip('/')
namespace = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
visited = {}
all_pages = set()

def visit(url, depth=0):
    if url in visited:
        return visited[url]
    if depth > 2 or urlsplit(url).netloc != urlsplit(base).netloc:
        raise ValueError(f'Unexpected sitemap location: {url}')
    xml = subprocess.check_output(['curl', '--fail', '--silent', '--show-error', '--max-time', '90', url])
    root = ET.fromstring(xml)
    kind = root.tag.rsplit('}', 1)[-1]
    if kind not in ('sitemapindex', 'urlset'):
        raise ValueError(f'Unexpected root {kind}: {url}')
    entries = root.findall('s:sitemap' if kind == 'sitemapindex' else 's:url', namespace)
    if not entries or len(entries) > 50000:
        raise ValueError(f'Invalid entry count {len(entries)}: {url}')
    if len(xml) > 50 * 1024 * 1024:
        raise ValueError(f'Sitemap exceeds uncompressed size limit: {url}')
    locations = [item.findtext('s:loc', namespaces=namespace) for item in entries]
    if any(not loc or urlsplit(loc).scheme not in ('http', 'https') for loc in locations):
        raise ValueError(f'Missing or invalid loc: {url}')
    if len(set(locations)) != len(locations):
        raise ValueError(f'Duplicate entries: {url}')
    pages = set()
    # Reserve before recursion to reject cycles without unbounded fetching.
    visited[url] = None
    if kind == 'sitemapindex':
        for location in locations:
            child = visit(location, depth + 1)
            if child is None:
                raise ValueError(f'Sitemap cycle at {location}')
            if pages.intersection(child):
                raise ValueError(f'Overlapping shards in {url}')
            pages.update(child)
    else:
        pages.update(locations)
    visited[url] = pages
    print(f'{kind:12} {len(entries):6} entries {url}')
    return pages

main = visit(base + '/sitemap.xml')
for name in ('apps', 'skills'):
    legacy = visit(f'{base}/sitemaps/{name}.xml')
    if not legacy.issubset(main):
        raise ValueError(f'{name} legacy entry point contains pages missing from main index')
    # Check completeness in both directions: the legacy endpoint must not silently truncate.
    shards = [pages for url, pages in visited.items()
              if urlsplit(url).path.startswith(f'/sitemaps/{name}-')]
    expected = set().union(*shards) if shards else legacy
    if legacy != expected:
        raise ValueError(f'{name} legacy entry point is incomplete: {len(legacy)} vs {len(expected)}')
print(f'PASS: {len(main)} unique page URLs; current and legacy entry points agree.')
