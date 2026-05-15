import {
  DEFAULT_IMAGE_SIZE,
  IMAGE_SIZE_SPECS,
  IMAGE_SIZE_VALUES,
  normalizeImageSize,
} from "../../shared/imageSize.js";

export type ImageSize = (typeof IMAGE_SIZE_VALUES)[number];

export { DEFAULT_IMAGE_SIZE, IMAGE_SIZE_SPECS, IMAGE_SIZE_VALUES, normalizeImageSize };

export const IMAGE_SIZE_OPTIONS: ReadonlyArray<{ value: ImageSize; label: string }> = IMAGE_SIZE_VALUES.map(
  (value) => ({
    value,
    label: IMAGE_SIZE_SPECS[value].label,
  }),
);
