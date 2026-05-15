import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assessGoogleStructuralReadiness,
  buildGoogleErrorLogPayload,
  classifyGoogleApiError,
  getGoogleRuntimeSnapshot,
  parseGoogleApiError,
} from "./googleProviderDiagnostics.js";

describe("parseGoogleApiError", () => {
  it("extracts status, message, and quota details without secrets", () => {
    const parsed = parseGoogleApiError(
      {
        error: {
          code: 429,
          message: "Quota exceeded for metric generativelanguage.googleapis.com/generate_requests",
          status: "RESOURCE_EXHAUSTED",
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.QuotaFailure",
              violations: [
                {
                  quotaMetric: "generativelanguage.googleapis.com/generate_requests",
                  quotaId: "GenerateRequestsPerMinutePerProject",
                },
              ],
            },
            {
              "@type": "type.googleapis.com/google.rpc.RetryInfo",
              retryDelay: "34s",
            },
          ],
        },
      },
      429,
    );

    assert.equal(parsed.status, "RESOURCE_EXHAUSTED");
    assert.match(parsed.message ?? "", /Quota exceeded/);
    assert.equal(parsed.quotaMetric, "generativelanguage.googleapis.com/generate_requests");
    assert.equal(parsed.quotaId, "GenerateRequestsPerMinutePerProject");
    assert.equal(parsed.retryDelay, "34s");
    assert.ok(parsed.reasons.length >= 1);
  });
});

describe("classifyGoogleApiError", () => {
  it("classifies quota-style 429 separately from generic rate limits", () => {
    const quotaDetails = parseGoogleApiError(
      {
        error: {
          message: "Quota exceeded for this project",
          status: "RESOURCE_EXHAUSTED",
        },
      },
      429,
    );
    assert.equal(classifyGoogleApiError(429, quotaDetails).category, "quota");

    const rateDetails = parseGoogleApiError(
      {
        error: {
          message: "Too many requests. Please try again later.",
          status: "RESOURCE_EXHAUSTED",
        },
      },
      429,
    );
    assert.equal(classifyGoogleApiError(429, rateDetails).category, "rate_limit");
  });

  it("classifies auth and misconfiguration errors", () => {
    const authDetails = parseGoogleApiError(
      { error: { message: "API key not valid.", status: "UNAUTHENTICATED" } },
      401,
    );
    assert.equal(classifyGoogleApiError(401, authDetails).category, "auth");

    const modelDetails = parseGoogleApiError(
      { error: { message: "Model not found", status: "NOT_FOUND" } },
      404,
    );
    assert.equal(classifyGoogleApiError(404, modelDetails).category, "misconfigured");
  });
});

describe("getGoogleRuntimeSnapshot", () => {
  it("builds host/path diagnostics without exposing the API key", () => {
    const snapshot = getGoogleRuntimeSnapshot({
      GOOGLE_API_KEY: "secret-key",
      GOOGLE_BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
      GOOGLE_IMAGE_MODEL: "gemini-2.5-flash-image",
      GOOGLE_PROJECT_NUMBER: "777112972235",
      GOOGLE_PROJECT_NAME: "projects/777112972235",
    });

    assert.equal(snapshot.apiKeyPresent, true);
    assert.equal(snapshot.baseUrlHost, "generativelanguage.googleapis.com");
    assert.equal(snapshot.model, "gemini-2.5-flash-image");
    assert.match(snapshot.requestPath, /gemini-2\.5-flash-image/);
    assert.equal(snapshot.projectNumber, "777112972235");
    assert.notEqual(JSON.stringify(snapshot), /secret-key/);
  });
});

describe("assessGoogleStructuralReadiness", () => {
  it("requires credentials and a supported model", () => {
    const missing = assessGoogleStructuralReadiness({});
    assert.equal(missing.readinessLevel, "missing_credentials");
    assert.equal(missing.credentialsPresent, false);

    const ready = assessGoogleStructuralReadiness({
      GOOGLE_API_KEY: "test",
      GOOGLE_IMAGE_MODEL: "gemini-2.5-flash-image",
    });
    assert.equal(ready.readinessLevel, "structurally_ready");
    assert.equal(ready.settingsValid, true);
  });
});

describe("buildGoogleErrorLogPayload", () => {
  it("never includes raw API keys", () => {
    const runtime = getGoogleRuntimeSnapshot({
      GOOGLE_API_KEY: "AIzaSySecret",
      GOOGLE_IMAGE_MODEL: "gemini-2.5-flash-image",
    });
    const details = parseGoogleApiError(
      { error: { message: "Too many requests", status: "RESOURCE_EXHAUSTED" } },
      429,
    );
    const classification = classifyGoogleApiError(429, details);
    const payload = buildGoogleErrorLogPayload(runtime, 429, classification);
    assert.equal(payload.model, "gemini-2.5-flash-image");
    assert.equal(JSON.stringify(payload).includes("AIzaSySecret"), false);
  });
});
