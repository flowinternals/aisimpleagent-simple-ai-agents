/** Intentional HTTP error with a client-safe message (no stack, secrets, or raw provider output). */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code (4xx or 5xx)
   * @param {string} code Stable machine-readable code for clients
   * @param {string} message Safe to return in JSON `error` for end users
   */
  constructor(status, code, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}
