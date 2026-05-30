import { randomUUID } from "node:crypto";

export const DEMO_SESSION_COOKIE = "tdg_demo_session";
export const DEMO_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/** @type {Map<string, { userId: string, createdAt: number }>} */
const sessions = new Map();

/**
 * @param {string} userId
 * @returns {string}
 */
export function createDemoSession(userId) {
  const sessionId = randomUUID();
  sessions.set(sessionId, { userId, createdAt: Date.now() });
  return sessionId;
}

/**
 * @param {string | undefined} sessionId
 * @returns {{ userId: string, createdAt: number } | null}
 */
export function getDemoSession(sessionId) {
  if (!sessionId || typeof sessionId !== "string") {
    return null;
  }
  return sessions.get(sessionId) ?? null;
}

/**
 * @param {string | undefined} sessionId
 */
export function destroyDemoSession(sessionId) {
  if (!sessionId || typeof sessionId !== "string") {
    return;
  }
  sessions.delete(sessionId);
}

/** @internal test helper */
export function clearDemoSessionsForTests() {
  sessions.clear();
}
