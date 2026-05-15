import {
  DEFAULT_IMAGE_QUALITY,
  IMAGE_QUALITY_VALUES,
  normalizeImageQuality,
} from "../../shared/imageQuality.js";
import { buildImageQualityOptions, getImageQualityCostHints } from "../../shared/imageQualityPricing.js";
import type { ProviderId, ProviderMode } from "./providerSettings";

export type ImageQuality = (typeof IMAGE_QUALITY_VALUES)[number];

export { DEFAULT_IMAGE_QUALITY, IMAGE_QUALITY_VALUES, normalizeImageQuality, buildImageQualityOptions, getImageQualityCostHints };

export type ImageQualityOption = {
  value: ImageQuality;
  label: string;
  costHint: string;
};

export function imageQualityOptionsForProvider(settings: {
  providerMode: ProviderMode;
  providerId: ProviderId;
  liveImageModel?: string;
}): ReadonlyArray<ImageQualityOption> {
  return buildImageQualityOptions({
    providerMode: settings.providerMode,
    providerId: settings.providerId,
    liveImageModel: settings.liveImageModel,
  });
}
