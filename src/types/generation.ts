export type GenerationResponse = {
  imageData: string;
  mimeType: string;
  fileName: string;
  providerMode: "mock" | "live";
  generatedAt: string;
};
