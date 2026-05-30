import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildOpenAiErrorLogSummary } from "../../../shared/openaiProviderDiagnostics.js";
import { buildGoogleErrorLogPayload, classifyGoogleApiError, getGoogleRuntimeSnapshot, parseGoogleApiError } from "../../../shared/googleProviderDiagnostics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../../..");

/** Patterns that must not appear in client-facing API error JSON bodies. */
const FORBIDDEN_CLIENT_SUBSTRINGS = [
  "sk-proj-",
  "sk-",
  "AIzaSy",
  "Bearer ",
  "OPENAI_API_KEY",
  "GOOGLE_API_KEY",
  "DEMO_PASSWORD",
  "stack trace",
  "at Object.",
  "ECONNREFUSED",
  "vendor-trace",
];

/**
 * @param {unknown} body
 * @param {number} status
 * @returns {{ ok: boolean, summary: string }}
 */
export function evaluateClientErrorEnvelopeSafe(body, status) {
  if (status >= 500) {
    const text = typeof body?.error === "string" ? body.error : JSON.stringify(body ?? {});
    if (/Exception|Error:|\.js:\d+/.test(text)) {
      return { ok: false, summary: "500 response appears to expose internal exception detail" };
    }
  }
  const serialized = JSON.stringify(body ?? {});
  for (const needle of FORBIDDEN_CLIENT_SUBSTRINGS) {
    if (serialized.includes(needle)) {
      return { ok: false, summary: `client body contains forbidden substring: ${needle}` };
    }
  }
  if (body && typeof body === "object" && "diagnostics" in body) {
    return { ok: false, summary: "client body must not include server diagnostics field" };
  }
  return { ok: true, summary: `client error envelope safe for HTTP ${status}` };
}

/**
 * @param {Record<string, unknown>} summary
 * @param {unknown} vendorJson
 * @returns {{ ok: boolean, summary: string }}
 */
export function evaluateOpenAiLogSummarySafe(summary, vendorJson) {
  const serialized = JSON.stringify(summary);
  if (serialized.includes("b64_json")) {
    return { ok: false, summary: "OpenAI log summary includes b64_json" };
  }
  const vendorText = JSON.stringify(vendorJson ?? {});
  if (vendorText.length > 300 && serialized.includes(vendorText.slice(0, 120))) {
    return { ok: false, summary: "OpenAI log summary echoes a large slice of vendor JSON" };
  }
  if (serialized.includes("sk-proj-") || serialized.includes("AIzaSy")) {
    return { ok: false, summary: "OpenAI log summary includes secret-like material" };
  }
  return { ok: true, summary: "OpenAI log summary omits full vendor body" };
}

/**
 * @returns {{ ok: boolean, summary: string }}
 */
export function evaluateOpenAiLogSummaryFixture() {
  const vendorJson = {
    error: { message: "Billing hard limit", type: "billing" },
    data: [{ b64_json: "x".repeat(8000) }],
  };
  const summary = buildOpenAiErrorLogSummary(402, vendorJson);
  return evaluateOpenAiLogSummarySafe(summary, vendorJson);
}

/**
 * @returns {{ ok: boolean, summary: string }}
 */
export function evaluateGoogleLogPayloadFixture() {
  const runtime = getGoogleRuntimeSnapshot({
    GOOGLE_API_KEY: "AIzaSySecretKeyMaterial",
    GOOGLE_IMAGE_MODEL: "gemini-2.5-flash-image",
  });
  const details = parseGoogleApiError(
    { error: { message: "Quota exceeded", status: "RESOURCE_EXHAUSTED" } },
    429,
  );
  const classification = classifyGoogleApiError(429, details);
  const payload = buildGoogleErrorLogPayload(runtime, 429, classification);
  const serialized = JSON.stringify(payload);
  if (serialized.includes("AIzaSySecret")) {
    return { ok: false, summary: "Google log payload includes API key material" };
  }
  return { ok: true, summary: "Google log payload omits API key material" };
}

/**
 * @param {string} relativePath
 * @param {RegExp[]} forbiddenPatterns
 * @returns {{ ok: boolean, summary: string }}
 */
export function evaluateSourceAvoidsPatterns(relativePath, forbiddenPatterns) {
  const absolute = path.join(repoRoot, relativePath);
  const source = readFileSync(absolute, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      return { ok: false, summary: `${relativePath} matches forbidden pattern ${pattern}` };
    }
  }
  return { ok: true, summary: `${relativePath} avoids verbose vendor JSON logging` };
}

/**
 * @returns {{ ok: boolean, summary: string }}
 */
export function evaluateProviderSourcesUseSafeLogging() {
  const openAi = evaluateSourceAvoidsPatterns("server/providers/live/openaiLiveProvider.js", [
    /console\.(log|info|warn|error)\([^)]*\bjson\b[^)]*\)/,
    /detail\s*\|\|\s*json/,
  ]);
  if (!openAi.ok) {
    return openAi;
  }
  const usesSummary = readFileSync(
    path.join(repoRoot, "server/providers/live/openaiLiveProvider.js"),
    "utf8",
  ).includes("buildOpenAiErrorLogSummary");
  if (!usesSummary) {
    return { ok: false, summary: "openaiLiveProvider.js must use buildOpenAiErrorLogSummary" };
  }
  return { ok: true, summary: "provider sources use safe logging helpers" };
}

/**
 * @returns {{ ok: boolean, summary: string }}
 */
export function evaluateServerRoutesUseTrainingLog() {
  const files = [
    "server/index.js",
    "server/routes/generationRoutes.js",
    "server/routes/authRoutes.js",
    "server/middleware/requireDemoSession.js",
    "server/providers/providerAdapter.js",
  ];
  for (const relativePath of files) {
    const source = readFileSync(path.join(repoRoot, relativePath), "utf8");
    if (/console\.(log|info|warn|error)\(/.test(source)) {
      return {
        ok: false,
        summary: `${relativePath} must use trainingLog helpers instead of raw console.*`,
      };
    }
    if (!source.includes("trainingLog.js")) {
      return { ok: false, summary: `${relativePath} must import trainingLog.js` };
    }
  }
  return { ok: true, summary: "server routes use trainingLog helpers" };
}
