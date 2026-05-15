import {
  DEFAULT_IMAGE_QUALITY,
  IMAGE_QUALITY_COST_HINTS,
  IMAGE_QUALITY_VALUES,
  normalizeImageQuality,
} from "../../shared/imageQuality.js";

export type ImageQuality = (typeof IMAGE_QUALITY_VALUES)[number];

export { DEFAULT_IMAGE_QUALITY, IMAGE_QUALITY_COST_HINTS, IMAGE_QUALITY_VALUES, normalizeImageQuality };

export const IMAGE_QUALITY_OPTIONS: ReadonlyArray<{
  value: ImageQuality;
  label: string;
  costHint: string;
}> = IMAGE_QUALITY_VALUES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
  costHint: IMAGE_QUALITY_COST_HINTS[value],
}));
