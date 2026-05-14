import { z, ZodIssueCode } from "zod";
import { GENERATION_PROMPT_MAX_LENGTH } from "../../shared/generationLimits.js";

export { GENERATION_PROMPT_MAX_LENGTH };

const hasLetterOrNumber = (value) => /\p{L}|\p{N}/u.test(value);

/** HTTP JSON body for POST /api/generate — only `prompt`; unknown keys are rejected (strict). No optional fields. */
const generationRequestSchema = z
  .object({
    prompt: z
      .string({
        required_error: "Prompt is required.",
        invalid_type_error: "Prompt must be a text string.",
      })
      .transform((value) => value.trim())
      .superRefine((value, ctx) => {
        if (value.length === 0) {
          ctx.addIssue({
            code: ZodIssueCode.custom,
            message: "Prompt cannot be empty or whitespace only.",
          });
          return;
        }
        if (value.length > GENERATION_PROMPT_MAX_LENGTH) {
          ctx.addIssue({
            code: ZodIssueCode.custom,
            message: `Prompt must be at most ${GENERATION_PROMPT_MAX_LENGTH} characters.`,
          });
          return;
        }
        if (!hasLetterOrNumber(value)) {
          ctx.addIssue({
            code: ZodIssueCode.custom,
            message:
              "Describe the diagram in words: the prompt must include at least one letter or number (not only punctuation or symbols).",
          });
        }
      }),
  })
  .strict(
    'Only "prompt" is allowed in the request body. Remove any other properties.',
  );

function normalizeIssues(zodError) {
  return zodError.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
    code: issue.code,
  }));
}

function primaryValidationMessage(issues) {
  if (!issues.length) {
    return "Invalid request payload.";
  }
  const unrecognized = issues.find((issue) => issue.code === "unrecognized_keys");
  if (unrecognized) {
    return 'Only "prompt" is allowed in the request body. Remove unsupported properties.';
  }
  return issues[0].message;
}

/**
 * Validates POST /api/generate JSON body before the agent runs.
 * @param {unknown} payload
 */
export function validateGenerationRequest(payload) {
  if (payload === null || payload === undefined) {
    return {
      success: false,
      error: "Request body must be a JSON object with a \"prompt\" field.",
      issues: [
        {
          path: "(root)",
          code: "request_body_null",
          message: "Expected an object, received null or undefined.",
        },
      ],
    };
  }
  if (typeof payload !== "object" || Array.isArray(payload)) {
    return {
      success: false,
      error: "Request body must be a JSON object with a \"prompt\" field.",
      issues: [
        {
          path: "(root)",
          code: "request_body_not_object",
          message: `Expected object, received ${Array.isArray(payload) ? "array" : typeof payload}.`,
        },
      ],
    };
  }

  const parsed = generationRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = normalizeIssues(parsed.error);
    return {
      success: false,
      error: primaryValidationMessage(issues),
      issues,
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}
