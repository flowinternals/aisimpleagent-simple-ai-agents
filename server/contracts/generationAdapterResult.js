/**
 * Canonical return shape from `generateWithProvider` (`server/providers/providerAdapter.js`).
 * Live backends should map SDK responses into this shape before returning.
 *
 * @typedef {Object} NormalizedGenerationResult
 * @property {string} imageData Image payload (e.g. data URL or base64, as agreed by the app UI).
 * @property {string} mimeType IANA media type for the image.
 * @property {string} fileName Suggested download filename.
 * @property {'mock'|'live'} providerMode How the run was produced (coarse; not vendor-specific).
 * @property {string} generatedAt ISO 8601 timestamp from the provider layer.
 * @property {string} [modelLabel] Optional display label when a live backend supplies it.
 */

/** Marker export so the module is a valid ES module; types live in JSDoc only. */
export const GENERATION_ADAPTER_RESULT_CONTRACT = true;
