/**
 * Safe OpenAI provider diagnostics for logs (no API keys, no full vendor JSON bodies).
 */

/**
 * @param {unknown} json
 * @returns {string}
 */
export function extractOpenAiErrorMessage(json) {
  if (!json || typeof json !== "object") {
    return "";
  }
  const err = /** @type {{ error?: unknown }} */ (json).error;
  if (typeof err === "string") {
    return err;
  }
  if (err && typeof err === "object" && "message" in err) {
    const m = /** @type {{ message?: unknown }} */ (err).message;
    return typeof m === "string" ? m : "";
  }
  return "";
}

/**
 * Safe summary for terminal logs (no full vendor JSON).
 *
 * @param {number} httpStatus
 * @param {unknown} json
 * @returns {Record<string, unknown>}
 */
export function buildOpenAiErrorLogSummary(httpStatus, json) {
  const detail = extractOpenAiErrorMessage(json);
  /** @type {Record<string, unknown>} */
  const summary = {
    httpStatus,
    errorMessage:
      detail ||
      (json === null ? "unparseable response body" : "vendor error (message not extracted)"),
  };
  if (json && typeof json === "object" && "error" in json) {
    const err = /** @type {{ error?: unknown }} */ (json).error;
    if (err && typeof err === "object") {
      if ("type" in err && typeof /** @type {{ type?: unknown }} */ (err).type === "string") {
        summary.errorType = /** @type {{ type: string }} */ (err).type;
      }
      if ("code" in err && /** @type {{ code?: unknown }} */ (err).code != null) {
        summary.errorCode = String(/** @type {{ code: unknown }} */ (err).code);
      }
    }
  }
  return summary;
}
