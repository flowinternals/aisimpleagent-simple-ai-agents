/** @typedef {{ response: Response, body: unknown, setCookie: string | string[] | null }} FetchJsonResult */

const MOCK_GENERATE_BODY = JSON.stringify({
  prompt: "Create a network diagram",
  providerMode: "mock",
});

/**
 * Extract tdg_demo_session value from Set-Cookie header(s).
 * @param {string | string[] | null | undefined} setCookieHeader
 * @returns {string}
 */
export function extractSessionCookie(setCookieHeader) {
  if (!setCookieHeader) {
    return "";
  }
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const entry of values) {
    const match = /^tdg_demo_session=([^;]+)/.exec(entry);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return "";
}

/**
 * @param {string} sessionId
 * @returns {string}
 */
export function buildDemoSessionCookieHeader(sessionId) {
  return `tdg_demo_session=${encodeURIComponent(sessionId)}`;
}

/**
 * @param {string} apiBase
 * @param {string} path
 * @param {RequestInit} [init]
 * @returns {Promise<FetchJsonResult>}
 */
export async function fetchJson(apiBase, path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, init);
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const setCookie = response.headers.getSetCookie?.() ?? response.headers.get("set-cookie");
  return { response, body, setCookie };
}

export { MOCK_GENERATE_BODY };
