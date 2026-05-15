/**
 * Preview panel phase for the generator result column.
 * @typedef {"empty" | "loading" | "success" | "error"} PreviewPhase
 */

/**
 * @param {{ loading: boolean, error: string, hasResult: boolean }} args
 * @returns {PreviewPhase}
 */
export function getPreviewPhase({ loading, error, hasResult }) {
  if (loading) {
    return "loading";
  }
  if (error) {
    return "error";
  }
  if (hasResult) {
    return "success";
  }
  return "empty";
}

/**
 * @param {PreviewPhase} phase
 * @returns {boolean}
 */
export function shouldShowPreviewImage(phase) {
  return phase === "success";
}
