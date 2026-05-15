import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateGenerationRequest } from "./generationRequest.js";

describe("validateGenerationRequest", () => {
  it("accepts mock mode without providerId", () => {
    const result = validateGenerationRequest({
      prompt: "Create a network diagram",
      providerMode: "mock",
    });
    assert.equal(result.success, true);
    assert.equal(result.data.providerMode, "mock");
    assert.equal(result.data.providerId, "openai");
  });

  it("requires providerId for live mode", () => {
    const result = validateGenerationRequest({
      prompt: "Create a network diagram",
      providerMode: "live",
    });
    assert.equal(result.success, false);
    assert.ok(result.issues.some((i) => i.path === "providerId"));
  });

  it("rejects unimplemented live providers", () => {
    const result = validateGenerationRequest({
      prompt: "Create a network diagram",
      providerMode: "live",
      providerId: "cloudflare",
    });
    assert.equal(result.success, false);
  });

  it("accepts live google", () => {
    const result = validateGenerationRequest({
      prompt: "Create a network diagram",
      providerMode: "live",
      providerId: "google",
    });
    assert.equal(result.success, true);
    assert.equal(result.data.providerId, "google");
  });

  it("accepts live openai", () => {
    const result = validateGenerationRequest({
      prompt: "Create a network diagram",
      providerMode: "live",
      providerId: "openai",
    });
    assert.equal(result.success, true);
    assert.equal(result.data.providerId, "openai");
    assert.equal(result.data.imageQuality, "low");
  });

  it("accepts imageQuality and defaults to low when omitted", () => {
    const withQuality = validateGenerationRequest({
      prompt: "Create a network diagram",
      providerMode: "mock",
      imageQuality: "high",
    });
    assert.equal(withQuality.success, true);
    assert.equal(withQuality.data.imageQuality, "high");

    const defaulted = validateGenerationRequest({
      prompt: "Create a network diagram",
      providerMode: "mock",
    });
    assert.equal(defaulted.success, true);
    assert.equal(defaulted.data.imageQuality, "low");
  });

  it("rejects invalid imageQuality", () => {
    const result = validateGenerationRequest({
      prompt: "Create a network diagram",
      providerMode: "mock",
      imageQuality: "ultra",
    });
    assert.equal(result.success, false);
  });

  it("accepts imageTheme and imageSize with defaults", () => {
    const result = validateGenerationRequest({
      prompt: "Create a network diagram",
      providerMode: "mock",
      imageTheme: "dark",
      imageSize: "1:1",
    });
    assert.equal(result.success, true);
    assert.equal(result.data.imageTheme, "dark");
    assert.equal(result.data.imageSize, "1:1");
  });
});
