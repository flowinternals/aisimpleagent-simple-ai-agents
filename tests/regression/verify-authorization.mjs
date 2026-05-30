/**
 * Protected-route authorization regression gate against a running API.
 *
 * Usage:
 *   node tests/regression/verify-authorization.mjs
 *   npm run test:authorization
 *
 * Env:
 *   VERIFY_API_BASE — default http://127.0.0.1:8787
 *   DEMO_USER_ID / DEMO_PASSWORD — must match the running server's `.env.local`
 */

import { runAuthorizationRegression } from "./lib/runAuthorizationRegression.mjs";

const exitCode = await runAuthorizationRegression();
process.exit(exitCode);
