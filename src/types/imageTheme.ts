import {
  DEFAULT_IMAGE_THEME,
  IMAGE_THEME_VALUES,
  normalizeImageTheme,
} from "../../shared/imageTheme.js";

export type ImageTheme = (typeof IMAGE_THEME_VALUES)[number];

export { DEFAULT_IMAGE_THEME, IMAGE_THEME_VALUES, normalizeImageTheme };
