import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clearDemoSessionCookie, setDemoSessionCookie } from "./demoSessionCookie.js";

describe("demoSessionCookie", () => {
  it("setDemoSessionCookie emits HttpOnly SameSite=Lax cookie without Secure", () => {
    /** @type {Record<string, string>} */
    const headers = {};
    const response = {
      setHeader(name, value) {
        headers[name] = value;
      },
    };
    setDemoSessionCookie(response, "session-123");
    const cookie = headers["Set-Cookie"];
    assert.match(cookie, /^tdg_demo_session=session-123;/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.doesNotMatch(cookie, /;\s*Secure(?:;|$)/);
  });

  it("clearDemoSessionCookie clears the demo session with Max-Age=0", () => {
    /** @type {Record<string, string>} */
    const headers = {};
    const response = {
      setHeader(name, value) {
        headers[name] = value;
      },
    };
    clearDemoSessionCookie(response);
    const cookie = headers["Set-Cookie"];
    assert.match(cookie, /^tdg_demo_session=;/);
    assert.match(cookie, /Max-Age=0/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
  });
});
