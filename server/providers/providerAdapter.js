import { generateMockResult } from "./mockResultProvider.js";

export class ProviderAdapterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProviderAdapterError";
    this.code = code;
  }
}

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
