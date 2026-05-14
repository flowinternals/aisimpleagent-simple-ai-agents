import { HttpError } from "../httpError.js";
import { generateMockResult } from "./mockResultProvider.js";

export async function generateWithProvider({ prompt, providerPrompt }) {
  const providerMode = process.env.AI_PROVIDER_MODE || "mock";

  if (providerMode !== "mock") {
    throw new HttpError(
      503,
      "PROVIDER_NOT_AVAILABLE",
      "Image generation is not available for the configured provider yet.",
    );
  }

  return generateMockResult({ prompt, providerPrompt });
}
