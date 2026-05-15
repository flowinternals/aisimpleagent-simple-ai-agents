import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_IMAGE_SIZE, normalizeImageSize, openAiImageDimensions } from "./imageSize.js";

describe("normalizeImageSize", () => {
  it("defaults to 16:9", () => {
    assert.equal(normalizeImageSize(undefined), DEFAULT_IMAGE_SIZE);
  });

  it("maps OpenAI dimensions", () => {
    assert.equal(openAiImageDimensions("16:9"), "1536x1024");
    assert.equal(openAiImageDimensions("1:1"), "1024x1024");
  });
});
