import { HttpError } from "../httpError.js";
import { ProviderAdapterError, generateWithProvider } from "../providers/providerAdapter.js";

function buildProviderPrompt(prompt) {
  return [
    "Create a clear mock result for this starter agent scaffold.",
    "Keep the response suitable for a single-page app preview and download flow.",
    "Treat the user prompt as app-specific input that will later be adapted by the learner.",
    `User request: ${prompt}`,
  ].join("\n");
}

/** Builds the `data` object for a successful `POST /api/generate` response. */
function buildGenerationApiData(providerResult, generationTimeMs) {
  const data = {
    imageData: providerResult.imageData,
    mimeType: providerResult.mimeType,
    fileName: providerResult.fileName,
    providerMode: providerResult.providerMode,
    generatedAt: providerResult.generatedAt,
    generationTimeMs,
  };
  if (typeof providerResult.modelLabel === "string" && providerResult.modelLabel.trim()) {
    data.modelLabel = providerResult.modelLabel.trim();
  }
  return data;
}

export async function runAgentGeneration({ prompt }) {
  const startedAt = Date.now();
  const providerPrompt = buildProviderPrompt(prompt);
  let providerResult;
  try {
    providerResult = await generateWithProvider({ prompt, providerPrompt });
  } catch (error) {
    if (error instanceof ProviderAdapterError && error.code === "PROVIDER_NOT_AVAILABLE") {
      throw new HttpError(
        503,
        "PROVIDER_NOT_AVAILABLE",
        "Image generation is not available for the configured provider yet.",
      );
    }
    throw error;
  }
  const generationTimeMs = Date.now() - startedAt;

  return buildGenerationApiData(providerResult, generationTimeMs);
}
