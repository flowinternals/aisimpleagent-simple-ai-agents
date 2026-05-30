/**
 * @typedef {{ response: Response, headers: Record<string, string>, setCookie: string | string[] | null }} FetchHeadersResult
 */

/**
 * @param {string} apiBase
 * @param {string} path
 * @param {RequestInit} [init]
 * @returns {Promise<FetchHeadersResult>}
 */
export async function fetchHeaders(apiBase, path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, init);
  /** @type {Record<string, string>} */
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  const setCookie = response.headers.getSetCookie?.() ?? response.headers.get("set-cookie");
  return { response, headers, setCookie };
}
