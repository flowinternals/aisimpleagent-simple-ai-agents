import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearDemoSessionsForTests,
  createDemoSession,
  destroyDemoSession,
  getDemoSession,
} from "./demoSessionStore.js";

describe("demoSessionStore", () => {
  beforeEach(() => {
    clearDemoSessionsForTests();
  });

  it("creates and reads a demo session", () => {
    const sessionId = createDemoSession("demo-user");
    const session = getDemoSession(sessionId);
    assert.ok(session);
    assert.equal(session.userId, "demo-user");
  });

  it("returns null for unknown session ids", () => {
    assert.equal(getDemoSession("missing"), null);
  });

  it("destroys a demo session", () => {
    const sessionId = createDemoSession("demo-user");
    destroyDemoSession(sessionId);
    assert.equal(getDemoSession(sessionId), null);
  });
});
