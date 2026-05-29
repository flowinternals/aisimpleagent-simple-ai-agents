#!/usr/bin/env node
/**
 * Scan git-tracked text files for encoding and line-ending problems.
 * Exit 1 when any issue is found (for CI and pre-commit hooks).
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** UTF-8 bytes misread as Windows-1252 / Latin-1 (common mojibake). */
function mojibakeFromUtf8Hex(hex) {
  return Buffer.from(hex, "hex").toString("latin1");
}

const MOJIBAKE_MARKERS = [
  mojibakeFromUtf8Hex("e28099"), // right single quote
  mojibakeFromUtf8Hex("e2809c"), // left double quote
  mojibakeFromUtf8Hex("e2809d"), // right double quote
  mojibakeFromUtf8Hex("e28093"), // en dash
  mojibakeFromUtf8Hex("e28094"), // em dash
  mojibakeFromUtf8Hex("e280a6"), // ellipsis
  mojibakeFromUtf8Hex("c2a0"), // no-break space misread
  mojibakeFromUtf8Hex("c3a9"), // e-acute
  mojibakeFromUtf8Hex("c3a8"), // e-grave
  mojibakeFromUtf8Hex("c3bc"), // u-umlaut
  mojibakeFromUtf8Hex("c3b6"), // o-umlaut
  mojibakeFromUtf8Hex("c3a4"), // a-umlaut
  mojibakeFromUtf8Hex("c3b1"), // n-tilde
  mojibakeFromUtf8Hex("c2a9"), // copyright misread
  mojibakeFromUtf8Hex("c2ae"), // registered misread
];

const REPLACEMENT_CHAR = "\uFFFD";

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".docx",
  ".xlsx",
  ".zip",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp3",
  ".mp4",
  ".webm",
  ".wav",
  ".avi",
  ".mov",
  ".gz",
  ".br",
  ".wasm",
]);

function listTrackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split("\0").filter(Boolean);
}

function isTextCandidate(relativePath) {
  const ext = path.extname(relativePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return false;
  }
  return true;
}

function decodeUtf8(buffer) {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    return decoder.decode(buffer);
  } catch {
    return null;
  }
}

function findMojibake(text) {
  const hits = [];
  for (const marker of MOJIBAKE_MARKERS) {
    if (text.includes(marker)) {
      hits.push(marker);
    }
  }
  return hits;
}

function scanFile(relativePath) {
  const abs = path.join(root, relativePath);
  if (!fs.existsSync(abs)) {
    return { relativePath, skipped: "missing" };
  }

  const buffer = fs.readFileSync(abs);
  const issues = [];

  const text = decodeUtf8(buffer);
  if (text === null) {
    issues.push({ kind: "invalid-utf8" });
    return { relativePath, issues };
  }

  if (buffer.includes(0)) {
    issues.push({ kind: "nul-byte" });
  }

  if (text.includes("\r\n")) {
    const count = text.split("\r\n").length - 1;
    issues.push({ kind: "crlf", detail: `${count} CRLF line ending(s)` });
  } else if (text.includes("\r")) {
    issues.push({ kind: "cr-only", detail: "bare CR without LF" });
  }

  if (text.includes(REPLACEMENT_CHAR)) {
    const count = [...text].filter((ch) => ch === REPLACEMENT_CHAR).length;
    issues.push({ kind: "replacement-char", detail: `${count} U+FFFD` });
  }

  const mojibake = findMojibake(text);
  if (mojibake.length > 0) {
    issues.push({
      kind: "mojibake",
      detail: mojibake.map((m) => JSON.stringify(m)).join(", "),
    });
  }

  return { relativePath, issues };
}

function main() {
  let tracked;
  try {
    tracked = listTrackedFiles();
  } catch (err) {
    console.error("check-text-hygiene: git ls-files failed. Run from a git checkout.");
    console.error(err.message);
    process.exit(2);
  }

  const candidates = tracked.filter(isTextCandidate);
  const failures = [];

  for (const relativePath of candidates) {
    const result = scanFile(relativePath);
    if (result.skipped) {
      continue;
    }
    if (result.issues?.length) {
      failures.push(result);
    }
  }

  if (failures.length === 0) {
    console.log(
      `check-text-hygiene: OK (${candidates.length} tracked text file(s) scanned)`,
    );
    process.exit(0);
  }

  console.error(`check-text-hygiene: ${failures.length} file(s) with issues:\n`);
  for (const { relativePath, issues } of failures) {
    console.error(`  ${relativePath}`);
    for (const issue of issues) {
      const extra = issue.detail ? ` (${issue.detail})` : "";
      console.error(`    - ${issue.kind}${extra}`);
    }
  }
  console.error(
    "\nSee docs/repo-text-hygiene.md for how to fix encoding and punctuation problems.",
  );
  process.exit(1);
}

main();
