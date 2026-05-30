/**
 * Lightweight training-build logging (API terminal only).
 * Use console.info / warn / error via these helpers so call sites stay consistent.
 * Never log secrets, cookies, auth headers, tokens, raw prompts, or full vendor bodies.
 */

/**
 * @param {string} event
 * @param {Record<string, unknown> | undefined} [details]
 */
export function logInfo(event, details) {
  if (details !== undefined) {
    console.info(event, details);
  } else {
    console.info(event);
  }
}

/**
 * @param {string} event
 * @param {Record<string, unknown> | undefined} [details]
 */
export function logWarn(event, details) {
  if (details !== undefined) {
    console.warn(event, details);
  } else {
    console.warn(event);
  }
}

/**
 * @param {string} event
 * @param {unknown} [errorOrDetails]
 */
export function logError(event, errorOrDetails) {
  if (errorOrDetails instanceof Error) {
    console.error(event, errorOrDetails);
  } else if (errorOrDetails !== undefined) {
    console.error(event, errorOrDetails);
  } else {
    console.error(event);
  }
}
