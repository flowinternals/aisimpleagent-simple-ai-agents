import { ProviderAdapterError } from "../../errors/providerAdapterError.js";
import { logWarn } from "../../logging/trainingLog.js";
import {
  buildOpenAiErrorLogSummary,
  extractOpenAiErrorMessage,
} from "../../../shared/openaiProviderDiagnostics.js";
import { DEFAULT_IMAGE_QUALITY, normalizeImageQuality } from "../../../shared/imageQuality.js";
import { normalizeImageSize, openAiImageDimensions } from "../../../shared/imageSize.js";

/** Default when env is unset (aligned with pack onboarding: gpt-image-1.5). */
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1.5";

/** DALL-E prompt limit (characters). */
const DALLE_IMAGE_PROMPT_MAX = 4000;

/** GPT image model prompt limit (characters). */
const GPT_IMAGE_PROMPT_MAX = 32000;

/**
 * @param {string} model
 * @returns {boolean}
 */
function isGptImageModel(model) {
  return model.startsWith("gpt-image");
}

/**
 * @param {string} model
 * @returns {boolean}
 */
function isDallEImageModel(model) {
  return model === "dall-e-2" || model === "dall-e-3";
}

/**
 * @param {string} model
 * @returns {number}
 */
function openAiImagePromptMax(model) {
  return isGptImageModel(model) ? GPT_IMAGE_PROMPT_MAX : DALLE_IMAGE_PROMPT_MAX;
}

/**
 * @param {string} providerPrompt
 * @param {string} model
 * @returns {string}
 */
function openAiImagePrompt(providerPrompt, model) {
  const max = openAiImagePromptMax(model);
  const trimmed = providerPrompt.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 3)}...`;
}

/**
 * @param {string} detail
 * @returns {boolean}
 */
function isOpenAiBillingOrQuotaError(detail) {
  const normalized = detail.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes("billing") ||
    normalized.includes("quota") ||
    normalized.includes("insufficient") ||
    normalized.includes("usage limit") ||
    normalized.includes("exceeded your current")
  );
}

/**
 * Live OpenAI image generation (`/v1/images/generations`). Maps `providerPrompt` to the
 * vendor `prompt` field and returns `imageData` as a base64 data URL (validated by
 * `normalizeGenerationAdapterResult` in the adapter).
 *
 * @param {Pick<import("../../contracts/generationAdapterResult.js").GenerationAdapterRequest, "providerPrompt"|"imageQuality"|"imageSize">} args
 * @returns {Promise<Record<string, unknown>>}
 */
export async function generateOpenAiLiveImage({ providerPrompt, imageQuality, imageSize }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ProviderAdapterError(
      "LIVE_PROVIDER_NOT_CONFIGURED",
      "OpenAI API key is not configured on the server.",
    );
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model =
    (process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL).trim() || DEFAULT_OPENAI_IMAGE_MODEL;
  const gptImageQuality = normalizeImageQuality(
    imageQuality ?? process.env.OPENAI_IMAGE_QUALITY ?? DEFAULT_IMAGE_QUALITY,
  );
  const resolvedImageSize = normalizeImageSize(imageSize);
  const url = `${baseUrl}/images/generations`;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const org = process.env.OPENAI_ORG_ID?.trim();
  if (org) {
    headers["OpenAI-Organization"] = org;
  }
  const project = process.env.OPENAI_PROJECT?.trim();
  if (project) {
    headers["OpenAI-Project"] = project;
  }

  /** @type {Record<string, unknown>} */
  const body = {
    model,
    prompt: openAiImagePrompt(providerPrompt, model),
    n: 1,
    size: openAiImageDimensions(resolvedImageSize),
  };

  // GPT image models always return base64 and can use low/medium/high quality controls.
  if (isGptImageModel(model)) {
    body.quality = gptImageQuality;
  } else if (isDallEImageModel(model)) {
    body.response_format = "b64_json";
  }

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new ProviderAdapterError(
      "LIVE_PROVIDER_FAILED",
      "Could not reach the OpenAI API.",
    );
  }

  let json;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const detail = extractOpenAiErrorMessage(json);
    logWarn("OpenAI images API error", buildOpenAiErrorLogSummary(response.status, json));
    if (response.status === 401 || response.status === 403) {
      throw new ProviderAdapterError(
        "LIVE_PROVIDER_NOT_CONFIGURED",
        "OpenAI rejected the request (check the API key and account access).",
      );
    }
    if (response.status === 429) {
      if (isOpenAiBillingOrQuotaError(detail)) {
        throw new ProviderAdapterError(
          "LIVE_PROVIDER_QUOTA_EXCEEDED",
          detail || "OpenAI billing or quota limit reached.",
        );
      }
      throw new ProviderAdapterError(
        "LIVE_PROVIDER_RATE_LIMIT",
        "OpenAI rate limit reached. Try again shortly.",
      );
    }
    if (isOpenAiBillingOrQuotaError(detail)) {
      throw new ProviderAdapterError(
        "LIVE_PROVIDER_QUOTA_EXCEEDED",
        detail || "OpenAI billing or quota limit reached.",
      );
    }
    throw new ProviderAdapterError(
      "LIVE_PROVIDER_FAILED",
      "OpenAI could not generate an image for this request.",
    );
  }

  const data = json && typeof json === "object" ? /** @type {{ data?: unknown }} */ (json).data : null;
  const first = Array.isArray(data) && data[0] && typeof data[0] === "object" ? data[0] : null;
  const b64 =
    first && "b64_json" in first && typeof /** @type {{ b64_json?: unknown }} */ (first).b64_json === "string"
      ? /** @type {{ b64_json: string }} */ (first).b64_json
      : "";

  if (!b64.trim()) {
    logWarn("OpenAI images unexpected response shape", {
      httpStatus: response.status,
      issue: "missing_b64_json",
    });
    throw new ProviderAdapterError(
      "LIVE_PROVIDER_FAILED",
      "OpenAI returned an unexpected response shape.",
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  return {
    imageData: `data:image/png;base64,${b64.trim()}`,
    mimeType: "image/png",
    fileName: `diagram-openai-${stamp}.png`,
    providerMode: "live",
    generatedAt: new Date().toISOString(),
    modelLabel: model,
    qualityLabel: isGptImageModel(model) ? gptImageQuality : undefined,
    sizeLabel: resolvedImageSize,
  };
}
