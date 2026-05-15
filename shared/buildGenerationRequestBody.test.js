import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildGenerationRequestBody } from "./buildGenerationRequestBody.js";

describe("buildGenerationRequestBody", () => {
  it("maps mock settings to request body", () => {
    assert.deepEqual(
      buildGenerationRequestBody({ providerMode: "mock", providerId: "openai" }, "  hello  "),
      { prompt: "hello", providerMode: "mock", providerId: "openai", imageQuality: "low" },
    );
  });

  it("maps live settings to request body", () => {
    assert.deepEqual(
      buildGenerationRequestBody({ providerMode: "live", providerId: "openai" }, "diagram"),
      { prompt: "diagram", providerMode: "live", providerId: "openai", imageQuality: "low" },
    );
  });

  it("includes selected image quality", () => {
    assert.deepEqual(
      buildGenerationRequestBody({ providerMode: "live", providerId: "openai" }, "diagram", "high"),
      { prompt: "diagram", providerMode: "live", providerId: "openai", imageQuality: "high" },
    );
  });
});
