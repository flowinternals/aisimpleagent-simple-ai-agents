import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyTrainingTransportHeaders } from "./applyTrainingTransportHeaders.js";

describe("applyTrainingTransportHeaders", () => {
  it("sets Referrer-Policy and X-Content-Type-Options on the response", () => {
    /** @type {Record<string, string>} */
    const headers = {};
    const response = {
      setHeader(name, value) {
        headers[name] = value;
      },
    };
    let nextCalled = false;
    applyTrainingTransportHeaders({}, response, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
  });
});
