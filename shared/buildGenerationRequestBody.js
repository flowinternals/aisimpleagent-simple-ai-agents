import { DEFAULT_IMAGE_QUALITY } from "./imageQuality.js";
import { DEFAULT_IMAGE_SIZE } from "./imageSize.js";
import { DEFAULT_IMAGE_THEME } from "./imageTheme.js";

/**
 * @typedef {Object} GenerationRequestOptions
 * @property {"low"|"medium"|"high"} [imageQuality]
 * @property {"light"|"dark"} [imageTheme]
 * @property {"16:9"|"4:3"|"1:1"} [imageSize]
 */

/**
 * Maps UI provider settings, prompt text, and generation options to POST /api/generate JSON body.
 * @param {{ providerMode: "mock" | "live", providerId: string }} settings
 * @param {string} prompt
 * @param {GenerationRequestOptions} [generationOptions]
 */
export function buildGenerationRequestBody(settings, prompt, generationOptions = {}) {
  const {
    imageQuality = DEFAULT_IMAGE_QUALITY,
    imageTheme = DEFAULT_IMAGE_THEME,
    imageSize = DEFAULT_IMAGE_SIZE,
  } = generationOptions;

  return {
    prompt: prompt.trim(),
    providerMode: settings.providerMode,
    providerId: settings.providerId,
    imageQuality,
    imageTheme,
    imageSize,
  };
}
