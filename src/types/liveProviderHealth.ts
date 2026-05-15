/** `GET /api/health` → `liveOpenAi` (no secrets). */
export type LiveOpenAiHealth = {
  configured: boolean;
  ready: boolean;
  imageModel: string;
  reason?: string;
};

export type ApiHealthResponse = {
  status: string;
  mockReady: boolean;
  liveOpenAi: LiveOpenAiHealth;
};

export function parseApiHealthResponse(payload: unknown): ApiHealthResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const o = payload as Record<string, unknown>;
  const live = o.liveOpenAi;
  if (!live || typeof live !== "object") {
    return null;
  }
  const l = live as Record<string, unknown>;
  if (typeof l.configured !== "boolean" || typeof l.ready !== "boolean" || typeof l.imageModel !== "string") {
    return null;
  }
  return {
    status: typeof o.status === "string" ? o.status : "unknown",
    mockReady: o.mockReady === true,
    liveOpenAi: {
      configured: l.configured,
      ready: l.ready,
      imageModel: l.imageModel,
      reason: typeof l.reason === "string" ? l.reason : undefined,
    },
  };
}
