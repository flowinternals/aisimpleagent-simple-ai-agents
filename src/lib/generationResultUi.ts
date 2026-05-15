import type { GenerationResponse } from "../types/generation";

const MIME_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
};

/** True when the result has a renderable image payload from the API contract. */
export function hasValidGenerationImageResult(result: GenerationResponse | null | undefined): boolean {
  if (!result) {
    return false;
  }
  const src = generationImageSrc(result);
  return src.length > 0 && (src.startsWith("data:image/") || isHttpImageUrl(src));
}

/** Inline preview and download both use the same contract field(s). */
export function generationImageSrc(result: GenerationResponse): string {
  const url = result.imageUrl?.trim();
  if (url && isHttpImageUrl(url)) {
    return url;
  }
  return result.imageData.trim();
}

/** Uses backend `fileName` when suitable; otherwise a safe `diagram-<timestamp>.<ext>` fallback. */
export function generationDownloadFileName(result: GenerationResponse): string {
  const ext = extensionForMimeType(result.mimeType);
  const fromApi = typeof result.fileName === "string" ? result.fileName.trim() : "";
  if (fromApi) {
    const sanitized = sanitizeDownloadFileName(fromApi);
    if (sanitized) {
      const withExt = alignDownloadExtension(sanitized, ext);
      if (isUsableDownloadStem(stemOfDownloadFileName(withExt))) {
        return withExt;
      }
    }
  }
  return fallbackDownloadFileName(result.generatedAt, ext);
}

/** Saves the same bytes/URL the preview uses — no extra provider calls. */
export function downloadGenerationImage(result: GenerationResponse): void {
  const src = generationImageSrc(result);
  const fileName = generationDownloadFileName(result);

  if (src.startsWith("data:image/")) {
    triggerBlobDownload(dataUrlToBlob(src), fileName);
    return;
  }

  if (isHttpImageUrl(src)) {
    void fetch(src)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Download failed (HTTP ${response.status}).`);
        }
        return response.blob();
      })
      .then((blob) => triggerBlobDownload(blob, fileName))
      .catch(() => {
        triggerAnchorDownload(src, fileName);
      });
    return;
  }

  throw new Error("No downloadable image is available for this result.");
}

/** Compact metadata line from fields already on `GenerationResponse`. */
export function formatGenerationResultMetadata(result: GenerationResponse): string {
  const parts: string[] = [];
  if (typeof result.generationTimeMs === "number" && Number.isFinite(result.generationTimeMs)) {
    const seconds = result.generationTimeMs / 1000;
    parts.push(`Generated in ${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`);
  }
  if (result.modelLabel?.trim()) {
    parts.push(`Model: ${result.modelLabel.trim()}`);
  }
  if (result.qualityLabel) {
    parts.push(`Quality: ${result.qualityLabel}`);
  }
  if (result.themeLabel) {
    parts.push(`Tone: ${result.themeLabel}`);
  }
  if (result.sizeLabel) {
    parts.push(`Size: ${result.sizeLabel}`);
  }
  parts.push(`Mode: ${result.providerMode}`);
  parts.push(`File: ${generationDownloadFileName(result)}`);
  return parts.join(" | ");
}

function isHttpImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function extensionForMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  return MIME_EXTENSION[normalized] ?? "png";
}

function safeTimestampSlug(generatedAt: string): string {
  const parsed = Date.parse(generatedAt);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString().replace(/[:.]/g, "-");
  }
  return "export";
}

/** Strip path segments, control chars, and characters unsafe for download attributes / common OSes. */
function sanitizeDownloadFileName(fileName: string): string {
  const segments = fileName.split(/[/\\]/);
  const base = (segments.pop() ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return base.replace(/[. ]+$/g, "").replace(/^\.+/, "");
}

function isUsableDownloadStem(stem: string): boolean {
  const trimmed = stem.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") {
    return false;
  }
  return !/^\.+$/.test(trimmed);
}

function stemOfDownloadFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0) {
    return fileName;
  }
  return fileName.slice(0, lastDot);
}

/** Ensures the saved name ends with the extension that matches `mimeType`. */
function alignDownloadExtension(fileName: string, expectedExt: string): string {
  if (!fileName) {
    return "";
  }
  const lastDot = fileName.lastIndexOf(".");
  const hasExtension =
    lastDot > 0 && lastDot < fileName.length - 1 && /^[a-z0-9]{1,8}$/i.test(fileName.slice(lastDot + 1));
  if (!hasExtension) {
    return `${fileName}.${expectedExt}`;
  }
  const stem = fileName.slice(0, lastDot);
  const currentExt = fileName.slice(lastDot + 1).toLowerCase();
  if (currentExt === expectedExt) {
    return fileName;
  }
  return `${stem}.${expectedExt}`;
}

function fallbackDownloadFileName(generatedAt: string, ext: string): string {
  const stamp = safeTimestampSlug(generatedAt);
  return `diagram-${stamp}.${ext}`;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    throw new Error("Invalid image data URL.");
  }
  const header = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);
  const mimeMatch = /^data:([^;,]+)/i.exec(header);
  const mime = mimeMatch?.[1]?.trim() || "application/octet-stream";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerAnchorDownload(objectUrl, fileName);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function triggerAnchorDownload(href: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
