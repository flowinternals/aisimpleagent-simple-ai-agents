import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TRAINING_CORS_ORIGIN,
  evaluateDemoSessionSetCookieFlags,
  evaluateDisallowedOriginCorsRejection,
  evaluateTrainingBuildTransportHeaders,
  toLowerCaseHeaderMap,
} from "./transportSecurityAssertions.mjs";

describe("transportSecurityAssertions", () => {
  it("toLowerCaseHeaderMap normalizes header names", () => {
    const map = toLowerCaseHeaderMap({
      "Access-Control-Allow-Origin": "http://localhost:5173",
    });
    assert.equal(map["access-control-allow-origin"], "http://localhost:5173");
  });

  it("evaluateTrainingBuildTransportHeaders accepts configured CORS headers", () => {
    const result = evaluateTrainingBuildTransportHeaders(
      {
        "Access-Control-Allow-Origin": DEFAULT_TRAINING_CORS_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
        "X-Powered-By": "Express",
      },
      { requestOrigin: DEFAULT_TRAINING_CORS_ORIGIN },
    );
    assert.equal(result.ok, true);
    assert.deepEqual(result.issues, []);
  });

  it("evaluateTrainingBuildTransportHeaders rejects missing baseline security headers", () => {
    const result = evaluateTrainingBuildTransportHeaders({
      "Access-Control-Allow-Origin": DEFAULT_TRAINING_CORS_ORIGIN,
      "Access-Control-Allow-Credentials": "true",
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((issue) => issue.includes("Referrer-Policy")));
    assert.ok(result.issues.some((issue) => issue.includes("X-Content-Type-Options")));
  });

  it("evaluateTrainingBuildTransportHeaders rejects missing CORS credentials", () => {
    const result = evaluateTrainingBuildTransportHeaders(
      {
        "Access-Control-Allow-Origin": DEFAULT_TRAINING_CORS_ORIGIN,
      },
      { requestOrigin: DEFAULT_TRAINING_CORS_ORIGIN },
    );
    assert.equal(result.ok, false);
    assert.match(result.issues.join(" "), /Access-Control-Allow-Credentials/);
  });

  it("evaluateTrainingBuildTransportHeaders rejects premature production headers", () => {
    const result = evaluateTrainingBuildTransportHeaders({
      "Strict-Transport-Security": "max-age=31536000",
      "Content-Security-Policy": "default-src 'self'",
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((issue) => issue.includes("strict-transport-security")));
    assert.ok(result.issues.some((issue) => issue.includes("content-security-policy")));
  });

  it("evaluateDisallowedOriginCorsRejection rejects reflected attacker origin", () => {
    const result = evaluateDisallowedOriginCorsRejection(
      {
        "Access-Control-Allow-Origin": "http://evil.example",
      },
      { requestOrigin: "http://evil.example" },
    );
    assert.equal(result.ok, false);
    assert.match(result.issues.join(" "), /must not be echoed/);
  });

  it("evaluateDisallowedOriginCorsRejection accepts fixed configured origin", () => {
    const result = evaluateDisallowedOriginCorsRejection(
      {
        "Access-Control-Allow-Origin": DEFAULT_TRAINING_CORS_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
      },
      { requestOrigin: "http://evil.example" },
    );
    assert.equal(result.ok, true);
  });

  it("evaluateDemoSessionSetCookieFlags requires HttpOnly SameSite=Lax without Secure", () => {
    const result = evaluateDemoSessionSetCookieFlags(
      "tdg_demo_session=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800",
    );
    assert.equal(result.ok, true);
  });

  it("evaluateDemoSessionSetCookieFlags rejects Secure on localhost HTTP", () => {
    const result = evaluateDemoSessionSetCookieFlags(
      "tdg_demo_session=abc; Path=/; HttpOnly; SameSite=Lax; Secure",
    );
    assert.equal(result.ok, false);
    assert.match(result.issues.join(" "), /Secure/);
  });
});
