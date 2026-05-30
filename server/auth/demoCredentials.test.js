import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getDemoCredentials, verifyDemoCredentials } from "./demoCredentials.js";

describe("demoCredentials", () => {
  const originalUserId = process.env.DEMO_USER_ID;
  const originalPassword = process.env.DEMO_PASSWORD;

  afterEach(() => {
    if (originalUserId === undefined) {
      delete process.env.DEMO_USER_ID;
    } else {
      process.env.DEMO_USER_ID = originalUserId;
    }
    if (originalPassword === undefined) {
      delete process.env.DEMO_PASSWORD;
    } else {
      process.env.DEMO_PASSWORD = originalPassword;
    }
  });

  it("returns null when demo credentials are missing", () => {
    delete process.env.DEMO_USER_ID;
    delete process.env.DEMO_PASSWORD;
    assert.equal(getDemoCredentials(), null);
  });

  it("accepts matching demo credentials", () => {
    process.env.DEMO_USER_ID = "demo-user";
    process.env.DEMO_PASSWORD = "demo-pass";
    const result = verifyDemoCredentials("demo-user", "demo-pass");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.userId, "demo-user");
    }
  });

  it("rejects invalid demo credentials", () => {
    process.env.DEMO_USER_ID = "demo-user";
    process.env.DEMO_PASSWORD = "demo-pass";
    const result = verifyDemoCredentials("demo-user", "wrong");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "INVALID");
    }
  });
});
