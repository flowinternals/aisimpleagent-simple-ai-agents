import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GENERATION_PROMPT_MAX_LENGTH,
  validateGenerationRequest,
} from "./generationRequest.js";

describe("validateGenerationRequest", () => {
  describe("valid payloads", () => {
    it("accepts mock mode without providerId", () => {
      const result = validateGenerationRequest({
        prompt: "Create a network diagram",
        providerMode: "mock",
      });
      assert.equal(result.success, true);
      assert.equal(result.data.providerMode, "mock");
      assert.equal(result.data.providerId, "openai");
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

    it("accepts live openai with defaults", () => {
      const result = validateGenerationRequest({
        prompt: "Create a network diagram",
        providerMode: "live",
        providerId: "openai",
      });
      assert.equal(result.success, true);
      assert.equal(result.data.providerId, "openai");
      assert.equal(result.data.imageQuality, "low");
      assert.equal(result.data.imageTheme, "light");
      assert.equal(result.data.imageSize, "16:9");
    });

    it("accepts imageQuality, imageTheme, and imageSize", () => {
      const result = validateGenerationRequest({
        prompt: "Create a network diagram",
        providerMode: "mock",
        imageQuality: "high",
        imageTheme: "dark",
        imageSize: "1:1",
      });
      assert.equal(result.success, true);
      assert.equal(result.data.imageQuality, "high");
      assert.equal(result.data.imageTheme, "dark");
      assert.equal(result.data.imageSize, "1:1");
    });

    it("trims prompt whitespace before validating", () => {
      const result = validateGenerationRequest({
        prompt: "  Create a network diagram  ",
        providerMode: "mock",
      });
      assert.equal(result.success, true);
      assert.equal(result.data.prompt, "Create a network diagram");
    });

    it("accepts prompt at max length", () => {
      const prompt = `diagram ${"x".repeat(GENERATION_PROMPT_MAX_LENGTH - 8)}`;
      assert.equal(prompt.length, GENERATION_PROMPT_MAX_LENGTH);
      const result = validateGenerationRequest({ prompt, providerMode: "mock" });
      assert.equal(result.success, true);
    });
  });

  describe("malformed payloads", () => {
    it("rejects null and undefined", () => {
      for (const payload of [null, undefined]) {
        const result = validateGenerationRequest(payload);
        assert.equal(result.success, false);
        assert.match(result.error, /JSON object/i);
      }
    });

    it("rejects array and non-object bodies", () => {
      for (const payload of [[{ prompt: "x", providerMode: "mock" }], "string", 42]) {
        const result = validateGenerationRequest(payload);
        assert.equal(result.success, false);
      }
    });

    it("rejects strict-schema extra keys", () => {
      const result = validateGenerationRequest({
        prompt: "Create a network diagram",
        providerMode: "mock",
        isAdmin: true,
      });
      assert.equal(result.success, false);
      assert.ok(result.issues.some((issue) => issue.code === "unrecognized_keys"));
    });

    it("rejects empty or whitespace-only prompt", () => {
      const result = validateGenerationRequest({ prompt: "   ", providerMode: "mock" });
      assert.equal(result.success, false);
      assert.match(result.error, /empty|whitespace/i);
    });

    it("rejects punctuation-only prompt", () => {
      const result = validateGenerationRequest({ prompt: "!!!", providerMode: "mock" });
      assert.equal(result.success, false);
      assert.match(result.error, /letter or number/i);
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

    it("rejects invalid imageQuality", () => {
      const result = validateGenerationRequest({
        prompt: "Create a network diagram",
        providerMode: "mock",
        imageQuality: "ultra",
      });
      assert.equal(result.success, false);
    });

    it("rejects invalid imageTheme", () => {
      const result = validateGenerationRequest({
        prompt: "Create a network diagram",
        providerMode: "mock",
        imageTheme: "neon",
      });
      assert.equal(result.success, false);
    });

    it("rejects invalid imageSize", () => {
      const result = validateGenerationRequest({
        prompt: "Create a network diagram",
        providerMode: "mock",
        imageSize: "21:9",
      });
      assert.equal(result.success, false);
    });

    it("rejects invalid providerMode", () => {
      const result = validateGenerationRequest({
        prompt: "Create a network diagram",
        providerMode: "staging",
      });
      assert.equal(result.success, false);
    });
  });

  describe("oversized prompt", () => {
    it(`rejects prompt longer than ${GENERATION_PROMPT_MAX_LENGTH} characters`, () => {
      const result = validateGenerationRequest({
        prompt: "a".repeat(GENERATION_PROMPT_MAX_LENGTH + 1),
        providerMode: "mock",
      });
      assert.equal(result.success, false);
      assert.match(result.error, new RegExp(String(GENERATION_PROMPT_MAX_LENGTH)));
    });
  });
});
