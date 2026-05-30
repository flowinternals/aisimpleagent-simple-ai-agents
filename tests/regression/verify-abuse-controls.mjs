/**
 * Abuse-control regression gate against a running API.
 *
 * Usage:
 *   node tests/regression/verify-abuse-controls.mjs
 *   npm run test:abuse
 *
 * Env:
 *   VERIFY_API_BASE — default http://127.0.0.1:8787
 *   DEMO_USER_ID / DEMO_PASSWORD — must match the running server's `.env.local`
 */

import "../../server/config/loadEnvFiles.js";
import { runAbuseControlRegression } from "./lib/runAbuseControlRegression.mjs";

const exitCode = await runAbuseControlRegression();
process.exit(exitCode);
