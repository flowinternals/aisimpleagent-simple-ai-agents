import { getGoogleRuntimeSnapshot } from "../../shared/googleProviderDiagnostics.js";
import { normalizeGenerationAdapterResult } from "../contracts/generationAdapterResult.js";
import { ProviderAdapterError } from "../errors/providerAdapterError.js";
import { generateCloudflareLiveImage } from "./live/cloudflareLiveProvider.js";
import { generateGoogleLiveImage } from "./live/googleLiveProvider.js";
import { generateOpenAiLiveImage } from "./live/openaiLiveProvider.js";
import { generateMockResult } from "./mockResultProvider.js";
import { logInfo } from "../logging/trainingLog.js";

/**
 * Provider execution boundary: runs mock or the selected live vendor module and returns a
 * normalised adapter result. Switching stays here; the agent service calls this module only.
 *
 * @param {import("../contracts/generationAdapterResult.js").GenerationAdapterRequest} args
 * @returns {Promise<import("../contracts/generationAdapterResult.js").NormalizedGenerationResult>}
 */
export async function generateWithProvider({
  providerPrompt,
  providerMode,
  providerId,
  imageQuality,
  imageTheme,
  imageSize,
}) {
  if (providerMode === "mock") {
    const raw = await generateMockResult({ providerPrompt, imageQuality, imageTheme, imageSize });
    return normalizeGenerationAdapterResult(raw, "mock");
  }

  logInfo("Provider adapter live dispatch", {
    providerMode: "live",
    providerId,
    imageQuality,
    imageSize,
    ...(providerId === "google" ? getGoogleRuntimeSnapshot() : {}),
  });

  /** @type {Promise<Record<string, unknown>>} */
  let livePromise;
  switch (providerId) {
    case "openai":
      livePromise = generateOpenAiLiveImage({ providerPrompt, imageQuality, imageSize });
      break;
    case "google":
      livePromise = generateGoogleLiveImage({ providerPrompt, imageQuality, imageSize });
      break;
    case "cloudflare":
      livePromise = generateCloudflareLiveImage({ providerPrompt });
      break;
    default:
      throw new ProviderAdapterError("PROVIDER_NOT_AVAILABLE", "Unsupported provider id.");
  }

  const raw = await livePromise;
  return normalizeGenerationAdapterResult(raw, "live");
}
