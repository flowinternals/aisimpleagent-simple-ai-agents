import { describe, expect, it } from "vitest";
import {
  fromGenerationApiErrorBody,
  getGenerationPreviewErrorPresentation,
  toGenerationPreviewError,
} from "./generationPreviewError";

describe("toGenerationPreviewError", () => {
  it("preserves API error code and message", () => {
    const error = toGenerationPreviewError({
      ok: false,
      error: "OpenAI billing or usage limit reached.",
      code: "LIVE_PROVIDER_QUOTA_EXCEEDED",
      issues: [],
    });
    expect(error.code).toBe("LIVE_PROVIDER_QUOTA_EXCEEDED");
    expect(error.message).toContain("billing");
  });

  it("infers quota code from HTTP 402 when body is loose", () => {
    const error = toGenerationPreviewError({ error: "Limit reached" }, 402);
    expect(error.code).toBe("LIVE_PROVIDER_QUOTA_EXCEEDED");
  });
});

describe("getGenerationPreviewErrorPresentation", () => {
  it("offers mock mode for billing limits", () => {
    const presentation = getGenerationPreviewErrorPresentation(
      fromGenerationApiErrorBody({
        ok: false,
        error: "OpenAI billing or usage limit reached.",
        code: "LIVE_PROVIDER_QUOTA_EXCEEDED",
        issues: [],
      }),
    );
    expect(presentation.title).toMatch(/billing limit/i);
    expect(presentation.action).toBe("switch-to-mock");
    expect(presentation.actionLabel).toBe("Switch to mock mode");
  });

  it("offers retry guidance for rate limits", () => {
    const presentation = getGenerationPreviewErrorPresentation(
      fromGenerationApiErrorBody({
        ok: false,
        error: "The image provider is rate limiting requests.",
        code: "LIVE_PROVIDER_RATE_LIMIT",
        issues: [],
      }),
    );
    expect(presentation.title).toMatch(/rate limit/i);
    expect(presentation.action).toBe("switch-to-mock");
  });

  it("explains when the preview image cannot be rendered", () => {
    const presentation = getGenerationPreviewErrorPresentation({
      code: "IMAGE_RESULT_UNAVAILABLE",
      message: "The diagram image could not be loaded in the preview.",
    });
    expect(presentation.title).toMatch(/preview unavailable/i);
    expect(presentation.hint).toBeTruthy();
  });
});
