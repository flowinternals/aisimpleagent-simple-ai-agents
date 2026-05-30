export type DemoUser = {
  userId: string;
  displayName: string;
  avatarInitial: string;
};

export type DemoSessionResponse =
  | { ok: true; user: DemoUser }
  | { ok: false; error: string; code: string };

export function parseDemoSessionResponse(payload: unknown): DemoUser | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const o = payload as Record<string, unknown>;
  if (o.ok !== true || !o.user || typeof o.user !== "object" || Array.isArray(o.user)) {
    return null;
  }
  const user = o.user as Record<string, unknown>;
  if (typeof user.userId !== "string" || typeof user.displayName !== "string") {
    return null;
  }
  const avatarInitial =
    typeof user.avatarInitial === "string" && user.avatarInitial.length > 0
      ? user.avatarInitial
      : user.userId.trim().charAt(0).toUpperCase() || "?";
  return {
    userId: user.userId,
    displayName: user.displayName,
    avatarInitial,
  };
}

export function parseDemoAuthError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fallback;
  }
  const error = (payload as Record<string, unknown>).error;
  return typeof error === "string" && error.trim() ? error : fallback;
}
