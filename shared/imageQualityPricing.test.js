import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildImageQualityOptions,
  getImageQualityCostHints,
  GOOGLE_FLASH_IMAGE_QUALITY_COST_HINTS,
  OPENAI_IMAGE_QUALITY_COST_HINTS,
} from "./imageQualityPricing.js";

describe("getImageQualityCostHints", () => {
  it("returns mock hints in mock mode", () => {
    const hints = getImageQualityCostHints({ providerMode: "mock", providerId: "openai" });
    assert.equal(hints.low, "no API cost");
  });

  it("returns OpenAI hints for live openai", () => {
    const hints = getImageQualityCostHints({ providerMode: "live", providerId: "openai" });
    assert.deepEqual(hints, OPENAI_IMAGE_QUALITY_COST_HINTS);
  });

  it("returns Google flash hints for live google default model", () => {
    const hints = getImageQualityCostHints({
      providerMode: "live",
      providerId: "google",
      liveImageModel: "gemini-2.5-flash-image",
    });
    assert.deepEqual(hints, GOOGLE_FLASH_IMAGE_QUALITY_COST_HINTS);
  });

  it("returns Google pro hints when pro image model is configured", () => {
    const hints = getImageQualityCostHints({
      providerMode: "live",
      providerId: "google",
      liveImageModel: "gemini-3-pro-image-preview",
    });
    assert.equal(hints.high, "~$0.24");
  });
});

describe("buildImageQualityOptions", () => {
  it("changes cost hints when provider changes", () => {
    const openai = buildImageQualityOptions({ providerMode: "live", providerId: "openai" });
    const google = buildImageQualityOptions({
      providerMode: "live",
      providerId: "google",
      liveImageModel: "gemini-2.5-flash-image",
    });
    assert.notEqual(openai[0].costHint, google[0].costHint);
  });
});
