import {
  formatGenerationApiErrorMessage,
  isGenerationApiErrorBody,
  type GenerationApiErrorBody,
} from "../types/generation";

/** Structured failure shown in the preview column (from API envelope or local fallback). */
export type GenerationPreviewError = {
  code: string;
  message: string;
};

export type GenerationPreviewErrorAction = "switch-to-mock" | "open-settings";

export type GenerationPreviewErrorPresentation = {
  title: string;
  message: string;
  hint?: string;
  action?: GenerationPreviewErrorAction;
  actionLabel?: string;
};

/** Maps a failed generate response (or thrown value) into preview error state. */
export function toGenerationPreviewError(
  payload: unknown,
  httpStatus?: number,
): GenerationPreviewError {
  if (isGenerationApiErrorBody(payload)) {
    return fromGenerationApiErrorBody(payload);
  }

  if (payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string") {
    const loose = payload as { error: string; code?: unknown };
    return {
      code: typeof loose.code === "string" ? loose.code : inferCodeFromHttpStatus(httpStatus),
      message: loose.error.trim() || defaultMessageForHttpStatus(httpStatus),
    };
  }

  return {
    code: inferCodeFromHttpStatus(httpStatus),
    message: defaultMessageForHttpStatus(httpStatus),
  };
}

export function fromGenerationApiErrorBody(body: GenerationApiErrorBody): GenerationPreviewError {
  return {
    code: body.code,
    message: formatGenerationApiErrorMessage(body),
  };
}

export function toGenerationPreviewErrorFromCaught(caught: unknown): GenerationPreviewError {
  if (caught instanceof Error) {
    return {
      code: "CLIENT_ERROR",
      message: caught.message || "Generation failed.",
    };
  }
  return {
    code: "CLIENT_ERROR",
    message: "Generation failed.",
  };
}

/** User-facing copy and recovery actions for the preview error banner. */
export function getGenerationPreviewErrorPresentation(
  error: GenerationPreviewError,
): GenerationPreviewErrorPresentation {
  switch (error.code) {
    case "LIVE_PROVIDER_QUOTA_EXCEEDED":
      return {
        title: "Live provider billing limit reached",
        message: error.message,
        hint: "Live generation is paused until your provider account has available quota or billing enabled.",
        action: "switch-to-mock",
        actionLabel: "Switch to mock mode",
      };
    case "LIVE_PROVIDER_NOT_CONFIGURED":
      return {
        title: "Live provider not configured",
        message: error.message,
        action: "open-settings",
        actionLabel: "Open settings",
      };
    case "VALIDATION_ERROR":
      return {
        title: "Check your prompt",
        message: error.message,
      };
    case "LIVE_PROVIDER_FAILED":
      return {
        title: "Live generation unavailable",
        message: error.message,
        hint: "You can retry in a moment, or switch to mock mode to keep testing the app locally.",
        action: "switch-to-mock",
        actionLabel: "Switch to mock mode",
      };
    case "NETWORK_ERROR":
      return {
        title: "Could not reach the server",
        message: error.message,
        hint: "Make sure `npm run dev` is running and refresh the page.",
      };
    default:
      return {
        title: "Generation failed",
        message: error.message,
      };
  }
}

function fromHttpStatus(httpStatus?: number): GenerationPreviewError {
  return {
    code: inferCodeFromHttpStatus(httpStatus),
    message: defaultMessageForHttpStatus(httpStatus),
  };
}

function inferCodeFromHttpStatus(httpStatus?: number): string {
  if (httpStatus === 402) {
    return "LIVE_PROVIDER_QUOTA_EXCEEDED";
  }
  if (httpStatus === 503) {
    return "LIVE_PROVIDER_NOT_CONFIGURED";
  }
  if (httpStatus === 502 || httpStatus === 504) {
    return "LIVE_PROVIDER_FAILED";
  }
  if (httpStatus === 400) {
    return "VALIDATION_ERROR";
  }
  if (httpStatus === 0 || httpStatus === undefined) {
    return "NETWORK_ERROR";
  }
  return "GENERATION_FAILED";
}

function defaultMessageForHttpStatus(httpStatus?: number): string {
  if (httpStatus === 402) {
    return "OpenAI billing or usage limit reached. Add credits in your OpenAI account, or switch to Mock mode to keep testing locally.";
  }
  if (httpStatus === 502 || httpStatus === 504) {
    return "The image provider could not complete this request. Please try again in a moment.";
  }
  if (httpStatus === 503) {
    return "Live image generation is not configured on the server.";
  }
  if (httpStatus === 0 || httpStatus === undefined) {
    return "Could not reach the generation API. Is the dev server running?";
  }
  return `Generation failed (HTTP ${httpStatus}).`;
}

export { fromHttpStatus as generationPreviewErrorFromHttpStatus };
