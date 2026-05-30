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
 * Wrong demo credentials must be rejected at sign-in.
 * @param {string} apiBase
 * @param {string} demoUserId
 * @param {RegressionReporter} reporter
 */
export async function regressionWrongCredentialsRejected(apiBase, demoUserId, reporter) {
  const wrongSignIn = await fetchJson(apiBase, "/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: demoUserId, password: "wrong-password" }),
  });
  if (wrongSignIn.response.status !== 401 || wrongSignIn.body?.code !== "INVALID_CREDENTIALS") {
    reporter.fail(
      `wrong demo credentials expected 401 INVALID_CREDENTIALS, got ${wrongSignIn.response.status}`,
    );
    return;
  }
  reporter.pass("wrong demo credentials rejected at sign-in");
}

/**
 * Correct demo credentials must create a usable signed-in session.
 * @param {string} apiBase
 * @param {string} demoUserId
 * @param {string} demoPassword
 * @param {RegressionReporter} reporter
 * @returns {Promise<string>} Cookie header for follow-up checks; empty when sign-in failed
 */
export async function regressionCorrectSignInCreatesSession(
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
  if (!signIn.response.ok || signIn.body?.user?.userId !== demoUserId || !sessionId) {
    reporter.fail(`correct sign-in failed with status ${signIn.response.status}`);
    return "";
  }

  const cookieHeader = buildDemoSessionCookieHeader(sessionId);
  const session = await fetchJson(apiBase, "/api/auth/session", {
    headers: { Cookie: cookieHeader },
  });
  if (!session.response.ok || session.body?.user?.userId !== demoUserId) {
    reporter.fail("GET /api/auth/session did not return the signed-in demo user");
    return "";
  }

  const signedGenerate = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: MOCK_GENERATE_BODY,
  });
  if (!signedGenerate.response.ok || signedGenerate.body?.ok !== true) {
    reporter.fail(`signed-in POST /api/generate returned ${signedGenerate.response.status}`);
    return "";
  }

  reporter.pass("correct demo credentials create a usable signed-in session");
  return cookieHeader;
}

/**
 * Signed-out access to protected routes must be rejected.
 * @param {string} apiBase
 * @param {RegressionReporter} reporter
 */
export async function regressionSignedOutProtectedRouteRejected(apiBase, reporter) {
  const unsignedGenerate = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: MOCK_GENERATE_BODY,
  });
  if (unsignedGenerate.response.status !== 401 || unsignedGenerate.body?.code !== "UNAUTHORIZED") {
    reporter.fail(
      `unsigned POST /api/generate expected 401 UNAUTHORIZED, got ${unsignedGenerate.response.status}`,
    );
    return;
  }
  reporter.pass("signed-out POST /api/generate rejected with 401");
}

/**
 * Sign-out must clear the demo session and block protected access.
 * @param {string} apiBase
 * @param {string} cookieHeader
 * @param {RegressionReporter} reporter
 */
export async function regressionSignOutClearsSession(apiBase, cookieHeader, reporter) {
  if (!cookieHeader) {
    reporter.fail("sign-out regression skipped because sign-in did not produce a session cookie");
    return;
  }

  const signOut = await fetchJson(apiBase, "/api/auth/sign-out", {
    method: "POST",
    headers: { Cookie: cookieHeader },
  });
  if (!signOut.response.ok) {
    reporter.fail(`sign-out failed with status ${signOut.response.status}`);
    return;
  }

  const sessionAfter = await fetchJson(apiBase, "/api/auth/session", {
    headers: { Cookie: cookieHeader },
  });
  if (sessionAfter.response.status !== 401) {
    reporter.fail(
      `GET /api/auth/session after sign-out expected 401, got ${sessionAfter.response.status}`,
    );
    return;
  }

  const generateAfter = await fetchJson(apiBase, "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: MOCK_GENERATE_BODY,
  });
  if (generateAfter.response.status !== 401) {
    reporter.fail(
      `POST /api/generate after sign-out expected 401, got ${generateAfter.response.status}`,
    );
    return;
  }

  reporter.pass("sign-out clears demo session and blocks protected access");
}

/**
 * Run the full demo sign-in regression gate against a running API.
 * @param {{ apiBase?: string, demoUserId?: string, demoPassword?: string }} [options]
 * @returns {Promise<number>} exit code (0 pass, 1 fail)
 */
export async function runDemoAuthRegression(options = {}) {
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
    reporter.fail("DEMO_USER_ID and DEMO_PASSWORD must be set for demo auth regression");
    return 1;
  }

  await regressionSignedOutProtectedRouteRejected(apiBase, reporter);
  await regressionWrongCredentialsRejected(apiBase, demoUserId, reporter);
  const cookieHeader = await regressionCorrectSignInCreatesSession(
    apiBase,
    demoUserId,
    demoPassword,
    reporter,
  );
  await regressionSignOutClearsSession(apiBase, cookieHeader, reporter);

  return failed ? 1 : 0;
}
