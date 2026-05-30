import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ProviderAdapterError, httpErrorFromProviderAdapter } from "./providerAdapterError.js";

const ADAPTER_CODES = [
  "PROVIDER_NOT_AVAILABLE",
  "LIVE_PROVIDER_NOT_IMPLEMENTED",
  "LIVE_PROVIDER_NOT_CONFIGURED",
  "LIVE_PROVIDER_QUOTA_EXCEEDED",
  "LIVE_PROVIDER_RATE_LIMIT",
  "LIVE_PROVIDER_MISCONFIGURED",
  "LIVE_PROVIDER_FAILED",
  "ADAPTER_RESULT_INVALID",
];

describe("httpErrorFromProviderAdapter", () => {
  for (const code of ADAPTER_CODES) {
    it(`does not forward internal adapter message for ${code}`, () => {
      const internal = `INTERNAL_ONLY_DETAIL_${code}_sk-proj-fake-key`;
      const http = httpErrorFromProviderAdapter(
        new ProviderAdapterError(code, internal, { debug: "vendor-trace-id-12345" }),
      );
      assert.ok(http);
      assert.equal(http.message.includes(internal), false);
      assert.equal(http.message.includes("sk-proj-"), false);
      assert.equal(http.message.includes("vendor-trace-id"), false);
      assert.equal(http.code, code);
    });
  }

  it("returns null for non-adapter errors", () => {
    assert.equal(httpErrorFromProviderAdapter(new Error("plain")), null);
  });
});
