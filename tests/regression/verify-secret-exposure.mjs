/**
 * Secret-exposure regression gate (commit/push surface only).
 *
 * Runs Gitleaks on tracked files and full git history. Does not run the quick
 * working-tree scan (`secrets:scan`), which includes gitignored `.env.local`
 * and may exit non-zero while real keys remain local.
 *
 * Usage:
 *   node tests/regression/verify-secret-exposure.mjs
 *   npm run test:secrets
 *
 * Prerequisites: git repo, Gitleaks on PATH or WinGet install (see scripts/run-gitleaks.mjs).
 */

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const gitleaksRunner = path.join(root, "scripts", "run-gitleaks.mjs");

let failed = false;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

function pass(message) {
  console.log(`OK: ${message}`);
}

function runGitleaksStep(label, args) {
  const result = spawnSync(process.execPath, [gitleaksRunner, ...args], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    fail(`${label} (exit ${result.status ?? "unknown"})`);
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    if (output) {
      console.error(output);
    }
    return;
  }
  pass(label);
}

function assertEnvExamplePlaceholders() {
  const envExamplePath = path.join(root, ".env.example");
  if (!fs.existsSync(envExamplePath)) {
    fail(".env.example is missing");
    return;
  }
  const content = fs.readFileSync(envExamplePath, "utf8");
  for (const key of ["OPENAI_API_KEY", "GOOGLE_API_KEY"]) {
    const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
    if (!match) {
      fail(`.env.example missing ${key}= line`);
      continue;
    }
    if (match[1].trim().length > 0) {
      fail(`.env.example must keep ${key}= empty (placeholder only)`);
    }
  }
  if (!failed) {
    pass(".env.example provider key placeholders are empty");
  }
}

function assertEnvLocalNotTracked() {
  try {
    const ignore = execFileSync("git", ["check-ignore", "-v", ".env.local"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    if (!ignore) {
      fail(".env.local is not gitignored");
      return;
    }
    pass(`.env.local is gitignored (${ignore.split(/\s+/)[0]})`);
  } catch {
    fail("git check-ignore failed for .env.local");
  }

  const tracked = execFileSync("git", ["ls-files", ".env.local"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (tracked) {
    fail(".env.local must not be tracked");
  } else {
    pass(".env.local is not tracked");
  }
}

console.log("Secret-exposure regression (tracked + git history)\n");

assertEnvExamplePlaceholders();
assertEnvLocalNotTracked();

runGitleaksStep("Gitleaks tracked-surface scan", ["tracked"]);
runGitleaksStep("Gitleaks git-history scan", [
  "detect",
  "--source",
  ".",
  "--verbose",
]);

if (failed) {
  console.error(
    "\nSecret-exposure regression failed. Fix tracked secrets or install Gitleaks:\n" +
      "  winget install Gitleaks.Gitleaks\n" +
      "Manual scans: npm run secrets:scan:tracked, npm run secrets:scan:history",
  );
  process.exit(1);
}

console.log("\nSecret-exposure regression passed.");
process.exit(0);
