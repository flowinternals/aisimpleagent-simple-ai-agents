export type ProviderMode = "mock" | "live";

export type ProviderId = "openai" | "google" | "cloudflare";

export type GenerationProviderSettings = {
  providerMode: ProviderMode;
  providerId: ProviderId;
};

export const PROVIDER_SETTINGS_STORAGE_KEY = "tdg-generation-provider-settings";

/** Live vendors with a working server adapter in this build. */
export const IMPLEMENTED_LIVE_PROVIDER_IDS: ProviderId[] = ["openai", "google"];

export const DEFAULT_PROVIDER_SETTINGS: GenerationProviderSettings = {
  providerMode: "mock",
  providerId: "openai",
};

export function isImplementedLiveProviderId(providerId: string): providerId is ProviderId {
  return IMPLEMENTED_LIVE_PROVIDER_IDS.includes(providerId as ProviderId);
}
