/**
 * Request-validation regression gate against a running API.
 *
 * Usage:
 *   node tests/regression/verify-validation.mjs
 *   npm run test:validation
 *
 * Env:
 *   VERIFY_API_BASE — default http://127.0.0.1:8787
 *   DEMO_USER_ID / DEMO_PASSWORD — must match the running server's `.env.local`
 */

import "../../server/config/loadEnvFiles.js";
import { runValidationRegression } from "./lib/runValidationRegression.mjs";

const exitCode = await runValidationRegression();
process.exit(exitCode);
