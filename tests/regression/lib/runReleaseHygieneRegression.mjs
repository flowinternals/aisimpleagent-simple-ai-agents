import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessTrainingBuildAuditPosture,
  serverIndexForbiddenRouteMarker,
  serverIndexHasExpectedRouteMarkers,
  trackedPathsExcludeReleaseLeftovers,
} from "./releaseHygieneAssertions.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * @returns {Promise<number>} exit code
 */
export async function runReleaseHygieneRegression() {
  let failed = false;

  function pass(message) {
    console.log(`OK: ${message}`);
  }

  function fail(message) {
    console.error(`FAIL: ${message}`);
    failed = true;
  }

  console.log("Release-hygiene regression (Section 14 / training build)\n");

  const packageJsonPath = path.join(root, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  if (packageJson.scripts?.["audit:check"] !== "npm audit") {
    fail('package.json must define "audit:check": "npm audit"');
  } else {
    pass('package.json defines audit:check -> npm audit');
  }

  if (!packageJson.scripts?.["test:release-hygiene"]) {
    fail("package.json must define test:release-hygiene");
  } else {
    pass("package.json defines test:release-hygiene");
  }

  try {
    const lockTracked = execFileSync("git", ["ls-files", "package-lock.json"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    if (!lockTracked) {
      fail("package-lock.json is not tracked");
    } else {
      pass("package-lock.json is tracked");
    }
  } catch {
    fail("git ls-files package-lock.json failed");
  }

  try {
    const trackedAll = execFileSync("git", ["ls-files"], {
      cwd: root,
      encoding: "utf8",
    });
    if (!trackedPathsExcludeReleaseLeftovers(trackedAll)) {
      fail("tracked files include .env.local, dist/, or backup-style paths");
    } else {
      pass("tracked files exclude .env.local, dist/, and backup extensions");
    }
  } catch {
    fail("git ls-files failed");
  }

  for (const ignored of [".env.local", "dist"]) {
    try {
      execFileSync("git", ["check-ignore", "-v", ignored], { cwd: root, encoding: "utf8" });
      pass(`${ignored} is gitignored`);
    } catch {
      fail(`${ignored} is not gitignored`);
    }
  }

  const serverIndexPath = path.join(root, "server", "index.js");
  const serverIndexSource = fs.readFileSync(serverIndexPath, "utf8");
  if (!serverIndexHasExpectedRouteMarkers(serverIndexSource)) {
    fail("server/index.js missing expected API route mounts");
  } else {
    pass("server/index.js exposes only expected API route mounts");
  }

  const forbiddenRoute = serverIndexForbiddenRouteMarker(serverIndexSource);
  if (forbiddenRoute) {
    fail(`server/index.js contains forbidden route marker: ${forbiddenRoute}`);
  } else {
    pass("server/index.js has no debug-only route markers");
  }

  const auditResult = spawnSync("npm", ["audit", "--json"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (!auditResult.stdout?.trim()) {
    fail("npm audit --json produced no stdout");
  } else {
    try {
      const auditJson = JSON.parse(auditResult.stdout);
      const vulnerabilities = auditJson.vulnerabilities ?? {};
      const assessment = assessTrainingBuildAuditPosture(vulnerabilities);
      if (!assessment.ok) {
        fail(`npm audit posture: ${assessment.reason}`);
      } else {
        pass(
          "npm audit posture OK: qs absent; only documented deferrals remain, if any (equal or better)",
        );
      }
    } catch (error) {
      fail(`npm audit --json parse failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  const unitResult = spawnSync(
    process.execPath,
    ["--test", "tests/regression/lib/releaseHygieneAssertions.test.js"],
    { cwd: root, encoding: "utf8", shell: false },
  );
  if (unitResult.status !== 0) {
    fail(`releaseHygieneAssertions unit checks (exit ${unitResult.status ?? "unknown"})`);
    const output = [unitResult.stdout, unitResult.stderr].filter(Boolean).join("\n").trim();
    if (output) {
      console.error(output);
    }
  } else {
    pass("releaseHygieneAssertions unit checks");
  }

  console.log(
    failed ? "\nRelease-hygiene regression: FAILED" : "\nRelease-hygiene regression: PASSED",
  );
  return failed ? 1 : 0;
}
