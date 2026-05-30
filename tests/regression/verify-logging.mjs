/**
 * Logging and error-disclosure regression gate.
 *
 * Usage:
 *   node tests/regression/verify-logging.mjs
 *   npm run test:logging
 *
 * Env:
 *   VERIFY_API_BASE — default http://127.0.0.1:8787
 *   DEMO_USER_ID / DEMO_PASSWORD — must match the running server's `.env.local`
 */

import "../../server/config/loadEnvFiles.js";
import { runLoggingRegression } from "./lib/runLoggingRegression.mjs";

const exitCode = await runLoggingRegression();
process.exit(exitCode);
