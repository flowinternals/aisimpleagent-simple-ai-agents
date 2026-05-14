/** Body for POST /api/generate — must match server validation (`generationRequest.js`). */
export type GenerationRequest = {
  prompt: string;
};

export type GenerationResponse = {
  imageData: string;
  mimeType: string;
  fileName: string;
  providerMode: "mock" | "live";
  generatedAt: string;
  /** When present, shown as “Generated in Xs” in the UI. */
  generationTimeMs?: number;
  /** When present, shown next to timing (for example a model name). */
  modelLabel?: string;
};
