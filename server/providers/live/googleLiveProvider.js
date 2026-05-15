import { ProviderAdapterError } from "../../errors/providerAdapterError.js";

/**
 * Extension point: Google image generation (Gemini / Vertex, etc.) is not implemented yet.
 *
 * @param {Pick<import("../../contracts/generationAdapterResult.js").GenerationAdapterRequest, "providerPrompt">} _args
 * @returns {Promise<Record<string, unknown>>}
 */
export async function generateGoogleLiveImage(_args) {
  throw new ProviderAdapterError(
    "LIVE_PROVIDER_NOT_IMPLEMENTED",
    "Google live image generation is not implemented yet.",
  );
}
