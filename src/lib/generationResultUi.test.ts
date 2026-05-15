import { describe, expect, it } from "vitest";
import type { GenerationResponse } from "../types/generation";
import {
  generationDownloadFileName,
  generationImageSrc,
  hasValidGenerationImageResult,
} from "./generationResultUi";

const baseResult: GenerationResponse = {
  imageData: "data:image/png;base64,YWJj",
  mimeType: "image/png",
  fileName: "diagram.png",
  providerMode: "mock",
  generatedAt: "2026-05-15T12:00:00.000Z",
  generationTimeMs: 500,
};

describe("hasValidGenerationImageResult", () => {
  it("accepts a data URL image payload", () => {
    expect(hasValidGenerationImageResult(baseResult)).toBe(true);
  });

  it("rejects null and invalid payloads", () => {
    expect(hasValidGenerationImageResult(null)).toBe(false);
    expect(
      hasValidGenerationImageResult({
        ...baseResult,
        imageData: "not-an-image",
      }),
    ).toBe(false);
  });

  it("accepts http image URLs when provided on the contract", () => {
    expect(
      hasValidGenerationImageResult({
        ...baseResult,
        imageData: "",
        imageUrl: "https://cdn.example.com/diagram.png",
      }),
    ).toBe(true);
  });
});

describe("generationImageSrc", () => {
  it("prefers imageUrl when set", () => {
    expect(
      generationImageSrc({
        ...baseResult,
        imageUrl: "https://cdn.example.com/diagram.png",
      }),
    ).toBe("https://cdn.example.com/diagram.png");
  });

  it("falls back to imageData", () => {
    expect(generationImageSrc(baseResult)).toBe(baseResult.imageData);
  });
});

describe("generationDownloadFileName", () => {
  it("uses the API filename when present and suitable", () => {
    expect(generationDownloadFileName(baseResult)).toBe("diagram.png");
  });

  it("derives a filename when fileName is missing", () => {
    const name = generationDownloadFileName({
      ...baseResult,
      fileName: "",
    });
    expect(name).toMatch(/^diagram-2026-05-15T12-00-00-000Z\.png$/);
  });

  it("strips unsafe path segments from API filenames", () => {
    expect(
      generationDownloadFileName({
        ...baseResult,
        fileName: "../evil/name.png",
      }),
    ).toBe("name.png");
  });

  it("replaces confusing characters in API filenames", () => {
    expect(
      generationDownloadFileName({
        ...baseResult,
        fileName: 'diagram:phase|1?.png',
      }),
    ).toBe("diagram-phase-1-.png");
  });

  it("appends an extension when the API name has no extension", () => {
    expect(
      generationDownloadFileName({
        ...baseResult,
        fileName: "my-diagram",
      }),
    ).toBe("my-diagram.png");
  });

  it("aligns the extension with mimeType when the API extension differs", () => {
    expect(
      generationDownloadFileName({
        ...baseResult,
        mimeType: "image/png",
        fileName: "diagram.jpg",
      }),
    ).toBe("diagram.png");
  });

  it("uses mimeType for the fallback extension", () => {
    expect(
      generationDownloadFileName({
        ...baseResult,
        mimeType: "image/svg+xml",
        fileName: "",
      }),
    ).toMatch(/^diagram-2026-05-15T12-00-00-000Z\.svg$/);
  });

  it("falls back when the API filename is only dots", () => {
    expect(
      generationDownloadFileName({
        ...baseResult,
        fileName: "..",
      }),
    ).toMatch(/^diagram-2026-05-15T12-00-00-000Z\.png$/);
  });
});
