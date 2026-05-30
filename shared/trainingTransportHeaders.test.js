import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFERRED_PRODUCTION_SECURITY_HEADER_NAMES,
  TRAINING_BASELINE_SECURITY_HEADERS,
} from "./trainingTransportHeaders.js";

describe("trainingTransportHeaders", () => {
  it("defines the localhost training baseline headers", () => {
    assert.equal(
      TRAINING_BASELINE_SECURITY_HEADERS["Referrer-Policy"],
      "strict-origin-when-cross-origin",
    );
    assert.equal(TRAINING_BASELINE_SECURITY_HEADERS["X-Content-Type-Options"], "nosniff");
  });

  it("keeps CSP and HSTS in the deferred production list", () => {
    assert.ok(DEFERRED_PRODUCTION_SECURITY_HEADER_NAMES.includes("content-security-policy"));
    assert.ok(DEFERRED_PRODUCTION_SECURITY_HEADER_NAMES.includes("strict-transport-security"));
    assert.ok(!DEFERRED_PRODUCTION_SECURITY_HEADER_NAMES.includes("referrer-policy"));
  });
});
