import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateClientErrorEnvelopeSafe,
  evaluateGoogleLogPayloadFixture,
  evaluateOpenAiLogSummaryFixture,
  evaluateProviderSourcesUseSafeLogging,
  evaluateServerRoutesUseTrainingLog,
} from "./loggingAssertions.mjs";

describe("loggingAssertions", () => {
  it("evaluateClientErrorEnvelopeSafe rejects secret-like client bodies", () => {
    const result = evaluateClientErrorEnvelopeSafe(
      { ok: false, error: "failed", code: "X", hint: "sk-proj-abc" },
      502,
    );
    assert.equal(result.ok, false);
  });

  it("evaluateClientErrorEnvelopeSafe accepts generic adapter-mapped errors", () => {
    const result = evaluateClientErrorEnvelopeSafe(
      {
        ok: false,
        error: "The image provider could not complete this request. Please try again in a moment.",
        code: "LIVE_PROVIDER_FAILED",
        issues: [],
      },
      502,
    );
    assert.equal(result.ok, true);
  });

  it("evaluateOpenAiLogSummaryFixture passes", () => {
    const result = evaluateOpenAiLogSummaryFixture();
    assert.equal(result.ok, true, result.summary);
  });

  it("evaluateGoogleLogPayloadFixture passes", () => {
    const result = evaluateGoogleLogPayloadFixture();
    assert.equal(result.ok, true, result.summary);
  });

  it("evaluateProviderSourcesUseSafeLogging passes", () => {
    const result = evaluateProviderSourcesUseSafeLogging();
    assert.equal(result.ok, true, result.summary);
  });

  it("evaluateServerRoutesUseTrainingLog passes", () => {
    const result = evaluateServerRoutesUseTrainingLog();
    assert.equal(result.ok, true, result.summary);
  });
});
