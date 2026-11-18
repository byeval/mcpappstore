import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultOgImagePath } from '../lib/og-path';
import { siteNameForLocale } from '../lib/seo';
// This runs under plain Node/tsx, without Vite's next/* rendering aliases.
test('SEO metadata loads without next/og and preserves the default image URL', () => {
  assert.equal(defaultOgImagePath(), '/api/og/default.png');
  assert.ok(siteNameForLocale('en').length > 0);
});
