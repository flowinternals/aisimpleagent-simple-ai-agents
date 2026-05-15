import { describe, expect, it } from "vitest";
import {
  historyThumbAspectRatio,
  imageSizeToAspectRatio,
  previewCanvasSizeClass,
  resolvePreviewAspectRatio,
} from "./previewAspectRatio";

describe("previewAspectRatio", () => {
  it("maps diagram sizes to numeric ratios", () => {
    expect(imageSizeToAspectRatio("16:9")).toBeCloseTo(16 / 9);
    expect(imageSizeToAspectRatio("4:3")).toBeCloseTo(4 / 3);
    expect(imageSizeToAspectRatio("1:1")).toBe(1);
  });

  it("prefers natural image dimensions when provided", () => {
    const resolved = resolvePreviewAspectRatio({
      imageSize: "16:9",
      sizeLabel: "16:9",
      naturalWidth: 1024,
      naturalHeight: 1024,
    });
    expect(resolved.css).toBe("1024 / 1024");
    expect(resolved.numeric).toBe(1);
  });

  it("falls back to size label then request size", () => {
    expect(
      resolvePreviewAspectRatio({ imageSize: "16:9", sizeLabel: "1:1" }).css,
    ).toBe("1 / 1");
    expect(resolvePreviewAspectRatio({ imageSize: "4:3" }).css).toBe("4 / 3");
  });

  it("exposes canvas class and history thumb ratio helpers", () => {
    expect(previewCanvasSizeClass("1:1")).toBe("tdg-preview-canvas--size-1-1");
    expect(historyThumbAspectRatio("4:3")).toBe("4 / 3");
  });
});
