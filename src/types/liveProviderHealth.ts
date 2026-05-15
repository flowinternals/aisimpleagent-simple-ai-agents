/** `GET /api/health` → per-vendor readiness (no secrets). */
export type LiveProviderHealth = {
  configured: boolean;
  ready: boolean;
  imageModel: string;
  reason?: string;
  credentialsPresent?: boolean;
  settingsValid?: boolean;
  modelConfigured?: boolean;
  readinessLevel?: string;
  baseUrl?: string;
  baseUrlHost?: string;
  requestPath?: string;
  authMethod?: string;
  projectName?: string | null;
  projectNumber?: string | null;
  likelyReadyForLiveTest?: boolean;
};

export type ApiHealthResponse = {
  status: string;
  mockReady: boolean;
  liveOpenAi: LiveProviderHealth;
  liveGoogle: LiveProviderHealth;
};

function parseLiveProviderHealth(value: unknown): LiveProviderHealth | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const l = value as Record<string, unknown>;
  if (typeof l.configured !== "boolean" || typeof l.ready !== "boolean" || typeof l.imageModel !== "string") {
    return null;
  }
  return {
    configured: l.configured,
    ready: l.ready,
    imageModel: l.imageModel,
    reason: typeof l.reason === "string" ? l.reason : undefined,
    credentialsPresent: typeof l.credentialsPresent === "boolean" ? l.credentialsPresent : undefined,
    settingsValid: typeof l.settingsValid === "boolean" ? l.settingsValid : undefined,
    modelConfigured: typeof l.modelConfigured === "boolean" ? l.modelConfigured : undefined,
    readinessLevel: typeof l.readinessLevel === "string" ? l.readinessLevel : undefined,
    baseUrl: typeof l.baseUrl === "string" ? l.baseUrl : undefined,
    baseUrlHost: typeof l.baseUrlHost === "string" ? l.baseUrlHost : undefined,
    requestPath: typeof l.requestPath === "string" ? l.requestPath : undefined,
    authMethod: typeof l.authMethod === "string" ? l.authMethod : undefined,
    projectName: typeof l.projectName === "string" ? l.projectName : l.projectName === null ? null : undefined,
    projectNumber:
      typeof l.projectNumber === "string" ? l.projectNumber : l.projectNumber === null ? null : undefined,
    likelyReadyForLiveTest:
      typeof l.likelyReadyForLiveTest === "boolean" ? l.likelyReadyForLiveTest : undefined,
  };
}

/** Fallback when the API process has not been restarted since Google support was added. */
const LEGACY_MISSING_LIVE_GOOGLE: LiveProviderHealth = {
  configured: false,
  ready: false,
  imageModel: "gemini-2.5-flash-image",
  reason:
    "Server health is missing liveGoogle. Restart npm run dev so the API loads the latest provider config.",
};

export function parseApiHealthResponse(payload: unknown): ApiHealthResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const o = payload as Record<string, unknown>;
  const liveOpenAi = parseLiveProviderHealth(o.liveOpenAi);
  if (!liveOpenAi) {
    return null;
  }
  const liveGoogle = parseLiveProviderHealth(o.liveGoogle) ?? LEGACY_MISSING_LIVE_GOOGLE;
  return {
    status: typeof o.status === "string" ? o.status : "unknown",
    mockReady: o.mockReady === true,
    liveOpenAi,
    liveGoogle,
  };
}

export function liveHealthForProviderId(
  health: ApiHealthResponse,
  providerId: "openai" | "google" | "cloudflare",
): LiveProviderHealth | null {
  if (providerId === "openai") {
    return health.liveOpenAi;
  }
  if (providerId === "google") {
    return health.liveGoogle;
  }
  return null;
}

/** @deprecated Use `LiveProviderHealth` */
export type LiveOpenAiHealth = LiveProviderHealth;
