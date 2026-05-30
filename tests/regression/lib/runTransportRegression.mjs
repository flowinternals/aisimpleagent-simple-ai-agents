import { fetchHeaders } from "./transportRegressionClient.mjs";
import {
  DEFAULT_TRAINING_CORS_ORIGIN,
  evaluateDemoSessionSetCookieFlags,
  evaluateDisallowedOriginCorsRejection,
  evaluateTrainingBuildTransportHeaders,
} from "./transportSecurityAssertions.mjs";

/**
 * @typedef {{ pass: (message: string) => void, fail: (message: string) => void }} RegressionReporter
 */

/**
 * @param {string} apiBase
 * @param {string} configuredCorsOrigin
 * @param {RegressionReporter} reporter
 */
export async function regressionAllowedOriginCorsHeaders(apiBase, configuredCorsOrigin, reporter) {
  const { response, headers } = await fetchHeaders(apiBase, "/api/health", {
    headers: { Origin: configuredCorsOrigin },
  });
  if (response.status !== 200) {
    reporter.fail(`allowed-origin GET /api/health expected 200, got ${response.status}`);
    return;
  }
  const evaluation = evaluateTrainingBuildTransportHeaders(headers, {
    requestOrigin: configuredCorsOrigin,
    configuredCorsOrigin,
  });
  if (!evaluation.ok) {
    reporter.fail(`allowed-origin CORS/transport headers: ${evaluation.issues.join("; ")}`);
    return;
  }
  reporter.pass("allowed Origin receives configured CORS and training-build transport headers");
}

/**
 * @param {string} apiBase
 * @param {string} configuredCorsOrigin
 * @param {RegressionReporter} reporter
 */
export async function regressionDisallowedOriginNotAccepted(
  apiBase,
  configuredCorsOrigin,
  reporter,
) {
  const disallowedOrigin = "http://evil.example";
  const { response, headers } = await fetchHeaders(apiBase, "/api/health", {
    headers: { Origin: disallowedOrigin },
  });
  if (response.status !== 200) {
    reporter.fail(`disallowed-origin GET /api/health expected 200, got ${response.status}`);
    return;
  }
  const evaluation = evaluateDisallowedOriginCorsRejection(headers, {
    requestOrigin: disallowedOrigin,
    configuredCorsOrigin,
  });
  if (!evaluation.ok) {
    reporter.fail(`disallowed-origin CORS rejection: ${evaluation.issues.join("; ")}`);
    return;
  }
  reporter.pass("disallowed Origin is not accepted by CORS (fixed configured ACAO only)");
}

/**
 * @param {string} apiBase
 * @param {RegressionReporter} reporter
 */
export async function regressionProductionEdgeHeadersAbsent(apiBase, reporter) {
  const { response, headers } = await fetchHeaders(apiBase, "/api/health");
  if (response.status !== 200) {
    reporter.fail(`GET /api/health expected 200, got ${response.status}`);
    return;
  }
  const evaluation = evaluateTrainingBuildTransportHeaders(headers);
  if (!evaluation.ok) {
    reporter.fail(`production edge headers must stay absent: ${evaluation.issues.join("; ")}`);
    return;
  }
  reporter.pass("production edge headers (HSTS/CSP/X-Frame-Options) remain absent on localhost API");
}

/**
 * @param {string} apiBase
 * @param {string} demoUserId
 * @param {string} demoPassword
 * @param {RegressionReporter} reporter
 */
export async function regressionDemoSessionCookieTransportFlags(
  apiBase,
  demoUserId,
  demoPassword,
  reporter,
) {
  const { response, setCookie } = await fetchHeaders(apiBase, "/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: demoUserId, password: demoPassword }),
  });
  if (response.status !== 200) {
    reporter.fail(`demo sign-in for cookie transport check expected 200, got ${response.status}`);
    return;
  }
  const evaluation = evaluateDemoSessionSetCookieFlags(setCookie);
  if (!evaluation.ok) {
    reporter.fail(`demo session Set-Cookie transport flags: ${evaluation.issues.join("; ")}`);
    return;
  }
  reporter.pass("demo session Set-Cookie uses HttpOnly SameSite=Lax without Secure on HTTP localhost");
}

/**
 * Run browser-and-transport regression against a running API.
 * @param {{ apiBase?: string, configuredCorsOrigin?: string, demoUserId?: string, demoPassword?: string }} [options]
 * @returns {Promise<number>} exit code (0 pass, 1 fail)
 */
export async function runTransportRegression(options = {}) {
  const apiBase = (options.apiBase || process.env.VERIFY_API_BASE || "http://127.0.0.1:8787").replace(
    /\/$/,
    "",
  );
  const configuredCorsOrigin =
    options.configuredCorsOrigin ??
    process.env.VERIFY_CORS_ORIGIN?.trim() ??
    DEFAULT_TRAINING_CORS_ORIGIN;
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
  console.log(`Configured CORS origin: ${configuredCorsOrigin}`);

  if (!demoUserId || demoPassword === undefined || demoPassword === "") {
    reporter.fail("DEMO_USER_ID and DEMO_PASSWORD must be set for transport regression");
    return 1;
  }

  await regressionAllowedOriginCorsHeaders(apiBase, configuredCorsOrigin, reporter);
  await regressionDisallowedOriginNotAccepted(apiBase, configuredCorsOrigin, reporter);
  await regressionProductionEdgeHeadersAbsent(apiBase, reporter);
  await regressionDemoSessionCookieTransportFlags(apiBase, demoUserId, demoPassword, reporter);

  return failed ? 1 : 0;
}
