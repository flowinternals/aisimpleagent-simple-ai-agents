import { generateMockResult } from "./mockResultProvider.js";

export class ProviderAdapterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProviderAdapterError";
    this.code = code;
  }
}

/**
 * HTTP-friendly check for provider-unavailable errors. Routes can use this instead of
 * importing `ProviderAdapterError` for `instanceof` checks.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isProviderNotAvailableError(error) {
  return error instanceof ProviderAdapterError && error.code === "PROVIDER_NOT_AVAILABLE";
}

/**
 * @param {{ prompt: string, providerPrompt: string }} args
 * @returns {Promise<import("../contracts/generationAdapterResult.js").NormalizedGenerationResult>}
 */
export async function generateWithProvider({ prompt, providerPrompt }) {
  const providerMode = process.env.AI_PROVIDER_MODE || "mock";

  if (providerMode !== "mock") {
    throw new ProviderAdapterError(
      "PROVIDER_NOT_AVAILABLE",
      "Configured provider path is not available.",
    );
  }

  return generateMockResult({ prompt, providerPrompt });
}
