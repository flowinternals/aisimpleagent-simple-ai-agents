import express from "express";
import { runAgentGeneration } from "../services/generationAgentService.js";
import { validateGenerationRequest } from "../validation/generationRequest.js";

export const generationRouter = express.Router();

generationRouter.post("/", async (request, response) => {
  const validation = validateGenerationRequest(request.body);
  if (!validation.success) {
    return response.status(400).json({
      ok: false,
      error: validation.error,
      code: "VALIDATION_ERROR",
      ...(validation.issues?.length ? { issues: validation.issues } : {}),
    });
  }

  try {
    const result = await runAgentGeneration(validation.data);
    return response.status(200).json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    const status = typeof error?.status === "number" && error.status >= 400 ? error.status : 500;
    if (status >= 500) {
      console.error(error);
    }
    return response.status(status).json({
      ok: false,
      error: message,
      code: status >= 500 ? "GENERATION_FAILED" : "GENERATION_REJECTED",
    });
  }
});
