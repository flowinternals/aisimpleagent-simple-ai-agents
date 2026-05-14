import { z } from "zod";

const generationRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required.")
    .max(2000, "Prompt must stay under 2000 characters."),
});

export function validateGenerationRequest(payload) {
  const parsed = generationRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid request payload.",
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}
