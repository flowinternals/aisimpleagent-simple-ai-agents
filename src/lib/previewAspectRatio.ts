import type { ImageSize } from "../types/imageSize";

export type PreviewAspectRatio = {
  /** CSS `aspect-ratio` value, e.g. `16 / 9`. */
  css: string;
  numeric: number;
};

/** Maps the app's diagram size labels to display aspect ratios. */
export function imageSizeToAspectRatio(size: ImageSize): number {
  switch (size) {
    case "1:1":
      return 1;
    case "4:3":
      return 4 / 3;
    default:
      return 16 / 9;
  }
}

export function imageSizeToCssAspectRatio(size: ImageSize): string {
  switch (size) {
    case "1:1":
      return "1 / 1";
    case "4:3":
      return "4 / 3";
    default:
      return "16 / 9";
  }
}

/** Class hook for size-specific preview polish (letterboxing emphasis). */
export function previewCanvasSizeClass(size: ImageSize): string {
  return `tdg-preview-canvas--size-${size.replace(":", "-")}`;
}

/** History strip thumbnails follow the entry's requested ratio. */
export function historyThumbAspectRatio(size: ImageSize): string {
  return imageSizeToCssAspectRatio(size);
}

/**
 * Prefer measured image pixels when available; otherwise fall back to API/request size.
 */
export function resolvePreviewAspectRatio(args: {
  sizeLabel?: ImageSize;
  imageSize: ImageSize;
  naturalWidth?: number;
  naturalHeight?: number;
}): PreviewAspectRatio {
  const { naturalWidth, naturalHeight, sizeLabel, imageSize } = args;
  if (
    typeof naturalWidth === "number" &&
    typeof naturalHeight === "number" &&
    naturalWidth > 0 &&
    naturalHeight > 0
  ) {
    return {
      css: `${naturalWidth} / ${naturalHeight}`,
      numeric: naturalWidth / naturalHeight,
    };
  }

  const size = sizeLabel ?? imageSize;
  return {
    css: imageSizeToCssAspectRatio(size),
    numeric: imageSizeToAspectRatio(size),
  };
}
