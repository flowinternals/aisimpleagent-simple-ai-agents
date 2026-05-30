# Tests

This folder is the long-term home for **reusable, cross-cutting test assets** in the main repository. The goal is clearer organisation, not a change in product behaviour or a rewrite of the test stack.

## Layout

| Path | Purpose |
|------|---------|
| [`e2e/`](./e2e/) | Runnable end-to-end flows that exercise the full product path (UI, HTTP API, providers, preview, download). Browser automation and full-stack smoke tests belong here when added. |
| [`regression/`](./regression/) | Smaller reusable checks that guard behaviour across releases: HTTP smoke scripts, contract checks against a running server, and similar gates that are not tied to a single source file. |
| [`fixtures/`](./fixtures/) | Shared prompts, request bodies, sample inputs, and reference artifacts used by tests in this tree (and optionally by scripts under `tests/regression/`). |

## npm scripts (unchanged commands)

| Command | What it runs |
|---------|----------------|
| `npm test` | Colocated Node unit tests (`shared/`, `server/`, `tests/regression/lib/`) plus Vitest (`src/`) |
| `npm run test:unit` | Node unit tests only (`shared/`, `server/`, `tests/regression/lib/`) |
| `npm run test:readiness` | Mock HTTP regression gate: `tests/regression/verify-generation-readiness.mjs` (requires demo sign-in env + running API) |
| `npm run test:readiness:live` | Optional OpenAI live smoke (requires running API + credentials) |
| `npm run test:auth` | Demo sign-in regression gate: wrong sign-in, correct sign-in + session, signed-out protected route, sign-out (`npm run test:auth` → `tests/regression/verify-demo-auth.mjs`) |
| `npm run test:authorization` | Protected `POST /api/generate` authorization regression: signed-out, invalid/cleared session, signed-in allow, body permission-claims rejected (`tests/regression/verify-authorization.mjs`) |
| `npm run test:abuse` | Abuse-control regression: unsigned block, oversized prompt/JSON rejection, training-build burst posture (`tests/regression/verify-abuse-controls.mjs`) |
| `npm run test:secrets` | Secret-exposure regression: `.env.example` / `.env.local` discipline + Gitleaks tracked + history (no server; requires Gitleaks) |

`test:readiness`, `test:auth`, `test:authorization`, and `test:abuse` expect the dev API at `http://127.0.0.1:8787` by default (`VERIFY_API_BASE` overrides) and `DEMO_USER_ID` / `DEMO_PASSWORD` matching the server's `.env.local`.

## Where tests live today

### In this tree (reusable / cross-cutting)

- **`tests/regression/verify-generation-readiness.mjs`** — demo sign-in + health check + mock `POST /api/generate`; optional `--live` OpenAI smoke.
- **`tests/regression/verify-demo-auth.mjs`** — reusable demo sign-in regression gate (`npm run test:auth`); orchestrates checks in `tests/regression/lib/runDemoAuthRegression.mjs`.
- **`tests/regression/verify-authorization.mjs`** — protected-route authorization regression gate (`npm run test:authorization`); orchestrates checks in `tests/regression/lib/runAuthorizationRegression.mjs`.
- **`tests/regression/verify-abuse-controls.mjs`** — abuse-control regression gate (`npm run test:abuse`); orchestrates checks in `tests/regression/lib/runAbuseControlRegression.mjs` with assertions in `tests/regression/lib/abuseControlAssertions.mjs`.
- **`tests/regression/lib/demoAuthRegressionClient.mjs`** — HTTP/cookie helpers for auth regression; unit-tested in `tests/regression/lib/demoAuthRegressionClient.test.js`.
- **`tests/regression/lib/runAuthorizationRegression.mjs`** — route-level `POST /api/generate` authorization checks (signed-out, invalid/cleared session, signed-in allow, body claims).
- **`tests/regression/verify-secret-exposure.mjs`** — `.env.example` placeholders, `.env.local` gitignore/tracking, Gitleaks tracked-surface + git-history scans (commit/push surface).
- **`tests/fixtures/generation-prompts.json`** — shared prompts for regression scripts.
- **`tests/e2e/`** — passive review reports and future browser/full-stack E2E assets.

### Colocated with code (intentionally left in place)

These are **fast, file-local unit tests**. They stay next to the modules they cover so imports and tooling stay simple. Do not move them without a dedicated migration.

| Location | Runner | Count (approx.) |
|----------|--------|-----------------|
| `shared/*.test.js` | Node `node --test` | Shared validation, preview, image config |
| `server/**/*.test.js` | Node `node --test` | Server config, request validation |
| `src/**/*.test.ts` | Vitest | Frontend types, UI helpers, preview errors |

Configuration:

- `vitest.config.ts` — `include: ["src/**/*.test.ts"]`
- `package.json` — `test` / `test:unit` globs for Node tests

### Application scripts (not tests)

- `scripts/dev.mjs` — local dev orchestration (stays under `scripts/`).

## Default placement for new work

| Kind of test | Put it here |
|--------------|-------------|
| Browser or full UI → API → provider flow | `tests/e2e/` |
| HTTP smoke, release gate, multi-module contract check | `tests/regression/` |
| Shared prompt, payload, golden file, sample response | `tests/fixtures/` |
| Pure function / module unit test | Next to the module (`*.test.js` / `*.test.ts`) |

## Transition notes

- **`scripts/verify-generation-readiness.mjs`** remains as a thin re-export for anyone invoking the old path; new work should use `tests/regression/` or `npm run test:readiness`.
- **No browser E2E runner** is configured yet; `tests/e2e/` currently holds review artifacts (e.g. `e2e-review-report-*.md`). Add Playwright or similar here when ready, without moving colocated unit tests.
- **High-value gaps** called out in the latest e2e review: provider adapter tests, route-level in-process tests, Google live readiness, minimal browser smoke. Prefer adding new coverage in the appropriate folder above rather than scattering one-off scripts.

## Principles

1. **Consolidation, not redesign** — same runners (Node test, Vitest), same npm script names.
2. **No behaviour change** — moves are organisational; test and app logic are unchanged unless a bug is being fixed separately.
3. **Move when safe** — prefer colocated unit tests until a check is clearly shared or needs a running server / browser.
