import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assessTrainingBuildAuditPosture,
  serverIndexForbiddenRouteMarker,
  serverIndexHasExpectedRouteMarkers,
  trackedPathsExcludeReleaseLeftovers,
} from "./releaseHygieneAssertions.mjs";

describe("releaseHygieneAssertions audit posture", () => {
  it("accepts documented vite and esbuild moderate deferrals when present", () => {
    const result = assessTrainingBuildAuditPosture({
      vite: { severity: "moderate" },
      esbuild: { severity: "moderate" },
    });
    assert.equal(result.ok, true);
  });

  it("accepts improved audit posture with no open advisories", () => {
    const result = assessTrainingBuildAuditPosture({});
    assert.equal(result.ok, true);
  });

  it("accepts improved audit posture when only one documented deferral remains", () => {
    const result = assessTrainingBuildAuditPosture({
      vite: { severity: "moderate" },
    });
    assert.equal(result.ok, true);
  });

  it("rejects unexpected moderate advisories outside documented deferrals", () => {
    const result = assessTrainingBuildAuditPosture({
      leftpad: { severity: "moderate" },
    });
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /unexpected moderate/);
  });

  it("rejects qs reappearing in audit report", () => {
    const result = assessTrainingBuildAuditPosture({
      qs: { severity: "moderate" },
      vite: { severity: "moderate" },
      esbuild: { severity: "moderate" },
    });
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /qs/);
  });

  it("rejects high or critical advisories", () => {
    const result = assessTrainingBuildAuditPosture({
      lodash: { severity: "high" },
      vite: { severity: "moderate" },
      esbuild: { severity: "moderate" },
    });
    assert.equal(result.ok, false);
  });
});

describe("releaseHygieneAssertions server route posture", () => {
  it("expects health, auth, and generate mounts", () => {
    const sample = `
      app.get("/api/health", () => {});
      app.use("/api/auth", authRouter);
      app.use("/api/generate", requireDemoSession, generationRouter);
    `;
    assert.equal(serverIndexHasExpectedRouteMarkers(sample), true);
  });

  it("flags forbidden debug route markers", () => {
    assert.equal(serverIndexForbiddenRouteMarker('app.get("/api/debug"'), "/api/debug");
    assert.equal(serverIndexForbiddenRouteMarker('app.get("/api/health"'), null);
  });
});

describe("releaseHygieneAssertions tracked release leftovers", () => {
  it("rejects tracked env.local, dist, or backup extensions", () => {
    assert.equal(
      trackedPathsExcludeReleaseLeftovers("package.json\n.env.local\n"),
      false,
    );
    assert.equal(trackedPathsExcludeReleaseLeftovers("package.json\npackage-lock.json\n"), true);
  });
});
