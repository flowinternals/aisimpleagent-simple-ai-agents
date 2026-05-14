import { generateMockResult } from "./mockResultProvider.js";

export async function generateWithProvider({ prompt, providerPrompt }) {
  const providerMode = process.env.AI_PROVIDER_MODE || "mock";

  if (providerMode !== "mock") {
    throw new Error(
      "Live provider mode is not wired in this scaffold yet. Use the walkthrough to implement the real provider path behind this adapter.",
    );
  }

  return generateMockResult({ prompt, providerPrompt });
}
