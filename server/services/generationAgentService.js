import { generateWithProvider } from "../providers/providerAdapter.js";

/**
 * Assembles the full provider-facing instruction string.
 * The validated `userPrompt` is only the customer brief; this function adds app
 * role, interpretation rules, and delimiters so models (or mocks) see one coherent task.
 * @param {string} userPrompt validated `prompt` from the API body
 * @param {{ imageTheme: "light"|"dark", imageSize: "16:9"|"4:3"|"1:1" }} options
 */
function buildProviderPrompt(userPrompt, { imageTheme, imageSize }) {
  const themeRequirement =
    imageTheme === "dark"
      ? "- Diagram tone: dark-theme image — dark background with light text, lines, and fills."
      : "- Diagram tone: light-theme image — light or white background with dark text, lines, and fills.";

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
    themeRequirement,
    `- Aspect ratio: ${imageSize}. Compose the full canvas for this ratio.`,
  ].join("\n");

  const userSpecification = ["USER SPECIFICATION", "---", userPrompt, "---"].join("\n");

  return [appAndTask, "", userSpecification].join("\n");
}

/**
 * Stable `data` object for a successful `POST /api/generate` response.
 * Only fields the UI needs are included; unknown adapter keys are never forwarded.
 *
 * From the adapter: `imageData`, `mimeType`, `fileName`, `providerMode`, `generatedAt`,
 * and optionally `modelLabel` / `qualityLabel` when a live backend supplies them.
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
  if (providerResult.modelLabel) {
    data.modelLabel = providerResult.modelLabel;
  }
  if (providerResult.qualityLabel) {
    data.qualityLabel = providerResult.qualityLabel;
  }
  if (providerResult.themeLabel) {
    data.themeLabel = providerResult.themeLabel;
  }
  if (providerResult.sizeLabel) {
    data.sizeLabel = providerResult.sizeLabel;
  }
  return data;
}

/**
 * Agent entrypoint after request body validation: builds the provider prompt, calls
 * `generateWithProvider` with that instruction only, maps the result to the public API shape,
 * and times the call.
 * @param {import("../validation/generationRequest.js").ValidatedGenerationRequest} validatedRequest `validation.data` from `validateGenerationRequest`
 */
export async function runAgentGeneration(validatedRequest) {
  const { prompt, providerMode, providerId, imageQuality, imageTheme, imageSize } = validatedRequest;
  const startedAt = Date.now();
  const providerPrompt = buildProviderPrompt(prompt, { imageTheme, imageSize });
  const providerResult = await generateWithProvider({
    providerPrompt,
    providerMode,
    providerId,
    imageQuality,
    imageTheme,
    imageSize,
  });
  const generationTimeMs = Date.now() - startedAt;

  const data = buildGenerationApiData(providerResult, generationTimeMs);
  if (!data.themeLabel) {
    data.themeLabel = imageTheme;
  }
  if (!data.sizeLabel) {
    data.sizeLabel = imageSize;
  }
  return data;
}
