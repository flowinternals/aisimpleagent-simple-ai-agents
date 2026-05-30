import {
  buildDemoSessionCookieHeader,
  extractSessionCookie,
  fetchJson,
  MOCK_GENERATE_BODY,
} from "./demoAuthRegressionClient.mjs";

/**
 * @typedef {{ pass: (message: string) => void, fail: (message: string) => void }} RegressionReporter
 */

/**
 * Signed-out POST /api/generate must be rejected before generation runs.
 * @param {string} apiBase
 * @param {RegressionReporter} reporter
 */
export async function regressionSignedOutGenerateUnauthorized(apiBase, reporter) {
  const result = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: MOCK_GENERATE_BODY,
  });
  if (result.response.status !== 401 || result.body?.code !== "UNAUTHORIZED") {
    reporter.fail(
      `signed-out POST /api/generate expected 401 UNAUTHORIZED, got ${result.response.status}`,
    );
    return;
  }
  reporter.pass("signed-out POST /api/generate returns 401 UNAUTHORIZED");
}

/**
 * Unknown or forged session id must not authorize generation.
 * @param {string} apiBase
 * @param {RegressionReporter} reporter
 */
export async function regressionInvalidSessionGenerateUnauthorized(apiBase, reporter) {
  const forged = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "tdg_demo_session=forged-not-in-store",
    },
    body: MOCK_GENERATE_BODY,
  });
  if (forged.response.status !== 401 || forged.body?.code !== "UNAUTHORIZED") {
    reporter.fail(
      `forged session POST /api/generate expected 401 UNAUTHORIZED, got ${forged.response.status}`,
    );
    return;
  }
  reporter.pass("invalid session cookie on POST /api/generate returns 401 UNAUTHORIZED");
}

/**
 * After sign-out, a stale cookie must not authorize generation.
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionClearedSessionGenerateUnauthorized(
  apiBase,
  cookieHeader,
  reporter,
) {
  if (!cookieHeader) {
    reporter.fail("cleared-session check skipped because sign-in did not produce a session cookie");
    return;
  }

  const signOut = await fetchJson(apiBase, "/api/auth/sign-out", {
    method: "POST",
    headers: { Cookie: cookieHeader },
  });
  if (!signOut.response.ok) {
    reporter.fail(`sign-out before cleared-session check failed with status ${signOut.response.status}`);
    return;
  }

  const afterSignOut = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: MOCK_GENERATE_BODY,
  });
  if (afterSignOut.response.status !== 401 || afterSignOut.body?.code !== "UNAUTHORIZED") {
    reporter.fail(
      `cleared session POST /api/generate expected 401 UNAUTHORIZED, got ${afterSignOut.response.status}`,
    );
    return;
  }
  reporter.pass("cleared demo session blocks POST /api/generate with 401 UNAUTHORIZED");
}

/**
 * Valid demo session must allow POST /api/generate to continue (mock path).
 * @param {string} apiBase
 * @param {string} demoUserId
 * @param {string} demoPassword
 * @param {RegressionReporter} reporter
 * @returns {Promise<string>} Cookie header for follow-up checks; empty when sign-in failed
 */
export async function regressionSignedInGenerateContinues(
  apiBase,
  demoUserId,
  demoPassword,
  reporter,
) {
  const signIn = await fetchJson(apiBase, "/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: demoUserId, password: demoPassword }),
  });
  const sessionId = extractSessionCookie(signIn.setCookie);
  if (!signIn.response.ok || !sessionId) {
    reporter.fail(`demo sign-in for authorization regression failed with status ${signIn.response.status}`);
    return "";
  }

  const cookieHeader = buildDemoSessionCookieHeader(sessionId);
  const generate = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: MOCK_GENERATE_BODY,
  });
  if (!generate.response.ok || generate.body?.ok !== true) {
    reporter.fail(
      `signed-in POST /api/generate expected 200 ok:true, got ${generate.response.status}`,
    );
    return "";
  }
  reporter.pass("signed-in demo session allows POST /api/generate to continue");
  return cookieHeader;
}

/**
 * Browser-supplied permission-like fields must not be trusted on the generate body.
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionGenerateBodyPermissionClaimsRejected(
  apiBase,
  cookieHeader,
  reporter,
) {
  if (!cookieHeader) {
    reporter.fail("body-claims check skipped because sign-in did not produce a session cookie");
    return;
  }

  const withClaims = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      prompt: "Create a network diagram",
      providerMode: "mock",
      userId: "attacker",
      owner: "attacker",
      role: "admin",
      isAdmin: true,
    }),
  });
  if (withClaims.response.status !== 400 || withClaims.body?.code !== "VALIDATION_ERROR") {
    reporter.fail(
      `POST /api/generate with permission-like body fields expected 400 VALIDATION_ERROR, got ${withClaims.response.status}`,
    );
    return;
  }
  reporter.pass(
    "browser permission-like generate body fields rejected with 400 VALIDATION_ERROR",
  );
}

/**
 * Run route-level authorization regression for POST /api/generate against a running API.
 * @param {{ apiBase?: string, demoUserId?: string, demoPassword?: string }} [options]
 * @returns {Promise<number>} exit code (0 pass, 1 fail)
 */
export async function runAuthorizationRegression(options = {}) {
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
    reporter.fail("DEMO_USER_ID and DEMO_PASSWORD must be set for authorization regression");
    return 1;
  }

  await regressionSignedOutGenerateUnauthorized(apiBase, reporter);
  await regressionInvalidSessionGenerateUnauthorized(apiBase, reporter);
  const cookieHeader = await regressionSignedInGenerateContinues(
    apiBase,
    demoUserId,
    demoPassword,
    reporter,
  );
  await regressionGenerateBodyPermissionClaimsRejected(apiBase, cookieHeader, reporter);
  await regressionClearedSessionGenerateUnauthorized(apiBase, cookieHeader, reporter);

  return failed ? 1 : 0;
}
