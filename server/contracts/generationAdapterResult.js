import { ProviderAdapterError } from "../errors/providerAdapterError.js";

/**
 * Canonical return shape from `generateWithProvider` (`server/providers/providerAdapter.js`).
 * Live backends should map SDK responses into this shape before returning.
 *
 * @typedef {Object} NormalizedGenerationResult
 * @property {string} imageData Base64 data URL for inline preview and download
 * (`data:<image/*>;base64,...`). Must match {@link NormalizedGenerationResult.mimeType}.
 * Live adapters map vendor bytes into this form before returning.
 * @property {string} mimeType Lowercase `image/*` IANA media type; must match the type in `imageData`.
 * @property {string} fileName Suggested download filename.
 * @property {'mock'|'live'} providerMode How the run was produced (coarse; not vendor-specific).
 * @property {string} generatedAt ISO 8601 timestamp from the provider layer.
 * @property {string} [modelLabel] Optional display label when a live backend supplies it.
 * @property {'low'|'medium'|'high'} [qualityLabel] Optional display label for the image quality used by a live backend.
 * @property {'light'|'dark'} [themeLabel] Optional diagram tone label echoed from the request.
 * @property {'16:9'|'4:3'|'1:1'} [sizeLabel] Optional aspect ratio label echoed from the request.
 */

/**
 * Arguments accepted by `generateWithProvider` (`server/providers/providerAdapter.js`).
 * The assembled provider instruction is passed; the agent service keeps the raw user
 * prompt out of the adapter boundary. Mode and vendor id come from validated API input.
 *
 * @typedef {Object} GenerationAdapterRequest
 * @property {string} providerPrompt
 * @property {'mock'|'live'} providerMode
 * @property {'openai'|'google'|'cloudflare'} providerId
 * @property {'low'|'medium'|'high'} [imageQuality] GPT image quality from the validated API request.
 * @property {'light'|'dark'} [imageTheme] Diagram tone from the validated API request.
 * @property {'16:9'|'4:3'|'1:1'} [imageSize] Aspect ratio from the validated API request.
 */

/** @param {string} detail internal detail for logs; not forwarded to clients */
function adapterResultContractError(detail) {
  return new ProviderAdapterError("ADAPTER_RESULT_INVALID", detail);
}

/**
 * @param {unknown} value
 * @returns {value is 'mock'|'live'}
 */
function isProviderMode(value) {
  return value === "mock" || value === "live";
}

/** Path segments, `..`, and ASCII control characters. */
const UNSAFE_FILE_NAME = /[\\/]|\.\.|[\x00-\x1f\x7f]/;

/** `image/png`, `image/svg+xml`, etc. */
const IMAGE_MIME_TYPE = /^image\/[a-z0-9.+-]+$/i;

/** `data:image/png;base64,...` — parameters (e.g. charset) are not allowed. */
const DATA_IMAGE_BASE64_URL =
  /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)\s*$/i;

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeAdapterFileName(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw adapterResultContractError('Adapter result field "fileName" is missing or empty.');
  }
  if (UNSAFE_FILE_NAME.test(trimmed)) {
    throw adapterResultContractError(
      'Adapter result field "fileName" must be a plain filename without path segments or control characters.',
    );
  }
  if (!/[^\s.]/.test(trimmed)) {
    throw adapterResultContractError('Adapter result field "fileName" is not a usable filename.');
  }
  return trimmed;
}

/**
 * @param {string} value
 * @returns {string} ISO 8601 UTC timestamp
 */
function normalizeAdapterGeneratedAt(value) {
  const trimmed = value.trim();
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) {
    throw adapterResultContractError(
      'Adapter result field "generatedAt" must be a valid date/time string.',
    );
  }
  return new Date(ms).toISOString();
}

/**
 * @param {string} value
 * @returns {string} lowercase `image/*` media type
 */
function normalizeAdapterMimeType(value) {
  const trimmed = value.trim();
  if (!IMAGE_MIME_TYPE.test(trimmed)) {
    throw adapterResultContractError(
      'Adapter result field "mimeType" must be an image/* IANA media type.',
    );
  }
  return trimmed.toLowerCase();
}

/**
 * @param {string} imageData
 * @param {string} expectedMimeType normalized lowercase `image/*` type
 * @returns {string}
 */
function normalizeAdapterImageData(imageData, expectedMimeType) {
  const trimmed = imageData.trim();
  const match = DATA_IMAGE_BASE64_URL.exec(trimmed);
  if (!match) {
    throw adapterResultContractError(
      'Adapter result field "imageData" must be a base64 data URL (data:<image/*>;base64,...).',
    );
  }
  const mediaType = match[1].toLowerCase();
  if (mediaType !== expectedMimeType) {
    throw adapterResultContractError(
      `Adapter result "imageData" media type "${mediaType}" does not match mimeType "${expectedMimeType}".`,
    );
  }
  return trimmed;
}

/**
 * Validates and returns a single object matching {@link NormalizedGenerationResult}.
 * Provider implementations may omit trimming; the adapter should pass results through here
 * so the agent service always sees a consistent contract.
 *
 * @param {unknown} raw
 * @param {'mock'|'live'} expectedProviderMode execution mode for this response (authoritative)
 * @returns {NormalizedGenerationResult}
 */
export function normalizeGenerationAdapterResult(raw, expectedProviderMode) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw adapterResultContractError("Adapter result must be a non-null object.");
  }
  const o = /** @type {Record<string, unknown>} */ (raw);

  for (const key of ["imageData", "mimeType", "fileName", "generatedAt"]) {
    const v = o[key];
    if (typeof v !== "string" || !v.trim()) {
      throw adapterResultContractError(`Adapter result missing or invalid string field: ${key}`);
    }
  }

  if (!isProviderMode(o.providerMode)) {
    throw adapterResultContractError('Adapter result field "providerMode" must be "mock" or "live".');
  }
  if (o.providerMode !== expectedProviderMode) {
    throw adapterResultContractError(
      `Adapter result providerMode "${o.providerMode}" does not match execution mode "${expectedProviderMode}".`,
    );
  }

  const mimeType = normalizeAdapterMimeType(o.mimeType);
  const imageData = normalizeAdapterImageData(o.imageData, mimeType);

  /** @type {NormalizedGenerationResult} */
  const out = {
    imageData,
    mimeType,
    fileName: normalizeAdapterFileName(o.fileName),
    providerMode: o.providerMode,
    generatedAt: normalizeAdapterGeneratedAt(o.generatedAt),
  };

  if (o.modelLabel !== undefined) {
    if (typeof o.modelLabel !== "string") {
      throw adapterResultContractError('Adapter result field "modelLabel" must be a string when present.');
    }
    const trimmed = o.modelLabel.trim();
    if (trimmed) {
      out.modelLabel = trimmed;
    }
  }

  if (o.qualityLabel !== undefined) {
    if (typeof o.qualityLabel !== "string") {
      throw adapterResultContractError('Adapter result field "qualityLabel" must be a string when present.');
    }
    const trimmed = o.qualityLabel.trim().toLowerCase();
    if (trimmed === "low" || trimmed === "medium" || trimmed === "high") {
      out.qualityLabel = trimmed;
    } else if (trimmed) {
      throw adapterResultContractError('Adapter result field "qualityLabel" must be "low", "medium", or "high" when present.');
    }
  }

  if (o.themeLabel !== undefined) {
    if (typeof o.themeLabel !== "string") {
      throw adapterResultContractError('Adapter result field "themeLabel" must be a string when present.');
    }
    const trimmed = o.themeLabel.trim().toLowerCase();
    if (trimmed === "light" || trimmed === "dark") {
      out.themeLabel = trimmed;
    } else if (trimmed) {
      throw adapterResultContractError('Adapter result field "themeLabel" must be "light" or "dark" when present.');
    }
  }

  if (o.sizeLabel !== undefined) {
    if (typeof o.sizeLabel !== "string") {
      throw adapterResultContractError('Adapter result field "sizeLabel" must be a string when present.');
    }
    const trimmed = o.sizeLabel.trim();
    if (trimmed === "16:9" || trimmed === "4:3" || trimmed === "1:1") {
      out.sizeLabel = trimmed;
    } else if (trimmed) {
      throw adapterResultContractError('Adapter result field "sizeLabel" must be "16:9", "4:3", or "1:1" when present.');
    }
  }

  return out;
}

/** Marker export so the module is a valid ES module; types live in JSDoc only. */
export const GENERATION_ADAPTER_RESULT_CONTRACT = true;
