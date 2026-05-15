import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_IMAGE_QUALITY, normalizeImageQuality } from "./imageQuality.js";

describe("normalizeImageQuality", () => {
  it("defaults unknown values to low", () => {
    assert.equal(normalizeImageQuality(undefined), DEFAULT_IMAGE_QUALITY);
    assert.equal(normalizeImageQuality("ultra"), DEFAULT_IMAGE_QUALITY);
  });

  it("accepts medium and high", () => {
    assert.equal(normalizeImageQuality("medium"), "medium");
    assert.equal(normalizeImageQuality(" HIGH "), "high");
  });
});
