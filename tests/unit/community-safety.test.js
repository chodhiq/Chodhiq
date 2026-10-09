import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canReportContent,
  reportFailureMessage,
} from '../../src/components/community/communitySafety.js';
test('reports target the content author rather than the parent post owner', () => {
  assert.equal(canReportContent('me', { author_id: 'me' }), false);
  assert.equal(canReportContent('me', { author_id: 'other' }), true);
  assert.equal(canReportContent('me', { author_id: 'me' }, { author_id: 'other' }), true);
  assert.equal(canReportContent('me', { author_id: 'other' }, { author_id: 'me' }), false);
  assert.equal(canReportContent(null, { author_id: 'other' }), false);
});
test('report errors distinguish session, rate limit, deleted content and connectivity', () => {
  assert.match(reportFailureMessage('42501'), /Sign in/);
  assert.match(reportFailureMessage('P0001'), /hourly report limit/);
  assert.match(reportFailureMessage('P0002'), /no longer available/);
  assert.match(reportFailureMessage('22023'), /not valid/);
  assert.match(reportFailureMessage('unknown'), /connection and retry/);
});
