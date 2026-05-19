import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { PreviewImageFullscreen } from "./components/PreviewImageFullscreen";
import tdgLogoMark from "./assets/tdg_logo_mark.png";
import { parseGenerationApiSuccess, type GenerationResponse } from "./types/generation";
import {
  getGenerationPreviewErrorPresentation,
  imageResultUnavailableError,
  previewImageLoadFailedError,
  toGenerationPreviewError,
  toGenerationPreviewErrorFromCaught,
  type GenerationPreviewError,
} from "./lib/generationPreviewError";
import {
  downloadGenerationImage,
  formatGenerationResultMetadata,
  generationImageSrc,
  hasValidGenerationImageResult,
} from "./lib/generationResultUi";
import { formatHistoryRelativeTime } from "./lib/historyTime";
import { historyThumbAspectRatio, previewCanvasSizeClass } from "./lib/previewAspectRatio";
import {
  liveHealthForProviderId,
  parseApiHealthResponse,
  type ApiHealthResponse,
  type LiveProviderHealth,
} from "./types/liveProviderHealth";
import {
  DEFAULT_IMAGE_QUALITY,
  imageQualityOptionsForProvider,
  type ImageQuality,
} from "./types/imageQuality";
import { DEFAULT_IMAGE_SIZE, IMAGE_SIZE_OPTIONS, type ImageSize } from "./types/imageSize";
import { DEFAULT_IMAGE_THEME, type ImageTheme } from "./types/imageTheme";
import {
  DEFAULT_PROVIDER_SETTINGS,
  isImplementedLiveProviderId,
  PROVIDER_SETTINGS_STORAGE_KEY,
  type GenerationProviderSettings,
  type ProviderId,
} from "./types/providerSettings";
import { buildGenerationRequestBody } from "../shared/buildGenerationRequestBody.js";
import { GENERATION_PROMPT_MAX_LENGTH } from "../shared/generationLimits.js";
import { getPreviewPhase, shouldShowPreviewImage } from "../shared/previewState.js";
import "./App.css";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
const HISTORY_MAX_ENTRIES = 24;

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
  imageTheme: ImageTheme;
  imageSize: ImageSize;
  result: GenerationResponse;
};

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
    const normalizedId: ProviderId = isImplementedLiveProviderId(providerId) ? providerId : "openai";
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
  const [imageTheme, setImageTheme] = useState<ImageTheme>(DEFAULT_IMAGE_THEME);
  const [imageSize, setImageSize] = useState<ImageSize>(DEFAULT_IMAGE_SIZE);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState<GenerationPreviewError | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewFullscreenOpen, setPreviewFullscreenOpen] = useState(false);
  const [providerSettings, setProviderSettings] = useState<GenerationProviderSettings>(() => readStoredProviderSettings());
  const [apiHealth, setApiHealth] = useState<ApiHealthResponse | null>(null);
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

  const closePreviewFullscreen = useCallback(() => {
    setPreviewFullscreenOpen(false);
  }, []);

  useEffect(() => {
    if (!showPreviewImage || !imageSrc) {
      setPreviewFullscreenOpen(false);
    }
  }, [showPreviewImage, imageSrc]);

  function handlePreviewImageDoubleClick() {
    if (showPreviewImage && imageSrc) {
      setPreviewFullscreenOpen(true);
    }
  }

  function handlePreviewImageError() {
    setPreviewError(previewImageLoadFailedError());
  }

  const activePreviewSize = result?.sizeLabel ?? imageSize;

  const selectedLiveHealth: LiveProviderHealth | null =
    providerSettings.providerMode === "live" && apiHealth
      ? liveHealthForProviderId(apiHealth, providerSettings.providerId)
      : null;

  const imageQualityOptions = useMemo(
    () =>
      imageQualityOptionsForProvider({
        providerMode: providerSettings.providerMode,
        providerId: providerSettings.providerId,
        liveImageModel: selectedLiveHealth?.imageModel,
      }),
    [providerSettings.providerMode, providerSettings.providerId, selectedLiveHealth?.imageModel],
  );

  useEffect(() => {
    if (providerSettings.providerMode !== "live") {
      setApiHealth(null);
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
          setApiHealth(null);
          setLiveHealthError("Could not read live provider readiness from the API.");
          return;
        }
        setApiHealth(parsed);
        setLiveHealthError("");
      } catch {
        if (!cancelled) {
          setApiHealth(null);
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
        body: JSON.stringify(
          buildGenerationRequestBody(providerSettings, prompt, { imageQuality, imageTheme, imageSize }),
        ),
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

      if (!hasValidGenerationImageResult(data)) {
        setPreviewError(imageResultUnavailableError());
        return;
      }

      setResult(data);
      setHistory((previous) => {
        const entry: HistoryEntry = {
          id: `${data.generatedAt}-${Math.random().toString(36).slice(2, 9)}`,
          prompt: prompt.trim(),
          imageQuality,
          imageTheme,
          imageSize,
          result: data,
        };
        return [entry, ...previous].slice(0, HISTORY_MAX_ENTRIES);
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
    setImageTheme(entry.imageTheme);
    setImageSize(entry.imageSize);
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
    (providerSettings.providerMode === "live" && selectedLiveHealth !== null && !selectedLiveHealth.ready);

  return (
    <div className="tdg-app">
      <header className="tdg-topnav">
        <div className="tdg-shell tdg-topnav-inner">
          <div className="tdg-brand">
            <img className="tdg-logo-mark" src={tdgLogoMark} alt="" aria-hidden />
            <span className="tdg-brand-title">Technical Diagram Generator</span>
          </div>
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
                  <option value="openai">OpenAI (live)</option>
                  <option value="google">Google (live)</option>
                  <option value="cloudflare" disabled>
                    Cloudflare (not implemented in this build)
                  </option>
                </select>
                <p className="tdg-settings-hint">
                  Mock mode ignores the provider target. Live mode calls the selected vendor on the server.
                </p>
                {providerSettings.providerMode === "live" ? (
                  <p
                    className={`tdg-readiness ${selectedLiveHealth?.ready ? "is-ready" : "is-not-ready"}`}
                    role="status"
                    aria-live="polite"
                  >
                    {liveHealthError
                      ? liveHealthError
                      : selectedLiveHealth?.ready
                        ? providerSettings.providerId === "google" &&
                          selectedLiveHealth.baseUrlHost &&
                          selectedLiveHealth.requestPath
                          ? `Server structurally ready for live Google (${selectedLiveHealth.imageModel} via ${selectedLiveHealth.baseUrlHost}${selectedLiveHealth.requestPath}). A live request is still required to validate the API key and quotas.`
                          : `Server ready for live ${providerSummaryLabel(providerSettings).replace(/^Live · /, "")} (${selectedLiveHealth.imageModel}).`
                        : selectedLiveHealth?.reason ??
                          (providerSettings.providerId === "google"
                            ? "Live Google is not ready. Check GOOGLE_API_KEY, GOOGLE_IMAGE_MODEL, and GOOGLE_BASE_URL on the server."
                            : "Live OpenAI is not ready. Check OPENAI_API_KEY and OPENAI_IMAGE_MODEL on the server.")}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <main className="tdg-page tdg-shell">
        <form className="tdg-generator" onSubmit={handleGenerate}>
          <div className="tdg-workspace">
            <section className="tdg-panel tdg-panel-input tdg-card" aria-labelledby="prompt-heading">
              <header className="tdg-panel-header">
                <h1 id="prompt-heading" className="tdg-panel-title">
                  Describe your diagram
                </h1>
                <p className="tdg-panel-sub">Use natural language. Be specific about systems, flows, and relationships.</p>
              </header>

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
                    rows={6}
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

              <div className="tdg-card tdg-options-card">
                <div className="tdg-option-block">
                  <span className="tdg-option-label" id="diagram-size-label">
                    Diagram size
                  </span>
                  <div className="tdg-radio-choices" role="radiogroup" aria-labelledby="diagram-size-label">
                    {IMAGE_SIZE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`tdg-radio-choice ${imageSize === option.value ? "is-selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="image-size"
                          value={option.value}
                          checked={imageSize === option.value}
                          onChange={() => setImageSize(option.value)}
                        />
                        <span className="tdg-radio-choice-text">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="tdg-option-block">
                  <span className="tdg-option-label" id="image-quality-label">
                    Image quality
                  </span>
                  <div className="tdg-option-controls-row">
                    <div className="tdg-radio-choices" role="radiogroup" aria-labelledby="image-quality-label">
                      {imageQualityOptions.map((option) => (
                        <label
                          key={option.value}
                          className={`tdg-radio-choice ${imageQuality === option.value ? "is-selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name="image-quality"
                            value={option.value}
                            checked={imageQuality === option.value}
                            onChange={() => setImageQuality(option.value)}
                          />
                          <span className="tdg-radio-choice-text">
                            {option.label}{" "}
                            <span className="tdg-radio-choice-meta">({option.costHint})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="tdg-option-tools">
                      <span
                        className={`tdg-provider-pill ${providerSettings.providerMode === "live" ? "is-live" : "is-mock"}`}
                        title="Generation mode and target vendor (change in Settings)"
                      >
                        {providerSummaryLabel(providerSettings)}
                      </span>
                      <button
                        type="button"
                        className={`tdg-icon-action ${imageTheme === "dark" ? "is-active" : ""}`}
                        onClick={() => setImageTheme((theme) => (theme === "dark" ? "light" : "dark"))}
                        aria-pressed={imageTheme === "dark"}
                        aria-label={
                          imageTheme === "dark"
                            ? "Dark diagram tone. Activate for light diagram."
                            : "Light diagram tone. Activate for dark diagram."
                        }
                        title={imageTheme === "dark" ? "Switch to light diagram" : "Switch to dark diagram"}
                      >
                        {imageTheme === "light" ? <SunIcon /> : <CrescentIcon />}
                      </button>
                      <button
                        type="button"
                        className={`tdg-icon-action ${settingsOpen ? "is-active" : ""}`}
                        onClick={() => setSettingsOpen(true)}
                        aria-label="Settings"
                        aria-expanded={settingsOpen}
                        title="Settings"
                      >
                        <SettingsIcon />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {providerSettings.providerMode === "live" &&
              selectedLiveHealth &&
              !selectedLiveHealth.ready &&
              !liveHealthError ? (
                <p className="tdg-live-hint" role="status">
                  {selectedLiveHealth.reason ??
                    "The selected live provider is not ready on the server. Open Settings to review configuration."}
                </p>
              ) : null}

              <button type="submit" className="tdg-generate" disabled={generateDisabled}>
                <SparkleIcon />
                {loading ? "Generating…" : "Generate diagram"}
              </button>
            </section>

            <section className="tdg-panel tdg-panel-preview tdg-card" aria-labelledby="preview-heading">
              <header className="tdg-preview-toolbar">
                <h2 id="preview-heading" className="tdg-panel-title">
                  Generated diagram
                </h2>
                <span className={`tdg-status-pill tdg-status-pill--${previewPhase}`}>{previewStatusLabel(previewPhase)}</span>
              </header>

              <div
                className={`tdg-preview-canvas ${showPreviewImage ? "has-image" : ""} ${showPreviewImage ? previewCanvasSizeClass(activePreviewSize) : ""} ${previewPhase === "error" ? "has-error" : ""} ${previewPhase === "empty" ? "is-empty" : ""}`}
              >
                {previewPhase === "loading" ? (
                  <div className="tdg-preview-state" role="status" aria-live="polite">
                    <span className="tdg-spinner" aria-hidden />
                    <p>
                      {providerSettings.providerMode === "live"
                        ? `Generating with ${providerSummaryLabel(providerSettings).replace(/^Live · /, "")} (this can take 20–40 seconds)…`
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
                    <img
                      key={result.generatedAt}
                      className="tdg-preview-image tdg-preview-image--zoomable"
                      src={imageSrc}
                      alt="Generated diagram"
                      title="Double-click to view fullscreen"
                      onDoubleClick={handlePreviewImageDoubleClick}
                      onError={handlePreviewImageError}
                    />
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
                    Choose size, quality, and tone, describe your diagram, then generate.
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
                <p className="tdg-history-empty">
                  No diagrams yet. Up to {HISTORY_MAX_ENTRIES} recent runs appear here.
                </p>
              ) : (
                <ul className="tdg-history-list">
                  {history.map((entry) => (
                    <li key={entry.id}>
                      <button type="button" className="tdg-history-card" onClick={() => applyHistoryEntry(entry)}>
                        <span
                          className="tdg-history-thumb"
                          aria-hidden
                          style={
                            {
                              "--thumb-aspect-ratio": historyThumbAspectRatio(entry.imageSize),
                            } as CSSProperties
                          }
                        >
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

      <PreviewImageFullscreen
        open={previewFullscreenOpen}
        imageSrc={showPreviewImage ? imageSrc : ""}
        onClose={closePreviewFullscreen}
      />
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CrescentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="currentColor"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
