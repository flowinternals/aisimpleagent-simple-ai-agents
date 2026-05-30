import express from "express";
import { verifyDemoCredentials } from "../auth/demoCredentials.js";
import { clearDemoSessionCookie, setDemoSessionCookie } from "../auth/demoSessionCookie.js";
import { parseCookies } from "../auth/parseCookies.js";
import {
  createDemoSession,
  DEMO_SESSION_COOKIE,
  destroyDemoSession,
  getDemoSession,
} from "../auth/demoSessionStore.js";
import { logWarn } from "../logging/trainingLog.js";

export const authRouter = express.Router();

function demoUserPayload(userId) {
  return {
    userId,
    displayName: userId,
    avatarInitial: userId.trim().charAt(0).toUpperCase() || "?",
  };
}

/**
 * GET /api/auth/session
 * Returns the current demo session when the HttpOnly cookie is valid.
 */
authRouter.get("/session", (request, response) => {
  const cookies = parseCookies(request.headers.cookie);
  const session = getDemoSession(cookies[DEMO_SESSION_COOKIE]);
  if (!session) {
    return response.status(401).json({
      ok: false,
      error: "Not signed in.",
      code: "UNAUTHORIZED",
      issues: [],
    });
  }
  return response.status(200).json({
    ok: true,
    user: demoUserPayload(session.userId),
  });
});

/**
 * POST /api/auth/sign-in
 * Body: { userId: string, password: string }
 */
authRouter.post("/sign-in", (request, response) => {
  const verification = verifyDemoCredentials(request.body?.userId, request.body?.password);
  if (verification.reason === "NOT_CONFIGURED") {
    logWarn("Demo sign-in unavailable", { code: "DEMO_AUTH_NOT_CONFIGURED" });
    return response.status(503).json({
      ok: false,
      error: "Demo sign-in is not configured on the server.",
      code: "DEMO_AUTH_NOT_CONFIGURED",
      issues: [],
    });
  }
  if (!verification.ok) {
    logWarn("Demo sign-in rejected", { code: "INVALID_CREDENTIALS" });
    return response.status(401).json({
      ok: false,
      error: "Invalid demo user ID or password.",
      code: "INVALID_CREDENTIALS",
      issues: [],
    });
  }

  const sessionId = createDemoSession(verification.userId);
  setDemoSessionCookie(response, sessionId);
  return response.status(200).json({
    ok: true,
    user: demoUserPayload(verification.userId),
  });
});

/**
 * POST /api/auth/sign-out
 */
authRouter.post("/sign-out", (request, response) => {
  const cookies = parseCookies(request.headers.cookie);
  destroyDemoSession(cookies[DEMO_SESSION_COOKIE]);
  clearDemoSessionCookie(response);
  return response.status(200).json({ ok: true });
});
