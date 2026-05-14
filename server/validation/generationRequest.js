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
    const issues = parsed.error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    }));
    return {
      success: false,
      error: issues[0]?.message || "Invalid request payload.",
      issues,
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}
