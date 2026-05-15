import { describe, expect, it } from "vitest";
import {
  formatGenerationApiErrorMessage,
  isGenerationApiErrorBody,
  parseGenerationApiSuccess,
} from "./generation";

const validData = {
  imageData: "data:image/png;base64,abcd",
  mimeType: "image/png",
  fileName: "diagram.png",
  providerMode: "live" as const,
  generatedAt: "2026-05-15T12:00:00.000Z",
  generationTimeMs: 1200,
  modelLabel: "gpt-image-1.5",
};

describe("parseGenerationApiSuccess", () => {
  it("parses ok envelope", () => {
    const data = parseGenerationApiSuccess({ ok: true, data: validData });
    expect(data.fileName).toBe("diagram.png");
    expect(data.providerMode).toBe("live");
  });

  it("throws on invalid image payload", () => {
    expect(() =>
      parseGenerationApiSuccess({
        ok: true,
        data: { ...validData, imageData: "not-a-data-url" },
      }),
    ).toThrow(/image payload/i);
  });
});

describe("isGenerationApiErrorBody", () => {
  it("accepts API error envelope", () => {
    expect(
      isGenerationApiErrorBody({
        ok: false,
        error: "The image provider could not complete this request.",
        code: "LIVE_PROVIDER_FAILED",
        issues: [],
      }),
    ).toBe(true);
  });
});

describe("formatGenerationApiErrorMessage", () => {
  it("includes distinct issue lines", () => {
    const message = formatGenerationApiErrorMessage({
      ok: false,
      error: "Validation failed.",
      code: "VALIDATION_ERROR",
      issues: [{ path: "prompt", message: "Prompt is required.", code: "custom" }],
    });
    expect(message).toContain("Validation failed.");
    expect(message).toContain("Prompt is required.");
  });
});
