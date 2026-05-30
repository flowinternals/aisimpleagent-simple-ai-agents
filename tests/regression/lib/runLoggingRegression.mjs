import {
  buildDemoSessionCookieHeader,
  extractSessionCookie,
  fetchJson,
} from "./demoAuthRegressionClient.mjs";
import {
  evaluateClientErrorEnvelopeSafe,
  evaluateGoogleLogPayloadFixture,
  evaluateOpenAiLogSummaryFixture,
  evaluateProviderSourcesUseSafeLogging,
  evaluateServerRoutesUseTrainingLog,
} from "./loggingAssertions.mjs";

/**
 * @typedef {{ pass: (message: string) => void, fail: (message: string) => void }} RegressionReporter
 */

/**
 * @param {RegressionReporter} reporter
 */
function runPureLoggingAssertions(reporter) {
  const checks = [
    evaluateOpenAiLogSummaryFixture,
    evaluateGoogleLogPayloadFixture,
    evaluateProviderSourcesUseSafeLogging,
    evaluateServerRoutesUseTrainingLog,
  ];
  for (const check of checks) {
    const result = check();
    if (result.ok) {
      reporter.pass(result.summary);
    } else {
      reporter.fail(result.summary);
    }
  }
}

/**
 * @param {string} apiBase
 * @param {RegressionReporter} reporter
 */
export async function regressionLoggingUnsignedGenerateSafe(apiBase, reporter) {
  const result = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Create a network diagram", providerMode: "mock" }),
  });
  if (result.response.status !== 401 || result.body?.code !== "UNAUTHORIZED") {
    reporter.fail(`unsigned generate expected 401 UNAUTHORIZED, got ${result.response.status}`);
    return;
  }
  const safe = evaluateClientErrorEnvelopeSafe(result.body, result.response.status);
  if (!safe.ok) {
    reporter.fail(safe.summary);
    return;
  }
  reporter.pass(safe.summary);
}

/**
 * @param {string} apiBase
 * @param {string} demoUserId
 * @param {RegressionReporter} reporter
 */
export async function regressionLoggingInvalidSignInSafe(apiBase, demoUserId, reporter) {
  const result = await fetchJson(apiBase, "/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: demoUserId, password: "definitely-wrong-password" }),
  });
  if (result.response.status !== 401 || result.body?.code !== "INVALID_CREDENTIALS") {
    reporter.fail(`invalid sign-in expected 401 INVALID_CREDENTIALS, got ${result.response.status}`);
    return;
  }
  const safe = evaluateClientErrorEnvelopeSafe(result.body, result.response.status);
  if (!safe.ok) {
    reporter.fail(safe.summary);
    return;
  }
  const serialized = JSON.stringify(result.body);
  if (serialized.includes("definitely-wrong-password")) {
    reporter.fail("sign-in error echoed submitted password");
    return;
  }
  reporter.pass("invalid sign-in returns safe client envelope without password echo");
}

/**
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionLoggingValidationErrorSafe(apiBase, cookieHeader, reporter) {
  const result = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ prompt: "!!!", providerMode: "mock" }),
  });
  if (result.response.status !== 400 || result.body?.code !== "VALIDATION_ERROR") {
    reporter.fail(`validation expected 400 VALIDATION_ERROR, got ${result.response.status}`);
    return;
  }
  const safe = evaluateClientErrorEnvelopeSafe(result.body, result.response.status);
  if (!safe.ok) {
    reporter.fail(safe.summary);
    return;
  }
  reporter.pass("validation error returns safe client envelope");
}

/**
 * Cloudflare live is rejected at validation in this build (not in IMPLEMENTED_LIVE_PROVIDER_IDS).
 * Adapter LIVE_PROVIDER_NOT_IMPLEMENTED mapping is covered by unit tests in providerAdapterError.test.js.
 *
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionLoggingUnimplementedLiveProviderValidationSafe(
  apiBase,
  cookieHeader,
  reporter,
) {
  const result = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      prompt: "Create a network diagram",
      providerMode: "live",
      providerId: "cloudflare",
    }),
  });
  if (result.response.status !== 400 || result.body?.code !== "VALIDATION_ERROR") {
    reporter.fail(
      `live cloudflare expected 400 VALIDATION_ERROR before adapter, got ${result.response.status} ${result.body?.code ?? ""}`,
    );
    return;
  }
  const safe = evaluateClientErrorEnvelopeSafe(result.body, result.response.status);
  if (!safe.ok) {
    reporter.fail(safe.summary);
    return;
  }
  reporter.pass("unimplemented live providerId rejected at validation with safe client envelope");
}

/**
 * @param {string} apiBase
 * @param {RegressionReporter} reporter
 */
export async function regressionLoggingHealthOmitsSecrets(apiBase, reporter) {
  const result = await fetchJson(apiBase, "/api/health");
  if (!result.response.ok) {
    reporter.fail(`GET /api/health expected 200, got ${result.response.status}`);
    return;
  }
  const serialized = JSON.stringify(result.body ?? {});
  if (/sk-[a-zA-Z0-9]{10,}/.test(serialized) || serialized.includes("AIzaSy")) {
    reporter.fail("health JSON must not include API key material");
    return;
  }
  reporter.pass("GET /api/health omits API key material");
}

/**
 * Run logging + error-disclosure regression (pure helpers + running API).
 * @param {{ apiBase?: string, demoUserId?: string, demoPassword?: string }} [options]
 * @returns {Promise<number>} exit code (0 pass, 1 fail)
 */
export async function runLoggingRegression(options = {}) {
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

  console.log("Logging regression (unit helpers + route-level client envelopes)\n");
  console.log(`API base: ${apiBase}`);

  runPureLoggingAssertions(reporter);

  try {
    const healthProbe = await fetch(`${apiBase}/api/health`);
    if (!healthProbe.ok) {
      reporter.fail(
        `API not reachable at ${apiBase} (start npm run dev:api or set VERIFY_API_BASE)`,
      );
      return failed ? 1 : 1;
    }
  } catch {
    reporter.fail(`API not reachable at ${apiBase} (start npm run dev:api or set VERIFY_API_BASE)`);
    return 1;
  }

  await regressionLoggingHealthOmitsSecrets(apiBase, reporter);
  await regressionLoggingUnsignedGenerateSafe(apiBase, reporter);

  if (!demoUserId || demoPassword === undefined || demoPassword === "") {
    reporter.fail("DEMO_USER_ID and DEMO_PASSWORD must be set for signed-in logging regression checks");
    return 1;
  }

  await regressionLoggingInvalidSignInSafe(apiBase, demoUserId, reporter);

  const signIn = await fetchJson(apiBase, "/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: demoUserId, password: demoPassword }),
  });
  const sessionId = extractSessionCookie(signIn.setCookie);
  if (!signIn.response.ok || !sessionId) {
    reporter.fail(`demo sign-in for logging regression failed with status ${signIn.response.status}`);
    return 1;
  }
  const cookieHeader = buildDemoSessionCookieHeader(sessionId);

  await regressionLoggingValidationErrorSafe(apiBase, cookieHeader, reporter);
  await regressionLoggingUnimplementedLiveProviderValidationSafe(apiBase, cookieHeader, reporter);

  console.log(failed ? "\nLogging regression: FAILED" : "\nLogging regression: PASSED");
  return failed ? 1 : 0;
}
