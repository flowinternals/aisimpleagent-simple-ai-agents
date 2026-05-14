import express from "express";
import { runAgentGeneration } from "../services/generationAgentService.js";
import { validateGenerationRequest } from "../validation/generationRequest.js";

export const generationRouter = express.Router();

generationRouter.post("/", async (request, response) => {
  const validation = validateGenerationRequest(request.body);
  if (!validation.success) {
    return response.status(400).json({ error: validation.error });
  }

  try {
    const result = await runAgentGeneration(validation.data);
    return response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    return response.status(500).json({ error: message });
  }
});
