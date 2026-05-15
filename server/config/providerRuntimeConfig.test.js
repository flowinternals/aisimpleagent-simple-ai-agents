import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getLiveGoogleReadiness, getLiveOpenAiReadiness } from "./providerRuntimeConfig.js";

describe("getLiveOpenAiReadiness", () => {
  /** @type {string | undefined} */
  let savedKey;
  /** @type {string | undefined} */
  let savedModel;

  beforeEach(() => {
    savedKey = process.env.OPENAI_API_KEY;
    savedModel = process.env.OPENAI_IMAGE_MODEL;
  });

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = savedKey;
    }
    if (savedModel === undefined) {
      delete process.env.OPENAI_IMAGE_MODEL;
    } else {
      process.env.OPENAI_IMAGE_MODEL = savedModel;
    }
  });

  it("reports not ready when API key is missing", () => {
    delete process.env.OPENAI_API_KEY;
    process.env.OPENAI_IMAGE_MODEL = "gpt-image-1.5";
    const readiness = getLiveOpenAiReadiness();
    assert.equal(readiness.ready, false);
    assert.equal(readiness.configured, false);
    assert.match(readiness.reason ?? "", /OPENAI_API_KEY/);
  });

  it("reports not ready for deprecated dall-e-3 model", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_IMAGE_MODEL = "dall-e-3";
    const readiness = getLiveOpenAiReadiness();
    assert.equal(readiness.ready, false);
    assert.equal(readiness.configured, true);
    assert.match(readiness.reason ?? "", /dall-e-3/);
  });

  it("reports ready for gpt-image-1.5 with key", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_IMAGE_MODEL = "gpt-image-1.5";
    const readiness = getLiveOpenAiReadiness();
    assert.equal(readiness.ready, true);
    assert.equal(readiness.imageModel, "gpt-image-1.5");
    assert.equal(readiness.reason, null);
  });
});

describe("getLiveGoogleReadiness", () => {
  /** @type {string | undefined} */
  let savedKey;
  /** @type {string | undefined} */
  let savedModel;
  /** @type {string | undefined} */
  let savedBaseUrl;
  /** @type {string | undefined} */
  let savedProjectNumber;

  beforeEach(() => {
    savedKey = process.env.GOOGLE_API_KEY;
    savedModel = process.env.GOOGLE_IMAGE_MODEL;
    savedBaseUrl = process.env.GOOGLE_BASE_URL;
    savedProjectNumber = process.env.GOOGLE_PROJECT_NUMBER;
  });

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env.GOOGLE_API_KEY;
    } else {
      process.env.GOOGLE_API_KEY = savedKey;
    }
    if (savedModel === undefined) {
      delete process.env.GOOGLE_IMAGE_MODEL;
    } else {
      process.env.GOOGLE_IMAGE_MODEL = savedModel;
    }
    if (savedBaseUrl === undefined) {
      delete process.env.GOOGLE_BASE_URL;
    } else {
      process.env.GOOGLE_BASE_URL = savedBaseUrl;
    }
    if (savedProjectNumber === undefined) {
      delete process.env.GOOGLE_PROJECT_NUMBER;
    } else {
      process.env.GOOGLE_PROJECT_NUMBER = savedProjectNumber;
    }
  });

  it("reports not ready when API key is missing", () => {
    delete process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_IMAGE_MODEL = "gemini-2.5-flash-image";
    const readiness = getLiveGoogleReadiness();
    assert.equal(readiness.ready, false);
    assert.equal(readiness.credentialsPresent, false);
    assert.equal(readiness.readinessLevel, "missing_credentials");
    assert.match(readiness.reason ?? "", /GOOGLE_API_KEY/);
  });

  it("reports not ready for unsupported model", () => {
    process.env.GOOGLE_API_KEY = "test-key";
    process.env.GOOGLE_IMAGE_MODEL = "gemini-2.5-flash";
    const readiness = getLiveGoogleReadiness();
    assert.equal(readiness.ready, false);
    assert.equal(readiness.settingsValid, false);
    assert.equal(readiness.readinessLevel, "invalid_model");
    assert.match(readiness.reason ?? "", /GOOGLE_IMAGE_MODEL/);
  });

  it("reports structurally ready with endpoint diagnostics", () => {
    process.env.GOOGLE_API_KEY = "test-key";
    process.env.GOOGLE_IMAGE_MODEL = "gemini-2.5-flash-image";
    process.env.GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    process.env.GOOGLE_PROJECT_NUMBER = "777112972235";
    const readiness = getLiveGoogleReadiness();
    assert.equal(readiness.ready, true);
    assert.equal(readiness.likelyReadyForLiveTest, true);
    assert.equal(readiness.imageModel, "gemini-2.5-flash-image");
    assert.equal(readiness.baseUrlHost, "generativelanguage.googleapis.com");
    assert.match(readiness.requestPath, /generateContent/);
    assert.equal(readiness.authMethod, "x-goog-api-key");
    assert.equal(readiness.projectNumber, "777112972235");
    assert.equal(readiness.reason, null);
  });
});
