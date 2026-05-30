/**
 * Pure assertions for Section 14 release-hygiene regression (training build).
 * Script-shaped checks (npm audit, git lockfile) live in runReleaseHygieneRegression.mjs.
 */

/** Packages allowed to remain as documented moderate deferrals (dev toolchain). */
export const TRAINING_BUILD_DEFERRED_AUDIT_PACKAGES = Object.freeze(["vite", "esbuild"]);

/** Packages that must not reappear as open advisories after npm audit fix. */
export const TRAINING_BUILD_PATCHED_AUDIT_PACKAGES = Object.freeze(["qs"]);

/** API route mount markers expected in server/index.js for this training build. */
export const TRAINING_BUILD_EXPECTED_ROUTE_MARKERS = Object.freeze([
  'app.get("/api/health"',
  'app.use("/api/auth"',
  'app.use("/api/generate"',
]);

/** Substrings that would suggest a debug-only or internal leak route in server/index.js. */
export const TRAINING_BUILD_FORBIDDEN_ROUTE_MARKERS = Object.freeze([
  "/api/debug",
  "/api/internal",
  "/api/test",
  "__debug",
  "debug-only",
]);

/**
 * @param {Record<string, { severity?: string }>} vulnerabilities
 * @returns {{ moderate: string[], high: string[], critical: string[] }}
 */
export function bucketAuditVulnerabilities(vulnerabilities) {
  /** @type {string[]} */
  const moderate = [];
  /** @type {string[]} */
  const high = [];
  /** @type {string[]} */
  const critical = [];
  for (const [name, entry] of Object.entries(vulnerabilities ?? {})) {
    const severity = entry?.severity ?? "unknown";
    if (severity === "moderate") {
      moderate.push(name);
    } else if (severity === "high") {
      high.push(name);
    } else if (severity === "critical") {
      critical.push(name);
    }
  }
  return { moderate, high, critical };
}

/**
 * Training build audit posture: reject worse-than-documented advisories; accept equal or better.
 * Documented deferrals (vite/esbuild moderates) may be present or may disappear after upgrades.
 * Patched packages (qs) must not reappear.
 *
 * @param {Record<string, { severity?: string }>} vulnerabilities
 * @returns {{ ok: boolean, reason?: string }}
 */
export function assessTrainingBuildAuditPosture(vulnerabilities) {
  const { moderate, high, critical } = bucketAuditVulnerabilities(vulnerabilities);

  for (const name of TRAINING_BUILD_PATCHED_AUDIT_PACKAGES) {
    if (name in (vulnerabilities ?? {})) {
      return { ok: false, reason: `${name} must not reappear in npm audit (regression)` };
    }
  }

  if (high.length > 0 || critical.length > 0) {
    return {
      ok: false,
      reason: `unexpected high/critical advisories: ${[...high, ...critical].join(", ")}`,
    };
  }

  const unexpectedModerate = moderate.filter(
    (name) => !TRAINING_BUILD_DEFERRED_AUDIT_PACKAGES.includes(name),
  );
  if (unexpectedModerate.length > 0) {
    return {
      ok: false,
      reason: `unexpected moderate advisories: ${unexpectedModerate.join(", ")}`,
    };
  }

  return { ok: true };
}

/**
 * @param {string} serverIndexSource
 * @returns {boolean}
 */
export function serverIndexHasExpectedRouteMarkers(serverIndexSource) {
  return TRAINING_BUILD_EXPECTED_ROUTE_MARKERS.every((marker) =>
    serverIndexSource.includes(marker),
  );
}

/**
 * @param {string} serverIndexSource
 * @returns {string | null} first forbidden marker hit, or null
 */
export function serverIndexForbiddenRouteMarker(serverIndexSource) {
  const lower = serverIndexSource.toLowerCase();
  return (
    TRAINING_BUILD_FORBIDDEN_ROUTE_MARKERS.find((marker) => lower.includes(marker.toLowerCase())) ??
    null
  );
}

/**
 * @param {string} trackedPathsMultiline git ls-files output
 * @returns {boolean}
 */
export function trackedPathsExcludeReleaseLeftovers(trackedPathsMultiline) {
  const lines = trackedPathsMultiline
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const forbidden = [/\.env\.local$/i, /^dist\//i, /\.(bak|backup|old|swp|orig)$/i];
  return !lines.some((line) => forbidden.some((re) => re.test(line)));
}
