/** @typedef {'low'|'medium'|'high'} ImageQuality */

/** Conservative default for local testing. */
export const DEFAULT_IMAGE_QUALITY = "low";

/** UI + API allowed values (gpt-image low / medium / high). */
export const IMAGE_QUALITY_VALUES = /** @type {const} */ (["low", "medium", "high"]);

/** @deprecated Use provider-specific hints from `imageQualityPricing.js`. */
export { OPENAI_IMAGE_QUALITY_COST_HINTS as IMAGE_QUALITY_COST_HINTS } from "./imageQualityPricing.js";

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
