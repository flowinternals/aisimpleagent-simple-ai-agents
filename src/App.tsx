import { useMemo, useState } from "react";
import type { GenerationResponse } from "./types/generation";
import "./App.css";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

function buildDownloadHref(result: GenerationResponse): string {
  if (result.imageData.startsWith("data:")) {
    return result.imageData;
  }
  return `data:${result.mimeType};base64,${result.imageData}`;
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        body: JSON.stringify({ prompt }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      setResult(payload);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Generation failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="panel">
        <span className="eyebrow">Foundation - Simple AI Agents</span>
        <h1>Starter Agent App</h1>
        <p className="lede">
          This scaffold proves the frontend-to-backend request flow and keeps provider logic
          behind the server boundary. Shape it into your own app during the walkthrough.
        </p>

        <form className="form" onSubmit={handleGenerate}>
          <label htmlFor="prompt">Describe what you want the agent to create</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the output you want this starter app to request from the backend-held agent."
            rows={8}
          />
          <div className="button-row">
            <button type="submit" disabled={loading || !prompt.trim()}>
              {loading ? "Running..." : "Run Agent"}
            </button>
            <span className="helper-text">
              The browser sends the request to the backend. Provider logic stays off the page.
            </span>
          </div>
        </form>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="panel result-panel">
        <div className="result-header">
          <div>
            <span className="eyebrow">Generated Result</span>
            <h2>Preview</h2>
          </div>
          {result ? (
            <a className="download-link" href={imageSrc} download={result.fileName}>
              Download
            </a>
          ) : null}
        </div>

        {result ? (
          <>
            <div className="preview-frame">
              <img src={imageSrc} alt="Generated mock result from the starter scaffold" />
            </div>
            <dl className="metadata">
              <div>
                <dt>Provider mode</dt>
                <dd>{result.providerMode}</dd>
              </div>
              <div>
                <dt>File name</dt>
                <dd>{result.fileName}</dd>
              </div>
              <div>
                <dt>Generated at</dt>
                <dd>{new Date(result.generatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </>
        ) : (
          <div className="empty-state">
            <p>No result generated yet.</p>
            <p>Run the starter flow to confirm the scaffold is wired correctly.</p>
          </div>
        )}
      </section>
    </main>
  );
}
