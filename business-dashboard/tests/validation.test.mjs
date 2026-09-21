import assert from "node:assert/strict";
import test from "node:test";
import {
  validateOptionalUrl,
  validateService,
  validateText,
  validateUpload,
} from "../lib/validation.ts";

test("service validation rejects invalid names and prices", () => {
  assert.ok(validateService("", "10"));
  assert.ok(validateService("Catering", "-1"));
  assert.ok(validateService("Catering", "not-a-number"));
  assert.equal(validateService("Catering", "125.50"), null);
});

test("text validation enforces trimmed boundaries", () => {
  assert.ok(validateText("  ", "Reply", 2, 2000));
  assert.equal(validateText("Thank you", "Reply", 2, 2000), null);
});

test("upload validation enforces MIME type and size", () => {
  assert.ok(validateUpload({ type: "text/html", size: 100 }, ["image/jpeg"]));
  assert.ok(
    validateUpload({ type: "image/jpeg", size: 11 * 1024 * 1024 }, [
      "image/jpeg",
    ]),
  );
  assert.equal(
    validateUpload({ type: "image/jpeg", size: 1024 }, ["image/jpeg"]),
    null,
  );
});

test("website validation only allows web URLs", () => {
  assert.equal(validateOptionalUrl(""), null);
  assert.equal(validateOptionalUrl("https://example.com"), null);
  assert.ok(validateOptionalUrl("javascript:alert(1)"));
  assert.ok(validateOptionalUrl("not a URL"));
});
