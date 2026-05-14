import { useMemo, useState } from "react";
import type { GenerationRequest, GenerationResponse } from "./types/generation";
import "./App.css";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
const PROMPT_MAX = 2000;

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
  result: GenerationResponse;
};

function buildDownloadHref(result: GenerationResponse): string {
  if (result.imageData.startsWith("data:")) {
    return result.imageData;
  }
  return `data:${result.mimeType};base64,${result.imageData}`;
}

function formatMetadataLine(result: GenerationResponse): string {
  const parts: string[] = [];
  if (typeof result.generationTimeMs === "number" && Number.isFinite(result.generationTimeMs)) {
    const seconds = result.generationTimeMs / 1000;
    parts.push(`Generated in ${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`);
  }
  if (result.modelLabel?.trim()) {
    parts.push(`Model: ${result.modelLabel.trim()}`);
  }
  parts.push(`Mode: ${result.providerMode}`);
  parts.push(`File: ${result.fileName}`);
  return parts.join(" · ");
}

export default function App() {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS.architecture);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const imageSrc = useMemo(() => {
    if (!result) {
      return "";
    }
    return buildDownloadHref(result);
  }, [result]);

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiBase}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prompt.trim() } satisfies GenerationRequest),
      });

      const payload = (await response.json()) as GenerationResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      if (!payload.imageData || !payload.mimeType) {
        throw new Error("Invalid response: missing image payload.");
      }

      setResult(payload);
      setHistory((previous) => {
        const entry: HistoryEntry = {
          id: `${payload.generatedAt}-${Math.random().toString(36).slice(2, 9)}`,
          prompt: prompt.trim(),
          result: payload,
        };
        return [entry, ...previous].slice(0, 12);
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Generation failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function applyHistoryEntry(entry: HistoryEntry) {
    setResult(entry.result);
    setPrompt(entry.prompt);
    setError("");
  }

  return (
    <div className="tdg-app">
      <header className="tdg-topnav">
        <div className="tdg-brand">
          <span className="tdg-logo" aria-hidden />
          <span className="tdg-title">Technical Diagram Generator</span>
        </div>
        <div className="tdg-topnav-actions">
          <label className="tdg-select-wrap">
            <span className="visually-hidden">Provider (display only)</span>
            <select className="tdg-select" disabled title="Provider mode is configured on the server.">
              <option>Mock Provider</option>
            </select>
          </label>
          <button type="button" className="tdg-icon-btn" aria-label="Assistant" title="Assistant (placeholder)">
            <SparkleIcon />
          </button>
          <div className="tdg-avatar" aria-hidden>
            U
          </div>
        </div>
      </header>

      <div className="tdg-body">
        <nav className="tdg-sidebar" aria-label="Primary">
          <button type="button" className="tdg-nav-item is-active">
            Generator
          </button>
          <button type="button" className="tdg-nav-item" disabled>
            History
          </button>
          <button type="button" className="tdg-nav-item" disabled>
            Settings
          </button>
          <button type="button" className="tdg-nav-item" disabled>
            About
          </button>
        </nav>

        <main className="tdg-main">
          <form className="tdg-columns" onSubmit={handleGenerate}>
            <section className="tdg-col tdg-col-prompt">
              <p className="tdg-eyebrow">1. Your prompt</p>
              <h1 className="tdg-heading">Create a technical diagram</h1>
              <p className="tdg-sub">Describe the diagram you want. Be specific for better results.</p>

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
                    maxLength={PROMPT_MAX}
                    rows={12}
                    spellCheck
                  />
                  <span className="tdg-char-count" aria-live="polite">
                    {prompt.length} / {PROMPT_MAX}
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
                    ["deployment", "Deployment Diagram"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="tdg-chip"
                    onClick={() => setPrompt(EXAMPLE_PROMPTS[key])}
                  >
                    {label}
                  </button>
                ))}
                <span className="tdg-chip-link" aria-disabled>
                  More examples →
                </span>
              </div>

              <div className="tdg-advanced">
                <button
                  type="button"
                  className="tdg-advanced-toggle"
                  aria-expanded={advancedOpen}
                  onClick={() => setAdvancedOpen((open) => !open)}
                >
                  Advanced options (optional)
                  <ChevronIcon className={advancedOpen ? "is-open" : undefined} />
                </button>
                {advancedOpen ? (
                  <p className="tdg-advanced-body">
                    Optional generation controls stay on the server. This panel reserves space for future
                    administrator-driven options without changing what the browser sends today.
                  </p>
                ) : null}
              </div>

              <button type="submit" className="tdg-generate" disabled={loading || !prompt.trim()}>
                <span className="tdg-generate-icon" aria-hidden>
                  +
                </span>
                {loading ? "Generating…" : "Generate diagram"}
              </button>
            </section>

            <section className="tdg-col tdg-col-preview" aria-labelledby="preview-heading">
              <p className="tdg-eyebrow">2. Generated diagram</p>
              <div className="tdg-preview-head">
                <h2 id="preview-heading" className="tdg-preview-title">
                  Preview
                </h2>
                {result && !loading ? (
                  <a
                    className="tdg-download"
                    href={imageSrc}
                    download={result.fileName}
                    aria-label={`Download ${result.fileName}`}
                  >
                    <DownloadIcon />
                  </a>
                ) : null}
              </div>

              <div
                className={`tdg-preview-frame ${error ? "has-error" : ""} ${!result && !loading && !error ? "is-empty" : ""}`}
              >
                {loading ? (
                  <div className="tdg-preview-state" role="status" aria-live="polite">
                    <span className="tdg-spinner" aria-hidden />
                    <p>Generating your diagram…</p>
                  </div>
                ) : (
                  <>
                    {error ? (
                      <div className="tdg-error-banner" role="alert">
                        <p className="tdg-error-title">Generation failed</p>
                        <p className="tdg-error-text">{error}</p>
                      </div>
                    ) : null}
                    {result ? (
                      <div className="tdg-image-wrap">
                        <img src={imageSrc} alt="Generated diagram" />
                      </div>
                    ) : null}
                    {!result && !error ? (
                      <div className="tdg-preview-state tdg-empty">
                        <PlaceholderIcon />
                        <p>No diagram yet. Add a prompt and choose Generate diagram.</p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {result && !loading ? <p className="tdg-meta-line">{formatMetadataLine(result)}</p> : null}
            </section>

            <section className="tdg-col tdg-col-history" aria-labelledby="history-heading">
              <p className="tdg-eyebrow">3. History</p>
              <h2 id="history-heading" className="tdg-preview-title">
                Recent diagrams
              </h2>
              <div className={`tdg-history-box ${history.length === 0 ? "is-empty" : ""}`}>
                {history.length === 0 ? (
                  <div className="tdg-preview-state tdg-empty">
                    <HistoryIcon />
                    <p>No diagrams yet. Create your first diagram!</p>
                  </div>
                ) : (
                  <ul className="tdg-history-list">
                    {history.map((entry) => (
                      <li key={entry.id}>
                        <button type="button" className="tdg-history-item" onClick={() => applyHistoryEntry(entry)}>
                          <span className="tdg-history-thumb" aria-hidden>
                            <img src={buildDownloadHref(entry.result)} alt="" />
                          </span>
                          <span className="tdg-history-text">
                            <span className="tdg-history-prompt">{entry.prompt || "Untitled prompt"}</span>
                            <span className="tdg-history-time">
                              {new Date(entry.result.generatedAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="button" className="tdg-history-footer" disabled>
                View all history
              </button>
            </section>
          </form>
        </main>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 2l1.4 5.1L18 9l-4.6 1.7L12 16l-1.4-5.3L6 9l4.6-1.9L12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
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
      <path d="M3 16l5-4 4 3 4-5 5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M4 7h16M4 12h10M4 17h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
