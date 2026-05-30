import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDemoSessionCookieHeader,
  extractSessionCookie,
} from "./demoAuthRegressionClient.mjs";

describe("demoAuthRegressionClient", () => {
  it("extractSessionCookie reads tdg_demo_session from Set-Cookie", () => {
    const value = extractSessionCookie(
      "tdg_demo_session=abc-123; Path=/; HttpOnly; SameSite=Lax",
    );
    assert.equal(value, "abc-123");
  });

  it("extractSessionCookie decodes encoded session values", () => {
    const value = extractSessionCookie(["tdg_demo_session=hello%2Fworld; Path=/"]);
    assert.equal(value, "hello/world");
  });

  it("extractSessionCookie returns empty when cookie is missing", () => {
    assert.equal(extractSessionCookie(null), "");
    assert.equal(extractSessionCookie("other=value; Path=/"), "");
  });

  it("buildDemoSessionCookieHeader encodes session id for Cookie header", () => {
    assert.equal(buildDemoSessionCookieHeader("id/with/slash"), "tdg_demo_session=id%2Fwith%2Fslash");
  });
});
