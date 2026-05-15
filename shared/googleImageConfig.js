import { normalizeImageQuality } from "./imageQuality.js";
import { normalizeImageSize } from "./imageSize.js";

/** Default when env is unset (Gemini native image model). */
export const DEFAULT_GOOGLE_IMAGE_MODEL = "gemini-2.5-flash-image";

/**
 * True when the model accepts `generationConfig.imageConfig` (aspect ratio + resolution).
 * Includes native Gemini image models such as `gemini-2.5-flash-image` and Pro/Imagen variants.
 *
 * @param {string} model
 * @returns {boolean}
 */
export function googleModelSupportsImageConfig(model) {
  const normalized = model.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes("flash-image") ||
    normalized.includes("pro-image") ||
    normalized.includes("imagen")
  );
}

/**
 * Maps app aspect ratio labels to Google ImageConfig aspectRatio values.
 * @param {"16:9"|"4:3"|"1:1"} imageSize
 * @returns {"16:9"|"4:3"|"1:1"}
 */
export function googleImageAspectRatio(imageSize) {
  return normalizeImageSize(imageSize);
}

/**
 * Maps GPT-style quality tiers to Gemini Pro image resolution labels.
 * @param {"low"|"medium"|"high"} imageQuality
 * @returns {"1K"|"2K"|"4K"}
 */
export function googleProImageResolution(imageQuality) {
  const normalized = normalizeImageQuality(imageQuality);
  if (normalized === "high") {
    return "4K";
  }
  if (normalized === "medium") {
    return "2K";
  }
  return "1K";
}
