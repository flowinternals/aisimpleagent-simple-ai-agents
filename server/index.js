import cors from "cors";
import express from "express";
 import { generationRouter } from "./routes/generationRoutes.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", providerMode: process.env.AI_PROVIDER_MODE || "mock" });
});

app.use("/api/generate", generationRouter);

app.listen(port, () => {
  console.log(`Simple AI Agents API listening on http://localhost:${port}`);
});
