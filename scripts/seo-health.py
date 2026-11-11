#!/usr/bin/env python3
"""Read-only HTTP checks. Does not execute scripts, submit forms or emit GA events."""
import argparse
import json
import subprocess
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = None
        self.lang = None
        self.robots = ''
        self.app_links = set()
        self.jsonld = []
        self.in_jsonld = False
        self.buffer = ''
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html': self.lang = attrs.get('lang')
        if tag == 'link' and attrs.get('rel') == 'canonical': self.canonical = attrs.get('href')
        if tag == 'meta' and attrs.get('name') == 'robots': self.robots = attrs.get('content', '')
        if tag == 'a' and attrs.get('href', '').startswith('/app/'):
            self.app_links.add(attrs['href'].removeprefix('/app/'))
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.in_jsonld = True
            self.buffer = ''
    def handle_data(self, data):
        if self.in_jsonld: self.buffer += data
    def handle_endtag(self, tag):
        if tag == 'script' and self.in_jsonld:
            self.jsonld.append(json.loads(self.buffer))
            self.in_jsonld = False

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='https://mcpapp.net')
parser.add_argument('--output', default='reports/seo-health.json')
args = parser.parse_args()
base = args.base_url.rstrip('/')
cohort = json.loads(Path('ops/seo-observation.json').read_text())
checks = cohort['pages'] + [
    {'path': '/app/adobe-formerly-photoshop', 'canonical': '/app/adobe'},
    {'path': '/app/data-analytics', 'canonical': '/app/data'},
    {'path': '/search?q=github&platform=claude', 'canonical': '/search', 'contains': ['name="platform"', 'value="claude"']},
    {'path': '/search?q=zzzz-not-found-798574', 'canonical': '/search', 'contains': ['No matching apps']},
    {'path': '/es/learn/build-your-first-mcp-app', 'contains': ['translation-note', 'lang="en"']},
]
results = []
for check in checks:
    path = check['path']
    try:
        raw = subprocess.check_output(['curl', '--fail', '--silent', '--show-error', '--location',
                                       '--max-time', '45', '--user-agent', 'mcpapp-public-health/1.0',
                                       '--write-out', '\n%{http_code}', base + path], text=True)
        body, status_text = raw.rsplit('\n', 1)
        status = int(status_text)
        assert status == 200, f'HTTP {status}'
        if path.endswith('/markdown'):
            expected = path.removesuffix('/markdown')
            canonical = next(line.split(': ', 1)[1] for line in body.splitlines() if line.startswith('- Canonical: '))
            assert urlparse(canonical).path == expected, 'Markdown canonical path mismatch'
        else:
            doc = Document()
            doc.feed(body)
            assert doc.canonical, 'Missing canonical'
            canonical = doc.canonical
            assert urlparse(canonical).path == check.get('canonical', path), 'Canonical path mismatch'
            assert '<title>' in body and 'name="description"' in body, 'Missing metadata'
            if path.startswith('/search'):
                assert 'noindex' in doc.robots, 'Search must remain noindex'
            if 'platform=claude' in path:
                assert 'github' in doc.app_links, 'Expected GitHub match'
                catalog = json.loads(Path('seed/chatgpt-apps.json').read_text())
                by_id = {app['id']: app for app in catalog['apps']}
                for app_id in doc.app_links:
                    if app_id in by_id:
                        assert any(s['platform'] == 'claude' for s in by_id[app_id]['surfaces']), f'Wrong platform: {app_id}'
        if urlparse(base).hostname == 'mcpapp.net':
            assert urlparse(canonical).netloc == 'mcpapp.net', 'Production canonical host mismatch'
        for text in check.get('contains', []): assert text in body, f'Missing expected content: {text}'
        results.append({'path': path, 'status': status, 'ok': True, 'canonical': canonical})
    except Exception as error:
        results.append({'path': path, 'ok': False, 'error': str(error)})
        print(f'FAIL {path}: {error}', flush=True)
report = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'baseUrl': base,
          'scope': 'Public HTTP, rendered HTML and Markdown only; not an index, traffic or AI citation report',
          'passed': sum(r['ok'] for r in results), 'total': len(results), 'results': results}
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
print(f"SEO HTTP health: {report['passed']}/{report['total']} passed; {output}")
raise SystemExit(0 if report['passed'] == report['total'] else 1)
