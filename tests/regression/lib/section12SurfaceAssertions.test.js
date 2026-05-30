import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeGenerationAdapterResult } from "../../../server/contracts/generationAdapterResult.js";
import {
  assessGoogleStructuralReadiness,
  isGoogleBaseUrlStructurallyValid,
} from "../../../shared/googleProviderDiagnostics.js";
import {
  GENERATE_API_DATA_WHITELIST_KEYS,
  TRAINING_BUILD_HAS_UPLOAD_ROUTES,
  TRAINING_BUILD_HAS_USER_URL_FETCH,
  TRAINING_BUILD_HAS_WEBHOOK_ROUTES,
  TRAINING_BUILD_OUTBOUND_URL_ALLOWLIST_ENABLED,
  apiDataExcludesHostedImageUrl,
  isAdapterUnsafeFileNameRejection,
  isGoogleInvalidBaseUrlReadiness,
} from "./section12SurfaceAssertions.mjs";

const validMockResult = {
  imageData: "data:image/png;base64,YWJj",
  mimeType: "image/png",
  fileName: "diagram.png",
  providerMode: "mock",
  generatedAt: "2026-05-15T12:00:00.000Z",
};

describe("section12SurfaceAssertions posture", () => {
  it("documents absent upload, webhook, and user-URL fetch surfaces", () => {
    assert.equal(TRAINING_BUILD_HAS_UPLOAD_ROUTES, false);
    assert.equal(TRAINING_BUILD_HAS_WEBHOOK_ROUTES, false);
    assert.equal(TRAINING_BUILD_HAS_USER_URL_FETCH, false);
  });

  it("documents that outbound URL allowlist rejection is not implemented yet", () => {
    assert.equal(TRAINING_BUILD_OUTBOUND_URL_ALLOWLIST_ENABLED, false);
  });

  it("apiDataExcludesHostedImageUrl rejects responses that include imageUrl", () => {
    assert.equal(apiDataExcludesHostedImageUrl({ imageData: "data:image/png;base64,x" }), true);
    assert.equal(
      apiDataExcludesHostedImageUrl({ imageData: "data:image/png;base64,x", imageUrl: "https://x" }),
      false,
    );
  });

  it("generate API whitelist excludes imageUrl", () => {
    assert.equal(GENERATE_API_DATA_WHITELIST_KEYS.includes("imageUrl"), false);
    assert.equal(GENERATE_API_DATA_WHITELIST_KEYS.includes("imageData"), true);
    assert.equal(GENERATE_API_DATA_WHITELIST_KEYS.includes("fileName"), true);
  });
});

describe("section12SurfaceAssertions adapter filename boundary", () => {
  it("normalizeGenerationAdapterResult rejects unsafe fileName path segments", () => {
    assert.throws(
      () =>
        normalizeGenerationAdapterResult(
          { ...validMockResult, fileName: "../evil/diagram.png" },
          "mock",
        ),
      (error) => isAdapterUnsafeFileNameRejection(error),
    );
  });
});

describe("section12SurfaceAssertions Google base URL structural gate", () => {
  it("isGoogleBaseUrlStructurallyValid rejects garbage URLs", () => {
    assert.equal(isGoogleBaseUrlStructurallyValid(":::invalid:::"), false);
  });

  it("assessGoogleStructuralReadiness marks invalid GOOGLE_BASE_URL as invalid_base_url", () => {
    const savedKey = process.env.GOOGLE_API_KEY;
    const savedBase = process.env.GOOGLE_BASE_URL;
    const savedModel = process.env.GOOGLE_IMAGE_MODEL;
    try {
      process.env.GOOGLE_API_KEY = "test-key";
      process.env.GOOGLE_BASE_URL = ":::invalid:::";
      process.env.GOOGLE_IMAGE_MODEL = "gemini-2.5-flash-image";
      const readiness = assessGoogleStructuralReadiness();
      assert.equal(isGoogleInvalidBaseUrlReadiness(readiness.readinessLevel), true);
      assert.equal(readiness.settingsValid, false);
    } finally {
      if (savedKey === undefined) {
        delete process.env.GOOGLE_API_KEY;
      } else {
        process.env.GOOGLE_API_KEY = savedKey;
      }
      if (savedBase === undefined) {
        delete process.env.GOOGLE_BASE_URL;
      } else {
        process.env.GOOGLE_BASE_URL = savedBase;
      }
      if (savedModel === undefined) {
        delete process.env.GOOGLE_IMAGE_MODEL;
      } else {
        process.env.GOOGLE_IMAGE_MODEL = savedModel;
      }
    }
  });
});
