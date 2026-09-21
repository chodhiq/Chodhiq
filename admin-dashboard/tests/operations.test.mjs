import assert from "node:assert/strict";
import test from "node:test";
import { cleanSearchValue, csvSafeValue, isLegalTransition, pageRange, runBoundedBulk } from "../lib/operations.ts";

test("search cleaning removes Supabase filter control characters", () => {
  assert.equal(cleanSearchValue("  Kerala,_%() Kitchen  "), "Kerala      Kitchen");
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
