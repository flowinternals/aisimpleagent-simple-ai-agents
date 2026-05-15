/**
 * Loads local env for the API process: `.env`, then `.env.local`, then OpenAI secrets
 * from the sibling Assets `security/openai.provider.runtime` when still unset.
 * Shell-defined variables are never overwritten.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(configDir, "..", "..");
const assetsOpenAiRuntime = path.join(
  projectRoot,
  "..",
  "aisimpleagent-simple-ai-agents-Assets",
  "security",
  "openai.provider.runtime",
);

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
 * Only `OPENAI_*` keys from the Assets runtime file are applied to `process.env`.
 * @param {Record<string, string>} record
 * @returns {Record<string, string>}
 */
function openAiKeysFromRuntimeRecord(record) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith("OPENAI_") && value) {
      out[key] = value;
    }
  }
  return out;
}

const fromEnv = readEnvFile(path.join(projectRoot, ".env"));
const fromLocal = readEnvFile(path.join(projectRoot, ".env.local"));
const fromAssetsOpenAi = openAiKeysFromRuntimeRecord(readEnvFile(assetsOpenAiRuntime));
const merged = { ...fromEnv, ...fromLocal, ...fromAssetsOpenAi };

for (const [key, value] of Object.entries(merged)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}
