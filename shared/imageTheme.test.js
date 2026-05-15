import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_IMAGE_THEME, normalizeImageTheme } from "./imageTheme.js";

describe("normalizeImageTheme", () => {
  it("defaults to light", () => {
    assert.equal(normalizeImageTheme(undefined), DEFAULT_IMAGE_THEME);
    assert.equal(normalizeImageTheme("bright"), DEFAULT_IMAGE_THEME);
  });

  it("accepts dark", () => {
    assert.equal(normalizeImageTheme("dark"), "dark");
    assert.equal(normalizeImageTheme(" DARK "), "dark");
  });
});
