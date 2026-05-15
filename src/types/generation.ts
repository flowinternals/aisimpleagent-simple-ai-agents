import type { ImageQuality } from "./imageQuality";
import type { ProviderId, ProviderMode } from "./providerSettings";

/** Body for POST /api/generate — must match server validation (`generationRequest.js`, limit from `shared/generationLimits.js`). */
export type GenerationRequest = {
  prompt: string;
  providerMode: ProviderMode;
  /** Required for live mode; optional for mock (server defaults to `openai`). */
  providerId?: ProviderId;
  /** GPT image quality for live OpenAI; mock echoes the label for UI testing. */
  imageQuality?: ImageQuality;
};

/** Image payload returned in `POST /api/generate` success body (`data`). */
export type GenerationResponse = {
  /** Base64 data URL (`data:<image/*>;base64,...`); matches `mimeType`. */
  imageData: string;
  /** Optional absolute URL when the backend exposes a hosted image instead of inline data. */
  imageUrl?: string;
  /** Lowercase `image/*` type; matches the media type embedded in `imageData`. */
  mimeType: string;
  /** Suggested download filename; UI falls back when missing or empty. */
  fileName: string;
  providerMode: "mock" | "live";
  generatedAt: string;
  /** Server timing for the provider call (always set by the agent service). */
  generationTimeMs: number;
  /** Optional label (e.g. model) for live providers; omitted when unset. */
  modelLabel?: string;
  /** Optional quality label for live image generation. */
  qualityLabel?: "low" | "medium" | "high";
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

function isGenerationResponse(value: unknown): value is GenerationResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const o = value as Record<string, unknown>;
  const imageData = typeof o.imageData === "string" ? o.imageData : "";
  const imageUrl = typeof o.imageUrl === "string" ? o.imageUrl.trim() : "";
  const hasDataUrl = imageData.startsWith("data:image/");
  const hasImageUrl = /^https?:\/\//i.test(imageUrl);
  if (!hasDataUrl && !hasImageUrl) {
    return false;
  }
  if (typeof o.mimeType !== "string" || !o.mimeType.startsWith("image/")) {
    return false;
  }
  if (o.fileName !== undefined && typeof o.fileName !== "string") {
    return false;
  }
  if (o.providerMode !== "mock" && o.providerMode !== "live") {
    return false;
  }
  if (typeof o.generatedAt !== "string" || !o.generatedAt.trim()) {
    return false;
  }
  if (typeof o.generationTimeMs !== "number" || !Number.isFinite(o.generationTimeMs)) {
    return false;
  }
  if (o.imageUrl !== undefined && typeof o.imageUrl !== "string") {
    return false;
  }
  if (o.modelLabel !== undefined && typeof o.modelLabel !== "string") {
    return false;
  }
  if (
    o.qualityLabel !== undefined &&
    o.qualityLabel !== "low" &&
    o.qualityLabel !== "medium" &&
    o.qualityLabel !== "high"
  ) {
    return false;
  }
  return true;
}

/** Parses `{ ok: true, data }` from `POST /api/generate`; throws on invalid shape. */
export function parseGenerationApiSuccess(payload: unknown): GenerationResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid response: expected JSON object.");
  }
  const o = payload as Record<string, unknown>;
  if (o.ok !== true || !("data" in o)) {
    throw new Error("Invalid response: expected { ok: true, data }.");
  }
  if (!isGenerationResponse(o.data)) {
    throw new Error("Invalid response: missing image payload.");
  }
  const data = o.data as GenerationResponse;
  return {
    ...data,
    fileName: typeof data.fileName === "string" ? data.fileName : "",
  };
}

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
