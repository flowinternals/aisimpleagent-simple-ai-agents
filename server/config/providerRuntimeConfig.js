/**
 * Provider runtime configuration: secrets and optional defaults live in env vars only.
 * Per-request `providerMode` / `providerId` come from the API; this module answers
 * whether the server can call OpenAI for health checks, without exposing secrets.
 *
 * Env is populated from `.env`, `.env.local`, and Assets `security/openai.provider.runtime`
 * via `loadEnvFiles.js` before this module is first imported from `server/index.js`.
 *
 * @module server/config/providerRuntimeConfig
 */

/**
 * @returns {boolean}
 */
export function isOpenAiApiKeyConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Default image model label (matches `openaiLiveProvider.js` when env is unset).
 * @returns {string}
 */
export function getOpenAiImageModelDefault() {
  const m = (process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5").trim();
  return m || "gpt-image-1.5";
}

/**
 * Snapshot for `/api/health` and logging. No secrets are returned.
 *
 * @returns {{
 *   liveOpenAi: { configured: boolean, imageModel: string },
 * }}
 */
/**
 * Whether the server can run a live OpenAI image generation pass (key + supported model).
 *
 * @returns {{
 *   ready: boolean,
 *   configured: boolean,
 *   imageModel: string,
 *   reason: string | null,
 * }}
 */
export function getLiveOpenAiReadiness() {
  const configured = isOpenAiApiKeyConfigured();
  const imageModel = getOpenAiImageModelDefault();

  if (!configured) {
    return {
      ready: false,
      configured: false,
      imageModel,
      reason: "OPENAI_API_KEY is not set on the server (.env.local or Assets runtime file).",
    };
  }

  if (imageModel === "dall-e-2" || imageModel === "dall-e-3") {
    return {
      ready: false,
      configured: true,
      imageModel,
      reason: `OPENAI_IMAGE_MODEL=${imageModel} is deprecated on most accounts; use gpt-image-1.5.`,
    };
  }

  if (!imageModel.startsWith("gpt-image")) {
    return {
      ready: false,
      configured: true,
      imageModel,
      reason: `OPENAI_IMAGE_MODEL=${imageModel} is not a recognised GPT image model for this scaffold.`,
    };
  }

  return {
    ready: true,
    configured: true,
    imageModel,
    reason: null,
  };
}

export function getGenerationProviderConfig() {
  const readiness = getLiveOpenAiReadiness();
  return {
    liveOpenAi: {
      configured: readiness.configured,
      ready: readiness.ready,
      imageModel: readiness.imageModel,
      ...(readiness.reason ? { reason: readiness.reason } : {}),
    },
  };
}
