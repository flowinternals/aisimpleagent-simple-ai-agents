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
