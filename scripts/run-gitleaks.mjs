#!/usr/bin/env node
/**
 * Run gitleaks with a resolved binary (PATH or WinGet install folder).
 * Usage: node scripts/run-gitleaks.mjs [gitleaks args...]
 *        node scripts/run-gitleaks.mjs tracked
 */

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function findGitleaksInWingetPackages() {
  const packagesRoot = path.join(
    process.env.LOCALAPPDATA || "",
    "Microsoft",
    "WinGet",
    "Packages",
  );
  if (!fs.existsSync(packagesRoot)) {
    return null;
  }
  for (const entry of fs.readdirSync(packagesRoot)) {
    if (!entry.startsWith("Gitleaks.Gitleaks_")) {
      continue;
    }
    const candidate = path.join(packagesRoot, entry, "gitleaks.exe");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveGitleaks() {
  const lookup = process.platform === "win32" ? "where" : "which";
  const name = process.platform === "win32" ? "gitleaks.exe" : "gitleaks";
  const found = spawnSync(lookup, [name], {
    encoding: "utf8",
    shell: true,
  });
  if (found.status === 0 && found.stdout.trim()) {
    return found.stdout.trim().split(/\r?\n/)[0].trim();
  }
  if (process.platform === "win32") {
    return findGitleaksInWingetPackages();
  }
  return null;
}

function runGitleaks(args, cwd = root) {
  const gitleaks = resolveGitleaks();
  if (!gitleaks) {
    console.error(
      "gitleaks not found.\n" +
        "Install (Windows): winget install Gitleaks.Gitleaks\n" +
        "Then open a new terminal, or ensure gitleaks is on PATH.",
    );
    process.exit(1);
  }

  const result = spawnSync(gitleaks, args, { stdio: "inherit", cwd });
  process.exit(result.status ?? 1);
}

function copyTrackedFilesToDir(targetRoot) {
  const listed = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  for (const relativePath of listed.split("\0").filter(Boolean)) {
    const src = path.join(root, relativePath);
    const dest = path.join(targetRoot, relativePath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function runTrackedScan() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gitleaks-tracked-"));
  try {
    copyTrackedFilesToDir(tempRoot);
    runGitleaks(
      ["detect", "--source", tempRoot, "--verbose", "--no-git"],
      tempRoot,
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

const userArgs = process.argv.slice(2);
if (userArgs[0] === "tracked") {
  runTrackedScan();
} else if (userArgs.length > 0) {
  runGitleaks(userArgs);
} else {
  runGitleaks(["detect", "--source", ".", "--verbose", "--no-git"]);
}
