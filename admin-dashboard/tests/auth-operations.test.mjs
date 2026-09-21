import assert from "node:assert/strict";
import test from "node:test";
import { signInErrorMessage, withAuthTimeout } from "../lib/auth-operations.ts";

test("auth requests preserve successful sessions and rejected errors", async () => {
  const session = { user: { id: "admin" } };
  assert.equal(await withAuthTimeout(Promise.resolve(session)), session);
  const failure = new Error("connection failed");
  await assert.rejects(withAuthTimeout(Promise.reject(failure)), error => error === failure);
});

test("stalled authentication stops waiting and a subsequent attempt can succeed", async () => {
  await assert.rejects(withAuthTimeout(new Promise(() => {}), 10), /auth_timeout/);
  assert.equal(await withAuthTimeout(Promise.resolve("retry succeeded")), "retry succeeded");
});

test("login errors explain credentials, confirmation, throttling and timeouts without exposing raw errors", () => {
  assert.match(signInErrorMessage({ code: "invalid_credentials" }), /Email or password is incorrect/);
  assert.match(signInErrorMessage({ code: "email_not_confirmed" }), /Confirm your email/);
  assert.match(signInErrorMessage({ code: "over_request_rate_limit" }), /Too many attempts/);
  assert.match(signInErrorMessage(new Error("auth_timeout")), /timed out/);
  assert.doesNotMatch(signInErrorMessage(new Error("private diagnostic")), /private diagnostic/);
});
