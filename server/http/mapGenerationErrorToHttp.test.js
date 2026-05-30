import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapGenerationErrorToHttp } from "./mapGenerationErrorToHttp.js";
import { ProviderAdapterError } from "../errors/providerAdapterError.js";
import { HttpError } from "../httpError.js";

describe("mapGenerationErrorToHttp", () => {
  it("maps adapter quota errors to 402 with client-safe message", () => {
    const mapped = mapGenerationErrorToHttp(
      new ProviderAdapterError("LIVE_PROVIDER_QUOTA_EXCEEDED", "internal quota detail"),
    );
    assert.equal(mapped.status, 402);
    assert.equal(mapped.code, "LIVE_PROVIDER_QUOTA_EXCEEDED");
    assert.match(mapped.message, /billing or usage limit/i);
    assert.equal(mapped.logError, false);
    assert.doesNotMatch(mapped.message, /internal quota detail/);
  });

  it("maps adapter result contract failures to 502", () => {
    const mapped = mapGenerationErrorToHttp(
      new ProviderAdapterError("ADAPTER_RESULT_INVALID", 'Adapter result field "fileName" is missing'),
    );
    assert.equal(mapped.status, 502);
    assert.equal(mapped.code, "ADAPTER_RESULT_INVALID");
    assert.match(mapped.message, /invalid result/i);
  });

  it("maps HttpError instances directly", () => {
    const mapped = mapGenerationErrorToHttp(new HttpError(400, "VALIDATION_ERROR", "Check your prompt."));
    assert.equal(mapped.status, 400);
    assert.equal(mapped.code, "VALIDATION_ERROR");
    assert.equal(mapped.message, "Check your prompt.");
    assert.equal(mapped.logError, false);
  });

  it("returns generic 500 for unknown errors", () => {
    const mapped = mapGenerationErrorToHttp(new Error("unexpected vendor stack trace"));
    assert.equal(mapped.status, 500);
    assert.equal(mapped.code, "GENERATION_FAILED");
    assert.match(mapped.message, /try again/i);
    assert.equal(mapped.logError, true);
    assert.doesNotMatch(mapped.message, /stack trace/);
  });
});
