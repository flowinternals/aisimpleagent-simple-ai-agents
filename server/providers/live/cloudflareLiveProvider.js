import { ProviderAdapterError } from "../../errors/providerAdapterError.js";

/**
 * Extension point: Cloudflare Workers AI / image bindings are not implemented yet.
 *
 * @param {Pick<import("../../contracts/generationAdapterResult.js").GenerationAdapterRequest, "providerPrompt">} _args
 * @returns {Promise<Record<string, unknown>>}
 */
export async function generateCloudflareLiveImage(_args) {
  throw new ProviderAdapterError(
    "LIVE_PROVIDER_NOT_IMPLEMENTED",
    "Cloudflare live image generation is not implemented yet.",
  );
}
