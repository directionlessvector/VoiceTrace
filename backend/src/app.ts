import path from "path";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import pinoHttp from "pino-http";
import pino from "pino";
import cors from "cors";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import authRouter        from "./routes/auth.routes";
import usersRouter       from "./routes/users.routes";
import voiceRouter       from "./routes/voice.routes";
import ledgerUploadRouter from "./routes/ledger-upload.routes";
import ledgerRouter      from "./routes/ledger.routes";
import customersRouter   from "./routes/customers.routes";
import stockRouter       from "./routes/stock.routes";
import suppliersRouter   from "./routes/suppliers.routes";
import osmSuppliersRouter from "./routes/osm-suppliers.routes";
import anomaliesRouter   from "./routes/anomalies.routes";
import intelligenceRouter from "./routes/intelligence.routes";
import insightsRouter    from "./routes/insights.routes";
import alertsRouter      from "./routes/alerts.routes";
import adminRouter       from "./routes/admin.routes";
import { bootstrapAdminFromEnv } from "./services/admin-bootstrap.service";

const app = express();

app.use(cors({
	origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next) => {
  const startedAt = Date.now();

  logger.info(
    {
      event: "request_start",
      method: req.method,
      path: req.originalUrl,
      query: req.query,
      params: req.params,
      body: req.body,
    },
    `--> ${req.method} ${req.originalUrl}`,
  );

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;

    logger.info(
      {
        event: "request_end",
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      },
      `<-- ${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`,
    );
  });

  next();
});

/* ---------- PINO LOGGER (FINAL CLEAN SETUP) ---------- */

const colorStatus = (status: number): string => {
  if (status >= 500) return `\x1b[31m${status}\x1b[0m`; // red
  if (status >= 400) return `\x1b[33m${status}\x1b[0m`; // yellow
  if (status >= 300) return `\x1b[36m${status}\x1b[0m`; // cyan
  return `\x1b[32m${status}\x1b[0m`; // green
};

const logger = pino({
  level: "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss",
      singleLine: true,
      ignore: "pid,hostname"
    }
  }
});

app.use(
  pinoHttp({
    logger,

    customLogLevel: (req, res) => {
      const status = res.statusCode ?? 200;

      if (status >= 500) return "error";
      if (status >= 400) return "warn";
      return "info";
    },

    customSuccessMessage: (req, res) => {
      const status = res.statusCode ?? 200;
      return `${req.method} ${req.url} ${colorStatus(status)}`;
    },

    customErrorMessage: (req, res) => {
      const status = res.statusCode ?? 500;
      return `${req.method} ${req.url} ${colorStatus(status)}`;
    },

    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          body: req.body
        };
      }
    }
  })
);

/* --------------------------------------------------- */

app.use("/auth",         authRouter);
app.use("/users",        usersRouter);
app.use("/voice",        voiceRouter);
app.use("/ledger-upload", ledgerUploadRouter);
app.use("/ledger",       ledgerRouter);
app.use("/customers",    customersRouter);
app.use("/stock",        stockRouter);
app.use("/suppliers",    suppliersRouter);
app.use("/api/osm-suppliers", osmSuppliersRouter);
app.use("/anomalies",    anomaliesRouter);
app.use("/intelligence", intelligenceRouter);
app.use("/api/insights", insightsRouter);
app.use("/alerts",       alertsRouter);
app.use("/admin",        adminRouter);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await bootstrapAdminFromEnv(logger);
  } catch (err: any) {
    logger.error(`Admin bootstrap failed: ${err?.message || "unknown error"}`);
  }

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

void startServer();

export default app;