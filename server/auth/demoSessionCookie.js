import { DEMO_SESSION_COOKIE, DEMO_SESSION_MAX_AGE_SECONDS } from "./demoSessionStore.js";

/**
 * @param {import("express").Response} response
 * @param {string} sessionId
 */
export function setDemoSessionCookie(response, sessionId) {
  const parts = [
    `${DEMO_SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${DEMO_SESSION_MAX_AGE_SECONDS}`,
  ];
  response.setHeader("Set-Cookie", parts.join("; "));
}

/**
 * @param {import("express").Response} response
 */
export function clearDemoSessionCookie(response) {
  const parts = [
    `${DEMO_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  response.setHeader("Set-Cookie", parts.join("; "));
}
