import {
  DEFERRED_PRODUCTION_SECURITY_HEADER_NAMES,
  TRAINING_BASELINE_SECURITY_HEADERS,
} from "../../../shared/trainingTransportHeaders.js";

/** Default CORS origin when the API runs with stock training-build config. */
export const DEFAULT_TRAINING_CORS_ORIGIN = "http://localhost:5173";

export { DEFERRED_PRODUCTION_SECURITY_HEADER_NAMES as DEFERRED_PRODUCTION_HEADER_NAMES };

/**
 * @param {Headers | Record<string, string>} headers
 * @returns {Record<string, string>}
 */
export function toLowerCaseHeaderMap(headers) {
  if (headers instanceof Headers) {
    /** @type {Record<string, string>} */
    const map = {};
    headers.forEach((value, key) => {
      map[key.toLowerCase()] = value;
    });
    return map;
  }
  /** @type {Record<string, string>} */
  const map = {};
  for (const [key, value] of Object.entries(headers)) {
    map[key.toLowerCase()] = value;
  }
  return map;
}

/**
 * @param {Headers | Record<string, string>} headers
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function evaluateBaselineSecurityHeadersPresent(headers) {
  const map = toLowerCaseHeaderMap(headers);
  /** @type {string[]} */
  const issues = [];
  for (const [name, expectedValue] of Object.entries(TRAINING_BASELINE_SECURITY_HEADERS)) {
    const actual = map[name.toLowerCase()];
    if (actual !== expectedValue) {
      issues.push(`expected ${name}: ${expectedValue}, got ${actual ?? "(missing)"}`);
    }
  }
  return { ok: issues.length === 0, issues };
}

/**
 * @param {Headers | Record<string, string>} headers
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function evaluateDeferredProductionHeadersAbsent(headers) {
  const map = toLowerCaseHeaderMap(headers);
  /** @type {string[]} */
  const issues = [];
  for (const name of DEFERRED_PRODUCTION_SECURITY_HEADER_NAMES) {
    if (map[name]) {
      issues.push(`expected ${name} to be absent on localhost training API, got ${map[name]}`);
    }
  }
  return { ok: issues.length === 0, issues };
}

/**
 * Evaluate the training-build transport header profile for an API response.
 * @param {Headers | Record<string, string>} headers
 * @param {{ requestOrigin?: string | null, configuredCorsOrigin?: string }} [options]
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function evaluateTrainingBuildTransportHeaders(headers, options = {}) {
  const map = toLowerCaseHeaderMap(headers);
  const configuredCorsOrigin = options.configuredCorsOrigin ?? DEFAULT_TRAINING_CORS_ORIGIN;
  const requestOrigin = options.requestOrigin ?? null;
  /** @type {string[]} */
  const issues = [];

  if (requestOrigin) {
    const acao = map["access-control-allow-origin"];
    const credentials = map["access-control-allow-credentials"];
    if (acao !== configuredCorsOrigin) {
      issues.push(
        `expected Access-Control-Allow-Origin ${configuredCorsOrigin}, got ${acao ?? "(missing)"}`,
      );
    }
    if (credentials !== "true") {
      issues.push(
        `expected Access-Control-Allow-Credentials true, got ${credentials ?? "(missing)"}`,
      );
    }
  }

  issues.push(...evaluateBaselineSecurityHeadersPresent(headers).issues);
  issues.push(...evaluateDeferredProductionHeadersAbsent(headers).issues);

  return { ok: issues.length === 0, issues };
}

/**
 * Browsers reject cross-site reads when ACAO does not match the request Origin.
 * @param {Headers | Record<string, string>} headers
 * @param {{ requestOrigin: string, configuredCorsOrigin?: string }} options
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function evaluateDisallowedOriginCorsRejection(headers, options) {
  const map = toLowerCaseHeaderMap(headers);
  const configuredCorsOrigin = options.configuredCorsOrigin ?? DEFAULT_TRAINING_CORS_ORIGIN;
  const { requestOrigin } = options;
  /** @type {string[]} */
  const issues = [];
  const acao = map["access-control-allow-origin"];

  if (acao === requestOrigin) {
    issues.push(`disallowed Origin ${requestOrigin} must not be echoed in Access-Control-Allow-Origin`);
  }
  if (acao !== configuredCorsOrigin) {
    issues.push(
      `expected fixed Access-Control-Allow-Origin ${configuredCorsOrigin}, got ${acao ?? "(missing)"}`,
    );
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {string | string[] | null | undefined} setCookieHeader
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function evaluateDemoSessionSetCookieFlags(setCookieHeader) {
  /** @type {string[]} */
  const issues = [];
  if (!setCookieHeader) {
    return { ok: false, issues: ["Set-Cookie header missing"] };
  }
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const sessionCookie = values.find((entry) => /^tdg_demo_session=/i.test(entry));
  if (!sessionCookie) {
    return { ok: false, issues: ["tdg_demo_session Set-Cookie missing"] };
  }

  const lower = sessionCookie.toLowerCase();
  if (!lower.includes("httponly")) {
    issues.push("demo session cookie must include HttpOnly");
  }
  if (!lower.includes("samesite=lax")) {
    issues.push("demo session cookie must include SameSite=Lax");
  }
  if (/(?:^|;)\s*secure(?:;|$)/i.test(sessionCookie)) {
    issues.push("demo session cookie must not include Secure on HTTP localhost");
  }

  return { ok: issues.length === 0, issues };
}
