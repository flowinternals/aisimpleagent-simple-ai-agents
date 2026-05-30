import { timingSafeEqual } from "node:crypto";

/**
 * @returns {{ userId: string, password: string } | null}
 */
export function getDemoCredentials() {
  const userId = process.env.DEMO_USER_ID?.trim();
  const password = process.env.DEMO_PASSWORD;
  if (!userId || password === undefined || password === "") {
    return null;
  }
  return { userId, password };
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * @param {unknown} userId
 * @param {unknown} password
 * @returns {{ ok: true, userId: string } | { ok: false, reason: "NOT_CONFIGURED" | "INVALID" }}
 */
export function verifyDemoCredentials(userId, password) {
  const expected = getDemoCredentials();
  if (!expected) {
    return { ok: false, reason: "NOT_CONFIGURED" };
  }
  if (typeof userId !== "string" || typeof password !== "string") {
    return { ok: false, reason: "INVALID" };
  }
  if (!safeEqual(userId.trim(), expected.userId) || !safeEqual(password, expected.password)) {
    return { ok: false, reason: "INVALID" };
  }
  return { ok: true, userId: expected.userId };
}
