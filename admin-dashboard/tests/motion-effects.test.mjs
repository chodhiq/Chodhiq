import assert from 'node:assert/strict';
import test from 'node:test';
import { animateCountUp, getCountUpDisplay } from '../lib/motion-effects.ts';

test('late metric data replaces the initial zero without showing a stale count', () => {
  assert.equal(getCountUpDisplay(0, null, null), '0');
  assert.equal(getCountUpDisplay(592, '0', 0), '592');
});

test('a changed value is shown immediately after the first animation', () => {
  assert.equal(getCountUpDisplay(4, null, null), '4');
  assert.equal(getCountUpDisplay(5, '4', 4), '5');
});

test('reduced motion always displays the real numeric value', () => {
  assert.equal(getCountUpDisplay(592, '168', 592, true), '592');
});

test('non-numeric metric content displays unchanged', () => {
  assert.equal(getCountUpDisplay('•••', '0', 0), '•••');
});

test('an eligible count-up publishes its starting zero synchronously', () => {
  const values = [];
  let tick;
  let clock = 100;
  animateCountUp(592, value => values.push(value), 600, callback => { tick = callback; return 7; }, () => {}, () => clock);
  assert.deepEqual(values, ['0']);
  clock = 400;
  tick(clock);
  assert.notEqual(values.at(-1), '592');
  clock = 700;
  tick(clock);
  assert.equal(values.at(-1), null);
});
