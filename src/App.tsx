import { useEffect, useMemo, useState } from "react";
import { parseGenerationApiSuccess, type GenerationResponse } from "./types/generation";
import {
  getGenerationPreviewErrorPresentation,
  toGenerationPreviewError,
  toGenerationPreviewErrorFromCaught,
  type GenerationPreviewError,
} from "./lib/generationPreviewError";
import {
  downloadGenerationImage,
  formatGenerationResultMetadata,
  generationDownloadFileName,
  generationImageSrc,
  hasValidGenerationImageResult,
} from "./lib/generationResultUi";
import { formatHistoryRelativeTime } from "./lib/historyTime";
import { parseApiHealthResponse, type LiveOpenAiHealth } from "./types/liveProviderHealth";
import {
  DEFAULT_IMAGE_QUALITY,
  IMAGE_QUALITY_OPTIONS,
  type ImageQuality,
} from "./types/imageQuality";
import {
  DEFAULT_PROVIDER_SETTINGS,
  IMPLEMENTED_LIVE_PROVIDER_ID,
  PROVIDER_SETTINGS_STORAGE_KEY,
  type GenerationProviderSettings,
} from "./types/providerSettings";
import { buildGenerationRequestBody } from "../shared/buildGenerationRequestBody.js";
import { GENERATION_PROMPT_MAX_LENGTH } from "../shared/generationLimits.js";
import { getPreviewPhase, shouldShowPreviewImage } from "../shared/previewState.js";
import "./App.css";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

const EXAMPLE_PROMPTS: Record<string, string> = {
  architecture:
    "Create a high-level system architecture diagram for a B2B SaaS product with a React SPA, API gateway, core services, Postgres, Redis cache, and object storage for uploads.",
  dataflow:
    "Create a data flow diagram showing how user events move from the web client through ingestion, stream processing, and into the analytics warehouse.",
  network:
    "Create a network diagram for a three-tier VPC with public subnets for load balancers, private subnets for application servers, and a private data tier.",
  erd: "Create an entity-relationship diagram for customers, subscriptions, invoices, and payments with cardinalities labeled.",
  deployment:
    "Create a deployment diagram for a containerized service running on Kubernetes with ingress, autoscaled pods, and a managed database.",
};

type HistoryEntry = {
  id: string;
  prompt: string;
  imageQuality: ImageQuality;
  result: GenerationResponse;
};

type PreviewFrameTheme = "light" | "dark";

function readStoredProviderSettings(): GenerationProviderSettings {
  if (typeof window === "undefined") {
    return DEFAULT_PROVIDER_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROVIDER_SETTINGS;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_PROVIDER_SETTINGS;
    }
    const o = parsed as Record<string, unknown>;
    const providerMode = o.providerMode;
    const providerId = o.providerId;
    if (providerMode !== "mock" && providerMode !== "live") {
      return DEFAULT_PROVIDER_SETTINGS;
    }
    if (providerId !== "openai" && providerId !== "google" && providerId !== "cloudflare") {
      return DEFAULT_PROVIDER_SETTINGS;
    }
    const normalizedId =
      providerId === "google" || providerId === "cloudflare" ? IMPLEMENTED_LIVE_PROVIDER_ID : providerId;
    const normalized: GenerationProviderSettings = { providerMode, providerId: normalizedId };
    if (normalizedId !== providerId) {
      try {
        localStorage.setItem(PROVIDER_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
      } catch {
        /* ignore */
      }
    }
    return normalized;
  } catch {
    return DEFAULT_PROVIDER_SETTINGS;
  }
}

function persistProviderSettings(next: GenerationProviderSettings) {
  try {
    localStorage.setItem(PROVIDER_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

function providerSummaryLabel(settings: GenerationProviderSettings): string {
  if (settings.providerMode === "mock") {
    return "Mock (local scaffold)";
  }
  const vendor =
    settings.providerId === "openai" ? "OpenAI" : settings.providerId === "google" ? "Google" : "Cloudflare";
  return `Live · ${vendor}`;
}

function previewStatusLabel(phase: ReturnType<typeof getPreviewPhase>): string {
  if (phase === "loading") {
    return "Generating";
  }
  if (phase === "error") {
    return "Failed";
  }
  if (phase === "success") {
    return "Completed";
  }
  return "Waiting";
}

export default function App() {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS.architecture);
  const [imageQuality, setImageQuality] = useState<ImageQuality>(DEFAULT_IMAGE_QUALITY);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState<GenerationPreviewError | null>(null);
  const [previewFrameTheme, setPreviewFrameTheme] = useState<PreviewFrameTheme>("light");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providerSettings, setProviderSettings] = useState<GenerationProviderSettings>(() => readStoredProviderSettings());
  const [liveOpenAiHealth, setLiveOpenAiHealth] = useState<LiveOpenAiHealth | null>(null);
  const [liveHealthError, setLiveHealthError] = useState("");

  const hasDisplayableResult = hasValidGenerationImageResult(result);

  const previewErrorPresentation = previewError
    ? getGenerationPreviewErrorPresentation(previewError)
    : null;

  const previewPhase = getPreviewPhase({
    loading,
    error: previewError?.message ?? "",
    hasResult: hasDisplayableResult,
  });
  const showPreviewImage = shouldShowPreviewImage(previewPhase);

  const imageSrc = useMemo(() => {
    if (!result || !showPreviewImage) {
      return "";
    }
    return generationImageSrc(result);
  }, [result, showPreviewImage]);

  const downloadFileName = result && showPreviewImage ? generationDownloadFileName(result) : "";

  useEffect(() => {
    if (providerSettings.providerMode !== "live") {
      setLiveOpenAiHealth(null);
      setLiveHealthError("");
      return;
    }

    let cancelled = false;

    async function loadLiveHealth() {
      try {
        const response = await fetch(`${apiBase}/api/health`);
        const payload: unknown = await response.json();
        if (cancelled) {
          return;
        }
        const parsed = parseApiHealthResponse(payload);
        if (!parsed) {
          setLiveOpenAiHealth(null);
          setLiveHealthError("Could not read live provider readiness from the API.");
          return;
        }
        setLiveOpenAiHealth(parsed.liveOpenAi);
        setLiveHealthError("");
      } catch {
        if (!cancelled) {
          setLiveOpenAiHealth(null);
          setLiveHealthError("Could not reach the API health endpoint. Is npm run dev running?");
        }
      }
    }

    void loadLiveHealth();
    return () => {
      cancelled = true;
    };
  }, [providerSettings.providerMode, settingsOpen]);

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setPreviewError(null);
    setResult(null);

    try {
      const response = await fetch(`${apiBase}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildGenerationRequestBody(providerSettings, prompt, imageQuality)),
      });

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`Generation failed (HTTP ${response.status}, response was not JSON).`);
      }

      if (!response.ok) {
        setPreviewError(toGenerationPreviewError(payload, response.status));
        return;
      }

      const data = parseGenerationApiSuccess(payload);

      setResult(data);
      setHistory((previous) => {
        const entry: HistoryEntry = {
          id: `${data.generatedAt}-${Math.random().toString(36).slice(2, 9)}`,
          prompt: prompt.trim(),
          imageQuality,
          result: data,
        };
        return [entry, ...previous].slice(0, 24);
      });
    } catch (caught) {
      setPreviewError(toGenerationPreviewErrorFromCaught(caught));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function applyHistoryEntry(entry: HistoryEntry) {
    setResult(entry.result);
    setPrompt(entry.prompt);
    setImageQuality(entry.imageQuality);
    setPreviewError(null);
  }

  function clearPreview() {
    setResult(null);
    setPreviewError(null);
  }

  function switchToMockMode() {
    const next: GenerationProviderSettings = { ...providerSettings, providerMode: "mock" };
    setProviderSettings(next);
    persistProviderSettings(next);
    setPreviewError(null);
  }

  function handlePreviewErrorAction(action: NonNullable<typeof previewErrorPresentation>["action"]) {
    if (action === "switch-to-mock") {
      switchToMockMode();
      return;
    }
    if (action === "open-settings") {
      setSettingsOpen(true);
    }
  }

  const generateDisabled =
    loading ||
    !prompt.trim() ||
    (providerSettings.providerMode === "live" && liveOpenAiHealth !== null && !liveOpenAiHealth.ready);

  return (
    <div className="tdg-app">
      <header className="tdg-topnav">
        <div className="tdg-brand">
          <span className="tdg-logo" aria-hidden />
          <span className="tdg-title">Technical Diagram Generator</span>
        </div>
        <div className="tdg-topnav-actions">
          <span className="tdg-provider-pill" title="Generation mode and target vendor (from Settings)">
            {providerSummaryLabel(providerSettings)}
          </span>
          <button type="button" className="tdg-text-btn" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>

      {settingsOpen ? (
        <div className="tdg-modal-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}>
          <section
            className="tdg-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tdg-modal-head">
              <h2 id="settings-heading" className="tdg-modal-title">
                Generation provider
              </h2>
              <button type="button" className="tdg-modal-close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                ×
              </button>
            </div>
            <p className="tdg-modal-sub">
              Choose mock diagrams for local flow testing, or live generation with your selected vendor. Secrets stay on
              the server; the browser only sends mode and provider id.
            </p>

            <div className="tdg-settings-card">
              <div className="tdg-field">
                <label htmlFor="setting-mode" className="tdg-settings-label">
                  Mode
                </label>
                <select
                  id="setting-mode"
                  className="tdg-select tdg-select-block"
                  value={providerSettings.providerMode}
                  onChange={(event) => {
                    const providerMode: GenerationProviderSettings["providerMode"] =
                      event.target.value === "live" ? "live" : "mock";
                    const next: GenerationProviderSettings = { ...providerSettings, providerMode };
                    setProviderSettings(next);
                    persistProviderSettings(next);
                  }}
                >
                  <option value="mock">Mock (local scaffold)</option>
                  <option value="live">Live (external API)</option>
                </select>
              </div>

              <div className="tdg-field">
                <label htmlFor="setting-provider" className="tdg-settings-label">
                  Live provider target
                </label>
                <select
                  id="setting-provider"
                  className="tdg-select tdg-select-block"
                  disabled={providerSettings.providerMode === "mock"}
                  value={providerSettings.providerId}
                  onChange={(event) => {
                    const v = event.target.value;
                    const providerId: GenerationProviderSettings["providerId"] =
                      v === "google" ? "google" : v === "cloudflare" ? "cloudflare" : "openai";
                    const next: GenerationProviderSettings = { ...providerSettings, providerId };
                    setProviderSettings(next);
                    persistProviderSettings(next);
                  }}
                >
                  <option value="openai">OpenAI (live, implemented)</option>
                  <option value="google" disabled>
                    Google (not implemented in this build)
                  </option>
                  <option value="cloudflare" disabled>
                    Cloudflare (not implemented in this build)
                  </option>
                </select>
                <p className="tdg-settings-hint">
                  Mock mode ignores the provider target. Live mode only calls OpenAI today.
                </p>
                {providerSettings.providerMode === "live" ? (
                  <p
                    className={`tdg-readiness ${liveOpenAiHealth?.ready ? "is-ready" : "is-not-ready"}`}
                    role="status"
                    aria-live="polite"
                  >
                    {liveHealthError
                      ? liveHealthError
                      : liveOpenAiHealth?.ready
                        ? `Server ready for live OpenAI (${liveOpenAiHealth.imageModel}).`
                        : liveOpenAiHealth?.reason ??
                          "Live OpenAI is not ready. Check OPENAI_API_KEY and OPENAI_IMAGE_MODEL on the server."}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <main className="tdg-page">
        <form className="tdg-generator" onSubmit={handleGenerate}>
          <div className="tdg-workspace">
            <section className="tdg-panel tdg-panel-input" aria-labelledby="prompt-heading">
              <p className="tdg-step">1</p>
              <h1 id="prompt-heading" className="tdg-panel-title">
                Describe your diagram
              </h1>
              <p className="tdg-panel-sub">Use natural language. Be specific about systems, flows, and relationships.</p>

              <div className="tdg-field">
                <label htmlFor="diagram-prompt" className="visually-hidden">
                  Diagram prompt
                </label>
                <div className="tdg-textarea-wrap">
                  <textarea
                    id="diagram-prompt"
                    className="tdg-textarea"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={EXAMPLE_PROMPTS.architecture}
                    maxLength={GENERATION_PROMPT_MAX_LENGTH}
                    rows={10}
                    spellCheck
                  />
                  <span className="tdg-char-count" aria-live="polite">
                    {prompt.length} / {GENERATION_PROMPT_MAX_LENGTH}
                  </span>
                </div>
              </div>

              <div className="tdg-chips" role="group" aria-label="Example diagram types">
                {(
                  [
                    ["architecture", "System Architecture"],
                    ["dataflow", "Data Flow"],
                    ["network", "Network Diagram"],
                    ["erd", "ERD"],
                    ["deployment", "Deployment"],
                  ] as const
                ).map(([key, label]) => (
                  <button key={key} type="button" className="tdg-chip" onClick={() => setPrompt(EXAMPLE_PROMPTS[key])}>
                    {label}
                  </button>
                ))}
              </div>

              <fieldset className="tdg-quality">
                <legend className="tdg-quality-legend">Image quality</legend>
                <div className="tdg-quality-options" role="radiogroup" aria-label="Image quality">
                  {IMAGE_QUALITY_OPTIONS.map((option) => (
                    <label key={option.value} className={`tdg-quality-option ${imageQuality === option.value ? "is-selected" : ""}`}>
                      <input
                        type="radio"
                        name="image-quality"
                        value={option.value}
                        checked={imageQuality === option.value}
                        onChange={() => setImageQuality(option.value)}
                      />
                      <span className="tdg-quality-label">{option.label}</span>
                      <span className="tdg-quality-cost">{option.costHint} / image</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {providerSettings.providerMode === "live" &&
              liveOpenAiHealth &&
              !liveOpenAiHealth.ready &&
              !liveHealthError ? (
                <p className="tdg-live-hint" role="status">
                  {liveOpenAiHealth.reason ??
                    "Live OpenAI is not ready on the server. Open Settings to review configuration."}
                </p>
              ) : null}

              <button type="submit" className="tdg-generate" disabled={generateDisabled}>
                <SparkleIcon />
                {loading ? "Generating…" : "Generate diagram"}
              </button>
            </section>

            <section className="tdg-panel tdg-panel-preview" aria-labelledby="preview-heading">
              <div className="tdg-preview-toolbar">
                <div>
                  <p className="tdg-step">2</p>
                  <h2 id="preview-heading" className="tdg-panel-title">
                    Generated diagram
                  </h2>
                </div>
                <div className="tdg-preview-toolbar-actions">
                  <span className={`tdg-status-pill tdg-status-pill--${previewPhase}`}>{previewStatusLabel(previewPhase)}</span>
                  <div className="tdg-preview-theme" role="group" aria-label="Preview frame theme">
                    <button
                      type="button"
                      className={previewFrameTheme === "light" ? "is-active" : ""}
                      onClick={() => setPreviewFrameTheme("light")}
                      aria-pressed={previewFrameTheme === "light"}
                    >
                      Light frame
                    </button>
                    <button
                      type="button"
                      className={previewFrameTheme === "dark" ? "is-active" : ""}
                      onClick={() => setPreviewFrameTheme("dark")}
                      aria-pressed={previewFrameTheme === "dark"}
                    >
                      Dark frame
                    </button>
                  </div>
                </div>
              </div>

              <div
                className={`tdg-preview-canvas tdg-preview-canvas--${previewFrameTheme} ${previewPhase === "error" ? "has-error" : ""} ${previewPhase === "empty" ? "is-empty" : ""}`}
              >
                {previewPhase === "loading" ? (
                  <div className="tdg-preview-state" role="status" aria-live="polite">
                    <span className="tdg-spinner" aria-hidden />
                    <p>
                      {providerSettings.providerMode === "live"
                        ? "Generating with OpenAI (this can take 20–40 seconds)…"
                        : "Generating your diagram…"}
                    </p>
                  </div>
                ) : null}
                {previewPhase === "error" && previewErrorPresentation ? (
                  <div className="tdg-error-banner" role="alert">
                    <p className="tdg-error-title">{previewErrorPresentation.title}</p>
                    <p className="tdg-error-text">{previewErrorPresentation.message}</p>
                    {previewErrorPresentation.hint ? (
                      <p className="tdg-error-hint">{previewErrorPresentation.hint}</p>
                    ) : null}
                    {previewErrorPresentation.action && previewErrorPresentation.actionLabel ? (
                      <button
                        type="button"
                        className="tdg-error-action"
                        onClick={() => handlePreviewErrorAction(previewErrorPresentation.action)}
                      >
                        {previewErrorPresentation.actionLabel}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {showPreviewImage && result ? (
                  <div className="tdg-image-stage">
                    <img key={result.generatedAt} src={imageSrc} alt="Generated diagram" />
                  </div>
                ) : null}
                {previewPhase === "empty" ? (
                  <div className="tdg-preview-state tdg-empty">
                    <PlaceholderIcon />
                    <p>Your diagram will appear here after you generate.</p>
                  </div>
                ) : null}
              </div>

              <div className="tdg-preview-footer">
                {showPreviewImage && result ? (
                  <>
                    <p className="tdg-meta-line">{formatGenerationResultMetadata(result)}</p>
                    <div className="tdg-preview-actions">
                      <button
                        type="button"
                        className="tdg-action-btn tdg-action-btn--primary"
                        onClick={() => downloadGenerationImage(result)}
                      >
                        <DownloadIcon />
                        Download
                      </button>
                      <button type="button" className="tdg-action-btn" onClick={clearPreview}>
                        New diagram
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="tdg-meta-line tdg-meta-line--muted">
                    Select image quality, describe your diagram, then generate.
                  </p>
                )}
              </div>
            </section>
          </div>

          <section className="tdg-history" aria-labelledby="history-heading">
            <div className="tdg-history-head">
              <h2 id="history-heading" className="tdg-history-title">
                Recent generations
              </h2>
              {history.length > 0 ? (
                <span className="tdg-history-count">{history.length} saved</span>
              ) : null}
            </div>
            <div className={`tdg-history-track ${history.length === 0 ? "is-empty" : ""}`}>
              {history.length === 0 ? (
                <p className="tdg-history-empty">No diagrams yet. Your last five runs appear here.</p>
              ) : (
                <ul className="tdg-history-list">
                  {history.map((entry) => (
                    <li key={entry.id}>
                      <button type="button" className="tdg-history-card" onClick={() => applyHistoryEntry(entry)}>
                        <span className="tdg-history-thumb" aria-hidden>
                          <img src={generationImageSrc(entry.result)} alt="" />
                        </span>
                        <span className="tdg-history-caption">
                          <span className="tdg-history-time">{formatHistoryRelativeTime(entry.result.generatedAt)}</span>
                          <span className="tdg-history-prompt">{entry.prompt || "Untitled prompt"}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 2l1.4 5.1L18 9l-4.6 1.7L12 16l-1.4-5.3L6 9l4.6-1.9L12 2z" fill="currentColor" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 3v12m0 0l4-4m-4 4L8 11M5 21h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlaceholderIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 16l5-4 4 3 4-5 5 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
