import "./config/loadEnvFiles.js";
import cors from "cors";
import express from "express";
import { HttpError } from "./httpError.js";
import {
  getGenerationProviderConfig,
  getGoogleRuntimeLogSummary,
} from "./config/providerRuntimeConfig.js";
import { authRouter } from "./routes/authRoutes.js";
import { generationRouter } from "./routes/generationRoutes.js";
import { requireDemoSession } from "./middleware/requireDemoSession.js";
import { applyTrainingTransportHeaders } from "./middleware/applyTrainingTransportHeaders.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(applyTrainingTransportHeaders);
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
  const { liveOpenAi, liveGoogle } = getGenerationProviderConfig();
  response.json({
    status: "ok",
    liveOpenAi,
    liveGoogle,
    /** True when mock and API process are up; live vendors additionally require their `ready` flags. */
    mockReady: true,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/generate", requireDemoSession, generationRouter);

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
  const { liveOpenAi, liveGoogle } = getGenerationProviderConfig();
  const googleRuntime = getGoogleRuntimeLogSummary();
  console.log(`Simple AI Agents API listening on http://localhost:${port}`);
  console.info("Live provider readiness at startup", {
    liveOpenAi: {
      configured: liveOpenAi.configured,
      ready: liveOpenAi.ready,
      imageModel: liveOpenAi.imageModel,
      reason: liveOpenAi.reason ?? undefined,
    },
    liveGoogle: {
      configured: liveGoogle.configured,
      credentialsPresent: liveGoogle.credentialsPresent,
      settingsValid: liveGoogle.settingsValid,
      likelyReadyForLiveTest: liveGoogle.likelyReadyForLiveTest,
      readinessLevel: liveGoogle.readinessLevel,
      imageModel: liveGoogle.imageModel,
      baseUrlHost: liveGoogle.baseUrlHost,
      requestPath: liveGoogle.requestPath,
      authMethod: liveGoogle.authMethod,
      projectName: liveGoogle.projectName ?? undefined,
      projectNumber: liveGoogle.projectNumber ?? undefined,
      reason: liveGoogle.reason ?? undefined,
    },
    googleRuntime,
  });
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
