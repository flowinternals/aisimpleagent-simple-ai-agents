import cors from "cors";
import express from "express";
import { HttpError } from "./httpError.js";
import { generationRouter } from "./routes/generationRoutes.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "2mb" }));

app.use((error, _request, response, next) => {
  const isJsonBodyParseFailure =
    error?.status === 400 &&
    (error.type === "entity.parse.failed" ||
      (error instanceof SyntaxError && "body" in error));

  if (isJsonBodyParseFailure) {
    return response.status(400).json({
      ok: false,
      error: "Request body must be valid JSON.",
      code: "INVALID_JSON",
      issues: [],
    });
  }
  return next(error);
});

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", providerMode: process.env.AI_PROVIDER_MODE || "mock" });
});

app.use("/api/generate", generationRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error instanceof HttpError) {
    return response.status(error.status).json({
      ok: false,
      error: error.message,
      code: error.code,
      issues: [],
    });
  }
  const status = typeof error?.status === "number" && error.status >= 400 ? error.status : 500;
  const message =
    status >= 500
      ? "An unexpected error occurred while handling the request."
      : "The request could not be completed.";
  return response.status(status).json({
    ok: false,
    error: message,
    code: status >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED",
    issues: [],
  });
});

const server = app.listen(port, () => {
  console.log(`Simple AI Agents API listening on http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the other process, set PORT to a free port, or run "npm run dev" (it picks a free port when PORT is unset).`,
    );
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
