import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateBurstRateLimitPosture,
  isOversizedJsonBodyRejection,
  isOversizedPromptRejection,
  TRAINING_BUILD_RATE_LIMIT_ENABLED,
} from "./abuseControlAssertions.mjs";

describe("abuseControlAssertions", () => {
  it("isOversizedPromptRejection accepts 400 VALIDATION_ERROR", () => {
    assert.equal(isOversizedPromptRejection(400, "VALIDATION_ERROR"), true);
    assert.equal(isOversizedPromptRejection(413, "REQUEST_FAILED"), false);
  });

  it("isOversizedJsonBodyRejection accepts 413 or 400 VALIDATION_ERROR", () => {
    assert.equal(isOversizedJsonBodyRejection(413, "REQUEST_FAILED"), true);
    assert.equal(isOversizedJsonBodyRejection(400, "VALIDATION_ERROR"), true);
    assert.equal(isOversizedJsonBodyRejection(200, undefined), false);
  });

  it("evaluateBurstRateLimitPosture documents no rate limit on training build", () => {
    assert.equal(TRAINING_BUILD_RATE_LIMIT_ENABLED, false);
    const result = evaluateBurstRateLimitPosture([200, 200, 200]);
    assert.equal(result.ok, true);
    assert.match(result.summary, /no 429/i);
  });

  it("evaluateBurstRateLimitPosture expects 429 when rate limiting is enabled", () => {
    const withoutLimit = evaluateBurstRateLimitPosture([200, 200, 200], { rateLimitEnabled: true });
    assert.equal(withoutLimit.ok, false);
    const withLimit = evaluateBurstRateLimitPosture([200, 429, 429], { rateLimitEnabled: true });
    assert.equal(withLimit.ok, true);
  });
});
