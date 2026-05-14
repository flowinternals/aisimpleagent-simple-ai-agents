# Aisimpleagent

This scaffold was created by the SkipRope Foundation - Simple AI Agents pack.

It gives you the initial project structure for a single-page web app with one backend-held AI agent:

```text
React UI
  ->
HTTP / JSON
  ->
Express API
  ->
Agent Service
  ->
Provider Adapter
  ->
AI Provider or Mock Provider
```

This scaffold is intentionally a reusable starting point, not a prebuilt exercise app.

## Scripts

- `npm run dev` starts the frontend and backend together
- `npm run dev:ui` starts the Vite frontend
- `npm run dev:api` starts the Express backend
- `npm run build` builds the frontend

## Folders

- `src/` frontend UI
- `server/routes/` thin API routes
- `server/services/` agent logic
- `server/providers/` provider adapter and provider implementations
- `server/validation/` request validation helpers
- `release-notes/` install logs
