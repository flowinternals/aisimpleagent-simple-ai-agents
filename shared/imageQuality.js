/** @typedef {'low'|'medium'|'high'} ImageQuality */

/** Conservative default for local testing. */
export const DEFAULT_IMAGE_QUALITY = "low";

/** UI + API allowed values (gpt-image low / medium / high). */
export const IMAGE_QUALITY_VALUES = /** @type {const} */ (["low", "medium", "high"]);

/**
 * Approximate list prices per 1024×1024 gpt-image generation (UI hint only).
 * @type {Record<ImageQuality, string>}
 */
export const IMAGE_QUALITY_COST_HINTS = {
  low: "~$0.02",
  medium: "~$0.06",
  high: "~$0.19",
};

/**
 * @param {unknown} value
 * @returns {ImageQuality}
 */
export function normalizeImageQuality(value) {
  if (typeof value !== "string") {
    return DEFAULT_IMAGE_QUALITY;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "medium" || normalized === "high") {
    return normalized;
  }
  return DEFAULT_IMAGE_QUALITY;
}
