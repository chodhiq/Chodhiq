import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mapAnalytics,
  mapModerationReport,
  mapVerificationRequest,
} from '../../src/data/dashboardMappers.js';

test('mapAnalytics produces stable zero-filled dashboard metrics', () => {
  assert.deepEqual(
    mapAnalytics([{ event_type: 'view' }, { event_type: 'view' }, { event_type: 'call' }]),
    {
      total: 3,
      view: 2,
      call: 1,
      whatsapp: 0,
      website: 0,
      direction: 0,
      save: 0,
      share: 0,
    },
  );
});

test('mapVerificationRequest flattens joined provider data', () => {
  const result = mapVerificationRequest({
    id: 'r1',
    provider_id: 'p1',
    status: 'pending',
    submitted_at: 'now',
    providers: {
      business_name: 'Nila Beauty',
      base_city: 'Coventry',
      categories: { name: 'Beauty' },
    },
  });
  assert.deepEqual(result, {
    id: 'r1',
    providerId: 'p1',
    name: 'Nila Beauty',
    category: 'Beauty',
    city: 'Coventry',
    status: 'pending',
    submittedAt: 'now',
    notes: '',
    documents: [],
  });
});

test('dashboard mappers tolerate deleted or unavailable joined records', () => {
  assert.equal(mapVerificationRequest({ id: 'r1' }).name, 'Provider');
  assert.deepEqual(
    mapModerationReport({
      id: 'm1',
      post_id: 'post',
      reason: 'spam',
      status: 'open',
      created_at: 'now',
    }),
    {
      id: 'm1',
      postId: 'post',
      reason: 'spam',
      status: 'open',
      createdAt: 'now',
      postBody: '',
      postStatus: 'unknown',
    },
  );
});

test('verification mapper exposes document metadata without storage credentials', () => {
  const result = mapVerificationRequest({
    id: 'r2',
    verification_documents: [
      { id: 'd1', document_type: 'licence', storage_path: 'user/file.pdf', created_at: 'today' },
    ],
  });
  assert.deepEqual(result.documents, [
    { id: 'd1', type: 'licence', path: 'user/file.pdf', createdAt: 'today' },
  ]);
});
