import express from "express";
import { HttpError } from "../httpError.js";
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
 * Request: JSON body `{ "prompt": string }` only (strict). Content-Type must be application/json.
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

  try {
    const data = await runAgentGeneration(validation.data);
    return response.status(200).json({ ok: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status >= 500) {
        console.error(error);
      }
      return response.status(error.status).json({
        ok: false,
        error: error.message,
        code: error.code,
        issues: [],
      });
    }

    console.error(error);
    return response.status(500).json({
      ok: false,
      error: "Unable to generate an image right now. Please try again in a moment.",
      code: "GENERATION_FAILED",
      issues: [],
    });
  }
});
