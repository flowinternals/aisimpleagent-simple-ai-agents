import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_GOOGLE_IMAGE_MODEL,
  googleImageAspectRatio,
  googleModelSupportsImageConfig,
  googleProImageResolution,
} from "./googleImageConfig.js";

describe("googleModelSupportsImageConfig", () => {
  it("enables imageConfig for the default flash image model", () => {
    assert.equal(googleModelSupportsImageConfig(DEFAULT_GOOGLE_IMAGE_MODEL), true);
    assert.equal(googleModelSupportsImageConfig("gemini-2.5-flash-image"), true);
  });

  it("enables imageConfig for pro-image and imagen models", () => {
    assert.equal(googleModelSupportsImageConfig("gemini-3-pro-image-preview"), true);
    assert.equal(googleModelSupportsImageConfig("imagen-3.0-generate-002"), true);
  });

  it("does not enable imageConfig for unrelated text models", () => {
    assert.equal(googleModelSupportsImageConfig("gemini-2.5-flash"), false);
    assert.equal(googleModelSupportsImageConfig(""), false);
  });
});

describe("googleImageAspectRatio", () => {
  it("passes through app aspect labels supported by Gemini ImageConfig", () => {
    assert.equal(googleImageAspectRatio("16:9"), "16:9");
    assert.equal(googleImageAspectRatio("4:3"), "4:3");
    assert.equal(googleImageAspectRatio("1:1"), "1:1");
  });
});

describe("googleProImageResolution", () => {
  it("maps quality tiers to Gemini resolution labels", () => {
    assert.equal(googleProImageResolution("low"), "1K");
    assert.equal(googleProImageResolution("medium"), "2K");
    assert.equal(googleProImageResolution("high"), "4K");
  });
});
