import { DEFAULT_IMAGE_QUALITY } from "./imageQuality.js";

/**
 * Maps UI provider settings, prompt text, and image quality to POST /api/generate JSON body.
 * @param {{ providerMode: "mock" | "live", providerId: string }} settings
 * @param {string} prompt
 * @param {"low"|"medium"|"high"} [imageQuality]
 * @returns {{ prompt: string, providerMode: "mock" | "live", providerId: string, imageQuality: "low"|"medium"|"high" }}
 */
export function buildGenerationRequestBody(settings, prompt, imageQuality = DEFAULT_IMAGE_QUALITY) {
  return {
    prompt: prompt.trim(),
    providerMode: settings.providerMode,
    providerId: settings.providerId,
    imageQuality,
  };
}
