import { parseCookies } from "../auth/parseCookies.js";
import { DEMO_SESSION_COOKIE, getDemoSession } from "../auth/demoSessionStore.js";

/**
 * Require a valid server-owned demo session before protected routes run.
 * @type {import("express").RequestHandler}
 */
export function requireDemoSession(request, response, next) {
  const cookies = parseCookies(request.headers.cookie);
  const session = getDemoSession(cookies[DEMO_SESSION_COOKIE]);
  if (!session) {
    return response.status(401).json({
      ok: false,
      error: "Sign in required.",
      code: "UNAUTHORIZED",
      issues: [],
    });
  }
  request.demoSession = session;
  return next();
}
