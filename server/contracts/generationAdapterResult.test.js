import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeGenerationAdapterResult } from "./generationAdapterResult.js";
import { ProviderAdapterError } from "../errors/providerAdapterError.js";

const validMockResult = {
  imageData: "data:image/png;base64,YWJj",
  mimeType: "image/png",
  fileName: "diagram.png",
  providerMode: "mock",
  generatedAt: "2026-05-15T12:00:00.000Z",
};

describe("normalizeGenerationAdapterResult", () => {
  it("accepts a valid mock adapter result", () => {
    const out = normalizeGenerationAdapterResult(validMockResult, "mock");
    assert.equal(out.mimeType, "image/png");
    assert.equal(out.fileName, "diagram.png");
    assert.equal(out.providerMode, "mock");
    assert.match(out.generatedAt, /^2026-05-15T12:00:00.000Z$/);
  });

  it("rejects non-object adapter results", () => {
    assert.throws(
      () => normalizeGenerationAdapterResult(null, "mock"),
      (error) => error instanceof ProviderAdapterError && error.code === "ADAPTER_RESULT_INVALID",
    );
  });

  it("rejects unsafe fileName path segments", () => {
    assert.throws(
      () =>
        normalizeGenerationAdapterResult(
          { ...validMockResult, fileName: "../evil/diagram.png" },
          "mock",
        ),
      (error) => error instanceof ProviderAdapterError && error.code === "ADAPTER_RESULT_INVALID",
    );
  });

  it("rejects non-image mimeType values", () => {
    assert.throws(
      () =>
        normalizeGenerationAdapterResult(
          {
            ...validMockResult,
            mimeType: "text/html",
            imageData: "data:text/html;base64,PGgxPg==",
          },
          "mock",
        ),
      (error) => error instanceof ProviderAdapterError && error.code === "ADAPTER_RESULT_INVALID",
    );
  });

  it("rejects imageData that does not match mimeType", () => {
    assert.throws(
      () =>
        normalizeGenerationAdapterResult(
          {
            ...validMockResult,
            mimeType: "image/png",
            imageData: "data:image/jpeg;base64,YWJj",
          },
          "mock",
        ),
      (error) => error instanceof ProviderAdapterError && error.code === "ADAPTER_RESULT_INVALID",
    );
  });

  it("rejects providerMode mismatch with execution mode", () => {
    assert.throws(
      () => normalizeGenerationAdapterResult({ ...validMockResult, providerMode: "live" }, "mock"),
      (error) => error instanceof ProviderAdapterError && error.code === "ADAPTER_RESULT_INVALID",
    );
  });

  it("accepts optional quality, theme, and size labels when valid", () => {
    const out = normalizeGenerationAdapterResult(
      {
        ...validMockResult,
        qualityLabel: "high",
        themeLabel: "dark",
        sizeLabel: "1:1",
      },
      "mock",
    );
    assert.equal(out.qualityLabel, "high");
    assert.equal(out.themeLabel, "dark");
    assert.equal(out.sizeLabel, "1:1");
  });
});
