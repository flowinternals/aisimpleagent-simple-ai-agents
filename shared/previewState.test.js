import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getPreviewPhase, shouldShowPreviewImage } from "./previewState.js";

describe("getPreviewPhase", () => {
  it("returns loading while a request is in flight", () => {
    assert.equal(getPreviewPhase({ loading: true, error: "", hasResult: true }), "loading");
  });

  it("returns error after failure even when a prior result exists in memory", () => {
    assert.equal(getPreviewPhase({ loading: false, error: "failed", hasResult: true }), "error");
  });

  it("returns success only when there is a result and no error", () => {
    assert.equal(getPreviewPhase({ loading: false, error: "", hasResult: true }), "success");
  });

  it("returns empty when idle with no result", () => {
    assert.equal(getPreviewPhase({ loading: false, error: "", hasResult: false }), "empty");
  });
});

describe("shouldShowPreviewImage", () => {
  it("is true only in success phase", () => {
    assert.equal(shouldShowPreviewImage("success"), true);
    assert.equal(shouldShowPreviewImage("error"), false);
    assert.equal(shouldShowPreviewImage("loading"), false);
    assert.equal(shouldShowPreviewImage("empty"), false);
  });
});
