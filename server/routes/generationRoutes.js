import express from "express";
import { ProviderAdapterError } from "../errors/providerAdapterError.js";
import { mapGenerationErrorToHttp } from "../http/mapGenerationErrorToHttp.js";
import { runAgentGeneration } from "../services/generationAgentService.js";
import { validateGenerationRequest } from "../validation/generationRequest.js";

export const generationRouter = express.Router();

/** Only the media type segment; allows `application/json; charset=utf-8`. */
function jsonContentTypeMediaType(contentType) {
  if (!contentType || typeof contentType !== "string") {
    return "";
  }
  return contentType.split(";")[0].trim().toLowerCase();
}

function requireJsonContentType(request, response, next) {
  if (jsonContentTypeMediaType(request.headers["content-type"]) !== "application/json") {
    return response.status(415).json({
      ok: false,
      error: 'Content-Type must be application/json (e.g. application/json; charset=utf-8).',
      code: "UNSUPPORTED_MEDIA_TYPE",
      issues: [],
    });
  }
  next();
}

/**
 * POST /api/generate
 *
 * Request: JSON body `{ "prompt": string, "providerMode": "mock"|"live", "providerId"?: "openai"|"google"|"cloudflare" }` (strict).
 * `providerId` is required when `providerMode` is `live`; optional in `mock` (defaults to `openai`).
 * Content-Type must be application/json.
 * Success: 200 `{ ok: true, data: GenerationResponse }`.
 * Errors: 4xx/5xx `{ ok: false, error: string, code: string, issues: Issue[] }`.
 */
generationRouter.post("/", requireJsonContentType, async (request, response) => {
  const validation = validateGenerationRequest(request.body);
  if (!validation.success) {
    return response.status(400).json({
      ok: false,
      error: validation.error,
      code: "VALIDATION_ERROR",
      issues: validation.issues ?? [],
    });
  }

  const validatedBody = validation.data;

  try {
    const data = await runAgentGeneration(validatedBody);
    return response.status(200).json({ ok: true, data });
  } catch (error) {
    const mapped = mapGenerationErrorToHttp(error);
    if (error instanceof ProviderAdapterError && error.diagnostics) {
      console.error("Generation provider adapter failure", {
        providerMode: validatedBody.providerMode,
        providerId: validatedBody.providerId,
        adapterCode: error.code,
        adapterMessage: error.message,
        diagnostics: error.diagnostics,
      });
    } else if (mapped.logError) {
      console.error(error);
    }
    return response.status(mapped.status).json({
      ok: false,
      error: mapped.message,
      code: mapped.code,
      issues: [],
    });
  }
});
