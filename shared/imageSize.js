/** @typedef {'16:9'|'4:3'|'1:1'} ImageSize */

/** Default diagram aspect for new generations. */
export const DEFAULT_IMAGE_SIZE = "16:9";

export const IMAGE_SIZE_VALUES = /** @type {const} */ (["16:9", "4:3", "1:1"]);

/** @type {Record<ImageSize, { label: string, openAiSize: string }>} */
export const IMAGE_SIZE_SPECS = {
  "16:9": { label: "16:9", openAiSize: "1536x1024" },
  "4:3": { label: "4:3", openAiSize: "1024x1024" },
  "1:1": { label: "1:1", openAiSize: "1024x1024" },
};

/**
 * @param {unknown} value
 * @returns {ImageSize}
 */
export function normalizeImageSize(value) {
  if (typeof value !== "string") {
    return DEFAULT_IMAGE_SIZE;
  }
  const normalized = value.trim();
  if (normalized === "4:3" || normalized === "1:1") {
    return normalized;
  }
  return DEFAULT_IMAGE_SIZE;
}

/**
 * @param {ImageSize} imageSize
 * @returns {string}
 */
export function openAiImageDimensions(imageSize) {
  return IMAGE_SIZE_SPECS[normalizeImageSize(imageSize)].openAiSize;
}

/**
 * @param {ImageSize} imageSize
 * @returns {{ width: number, height: number }}
 */
export function mockSvgDimensions(imageSize) {
  switch (normalizeImageSize(imageSize)) {
    case "1:1":
      return { width: 1024, height: 1024 };
    case "4:3":
      return { width: 1200, height: 900 };
    default:
      return { width: 1600, height: 900 };
  }
}
