import { GENERATION_PROMPT_MAX_LENGTH } from "../../../shared/generationLimits.js";
import {
  buildDemoSessionCookieHeader,
  extractSessionCookie,
  fetchJson,
} from "./demoAuthRegressionClient.mjs";

/**
 * @typedef {{ pass: (message: string) => void, fail: (message: string) => void }} RegressionReporter
 */

/**
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionValidationWrongContentType(apiBase, cookieHeader, reporter) {
  const result = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "text/plain", Cookie: cookieHeader },
    body: JSON.stringify({ prompt: "Create a network diagram", providerMode: "mock" }),
  });
  if (result.response.status !== 415 || result.body?.code !== "UNSUPPORTED_MEDIA_TYPE") {
    reporter.fail(`wrong Content-Type expected 415 UNSUPPORTED_MEDIA_TYPE, got ${result.response.status}`);
    return;
  }
  reporter.pass("415 UNSUPPORTED_MEDIA_TYPE for non-JSON Content-Type");
}

/**
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionValidationInvalidJson(apiBase, cookieHeader, reporter) {
  const response = await fetch(`${apiBase}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: "{not json",
  });
  const body = await response.json();
  if (response.status !== 400 || body?.code !== "INVALID_JSON") {
    reporter.fail(`invalid JSON expected 400 INVALID_JSON, got ${response.status}`);
    return;
  }
  reporter.pass("400 INVALID_JSON for malformed JSON body");
}

/**
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionValidationStrictBody(apiBase, cookieHeader, reporter) {
  const extraKeys = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      prompt: "Create a network diagram",
      providerMode: "mock",
      isAdmin: true,
    }),
  });
  if (extraKeys.response.status !== 400 || extraKeys.body?.code !== "VALIDATION_ERROR") {
    reporter.fail(`strict body expected 400 VALIDATION_ERROR, got ${extraKeys.response.status}`);
    return;
  }
  reporter.pass("400 VALIDATION_ERROR for strict-schema extra keys");
}

/**
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionValidationEmptyPrompt(apiBase, cookieHeader, reporter) {
  const empty = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ prompt: "   ", providerMode: "mock" }),
  });
  if (empty.response.status !== 400 || empty.body?.code !== "VALIDATION_ERROR") {
    reporter.fail(`empty prompt expected 400 VALIDATION_ERROR, got ${empty.response.status}`);
    return;
  }
  reporter.pass("400 VALIDATION_ERROR for empty/whitespace prompt");
}

/**
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionValidationOversizedPrompt(apiBase, cookieHeader, reporter) {
  const overPrompt = "a".repeat(GENERATION_PROMPT_MAX_LENGTH + 1);
  const over = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ prompt: overPrompt, providerMode: "mock" }),
  });
  if (over.response.status !== 400 || over.body?.code !== "VALIDATION_ERROR") {
    reporter.fail(`oversized prompt expected 400 VALIDATION_ERROR, got ${over.response.status}`);
    return;
  }
  reporter.pass(`400 VALIDATION_ERROR for prompt over ${GENERATION_PROMPT_MAX_LENGTH} chars`);
}

/**
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionValidationInvalidOptions(apiBase, cookieHeader, reporter) {
  const badQuality = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      prompt: "Create a network diagram",
      providerMode: "mock",
      imageQuality: "ultra",
    }),
  });
  if (badQuality.response.status !== 400 || badQuality.body?.code !== "VALIDATION_ERROR") {
    reporter.fail(`invalid imageQuality expected 400 VALIDATION_ERROR, got ${badQuality.response.status}`);
    return;
  }
  reporter.pass("400 VALIDATION_ERROR for invalid imageQuality");
}

/**
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionValidationValidMockContinues(apiBase, cookieHeader, reporter) {
  const valid = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ prompt: "Create a network diagram", providerMode: "mock" }),
  });
  if (!valid.response.ok || valid.body?.ok !== true || !valid.body.data?.imageData?.startsWith("data:image/")) {
    reporter.fail(`valid mock expected 200 with data:image/ payload, got ${valid.response.status}`);
    return;
  }
  reporter.pass("valid mock POST /api/generate returns data:image/ payload");
}

/**
 * Run route-level validation regression for POST /api/generate against a running API.
 * @param {{ apiBase?: string, demoUserId?: string, demoPassword?: string }} [options]
 * @returns {Promise<number>} exit code (0 pass, 1 fail)
 */
export async function runValidationRegression(options = {}) {
  const apiBase = (options.apiBase || process.env.VERIFY_API_BASE || "http://127.0.0.1:8787").replace(
    /\/$/,
    "",
  );
  const demoUserId = options.demoUserId ?? process.env.DEMO_USER_ID?.trim();
  const demoPassword = options.demoPassword ?? process.env.DEMO_PASSWORD;

  let failed = false;
  const reporter = {
    pass(message) {
      console.log(`OK: ${message}`);
    },
    fail(message) {
      console.error(`FAIL: ${message}`);
      failed = true;
    },
  };

  console.log(`API base: ${apiBase}`);

  if (!demoUserId || demoPassword === undefined || demoPassword === "") {
    reporter.fail("DEMO_USER_ID and DEMO_PASSWORD must be set for validation regression");
    return 1;
  }

  const signIn = await fetchJson(apiBase, "/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: demoUserId, password: demoPassword }),
  });
  const sessionId = extractSessionCookie(signIn.setCookie);
  if (!signIn.response.ok || !sessionId) {
    reporter.fail(`demo sign-in for validation regression failed with status ${signIn.response.status}`);
    return 1;
  }
  reporter.pass(`demo sign-in accepted for user=${signIn.body?.user?.userId ?? demoUserId}`);

  const cookieHeader = buildDemoSessionCookieHeader(sessionId);

  await regressionValidationWrongContentType(apiBase, cookieHeader, reporter);
  await regressionValidationInvalidJson(apiBase, cookieHeader, reporter);
  await regressionValidationStrictBody(apiBase, cookieHeader, reporter);
  await regressionValidationEmptyPrompt(apiBase, cookieHeader, reporter);
  await regressionValidationOversizedPrompt(apiBase, cookieHeader, reporter);
  await regressionValidationInvalidOptions(apiBase, cookieHeader, reporter);
  await regressionValidationValidMockContinues(apiBase, cookieHeader, reporter);

  return failed ? 1 : 0;
}
