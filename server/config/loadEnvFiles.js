/**
 * Loads local env for the API process: `.env`, then `.env.local`, then provider secrets
 * from sibling Assets `security/*.provider.runtime` files when still unset.
 * Shell-defined variables are never overwritten.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(configDir, "..", "..");
const assetsSecurityDir = path.join(
  projectRoot,
  "..",
  "aisimpleagent-simple-ai-agents-Assets",
  "security",
);
const assetsOpenAiRuntime = path.join(assetsSecurityDir, "openai.provider.runtime");
const assetsGoogleRuntime = path.join(assetsSecurityDir, "google.provider.runtime");

/**
 * Minimal KEY=VAL parser (no multiline values). UTF-8 safe.
 * @param {string} content
 * @returns {Record<string, string>}
 */
function parseDotenvContent(content) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
      (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
function readEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    return parseDotenvContent(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Only keys with the given prefix from an Assets runtime file are applied to `process.env`.
 * @param {Record<string, string>} record
 * @param {string} prefix
 * @returns {Record<string, string>}
 */
function prefixedKeysFromRuntimeRecord(record, prefix) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith(prefix) && value) {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Maps non-GOOGLE_* keys from Assets `google.provider.runtime` into GOOGLE_* env names.
 * @param {Record<string, string>} record
 * @returns {Record<string, string>}
 */
function googleProjectAliasesFromRuntimeRecord(record) {
  /** @type {Record<string, string>} */
  const out = {};
  const projectName = record.PROJECT_NAME?.trim();
  const projectNumber = record.PROJECT_NUMBER?.trim();
  if (projectName) {
    out.GOOGLE_PROJECT_NAME = projectName;
  }
  if (projectNumber) {
    out.GOOGLE_PROJECT_NUMBER = projectNumber;
  }
  return out;
}

const fromEnv = readEnvFile(path.join(projectRoot, ".env"));
const fromLocal = readEnvFile(path.join(projectRoot, ".env.local"));
const googleRuntimeRecord = readEnvFile(assetsGoogleRuntime);
const fromAssetsOpenAi = prefixedKeysFromRuntimeRecord(readEnvFile(assetsOpenAiRuntime), "OPENAI_");
const fromAssetsGoogle = {
  ...prefixedKeysFromRuntimeRecord(googleRuntimeRecord, "GOOGLE_"),
  ...googleProjectAliasesFromRuntimeRecord(googleRuntimeRecord),
};
const merged = { ...fromEnv, ...fromLocal, ...fromAssetsOpenAi, ...fromAssetsGoogle };

for (const [key, value] of Object.entries(merged)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}
