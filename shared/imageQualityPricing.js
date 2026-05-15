import { IMAGE_QUALITY_VALUES } from "./imageQuality.js";

/**
 * Approximate list prices for UI hints only (not billing). OpenAI gpt-image tiers
 * for typical landscape output (~1536×1024); see platform.openai.com pricing.
 * @type {Record<import("./imageQuality.js").ImageQuality, string>}
 */
export const OPENAI_IMAGE_QUALITY_COST_HINTS = {
  low: "~$0.01",
  medium: "~$0.05",
  high: "~$0.20",
};

/**
 * Gemini 2.5 Flash Image — flat per-image output (quality tier does not change price).
 * @type {Record<import("./imageQuality.js").ImageQuality, string>}
 */
export const GOOGLE_FLASH_IMAGE_QUALITY_COST_HINTS = {
  low: "~$0.039",
  medium: "~$0.039",
  high: "~$0.039",
};

/**
 * Gemini 3 Pro Image — maps to 1K / 2K / 4K output (see ai.google.dev pricing).
 * @type {Record<import("./imageQuality.js").ImageQuality, string>}
 */
export const GOOGLE_PRO_IMAGE_QUALITY_COST_HINTS = {
  low: "~$0.13",
  medium: "~$0.13",
  high: "~$0.24",
};

/** Mock scaffold — no external API charges. */
export const MOCK_IMAGE_QUALITY_COST_HINTS = {
  low: "no API cost",
  medium: "no API cost",
  high: "no API cost",
};

/**
 * @param {string} [imageModel]
 * @returns {boolean}
 */
export function isGoogleProImageModel(imageModel) {
  if (!imageModel) {
    return false;
  }
  const normalized = imageModel.trim().toLowerCase();
  return normalized.includes("pro-image") || normalized.startsWith("imagen-");
}

/**
 * @param {{
 *   providerMode: "mock" | "live",
 *   providerId: "openai" | "google" | "cloudflare",
 *   liveImageModel?: string,
 * }} options
 * @returns {Record<import("./imageQuality.js").ImageQuality, string>}
 */
export function getImageQualityCostHints({ providerMode, providerId, liveImageModel }) {
  if (providerMode === "mock") {
    return MOCK_IMAGE_QUALITY_COST_HINTS;
  }
  if (providerId === "google") {
    return isGoogleProImageModel(liveImageModel)
      ? GOOGLE_PRO_IMAGE_QUALITY_COST_HINTS
      : GOOGLE_FLASH_IMAGE_QUALITY_COST_HINTS;
  }
  return OPENAI_IMAGE_QUALITY_COST_HINTS;
}

/**
 * @param {{
 *   providerMode: "mock" | "live",
 *   providerId: "openai" | "google" | "cloudflare",
 *   liveImageModel?: string,
 * }} options
 * @returns {ReadonlyArray<{ value: import("./imageQuality.js").ImageQuality, label: string, costHint: string }>}
 */
export function buildImageQualityOptions(options) {
  const costHints = getImageQualityCostHints(options);
  return IMAGE_QUALITY_VALUES.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
    costHint: costHints[value],
  }));
}
