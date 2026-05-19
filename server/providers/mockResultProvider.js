import { normalizeImageSize, mockSvgDimensions } from "../../shared/imageSize.js";
import { normalizeImageTheme } from "../../shared/imageTheme.js";

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function chunkText(value, maxLength) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 6);
}

/**
 * @param {"light"|"dark"} imageTheme
 * @returns {{ canvas: string, header: string, headerText: string, headerSub: string, body: string, stroke: string, panelA: string, panelB: string, panelC: string }}
 */
function mockPalette(imageTheme) {
  if (normalizeImageTheme(imageTheme) === "dark") {
    return {
      canvas: "#0f172a",
      header: "#1e293b",
      headerText: "#f8fafc",
      headerSub: "#7dd3fc",
      body: "#e2e8f0",
      stroke: "#94a3b8",
      panelA: "#1e3a5f",
      panelB: "#134e4a",
      panelC: "#312e81",
    };
  }
  return {
    canvas: "#f5f9ff",
    header: "#0c1a32",
    headerText: "#f7fbff",
    headerSub: "#87d7ff",
    body: "#173052",
    stroke: "#0c1a32",
    panelA: "#e5f0ff",
    panelB: "#eafbf7",
    panelC: "#f1eeff",
  };
}

/**
 * Mock implementation of diagram generation for local/dev.
 *
 * @param {Pick<import("../contracts/generationAdapterResult.js").GenerationAdapterRequest, "providerPrompt"|"imageQuality"|"imageTheme"|"imageSize">} args
 * @returns {Promise<Record<string, unknown>>}
 */
export async function generateMockResult({ providerPrompt, imageQuality, imageTheme, imageSize }) {
  const lines = chunkText(providerPrompt, 44);
  const promptNote = chunkText(providerPrompt, 56)[0] || "Mock provider starter output";
  const theme = normalizeImageTheme(imageTheme);
  const size = normalizeImageSize(imageSize);
  const palette = mockPalette(theme);
  const { width, height } = mockSvgDimensions(size);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="32" fill="${palette.canvas}"/>
  <rect x="64" y="64" width="${width - 128}" height="112" rx="24" fill="${palette.header}"/>
  <text x="96" y="118" fill="${palette.headerText}" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700">Starter Agent App</text>
  <text x="96" y="154" fill="${palette.headerSub}" font-family="Segoe UI, Arial, sans-serif" font-size="20">Mock ${theme} diagram - ${size}</text>

  <rect x="88" y="228" width="272" height="480" rx="28" fill="${palette.panelA}" stroke="${palette.stroke}" stroke-width="2"/>
  <rect x="464" y="228" width="272" height="480" rx="28" fill="${palette.panelB}" stroke="${palette.stroke}" stroke-width="2"/>
  <rect x="840" y="228" width="272" height="480" rx="28" fill="${palette.panelC}" stroke="${palette.stroke}" stroke-width="2"/>

  <text x="128" y="288" fill="${palette.body}" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700">React UI</text>
  <text x="504" y="288" fill="${palette.body}" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700">Agent Service</text>
  <text x="874" y="288" fill="${palette.body}" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700">Provider Adapter</text>

  <path d="M360 468H464" stroke="${palette.stroke}" stroke-width="8" stroke-linecap="round"/>
  <path d="M736 468H840" stroke="${palette.stroke}" stroke-width="8" stroke-linecap="round"/>

  <text x="96" y="776" fill="${palette.body}" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700">User prompt</text>
  <rect x="88" y="792" width="${width - 176}" height="72" rx="18" fill="${theme === "dark" ? "#1e293b" : "#ffffff"}" stroke="${palette.stroke}" stroke-width="2"/>
  ${lines
    .map(
      (line, index) =>
        `<text x="116" y="${828 + index * 26}" fill="${palette.body}" font-family="Segoe UI, Arial, sans-serif" font-size="22">${escapeXml(line)}</text>`,
    )
    .join("\n  ")}

  <text x="504" y="620" fill="${palette.body}" font-family="Segoe UI, Arial, sans-serif" font-size="18">${escapeXml(promptNote)}</text>
</svg>`;

  return {
    imageData: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    mimeType: "image/svg+xml",
    fileName: "starter-agent-result.svg",
    providerMode: "mock",
    generatedAt: new Date().toISOString(),
    qualityLabel: imageQuality,
    themeLabel: theme,
    sizeLabel: size,
  };
}
