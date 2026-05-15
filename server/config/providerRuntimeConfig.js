import {
  assessGoogleStructuralReadiness,
  getGoogleRuntimeSnapshot,
} from "../../shared/googleProviderDiagnostics.js";
import { DEFAULT_GOOGLE_IMAGE_MODEL } from "../../shared/googleImageConfig.js";

/**
 * Provider runtime configuration: secrets and optional defaults live in env vars only.
 * Per-request `providerMode` / `providerId` come from the API; this module answers
 * whether the server can call each live vendor for health checks, without exposing secrets.
 *
 * Env is populated from `.env`, `.env.local`, and Assets `security/*.provider.runtime`
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
 * @returns {boolean}
 */
export function isGoogleApiKeyConfigured() {
  return Boolean(process.env.GOOGLE_API_KEY?.trim());
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
 * Default Gemini image model (matches `googleLiveProvider.js` when env is unset).
 * @returns {string}
 */
export function getGoogleImageModelDefault() {
  const m = (process.env.GOOGLE_IMAGE_MODEL || DEFAULT_GOOGLE_IMAGE_MODEL).trim();
  return m || DEFAULT_GOOGLE_IMAGE_MODEL;
}

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

/**
 * Structural + config snapshot for Google live generation. Does not call Google.
 *
 * @returns {{
 *   ready: boolean,
 *   configured: boolean,
 *   credentialsPresent: boolean,
 *   settingsValid: boolean,
 *   modelConfigured: boolean,
 *   readinessLevel: import("../../shared/googleProviderDiagnostics.js").GoogleReadinessLevel,
 *   imageModel: string,
 *   baseUrl: string,
 *   baseUrlHost: string,
 *   requestPath: string,
 *   authMethod: "x-goog-api-key",
 *   projectName: string | null,
 *   projectNumber: string | null,
 *   likelyReadyForLiveTest: boolean,
 *   reason: string | null,
 * }}
 */
export function getLiveGoogleReadiness() {
  const structural = assessGoogleStructuralReadiness();
  const snapshot = structural.snapshot;

  const configured = structural.credentialsPresent;
  const ready = structural.readinessLevel === "structurally_ready";
  const likelyReadyForLiveTest = ready;

  return {
    ready,
    configured,
    credentialsPresent: structural.credentialsPresent,
    settingsValid: structural.settingsValid,
    modelConfigured: structural.modelConfigured,
    readinessLevel: structural.readinessLevel,
    imageModel: snapshot.model,
    baseUrl: snapshot.baseUrl,
    baseUrlHost: snapshot.baseUrlHost,
    requestPath: snapshot.requestPath,
    authMethod: snapshot.authMethod,
    projectName: snapshot.projectName,
    projectNumber: snapshot.projectNumber,
    likelyReadyForLiveTest,
    reason: structural.reason,
  };
}

/**
 * Safe Google runtime summary for startup logs (no secrets).
 *
 * @returns {ReturnType<typeof getGoogleRuntimeSnapshot>}
 */
export function getGoogleRuntimeLogSummary() {
  return getGoogleRuntimeSnapshot();
}

/**
 * Snapshot for `/api/health` and logging. No secrets are returned.
 *
 * @returns {{
 *   liveOpenAi: ReturnType<typeof getLiveOpenAiReadiness>,
 *   liveGoogle: ReturnType<typeof getLiveGoogleReadiness>,
 * }}
 */
export function getGenerationProviderConfig() {
  return {
    liveOpenAi: getLiveOpenAiReadiness(),
    liveGoogle: getLiveGoogleReadiness(),
  };
}
