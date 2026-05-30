/**
 * Section 12 extension-risk regression gate (real supported surfaces only).
 *
 * Covers:
 * - env-only outbound provider fetch posture (no user-URL fetch; no upload/webhook routes)
 * - adapter + client download filename safety
 *
 * Does NOT test upload rejection, webhook signatures, or outbound URL allowlists —
 * those features are absent in this training build.
 *
 * Usage:
 *   node tests/regression/verify-section12-surfaces.mjs
 *   npm run test:section12
 */

import { runSection12Regression } from "./lib/runSection12Regression.mjs";

const exitCode = await runSection12Regression();
process.exit(exitCode);
