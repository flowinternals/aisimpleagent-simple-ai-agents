import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildGenerationRequestBody } from "./buildGenerationRequestBody.js";

describe("buildGenerationRequestBody", () => {
  it("maps mock settings with defaults", () => {
    assert.deepEqual(buildGenerationRequestBody({ providerMode: "mock", providerId: "openai" }, "  hello  "), {
      prompt: "hello",
      providerMode: "mock",
      providerId: "openai",
      imageQuality: "low",
      imageTheme: "light",
      imageSize: "16:9",
    });
  });

  it("includes generation options", () => {
    assert.deepEqual(
      buildGenerationRequestBody(
        { providerMode: "live", providerId: "openai" },
        "diagram",
        { imageQuality: "high", imageTheme: "dark", imageSize: "1:1" },
      ),
      {
        prompt: "diagram",
        providerMode: "live",
        providerId: "openai",
        imageQuality: "high",
        imageTheme: "dark",
        imageSize: "1:1",
      },
    );
  });
});
