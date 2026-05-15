/** @typedef {'light'|'dark'} ImageTheme */

/** Default diagram tone for new generations. */
export const DEFAULT_IMAGE_THEME = "light";

export const IMAGE_THEME_VALUES = /** @type {const} */ (["light", "dark"]);

/**
 * @param {unknown} value
 * @returns {ImageTheme}
 */
export function normalizeImageTheme(value) {
  if (typeof value !== "string") {
    return DEFAULT_IMAGE_THEME;
  }
  return value.trim().toLowerCase() === "dark" ? "dark" : "light";
}
