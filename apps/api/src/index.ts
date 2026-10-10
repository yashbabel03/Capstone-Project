import fs from "node:fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { connectDb } from "./db.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { documentsRouter } from "./routes/documents.js";
import { assistantRouter } from "./routes/assistant.js";
import { incidentsRouter } from "./routes/incidents.js";
import { analyticsRouter } from "./routes/analytics.js";
import { iotRouter } from "./routes/iot.js";
import { aiHealth } from "./services/ai.js";

fs.mkdirSync(config.uploadDir, { recursive: true });

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: config.webOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use("/api/assistant/query", rateLimit({ windowMs: 60 * 1000, max: 40 }));

app.get("/health", async (_req, res) => {
  const ai = await aiHealth();
  res.json({ ok: true, service: "restaurantops-api", ai });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/assistant", assistantRouter);
app.use("/api/incidents", incidentsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/iot", iotRouter);

app.use(errorHandler);

await connectDb();
app.listen(config.port, () => {
  console.log(`RestaurantOps API on :${config.port}`);
});
