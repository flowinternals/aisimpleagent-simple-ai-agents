/**
 * Browser-and-transport regression gate against a running API.
 *
 * Usage:
 *   node tests/regression/verify-transport.mjs
 *   npm run test:transport
 *
 * Env:
 *   VERIFY_API_BASE — default http://127.0.0.1:8787
 *   VERIFY_CORS_ORIGIN — default http://localhost:5173 (must match server CORS_ORIGIN)
 *   DEMO_USER_ID / DEMO_PASSWORD — must match the running server's `.env.local`
 */

import "../../server/config/loadEnvFiles.js";
import { runTransportRegression } from "./lib/runTransportRegression.mjs";

const exitCode = await runTransportRegression();
process.exit(exitCode);
