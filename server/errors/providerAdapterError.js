import { HttpError } from "../httpError.js";



export class ProviderAdapterError extends Error {

  /**
   * @param {string} code
   * @param {string} message
   * @param {Record<string, unknown> | undefined} [diagnostics] safe, non-secret fields for server logs
   */
  constructor(code, message, diagnostics) {

    super(message);

    this.name = "ProviderAdapterError";

    this.code = code;

    /** @type {Record<string, unknown> | undefined} */
    this.diagnostics = diagnostics;

  }

}



/**

 * True when `error` is a {@link ProviderAdapterError} with code `PROVIDER_NOT_AVAILABLE`.

 * Routes use this to choose 503 without importing error construction details.

 * @param {unknown} error

 * @returns {boolean}

 */

export function isProviderNotAvailableError(error) {

  return error instanceof ProviderAdapterError && error.code === "PROVIDER_NOT_AVAILABLE";

}



/**

 * Maps a provider-layer failure to an {@link HttpError} the route can return as JSON.

 * Client bodies use fixed, audited strings only (adapter `message` may contain internal

 * detail for logs; it is not forwarded here).

 * @param {unknown} error

 * @returns {HttpError | null}

 */

export function httpErrorFromProviderAdapter(error) {

  if (!(error instanceof ProviderAdapterError)) {

    return null;

  }

  const { code } = error;



  if (code === "PROVIDER_NOT_AVAILABLE") {

    return new HttpError(

      503,

      code,

      "Image generation is not available for the configured provider yet.",

    );

  }

  if (code === "LIVE_PROVIDER_NOT_IMPLEMENTED") {

    return new HttpError(

      503,

      code,

      "The selected live provider is not wired up yet. Choose OpenAI, Google, or use mock mode.",

    );

  }

  if (code === "LIVE_PROVIDER_NOT_CONFIGURED") {

    return new HttpError(

      503,

      code,

      "Live image generation is not configured on the server. Add the provider API key to .env.local.",

    );

  }

  if (code === "LIVE_PROVIDER_QUOTA_EXCEEDED") {

    return new HttpError(

      402,

      code,

      "Live provider billing or usage limit reached. Check your provider account, or switch to Mock mode in Settings to keep testing locally.",

    );

  }

  if (code === "LIVE_PROVIDER_RATE_LIMIT") {

    return new HttpError(

      429,

      code,

      "The image provider is rate limiting requests. Wait a moment and try again, or switch to Mock mode in Settings.",

    );

  }

  if (code === "LIVE_PROVIDER_MISCONFIGURED") {

    return new HttpError(

      503,

      code,

      "Live image generation is misconfigured on the server (endpoint or model). Check GOOGLE_BASE_URL and GOOGLE_IMAGE_MODEL.",

    );

  }

  if (code === "LIVE_PROVIDER_FAILED") {

    return new HttpError(

      502,

      code,

      "The image provider could not complete this request. Please try again in a moment.",

    );

  }

  if (code === "ADAPTER_RESULT_INVALID") {

    return new HttpError(

      502,

      code,

      "Image generation returned an invalid result. Please try again in a moment.",

    );

  }



  return new HttpError(503, code, "Image generation is temporarily unavailable.");

}

