import test from 'node:test';import assert from 'node:assert/strict';
import {isRemovedContentPath,removedContentResponse} from '../lib/content-removals';
test('global Viator public paths stay removed, unrelated detail/media policies unchanged',()=>{
 for(const path of ['/app/viator','/en/app/viator','/es/app/viator','/ja/app/viator'])for(const suffix of ['','/','?x=1'])assert.equal(isRemovedContentPath(path+suffix),true);
 for(const locale of ['fr','de','ru','zh-hans','ko'])assert.equal(isRemovedContentPath(`/${locale}/app/viator`),true);
 for(const path of ['/api/assets/viator','/app/viator-other','/admin/viator','/app/other'])assert.equal(isRemovedContentPath(path),false);
 for(const path of ['/FR/apps/Viator/','/en-US/app/viator.rsc','/zh-CN/app/%76iator','/api/og/viator'])assert.equal(isRemovedContentPath(path),true);
 const response=removedContentResponse();assert.equal(response.status,410);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-robots-tag'),'noindex');
});
