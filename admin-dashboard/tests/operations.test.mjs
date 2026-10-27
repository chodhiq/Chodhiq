import assert from "node:assert/strict";
import test from "node:test";
import { cleanSearchValue, csvSafeValue, isLegalTransition, pageRange, runBoundedBulk } from "../lib/operations.ts";
import { cachedQuery, clearQueryCache, readCachedQuery } from "../lib/query-cache.ts";

test("search cleaning removes Supabase filter control characters", () => {
  assert.equal(cleanSearchValue("  Kerala,._%():*`\\ Kitchen  "), "Kerala Kitchen");
  assert.equal(cleanSearchValue("a".repeat(120)).length, 100);
});

test("pagination produces inclusive server ranges", () => {
  assert.deepEqual(pageRange(0), [0, 24]);
  assert.deepEqual(pageRange(3), [75, 99]);
});

test("CSV cells escape quotes and spreadsheet formulas", () => {
  assert.equal(csvSafeValue('hello "world"'), '"hello ""world"""');
  for (const value of ["=1+1", "+cmd", "-2+3", "@SUM(A1)"]) assert.match(csvSafeValue(value), /^"'/);
});

test("state transitions reject repeats and illegal jumps", () => {
  assert.equal(isLegalTransition("verification", "pending", "approved"), true);
  assert.equal(isLegalTransition("verification", "approved", "rejected"), false);
  assert.equal(isLegalTransition("report", "resolved", "reviewing"), false);
  assert.equal(isLegalTransition("user", "suspended", "active"), true);
});

test("bounded bulk preserves per-record success and failure", async () => {
  const summary = await runBoundedBulk(["a", "b", "b", "c"], async id => id === "b" ? { ok: false, code: "mutation_failed", userMessage: "failed", correlationId: id } : { ok: true, data: id, correlationId: id }, 2);
  assert.deepEqual(summary.succeeded.sort(), ["a", "c"]);
  assert.deepEqual(summary.failed, ["b"]);
  assert.equal(summary.message, "2 succeeded, 1 failed.");
});

test("query cache serves fresh values, deduplicates requests, and preserves stale data on errors", async () => {
  clearQueryCache();
  let calls = 0;
  const first = await cachedQuery("providers", async () => { calls += 1; return ["cached"]; });
  const fresh = await cachedQuery("providers", async () => { calls += 1; return ["unexpected"]; });
  assert.deepEqual(first, ["cached"]);
  assert.deepEqual(fresh, ["cached"]);
  assert.equal(calls, 1);

  const stale = await cachedQuery("providers", async () => { calls += 1; throw new Error("offline"); }, { force: true, retries: 0 });
  assert.deepEqual(stale, ["cached"]);
  assert.deepEqual(readCachedQuery("providers"), ["cached"]);
  assert.equal(calls, 2);
});
