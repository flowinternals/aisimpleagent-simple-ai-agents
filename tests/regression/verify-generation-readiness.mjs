/**
 * Mock and optional live verification for the generation path.
 *
 * Usage:
 *   node tests/regression/verify-generation-readiness.mjs
 *   node tests/regression/verify-generation-readiness.mjs --live
 *
 * Env:
 *   VERIFY_API_BASE — default http://127.0.0.1:8787 (use the port from npm run dev)
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");
const { mockReadiness: mockPrompt } = JSON.parse(
  readFileSync(join(fixturesDir, "generation-prompts.json"), "utf8"),
);

const apiBase = (process.env.VERIFY_API_BASE || "http://127.0.0.1:8787").replace(/\/$/, "");
const runLive = process.argv.includes("--live");
const demoUserId = process.env.DEMO_USER_ID?.trim();
const demoPassword = process.env.DEMO_PASSWORD;

function extractSessionCookie(setCookieHeader) {
  if (!setCookieHeader) {
    return "";
  }
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const entry of values) {
    const match = /^tdg_demo_session=([^;]+)/.exec(entry);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return "";
}

async function signInForRegression() {
  if (!demoUserId || demoPassword === undefined || demoPassword === "") {
    fail("DEMO_USER_ID and DEMO_PASSWORD must be set for test:readiness (match server .env.local)");
    return "";
  }
  const signIn = await fetchJson("/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: demoUserId, password: demoPassword }),
  });
  const sessionCookie = extractSessionCookie(signIn.setCookie);
  if (!signIn.response.ok || !sessionCookie) {
    fail(`demo sign-in failed with status ${signIn.response.status}`);
    return "";
  }
  pass(`demo sign-in accepted for user=${signIn.body?.user?.userId ?? demoUserId}`);
  return `tdg_demo_session=${encodeURIComponent(sessionCookie)}`;
}

async function fetchJson(path, init) {
  const response = await fetch(`${apiBase}${path}`, init);
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const setCookie = response.headers.getSetCookie?.() ?? response.headers.get("set-cookie");
  return { response, body, setCookie };
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`OK: ${message}`);
}

console.log(`API base: ${apiBase}`);

const health = await fetchJson("/api/health");
if (!health.response.ok || !health.body?.liveOpenAi || !health.body?.liveGoogle) {
  fail(`/api/health returned ${health.response.status}`);
} else {
  const { liveOpenAi, liveGoogle, mockReady } = health.body;
  pass(`health status=${health.body.status} mockReady=${mockReady}`);
  console.log(
    `     liveOpenAi configured=${liveOpenAi.configured} ready=${liveOpenAi.ready} model=${liveOpenAi.imageModel}`,
  );
  if (liveOpenAi.reason) {
    console.log(`     liveOpenAi reason: ${liveOpenAi.reason}`);
  }
  console.log(
    `     liveGoogle configured=${liveGoogle.configured} ready=${liveGoogle.ready} model=${liveGoogle.imageModel}`,
  );
  if (liveGoogle.baseUrlHost && liveGoogle.requestPath) {
    console.log(
      `     liveGoogle endpoint=${liveGoogle.baseUrlHost}${liveGoogle.requestPath} auth=${liveGoogle.authMethod ?? "n/a"}`,
    );
  }
  if (liveGoogle.projectNumber || liveGoogle.projectName) {
    console.log(
      `     liveGoogle project number=${liveGoogle.projectNumber ?? "n/a"} name=${liveGoogle.projectName ?? "n/a"}`,
    );
  }
  if (liveGoogle.readinessLevel) {
    console.log(
      `     liveGoogle readinessLevel=${liveGoogle.readinessLevel} likelyReadyForLiveTest=${liveGoogle.likelyReadyForLiveTest ?? liveGoogle.ready}`,
    );
  }
  if (liveGoogle.reason) {
    console.log(`     liveGoogle reason: ${liveGoogle.reason}`);
  }
}

const sessionCookie = await signInForRegression();
if (process.exitCode) {
  process.exit(process.exitCode);
}

const mockGenerate = await fetchJson("/api/generate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(sessionCookie ? { Cookie: sessionCookie } : {}),
  },
  body: JSON.stringify({
    prompt: mockPrompt,
    providerMode: "mock",
  }),
});

if (!mockGenerate.response.ok || mockGenerate.body?.ok !== true) {
  fail(`mock POST /api/generate returned ${mockGenerate.response.status}`);
} else {
  const data = mockGenerate.body.data;
  if (!data?.imageData?.startsWith("data:image/")) {
    fail("mock generate missing imageData data URL");
  } else {
    pass(`mock generate fileName=${data.fileName} mode=${data.providerMode}`);
  }
}

if (runLive) {
  if (!health.body?.liveOpenAi?.ready) {
    fail("live pass skipped: liveOpenAi.ready is false (fix server env first)");
  } else {
    console.log("Live generate starting (may take 20-40 seconds)...");
    const liveGenerate = await fetchJson("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      body: JSON.stringify({
        prompt: mockPrompt,
        providerMode: "live",
        providerId: "openai",
      }),
    });
    if (!liveGenerate.response.ok || liveGenerate.body?.ok !== true) {
      fail(
        `live POST /api/generate returned ${liveGenerate.response.status}: ${liveGenerate.body?.error ?? ""}`,
      );
    } else {
      const data = liveGenerate.body.data;
      pass(`live generate model=${data.modelLabel ?? "n/a"} fileName=${data.fileName}`);
    }
  }
} else {
  console.log("Tip: run with --live after health shows liveOpenAi.ready=true");
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
