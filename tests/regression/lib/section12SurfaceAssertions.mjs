/**
 * Pure assertions for Section 12 extension-risk regression (training build).
 * Covers only surfaces that exist today: env-only outbound provider fetch and
 * download filename safety. Upload, webhook, and user-URL fetch surfaces are absent.
 */

/** When false, route-level upload rejection regression is not applicable. */
export const TRAINING_BUILD_HAS_UPLOAD_ROUTES = false;

/** When false, webhook signature regression is not applicable. */
export const TRAINING_BUILD_HAS_WEBHOOK_ROUTES = false;

/** When false, server-side fetch of user-supplied URLs is not implemented. */
export const TRAINING_BUILD_HAS_USER_URL_FETCH = false;

/** When false, outbound host allowlist / disallowed-URL rejection is not implemented. */
export const TRAINING_BUILD_OUTBOUND_URL_ALLOWLIST_ENABLED = false;

/**
 * Whitelisted keys on successful `POST /api/generate` `data` (see `buildGenerationApiData`).
 * `imageUrl` is intentionally excluded until a hosted-URL feature exists.
 */
export const GENERATE_API_DATA_WHITELIST_KEYS = Object.freeze([
  "imageData",
  "mimeType",
  "fileName",
  "providerMode",
  "generatedAt",
  "generationTimeMs",
  "modelLabel",
  "qualityLabel",
  "themeLabel",
  "sizeLabel",
]);

/**
 * @param {Record<string, unknown>} data
 * @returns {boolean}
 */
export function apiDataExcludesHostedImageUrl(data) {
  return !Object.prototype.hasOwnProperty.call(data, "imageUrl");
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isAdapterUnsafeFileNameRejection(error) {
  return (
    error != null &&
    typeof error === "object" &&
    "code" in error &&
    /** @type {{ code?: unknown }} */ (error).code === "ADAPTER_RESULT_INVALID"
  );
}

/**
 * @param {import("../../../shared/googleProviderDiagnostics.js").GoogleReadinessLevel} readinessLevel
 * @returns {boolean}
 */
export function isGoogleInvalidBaseUrlReadiness(readinessLevel) {
  return readinessLevel === "invalid_base_url";
}
