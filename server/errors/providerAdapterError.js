import { HttpError } from "../httpError.js";



export class ProviderAdapterError extends Error {

  constructor(code, message) {

    super(message);

    this.name = "ProviderAdapterError";

    this.code = code;

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

      "The selected live provider is not wired up yet. Choose OpenAI or use mock mode.",

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

      "OpenAI billing or usage limit reached. Add credits in your OpenAI account, or switch to Mock mode in Settings to keep testing locally.",

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

