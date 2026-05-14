/** Body for POST /api/generate — must match server validation (`generationRequest.js`, limit from `shared/generationLimits.js`). */
export type GenerationRequest = {
  prompt: string;
};

/** Image payload returned in `POST /api/generate` success body (`data`). */
export type GenerationResponse = {
  imageData: string;
  mimeType: string;
  fileName: string;
  providerMode: "mock" | "live";
  generatedAt: string;
  /** Server timing for the provider call; shown in the UI when present. */
  generationTimeMs?: number;
  /** Optional label (e.g. model) for live providers; omitted when unset. */
  modelLabel?: string;
};

/** Successful `POST /api/generate` JSON body — same envelope for mock and live. */
export type GenerationApiSuccess = {
  ok: true;
  data: GenerationResponse;
};

/** One validation or parse issue from the API error envelope. */
export type GenerationApiIssue = {
  path: string;
  message: string;
  code: string;
};

/** Failed `POST /api/generate` JSON body — matches `generationRoutes.js` and global error handler in `server/index.js`. */
export type GenerationApiErrorBody = {
  ok: false;
  error: string;
  code: string;
  issues: GenerationApiIssue[];
};

export function isGenerationApiErrorBody(value: unknown): value is GenerationApiErrorBody {
  if (!value || typeof value !== "object") {
    return false;
  }
  const o = value as Record<string, unknown>;
  if (o.ok !== false) {
    return false;
  }
  if (typeof o.error !== "string" || typeof o.code !== "string") {
    return false;
  }
  if (!Array.isArray(o.issues)) {
    return false;
  }
  for (const issue of o.issues) {
    if (!issue || typeof issue !== "object") {
      return false;
    }
    const i = issue as Record<string, unknown>;
    if (typeof i.path !== "string" || typeof i.message !== "string" || typeof i.code !== "string") {
      return false;
    }
  }
  return true;
}

/**
 * Builds a single UI string: primary `error` plus up to `maxExtraLines` distinct issue messages.
 */
export function formatGenerationApiErrorMessage(
  body: GenerationApiErrorBody,
  options?: { maxExtraLines?: number },
): string {
  const maxExtra = options?.maxExtraLines ?? 3;
  const lines: string[] = [body.error];
  const seen = new Set<string>([body.error.trim().toLowerCase()]);
  let extra = 0;
  for (const issue of body.issues) {
    if (extra >= maxExtra) {
      break;
    }
    const msg = issue.message.trim();
    const key = msg.toLowerCase();
    if (!msg || seen.has(key)) {
      continue;
    }
    seen.add(key);
    lines.push(`• ${msg}`);
    extra += 1;
  }
  return lines.join("\n");
}
