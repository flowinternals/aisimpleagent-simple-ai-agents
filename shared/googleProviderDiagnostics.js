import { DEFAULT_GOOGLE_IMAGE_MODEL } from "./googleImageConfig.js";

/** @typedef {"missing_credentials"|"invalid_model"|"invalid_base_url"|"structurally_ready"} GoogleReadinessLevel */

/**
 * @typedef {{
 *   httpStatus: number | null,
 *   status: string | null,
 *   code: number | string | null,
 *   message: string | null,
 *   reasons: string[],
 *   quotaMetric: string | null,
 *   quotaId: string | null,
 *   retryDelay: string | null,
 * }} GoogleApiErrorDetails
 */

/**
 * @typedef {{
 *   category:
 *     | "auth"
 *     | "quota"
 *     | "rate_limit"
 *     | "billing"
 *     | "misconfigured"
 *     | "unavailable"
 *     | "unknown",
 *   summary: string,
 *   details: GoogleApiErrorDetails,
 * }} GoogleApiErrorClassification
 */

const DEFAULT_GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Non-secret snapshot of Google provider settings used for logs and health.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{
 *   provider: "google",
 *   authMethod: "x-goog-api-key",
 *   apiKeyPresent: boolean,
 *   baseUrl: string,
 *   baseUrlHost: string,
 *   model: string,
 *   requestPath: string,
 *   requestUrlHostPath: string,
 *   projectName: string | null,
 *   projectNumber: string | null,
 * }}
 */
export function getGoogleRuntimeSnapshot(env = process.env) {
  const apiKeyPresent = Boolean(env.GOOGLE_API_KEY?.trim());
  const baseUrl = (env.GOOGLE_BASE_URL || DEFAULT_GOOGLE_BASE_URL).replace(/\/$/, "");
  const model =
    (env.GOOGLE_IMAGE_MODEL || DEFAULT_GOOGLE_IMAGE_MODEL).trim() || DEFAULT_GOOGLE_IMAGE_MODEL;
  const requestPath = `/models/${model}:generateContent`;
  let baseUrlHost = baseUrl;
  try {
    baseUrlHost = new URL(`${baseUrl}/`).hostname;
  } catch {
    baseUrlHost = baseUrl;
  }

  const projectName =
    env.GOOGLE_PROJECT_NAME?.trim() || env.PROJECT_NAME?.trim() || null;
  const projectNumber =
    env.GOOGLE_PROJECT_NUMBER?.trim() || env.PROJECT_NUMBER?.trim() || null;

  return {
    provider: "google",
    authMethod: "x-goog-api-key",
    apiKeyPresent,
    baseUrl,
    baseUrlHost,
    model,
    requestPath,
    requestUrlHostPath: `${baseUrlHost}${requestPath}`,
    projectName,
    projectNumber,
  };
}

/**
 * @param {string} baseUrl
 * @returns {boolean}
 */
export function isGoogleBaseUrlStructurallyValid(baseUrl) {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * @param {string} imageModel
 * @returns {boolean}
 */
export function isGoogleImageModelRecognized(imageModel) {
  const normalized = imageModel.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes("flash-image") ||
    normalized.includes("pro-image") ||
    normalized.startsWith("imagen-")
  );
}

/**
 * Structural readiness only (env present + model/base URL shape). Does not call Google.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{
 *   credentialsPresent: boolean,
 *   settingsValid: boolean,
 *   modelConfigured: boolean,
 *   readinessLevel: GoogleReadinessLevel,
 *   reason: string | null,
 *   snapshot: ReturnType<typeof getGoogleRuntimeSnapshot>,
 * }}
 */
export function assessGoogleStructuralReadiness(env = process.env) {
  const snapshot = getGoogleRuntimeSnapshot(env);
  const credentialsPresent = snapshot.apiKeyPresent;
  const modelConfigured = Boolean((env.GOOGLE_IMAGE_MODEL || DEFAULT_GOOGLE_IMAGE_MODEL).trim());
  const baseUrlValid = isGoogleBaseUrlStructurallyValid(snapshot.baseUrl);
  const modelValid = isGoogleImageModelRecognized(snapshot.model);
  const settingsValid = baseUrlValid && modelValid;

  if (!credentialsPresent) {
    return {
      credentialsPresent: false,
      settingsValid: false,
      modelConfigured,
      readinessLevel: "missing_credentials",
      reason:
        "GOOGLE_API_KEY is not set on the server (.env.local or Assets google.provider.runtime).",
      snapshot,
    };
  }

  if (!baseUrlValid) {
    return {
      credentialsPresent: true,
      settingsValid: false,
      modelConfigured,
      readinessLevel: "invalid_base_url",
      reason: `GOOGLE_BASE_URL is not a valid URL (${snapshot.baseUrl}).`,
      snapshot,
    };
  }

  if (!modelValid) {
    return {
      credentialsPresent: true,
      settingsValid: false,
      modelConfigured,
      readinessLevel: "invalid_model",
      reason: `GOOGLE_IMAGE_MODEL=${snapshot.model} is not a recognised Gemini/Imagen image model for this scaffold.`,
      snapshot,
    };
  }

  return {
    credentialsPresent: true,
    settingsValid: true,
    modelConfigured,
    readinessLevel: "structurally_ready",
    reason: null,
    snapshot,
  };
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function asNonEmptyString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Extracts safe, non-secret fields from a Google Generative Language API error body.
 *
 * @param {unknown} json
 * @param {number} [httpStatus]
 * @returns {GoogleApiErrorDetails}
 */
export function parseGoogleApiError(json, httpStatus) {
  /** @type {GoogleApiErrorDetails} */
  const details = {
    httpStatus: typeof httpStatus === "number" ? httpStatus : null,
    status: null,
    code: null,
    message: null,
    reasons: [],
    quotaMetric: null,
    quotaId: null,
    retryDelay: null,
  };

  if (!json || typeof json !== "object") {
    return details;
  }

  const err = /** @type {{ error?: unknown }} */ (json).error;
  if (!err || typeof err !== "object") {
    return details;
  }

  const errorObj = /** @type {Record<string, unknown>} */ (err);
  details.status = asNonEmptyString(errorObj.status);
  details.message = asNonEmptyString(errorObj.message);
  if (typeof errorObj.code === "number" || typeof errorObj.code === "string") {
    details.code = errorObj.code;
  }

  const nestedDetails = errorObj.details;
  if (!Array.isArray(nestedDetails)) {
    return details;
  }

  /** @type {string[]} */
  const reasons = [];
  for (const item of nestedDetails) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const entry = /** @type {Record<string, unknown>} */ (item);
    const type = asNonEmptyString(entry["@type"]) ?? asNonEmptyString(entry.type);
    if (type?.includes("QuotaFailure")) {
      const violations = entry.violations;
      if (Array.isArray(violations)) {
        for (const violation of violations) {
          if (!violation || typeof violation !== "object") {
            continue;
          }
          const v = /** @type {Record<string, unknown>} */ (violation);
          const quotaMetric = asNonEmptyString(v.quotaMetric);
          const quotaId = asNonEmptyString(v.quotaId);
          if (quotaMetric) {
            details.quotaMetric = quotaMetric;
          }
          if (quotaId) {
            details.quotaId = quotaId;
          }
          reasons.push(
            [quotaMetric, quotaId].filter(Boolean).join(":") || "quota_violation",
          );
        }
      }
    }
    if (type?.includes("RetryInfo")) {
      const retryDelay = entry.retryDelay;
      if (typeof retryDelay === "string") {
        details.retryDelay = retryDelay;
        reasons.push(`retry_after=${retryDelay}`);
      }
    }
    if (type?.includes("ErrorInfo")) {
      const reason = asNonEmptyString(entry.reason);
      if (reason) {
        reasons.push(reason);
      }
    }
  }

  details.reasons = [...new Set(reasons)];
  return details;
}

/**
 * @param {GoogleApiErrorDetails} details
 * @returns {boolean}
 */
function messageImpliesBilling(details) {
  const normalized = (details.message ?? "").toLowerCase();
  return (
    normalized.includes("billing") ||
    normalized.includes("enable billing") ||
    normalized.includes("billing account")
  );
}

/**
 * @param {GoogleApiErrorDetails} details
 * @returns {boolean}
 */
function messageImpliesQuota(details) {
  const normalized = (details.message ?? "").toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes("quota") ||
    normalized.includes("resource exhausted") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("exceeded your current") ||
    normalized.includes("usage limit") ||
    Boolean(details.quotaMetric || details.quotaId)
  );
}

/**
 * @param {GoogleApiErrorDetails} details
 * @returns {boolean}
 */
function messageImpliesRateLimit(details) {
  const normalized = (details.message ?? "").toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("request rate") ||
    normalized.includes("try again later")
  );
}

/**
 * @param {number} httpStatus
 * @param {GoogleApiErrorDetails} details
 * @returns {GoogleApiErrorClassification}
 */
export function classifyGoogleApiError(httpStatus, details) {
  const status = (details.status ?? "").toUpperCase();
  const message = details.message ?? "Google API request failed.";

  if (httpStatus === 401 || httpStatus === 403 || status === "UNAUTHENTICATED" || status === "PERMISSION_DENIED") {
    return {
      category: "auth",
      summary: "Google rejected credentials or account access.",
      details,
    };
  }

  if (
    httpStatus === 404 ||
    status === "NOT_FOUND" ||
    (httpStatus === 400 && (message.toLowerCase().includes("model") || status === "INVALID_ARGUMENT"))
  ) {
    return {
      category: "misconfigured",
      summary: "Google endpoint or model configuration appears invalid.",
      details,
    };
  }

  if (messageImpliesBilling(details)) {
    return {
      category: "billing",
      summary: message,
      details,
    };
  }

  if (httpStatus === 429) {
    if (messageImpliesQuota(details) && !messageImpliesRateLimit(details)) {
      return {
        category: "quota",
        summary: message,
        details,
      };
    }
    if (messageImpliesRateLimit(details) && !messageImpliesQuota(details)) {
      return {
        category: "rate_limit",
        summary: message,
        details,
      };
    }
    if (status === "RESOURCE_EXHAUSTED" && (details.quotaMetric || details.quotaId)) {
      return {
        category: "quota",
        summary: message,
        details,
      };
    }
    return {
      category: "rate_limit",
      summary: message,
      details,
    };
  }

  if (httpStatus === 402 || messageImpliesQuota(details) || status === "RESOURCE_EXHAUSTED") {
    return {
      category: "quota",
      summary: message,
      details,
    };
  }

  if (messageImpliesRateLimit(details)) {
    return {
      category: "rate_limit",
      summary: message,
      details,
    };
  }

  if (httpStatus >= 500) {
    return {
      category: "unavailable",
      summary: message,
      details,
    };
  }

  return {
    category: "unknown",
    summary: message,
    details,
  };
}

/**
 * Safe structured log payload for Google provider failures.
 *
 * @param {ReturnType<typeof getGoogleRuntimeSnapshot>} runtime
 * @param {number} httpStatus
 * @param {GoogleApiErrorClassification} classification
 * @returns {Record<string, unknown>}
 */
export function buildGoogleErrorLogPayload(runtime, httpStatus, classification) {
  const { details } = classification;
  return {
    provider: runtime.provider,
    authMethod: runtime.authMethod,
    httpStatus,
    errorCategory: classification.category,
    googleStatus: details.status,
    googleCode: details.code,
    googleMessage: details.message,
    googleReasons: details.reasons.length ? details.reasons : undefined,
    quotaMetric: details.quotaMetric ?? undefined,
    quotaId: details.quotaId ?? undefined,
    retryDelay: details.retryDelay ?? undefined,
    baseUrlHost: runtime.baseUrlHost,
    baseUrl: runtime.baseUrl,
    model: runtime.model,
    requestPath: runtime.requestPath,
    requestUrlHostPath: runtime.requestUrlHostPath,
    projectName: runtime.projectName ?? undefined,
    projectNumber: runtime.projectNumber ?? undefined,
  };
}
