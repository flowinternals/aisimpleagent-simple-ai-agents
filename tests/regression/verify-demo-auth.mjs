/**
 * Demo sign-in regression gate against a running API.
 *
 * Usage:
 *   node tests/regression/verify-demo-auth.mjs
 *   npm run test:auth
 *
 * Env:
 *   VERIFY_API_BASE — default http://127.0.0.1:8787
 *   DEMO_USER_ID / DEMO_PASSWORD — must match the running server's `.env.local`
 */

import { runDemoAuthRegression } from "./lib/runDemoAuthRegression.mjs";

const exitCode = await runDemoAuthRegression();
process.exit(exitCode);
