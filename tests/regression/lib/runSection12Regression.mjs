import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * @typedef {{ pass: (message: string) => void, fail: (message: string) => void }} RegressionReporter
 */

/**
 * @param {string} label
 * @param {string[]} args
 * @param {RegressionReporter} reporter
 */
function runCommand(label, args, reporter) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    reporter.fail(`${label} (exit ${result.status ?? "unknown"})`);
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    if (output) {
      console.error(output);
    }
    return;
  }
  reporter.pass(label);
}

/**
 * @param {RegressionReporter} reporter
 */
function assertBuildGenerationApiDataExcludesImageUrl(reporter) {
  const sourcePath = path.join(root, "server/services/generationAgentService.js");
  const source = fs.readFileSync(sourcePath, "utf8");
  const fnMatch = source.match(/function buildGenerationApiData[\s\S]*?\n}/);
  if (!fnMatch) {
    reporter.fail("buildGenerationApiData not found in generationAgentService.js");
    return;
  }
  if (fnMatch[0].includes("imageUrl")) {
    reporter.fail("buildGenerationApiData must not forward imageUrl in this training build");
    return;
  }
  reporter.pass("buildGenerationApiData excludes hosted imageUrl");
}

/**
 * @param {RegressionReporter} reporter
 */
function assertServerHasNoUploadOrWebhookRoutes(reporter) {
  const sourcePath = path.join(root, "server/index.js");
  const source = fs.readFileSync(sourcePath, "utf8").toLowerCase();
  const forbidden = ["multipart", "webhook", "multer", "sendfile", "res.download"];
  const hit = forbidden.find((token) => source.includes(token));
  if (hit) {
    reporter.fail(`server/index.js unexpectedly references ${hit}`);
    return;
  }
  reporter.pass("server/index.js has no upload/webhook/file-serving route markers");
}

/**
 * @param {RegressionReporter} reporter
 */
function assertOutboundFetchLimitedToLiveProviders(reporter) {
  const serverDir = path.join(root, "server");
  /** @type {string[]} */
  const fetchFiles = [];
  for (const rel of [
    "providers/live/openaiLiveProvider.js",
    "providers/live/googleLiveProvider.js",
    "providers/live/cloudflareLiveProvider.js",
  ]) {
    const filePath = path.join(serverDir, rel);
    if (fs.readFileSync(filePath, "utf8").includes("fetch(")) {
      fetchFiles.push(rel);
    }
  }
  if (fetchFiles.length !== 2) {
    reporter.fail(
      `expected outbound fetch only in openai/google live providers, found ${fetchFiles.join(", ") || "none"}`,
    );
    return;
  }
  reporter.pass("outbound fetch remains limited to openai/google live provider modules");
}

/**
 * @returns {Promise<number>} exit code
 */
export async function runSection12Regression() {
  let failed = false;
  /** @type {RegressionReporter} */
  const reporter = {
    pass(message) {
      console.log(`OK: ${message}`);
    },
    fail(message) {
      console.error(`FAIL: ${message}`);
      failed = true;
    },
  };

  console.log("Section 12 regression (extension-risk surfaces present in this build only)\n");

  assertBuildGenerationApiDataExcludesImageUrl(reporter);
  assertServerHasNoUploadOrWebhookRoutes(reporter);
  assertOutboundFetchLimitedToLiveProviders(reporter);

  runCommand(
    "section12SurfaceAssertions unit checks",
    ["--test", "tests/regression/lib/section12SurfaceAssertions.test.js"],
    reporter,
  );
  runCommand(
    "adapter filename contract (normalizeGenerationAdapterResult)",
    ["--test", "server/contracts/generationAdapterResult.test.js"],
    reporter,
  );
  runCommand(
    "Google provider URL structural readiness",
    ["--test", "shared/googleProviderDiagnostics.test.js"],
    reporter,
  );

  const vitestBin = path.join(root, "node_modules", "vitest", "vitest.mjs");
  const vitest = spawnSync(process.execPath, [vitestBin, "run", "src/lib/generationResultUi.test.ts"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    env: process.env,
  });
  if (vitest.status !== 0) {
    reporter.fail(`client download filename Vitest (exit ${vitest.status ?? "unknown"})`);
    const output = [vitest.stdout, vitest.stderr].filter(Boolean).join("\n").trim();
    if (output) {
      console.error(output);
    }
  } else {
    reporter.pass("client download filename Vitest (generationResultUi.test.ts)");
  }

  console.log(failed ? "\nSection 12 regression: FAILED" : "\nSection 12 regression: PASSED");
  return failed ? 1 : 0;
}
