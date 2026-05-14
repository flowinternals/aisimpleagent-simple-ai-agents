import { generateWithProvider } from "../providers/providerAdapter.js";

/**
 * @param {unknown} value
 * @returns {value is { prompt: string }}
 */
function isValidatedGenerationBody(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prompt = /** @type {{ prompt?: unknown }} */ (value).prompt;
  return typeof prompt === "string" && prompt.length > 0;
}

/**
 * Assembles the full provider-facing instruction string.
 * The validated `userPrompt` is only the customer brief; this function adds app
 * role, interpretation rules, and delimiters so models (or mocks) see one coherent task.
 * @param {string} userPrompt validated `prompt` from the API body
 */
function buildProviderPrompt(userPrompt) {
  const appAndTask = [
    "ROLE",
    "Technical Diagram Generator: turn a customer brief into one technical diagram image (preview + download in a web app).",
    "",
    "HOW TO USE THE NEXT SECTION",
    "The USER SPECIFICATION block is raw customer text. It is input to interpret—not the complete instruction set. Apply this role and the requirements when fulfilling it.",
    "",
    "REQUIREMENTS",
    "- One primary diagram unless the user clearly asks for more than one.",
    "- Engineering-style clarity: main elements, relationships or flows, short readable labels.",
    "- Reflect named systems, tiers, products, or technologies when the user names them.",
    "- If the brief is thin or ambiguous, pick one sensible interpretation and keep the layout uncluttered.",
  ].join("\n");

  const userSpecification = ["USER SPECIFICATION", "---", userPrompt, "---"].join("\n");

  return [appAndTask, "", userSpecification].join("\n");
}

/**
 * Stable `data` object for a successful `POST /api/generate` response.
 * Only fields the UI needs are included; unknown adapter keys are never forwarded.
 *
 * From the adapter: `imageData`, `mimeType`, `fileName`, `providerMode`, `generatedAt`,
 * and optionally `modelLabel` when a live backend supplies it.
 * From this service: `generationTimeMs` (wall-clock time for the adapter call).
 *
 * @param {import("../contracts/generationAdapterResult.js").NormalizedGenerationResult} providerResult
 * @param {number} generationTimeMs
 */
function buildGenerationApiData(providerResult, generationTimeMs) {
  const data = {
    imageData: providerResult.imageData,
    mimeType: providerResult.mimeType,
    fileName: providerResult.fileName,
    providerMode: providerResult.providerMode,
    generatedAt: providerResult.generatedAt,
    generationTimeMs,
  };
  if (typeof providerResult.modelLabel === "string" && providerResult.modelLabel.trim()) {
    data.modelLabel = providerResult.modelLabel.trim();
  }
  return data;
}

/**
 * Agent entrypoint after request body validation: builds the provider prompt, calls
 * `generateWithProvider`, maps the result to the public API shape, and times the call.
 * @param {unknown} validatedRequest use `validation.data` from `validateGenerationRequest` only
 */
export async function runAgentGeneration(validatedRequest) {
  if (!isValidatedGenerationBody(validatedRequest)) {
    throw new Error(
      "runAgentGeneration expects validation.data from validateGenerationRequest (non-empty string prompt).",
    );
  }
  const { prompt } = validatedRequest;
  const startedAt = Date.now();
  const providerPrompt = buildProviderPrompt(prompt);
  const providerResult = await generateWithProvider({ prompt, providerPrompt });
  const generationTimeMs = Date.now() - startedAt;

  return buildGenerationApiData(providerResult, generationTimeMs);
}
