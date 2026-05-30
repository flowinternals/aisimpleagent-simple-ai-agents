/**
 * Pure assertions for abuse-control regression (oversize rejection, training-build rate-limit posture).
 * No rate-limit or retry helpers exist in app code yet — these document expected HTTP outcomes.
 */

/** When false, burst regression expects mock success without 429 (solo localhost training build). */
export const TRAINING_BUILD_RATE_LIMIT_ENABLED = false;

/**
 * @param {number} status
 * @param {string | undefined} code
 * @returns {boolean}
 */
export function isOversizedPromptRejection(status, code) {
  return status === 400 && code === "VALIDATION_ERROR";
}

/**
 * Parser or validation rejection for bodies larger than the Express JSON limit (~2 MB).
 * @param {number} status
 * @param {string | undefined} [code]
 * @returns {boolean}
 */
export function isOversizedJsonBodyRejection(status, code) {
  if (status === 413) {
    return true;
  }
  if (status === 400 && code === "VALIDATION_ERROR") {
    return true;
  }
  return false;
}

/**
 * @param {number} status
 * @returns {boolean}
 */
export function isSuccessfulGenerateStatus(status) {
  return status === 200;
}

/**
 * Evaluate burst POST statuses for the current training-build rate-limit posture.
 * @param {number[]} statuses
 * @param {{ rateLimitEnabled?: boolean }} [options]
 * @returns {{ ok: boolean, summary: string }}
 */
export function evaluateBurstRateLimitPosture(statuses, options = {}) {
  const rateLimitEnabled = options.rateLimitEnabled ?? TRAINING_BUILD_RATE_LIMIT_ENABLED;
  if (rateLimitEnabled) {
    const saw429 = statuses.some((status) => status === 429);
    return {
      ok: saw429,
      summary: saw429
        ? "burst hit rate limit (429) as expected"
        : `expected at least one 429 in burst, got ${statuses.join(",")}`,
    };
  }
  const allSuccess = statuses.every((status) => isSuccessfulGenerateStatus(status));
  const no429 = !statuses.some((status) => status === 429);
  return {
    ok: allSuccess && no429,
    summary: allSuccess && no429
      ? `training build: burst ${statuses.length}x mock all 200, no 429 (rate limit deferred)`
      : `training build burst expected all 200 without 429, got ${statuses.join(",")}`,
  };
}
