import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOpenAiErrorLogSummary, extractOpenAiErrorMessage } from "./openaiProviderDiagnostics.js";

describe("extractOpenAiErrorMessage", () => {
  it("reads nested error.message", () => {
    const message = extractOpenAiErrorMessage({
      error: { message: "Rate limit exceeded", type: "rate_limit_error" },
    });
    assert.equal(message, "Rate limit exceeded");
  });
});

describe("buildOpenAiErrorLogSummary", () => {
  it("omits full vendor JSON including base64 image payloads", () => {
    const vendorJson = {
      error: { message: "Invalid request", type: "invalid_request_error", code: "invalid" },
      data: [{ b64_json: "a".repeat(5000) }],
    };
    const summary = buildOpenAiErrorLogSummary(400, vendorJson);
    const serialized = JSON.stringify(summary);
    assert.equal(serialized.includes("b64_json"), false);
    assert.equal(serialized.includes("a".repeat(100)), false);
    assert.equal(summary.httpStatus, 400);
    assert.equal(summary.errorMessage, "Invalid request");
    assert.equal(summary.errorType, "invalid_request_error");
    assert.equal(summary.errorCode, "invalid");
  });

  it("never echoes a fake API key from the vendor body", () => {
    const vendorJson = {
      error: { message: "bad key", type: "auth_error" },
      hint: "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890",
    };
    const summary = buildOpenAiErrorLogSummary(401, vendorJson);
    assert.equal(JSON.stringify(summary).includes("sk-proj-"), false);
  });
});
