import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getLiveOpenAiReadiness } from "./providerRuntimeConfig.js";

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
