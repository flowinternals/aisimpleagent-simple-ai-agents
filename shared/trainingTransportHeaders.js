/** Baseline API response headers for the localhost training build (Phase M "inspect the basics"). */
export const TRAINING_BASELINE_SECURITY_HEADERS = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
};

/** Production edge headers intentionally deferred on HTTP localhost (SEC-06). */
export const DEFERRED_PRODUCTION_SECURITY_HEADER_NAMES = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "permissions-policy",
];
