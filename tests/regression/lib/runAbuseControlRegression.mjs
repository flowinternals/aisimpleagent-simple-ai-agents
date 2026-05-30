import { GENERATION_PROMPT_MAX_LENGTH } from "../../../shared/generationLimits.js";
import {
  buildDemoSessionCookieHeader,
  extractSessionCookie,
  fetchJson,
  MOCK_GENERATE_BODY,
} from "./demoAuthRegressionClient.mjs";
import {
  evaluateBurstRateLimitPosture,
  isOversizedJsonBodyRejection,
  isOversizedPromptRejection,
  TRAINING_BUILD_RATE_LIMIT_ENABLED,
} from "./abuseControlAssertions.mjs";

/** Signed-in burst count for rate-limit posture check. */
const ABUSE_BURST_REQUEST_COUNT = 6;

/**
 * @typedef {{ pass: (message: string) => void, fail: (message: string) => void }} RegressionReporter
 */

/**
 * @param {string} apiBase
 * @param {RegressionReporter} reporter
 */
export async function regressionAbuseUnsignedGenerateBlocked(apiBase, reporter) {
  const result = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: MOCK_GENERATE_BODY,
  });
  if (result.response.status !== 401 || result.body?.code !== "UNAUTHORIZED") {
    reporter.fail(
      `unsigned POST /api/generate expected 401 UNAUTHORIZED, got ${result.response.status}`,
    );
    return;
  }
  reporter.pass("unsigned POST /api/generate blocked with 401 UNAUTHORIZED (abuse boundary)");
}

/**
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionAbuseOversizedPromptRejected(apiBase, cookieHeader, reporter) {
  const overPrompt = "a".repeat(GENERATION_PROMPT_MAX_LENGTH + 1);
  const result = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ prompt: overPrompt, providerMode: "mock" }),
  });
  if (!isOversizedPromptRejection(result.response.status, result.body?.code)) {
    reporter.fail(
      `oversized prompt expected 400 VALIDATION_ERROR, got ${result.response.status} code=${result.body?.code}`,
    );
    return;
  }
  reporter.pass(
    `oversized prompt (${GENERATION_PROMPT_MAX_LENGTH + 1} chars) rejected with 400 VALIDATION_ERROR`,
  );
}

/**
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionAbuseOversizedJsonBodyRejected(apiBase, cookieHeader, reporter) {
  const response = await fetch(`${apiBase}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: '{"prompt":"diagram","providerMode":"mock"' + " ".repeat(2_200_000),
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!isOversizedJsonBodyRejection(response.status, body?.code)) {
    reporter.fail(
      `oversized JSON body expected 413 or 400 VALIDATION_ERROR, got ${response.status} code=${body?.code}`,
    );
    return;
  }
  reporter.pass(
    `oversized JSON body (>2mb) rejected with HTTP ${response.status} before successful generate`,
  );
}

/**
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionAbuseBurstRateLimitPosture(apiBase, cookieHeader, reporter) {
  const statuses = [];
  for (let i = 0; i < ABUSE_BURST_REQUEST_COUNT; i++) {
    const burst = await fetchJson(apiBase, "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        prompt: `Abuse regression burst ${i}`,
        providerMode: "mock",
      }),
    });
    statuses.push(burst.response.status);
  }
  const evaluation = evaluateBurstRateLimitPosture(statuses, {
    rateLimitEnabled: TRAINING_BUILD_RATE_LIMIT_ENABLED,
  });
  if (!evaluation.ok) {
    reporter.fail(evaluation.summary);
    return;
  }
  reporter.pass(evaluation.summary);
}

/**
 * @param {string} apiBase
 * @param {string} demoUserId
 * @param {string} demoPassword
 * @param {RegressionReporter} reporter
 * @returns {Promise<string>} Cookie header for follow-up checks
 */
async function signInForAbuseRegression(apiBase, demoUserId, demoPassword, reporter) {
  const signIn = await fetchJson(apiBase, "/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: demoUserId, password: demoPassword }),
  });
  const sessionId = extractSessionCookie(signIn.setCookie);
  if (!signIn.response.ok || !sessionId) {
    reporter.fail(`demo sign-in for abuse regression failed with status ${signIn.response.status}`);
    return "";
  }
  reporter.pass(`demo sign-in accepted for user=${signIn.body?.user?.userId ?? demoUserId}`);
  return buildDemoSessionCookieHeader(sessionId);
}

/**
 * Run route-level abuse-control regression for POST /api/generate against a running API.
 * @param {{ apiBase?: string, demoUserId?: string, demoPassword?: string }} [options]
 * @returns {Promise<number>} exit code (0 pass, 1 fail)
 */
export async function runAbuseControlRegression(options = {}) {
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
    reporter.fail("DEMO_USER_ID and DEMO_PASSWORD must be set for abuse-control regression");
    return 1;
  }

  await regressionAbuseUnsignedGenerateBlocked(apiBase, reporter);

  const cookieHeader = await signInForAbuseRegression(apiBase, demoUserId, demoPassword, reporter);
  if (!cookieHeader) {
    return 1;
  }

  await regressionAbuseOversizedPromptRejected(apiBase, cookieHeader, reporter);
  await regressionAbuseOversizedJsonBodyRejected(apiBase, cookieHeader, reporter);
  await regressionAbuseBurstRateLimitPosture(apiBase, cookieHeader, reporter);

  return failed ? 1 : 0;
}
