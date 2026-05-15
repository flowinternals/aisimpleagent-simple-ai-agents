export type ProviderMode = "mock" | "live";

export type ProviderId = "openai" | "google" | "cloudflare";

export type GenerationProviderSettings = {
  providerMode: ProviderMode;
  providerId: ProviderId;
};

export const PROVIDER_SETTINGS_STORAGE_KEY = "tdg-generation-provider-settings";

/** Only OpenAI live image generation is implemented in this application build. */
export const IMPLEMENTED_LIVE_PROVIDER_ID: ProviderId = "openai";

export const DEFAULT_PROVIDER_SETTINGS: GenerationProviderSettings = {
  providerMode: "mock",
  providerId: "openai",
};
