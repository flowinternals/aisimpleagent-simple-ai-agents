import { TRAINING_BASELINE_SECURITY_HEADERS } from "../../shared/trainingTransportHeaders.js";

/**
 * Apply low-cost baseline security headers on every API response.
 * CSP, HSTS, and X-Frame-Options remain future-production edge concerns (SEC-06).
 * @type {import("express").RequestHandler}
 */
export function applyTrainingTransportHeaders(_request, response, next) {
  for (const [name, value] of Object.entries(TRAINING_BASELINE_SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }
  next();
}
