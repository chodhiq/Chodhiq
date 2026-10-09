import assert from 'node:assert/strict';
import test from 'node:test';
import { mapPoints, openStreetMapHtml } from '../../src/lib/openStreetMap.js';

test('map points keep valid zero coordinates and reject unsafe coordinates', () => {
  assert.deepEqual(
    mapPoints([
      { id: 'zero', name: 'Zero', baseLatitude: 0, baseLongitude: 0 },
      { id: 'missing', baseLatitude: null, baseLongitude: 12 },
      { id: 'invalid', baseLatitude: 91, baseLongitude: 12 },
      { id: 'infinite', baseLatitude: 12, baseLongitude: Infinity },
      { id: 'london', name: 'London', baseLatitude: 51.5, baseLongitude: -0.1 },
    ]),
    [
      { id: 'zero', name: 'Zero', latitude: 0, longitude: 0 },
      { id: 'london', name: 'London', latitude: 51.5, longitude: -0.1 },
    ],
  );
});

test('map HTML safely embeds business names without executing their markup', () => {
  const html = openStreetMapHtml([
    {
      id: '1',
      name: '</script><script>alert(1)</script>',
      baseLatitude: 51.5,
      baseLongitude: -0.1,
    },
  ]);
  assert.ok(!html.includes('</script><script>alert(1)'));
  assert.ok(html.includes('label.textContent=point.name'));
  assert.ok(html.includes('\\u003c/script>'));
});
