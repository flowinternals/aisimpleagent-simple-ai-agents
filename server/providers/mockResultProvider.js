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
 * Mock implementation of diagram generation for local/dev.
 * @param {{ prompt: string, providerPrompt: string }} args
 * @returns {Promise<import("../contracts/generationAdapterResult.js").NormalizedGenerationResult>}
 */
export async function generateMockResult({ prompt, providerPrompt }) {
  const lines = chunkText(prompt, 44);
  const promptNote = chunkText(providerPrompt, 56)[0] || "Mock provider starter output";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="900" viewBox="0 0 1200 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="900" rx="32" fill="#F5F9FF"/>
  <rect x="64" y="64" width="1072" height="112" rx="24" fill="#0C1A32"/>
  <text x="96" y="118" fill="#F7FBFF" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700">Starter Agent App</text>
  <text x="96" y="154" fill="#87D7FF" font-family="Segoe UI, Arial, sans-serif" font-size="20">Mock provider result proving the scaffolded request path</text>

  <rect x="88" y="228" width="272" height="480" rx="28" fill="#E5F0FF" stroke="#A6B9E0" stroke-width="2"/>
  <rect x="464" y="228" width="272" height="480" rx="28" fill="#EAFBF7" stroke="#9FD8CA" stroke-width="2"/>
  <rect x="840" y="228" width="272" height="480" rx="28" fill="#F1EEFF" stroke="#C0B3F1" stroke-width="2"/>

  <text x="128" y="288" fill="#0C1A32" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700">React UI</text>
  <text x="504" y="288" fill="#0C1A32" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700">Agent Service</text>
  <text x="874" y="288" fill="#0C1A32" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700">Provider Adapter</text>

  <text x="128" y="340" fill="#173052" font-family="Segoe UI, Arial, sans-serif" font-size="20">Prompt collected in the page</text>
  <text x="504" y="340" fill="#173052" font-family="Segoe UI, Arial, sans-serif" font-size="20">Prompt shaped for provider use</text>
  <text x="874" y="340" fill="#173052" font-family="Segoe UI, Arial, sans-serif" font-size="20">Mock provider returns starter output</text>

  <path d="M360 468H464" stroke="#0C1A32" stroke-width="8" stroke-linecap="round"/>
  <path d="M736 468H840" stroke="#0C1A32" stroke-width="8" stroke-linecap="round"/>
  <path d="M432 448L464 468L432 488" stroke="#0C1A32" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M808 448L840 468L808 488" stroke="#0C1A32" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>

  <text x="96" y="776" fill="#0C1A32" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700">User prompt</text>
  <rect x="88" y="792" width="1024" height="72" rx="18" fill="#FFFFFF" stroke="#D1DDF4" stroke-width="2"/>
  ${lines
    .map(
      (line, index) =>
        `<text x="116" y="${828 + index * 26}" fill="#1E2F4C" font-family="Segoe UI, Arial, sans-serif" font-size="22">${escapeXml(line)}</text>`,
    )
    .join("\n  ")}

  <text x="504" y="620" fill="#173052" font-family="Segoe UI, Arial, sans-serif" font-size="18">${escapeXml(promptNote)}</text>
</svg>`;

  return {
    imageData: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    mimeType: "image/svg+xml",
    fileName: "starter-agent-result.svg",
    providerMode: "mock",
    generatedAt: new Date().toISOString(),
  };
}
