import { HttpError } from "../httpError.js";
import { httpErrorFromProviderAdapter } from "../errors/providerAdapterError.js";

/**
 * Maps errors from the generation handler to HTTP status, client code, and message.
 * @param {unknown} error
 * @returns {{ status: number, code: string, message: string, logError: boolean }}
 */
export function mapGenerationErrorToHttp(error) {
  const adapterHttp = httpErrorFromProviderAdapter(error);
  if (adapterHttp) {
    return {
      status: adapterHttp.status,
      code: adapterHttp.code,
      message: adapterHttp.message,
      logError: adapterHttp.status >= 500,
    };
  }

  if (error instanceof HttpError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      logError: error.status >= 500,
    };
  }

  return {
    status: 500,
    code: "GENERATION_FAILED",
    message: "Unable to generate an image right now. Please try again in a moment.",
    logError: true,
  };
}
