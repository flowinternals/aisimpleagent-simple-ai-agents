import { ProviderAdapterError } from "../../errors/providerAdapterError.js";
import {
  DEFAULT_GOOGLE_IMAGE_MODEL,
  googleImageAspectRatio,
  googleModelSupportsImageConfig,
  googleProImageResolution,
} from "../../../shared/googleImageConfig.js";
import {
  assessGoogleStructuralReadiness,
  buildGoogleErrorLogPayload,
  classifyGoogleApiError,
  getGoogleRuntimeSnapshot,
  parseGoogleApiError,
} from "../../../shared/googleProviderDiagnostics.js";
import { normalizeImageQuality } from "../../../shared/imageQuality.js";
import { normalizeImageSize } from "../../../shared/imageSize.js";

/** Gemini generateContent prompt limit (characters). */
const GOOGLE_IMAGE_PROMPT_MAX = 32000;

/**
 * @param {string} providerPrompt
 * @returns {string}
 */
function googleImagePrompt(providerPrompt) {
  const trimmed = providerPrompt.trim();
  if (trimmed.length <= GOOGLE_IMAGE_PROMPT_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, GOOGLE_IMAGE_PROMPT_MAX - 3)}...`;
}

/**
 * @param {unknown} json
 * @returns {{ mimeType: string, base64: string } | null}
 */
function extractGoogleInlineImage(json) {
  if (!json || typeof json !== "object") {
    return null;
  }
  const candidates = /** @type {{ candidates?: unknown }} */ (json).candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== "object") {
    return null;
  }
  const content = /** @type {{ content?: unknown }} */ (candidates[0]).content;
  if (!content || typeof content !== "object") {
    return null;
  }
  const parts = /** @type {{ parts?: unknown }} */ (content).parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  for (const part of parts) {
    if (!part || typeof part !== "object") {
      continue;
    }
    const inlineData =
      "inlineData" in part
        ? /** @type {{ inlineData?: unknown }} */ (part).inlineData
        : "inline_data" in part
          ? /** @type {{ inline_data?: unknown }} */ (part).inline_data
          : null;
    if (!inlineData || typeof inlineData !== "object") {
      continue;
    }
    const data =
      "data" in inlineData && typeof /** @type {{ data?: unknown }} */ (inlineData).data === "string"
        ? /** @type {{ data: string }} */ (inlineData).data
        : "";
    const mimeTypeRaw =
      "mimeType" in inlineData && typeof /** @type {{ mimeType?: unknown }} */ (inlineData).mimeType === "string"
        ? /** @type {{ mimeType: string }} */ (inlineData).mimeType
        : "mime_type" in inlineData &&
            typeof /** @type {{ mime_type?: unknown }} */ (inlineData).mime_type === "string"
          ? /** @type {{ mime_type: string }} */ (inlineData).mime_type
          : "image/png";
    if (data.trim()) {
      return { mimeType: mimeTypeRaw.trim().toLowerCase() || "image/png", base64: data.trim() };
    }
  }

  return null;
}

/**
 * @param {GoogleApiErrorClassification} classification
 * @param {ReturnType<typeof getGoogleRuntimeSnapshot>} runtime
 * @returns {ProviderAdapterError}
 */
function providerErrorFromGoogleClassification(classification, runtime) {
  const diagnostics = {
    ...buildGoogleErrorLogPayload(runtime, classification.details.httpStatus ?? 0, classification),
    errorSummary: classification.summary,
  };

  switch (classification.category) {
    case "auth":
      return new ProviderAdapterError(
        "LIVE_PROVIDER_NOT_CONFIGURED",
        "Google rejected the request (check the API key and account access).",
        diagnostics,
      );
    case "billing":
    case "quota":
      return new ProviderAdapterError(
        "LIVE_PROVIDER_QUOTA_EXCEEDED",
        classification.summary || "Google billing or quota limit reached.",
        diagnostics,
      );
    case "rate_limit":
      return new ProviderAdapterError(
        "LIVE_PROVIDER_RATE_LIMIT",
        classification.summary || "Google rate limit reached. Try again shortly.",
        diagnostics,
      );
    case "misconfigured":
      return new ProviderAdapterError(
        "LIVE_PROVIDER_MISCONFIGURED",
        classification.summary || "Google endpoint or model configuration appears invalid.",
        diagnostics,
      );
    case "unavailable":
      return new ProviderAdapterError(
        "LIVE_PROVIDER_FAILED",
        "Google Gemini API is temporarily unavailable.",
        diagnostics,
      );
    default:
      return new ProviderAdapterError(
        "LIVE_PROVIDER_FAILED",
        "Google could not generate an image for this request.",
        diagnostics,
      );
  }
}

/**
 * Live Google image generation via Gemini `generateContent` (native image models).
 * Returns `imageData` as a base64 data URL for the shared adapter contract.
 *
 * @param {Pick<import("../../contracts/generationAdapterResult.js").GenerationAdapterRequest, "providerPrompt"|"imageQuality"|"imageSize">} args
 * @returns {Promise<Record<string, unknown>>}
 */
export async function generateGoogleLiveImage({ providerPrompt, imageQuality, imageSize }) {
  const structural = assessGoogleStructuralReadiness();
  const runtime = structural.snapshot;

  if (!structural.credentialsPresent) {
    throw new ProviderAdapterError(
      "LIVE_PROVIDER_NOT_CONFIGURED",
      "Google API key is not configured on the server.",
      { ...runtime, errorCategory: "missing_credentials" },
    );
  }

  if (!structural.settingsValid) {
    throw new ProviderAdapterError(
      "LIVE_PROVIDER_MISCONFIGURED",
      structural.reason ?? "Google provider settings are invalid on the server.",
      { ...runtime, errorCategory: structural.readinessLevel },
    );
  }

  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  const baseUrl = runtime.baseUrl;
  const model = runtime.model;
  const resolvedImageSize = normalizeImageSize(imageSize);
  const resolvedImageQuality = normalizeImageQuality(imageQuality);
  const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`;

  /** @type {Record<string, unknown>} */
  const generationConfig = {
    responseModalities: ["TEXT", "IMAGE"],
  };

  if (googleModelSupportsImageConfig(model)) {
    generationConfig.imageConfig = {
      aspectRatio: googleImageAspectRatio(resolvedImageSize),
      imageSize: googleProImageResolution(resolvedImageQuality),
    };
  }

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: googleImagePrompt(providerPrompt) }],
      },
    ],
    generationConfig,
  };

  console.info("Google live image request", {
    provider: runtime.provider,
    authMethod: runtime.authMethod,
    httpMethod: "POST",
    baseUrlHost: runtime.baseUrlHost,
    requestPath: runtime.requestPath,
    model: runtime.model,
    projectName: runtime.projectName ?? undefined,
    projectNumber: runtime.projectNumber ?? undefined,
    imageConfigEnabled: googleModelSupportsImageConfig(model),
    aspectRatio: googleModelSupportsImageConfig(model) ? resolvedImageSize : undefined,
    imageResolution: googleModelSupportsImageConfig(model) ? resolvedImageQuality : undefined,
  });

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (networkError) {
    console.error("Google live image network error", {
      ...runtime,
      errorCategory: "network",
      errorMessage: networkError instanceof Error ? networkError.message : "fetch failed",
    });
    throw new ProviderAdapterError(
      "LIVE_PROVIDER_FAILED",
      "Could not reach the Google Gemini API.",
      { ...runtime, errorCategory: "network" },
    );
  }

  let json;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const parsed = parseGoogleApiError(json, response.status);
    const classification = classifyGoogleApiError(response.status, parsed);
    const logPayload = buildGoogleErrorLogPayload(runtime, response.status, classification);
    console.error("Google live image API error", logPayload);
    throw providerErrorFromGoogleClassification(classification, runtime);
  }

  const inline = extractGoogleInlineImage(json);
  if (!inline) {
    console.error("Google Gemini response missing inline image data", {
      provider: runtime.provider,
      model: runtime.model,
      baseUrlHost: runtime.baseUrlHost,
      requestPath: runtime.requestPath,
      candidateCount: Array.isArray(/** @type {{ candidates?: unknown }} */ (json)?.candidates)
        ? /** @type {{ candidates: unknown[] }} */ (json).candidates.length
        : 0,
    });
    throw new ProviderAdapterError(
      "LIVE_PROVIDER_FAILED",
      "Google returned an unexpected response shape.",
      { ...runtime, errorCategory: "unexpected_response" },
    );
  }

  const mimeType = inline.mimeType.startsWith("image/") ? inline.mimeType : "image/png";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  return {
    imageData: `data:${mimeType};base64,${inline.base64}`,
    mimeType,
    fileName: `diagram-google-${stamp}.${mimeType === "image/jpeg" ? "jpg" : "png"}`,
    providerMode: "live",
    generatedAt: new Date().toISOString(),
    modelLabel: model,
    qualityLabel: googleModelSupportsImageConfig(model) ? resolvedImageQuality : undefined,
    sizeLabel: resolvedImageSize,
  };
}
