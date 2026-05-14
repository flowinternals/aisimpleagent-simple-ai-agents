import { generateWithProvider } from "../providers/providerAdapter.js";

function buildProviderPrompt(prompt) {
  return [
    "Create a clear mock result for this starter agent scaffold.",
    "Keep the response suitable for a single-page app preview and download flow.",
    "Treat the user prompt as app-specific input that will later be adapted by the learner.",
    `User request: ${prompt}`,
  ].join("\n");
}

export async function runAgentGeneration({ prompt }) {
  const providerPrompt = buildProviderPrompt(prompt);
  const providerResult = await generateWithProvider({ prompt, providerPrompt });

  return {
    imageData: providerResult.imageData,
    mimeType: providerResult.mimeType,
    fileName: providerResult.fileName,
    providerMode: providerResult.providerMode,
    generatedAt: providerResult.generatedAt,
  };
}
