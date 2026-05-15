import { z, ZodIssueCode } from "zod";
import { GENERATION_PROMPT_MAX_LENGTH } from "../../shared/generationLimits.js";
import { DEFAULT_IMAGE_QUALITY, normalizeImageQuality } from "../../shared/imageQuality.js";
import { DEFAULT_IMAGE_SIZE, normalizeImageSize } from "../../shared/imageSize.js";
import { DEFAULT_IMAGE_THEME, normalizeImageTheme } from "../../shared/imageTheme.js";

export { GENERATION_PROMPT_MAX_LENGTH };

const hasLetterOrNumber = (value) => /\p{L}|\p{N}/u.test(value);

const providerModeSchema = z.enum(["mock", "live"], {
  required_error: "providerMode is required.",
  invalid_type_error: "providerMode must be \"mock\" or \"live\".",
});

const providerIdSchema = z.enum(["openai", "google", "cloudflare"], {
  required_error: "providerId is required.",
  invalid_type_error: 'providerId must be "openai", "google", or "cloudflare".',
});

/** Default `providerId` when `providerMode` is `mock` and the client omits it. */
export const MOCK_DEFAULT_PROVIDER_ID = "openai";

/** Live vendors with a working adapter in this build (align with `IMPLEMENTED_LIVE_PROVIDER_IDS` in the UI). */
export const IMPLEMENTED_LIVE_PROVIDER_IDS = ["openai", "google"];

const imageQualitySchema = z.enum(["low", "medium", "high"], {
  invalid_type_error: 'imageQuality must be "low", "medium", or "high".',
});

const imageThemeSchema = z.enum(["light", "dark"], {
  invalid_type_error: 'imageTheme must be "light" or "dark".',
});

const imageSizeSchema = z.enum(["16:9", "4:3", "1:1"], {
  invalid_type_error: 'imageSize must be "16:9", "4:3", or "1:1".',
});

/**
 * HTTP JSON body for POST /api/generate — `prompt`, `providerMode`, and optional generation options (strict).
 * When `providerMode` is `live`, `providerId` is required and must be in {@link IMPLEMENTED_LIVE_PROVIDER_IDS}.
 * In `mock` mode `providerId` may be omitted (defaults to {@link MOCK_DEFAULT_PROVIDER_ID}) and is not used for generation.
 */
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
    providerMode: providerModeSchema,
    providerId: providerIdSchema.optional(),
    imageQuality: imageQualitySchema.optional(),
    imageTheme: imageThemeSchema.optional(),
    imageSize: imageSizeSchema.optional(),
  })
  .strict(
    'Only "prompt", "providerMode", "providerId", "imageQuality", "imageTheme", and "imageSize" are allowed in the request body. Remove any other properties.',
  )
  .superRefine((data, ctx) => {
    if (data.providerMode !== "live") {
      return;
    }
    if (data.providerId === undefined) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        path: ["providerId"],
        message: 'providerId is required when providerMode is "live".',
      });
      return;
    }
    if (!IMPLEMENTED_LIVE_PROVIDER_IDS.includes(data.providerId)) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        path: ["providerId"],
        message: `providerId must be one of ${IMPLEMENTED_LIVE_PROVIDER_IDS.map((id) => `"${id}"`).join(", ")} when providerMode is "live" in this build.`,
      });
    }
  })
  .transform((data) => ({
    prompt: data.prompt,
    providerMode: data.providerMode,
    providerId: data.providerId ?? MOCK_DEFAULT_PROVIDER_ID,
    imageQuality: normalizeImageQuality(data.imageQuality ?? DEFAULT_IMAGE_QUALITY),
    imageTheme: normalizeImageTheme(data.imageTheme ?? DEFAULT_IMAGE_THEME),
    imageSize: normalizeImageSize(data.imageSize ?? DEFAULT_IMAGE_SIZE),
  }));

/**
 * POST /api/generate body after a successful `validateGenerationRequest` call.
 * @typedef {z.infer<typeof generationRequestSchema>} ValidatedGenerationRequest
 */

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
    return 'Only "prompt", "providerMode", "providerId", "imageQuality", "imageTheme", and "imageSize" are allowed in the request body. Remove unsupported properties.';
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
      error: "Request body must be a JSON object with prompt and providerMode (providerId required for live mode).",
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
      error: "Request body must be a JSON object with prompt and providerMode (providerId required for live mode).",
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
