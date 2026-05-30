/**
 * Section 14 release-hygiene regression gate.
 *
 * Covers:
 * - tracked lockfile and absence of shippable release leftovers in git
 * - npm audit posture (qs must stay absent; only documented deferrals may remain, if any)
 * - no debug-only API route markers in server/index.js
 *
 * Does NOT require npm audit exit 0 (deferrals remain moderate).
 * Does NOT mandate Dependabot, CI release gates, or major vite upgrades.
 *
 * Usage:
 *   node tests/regression/verify-release-hygiene.mjs
 *   npm run test:release-hygiene
 */

import { runReleaseHygieneRegression } from "./lib/runReleaseHygieneRegression.mjs";

const exitCode = await runReleaseHygieneRegression();
process.exit(exitCode);
