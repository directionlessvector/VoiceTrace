import "dotenv/config";
import express, { Request, Response } from "express";
import pinoHttp from "pino-http";
import pino from "pino";
import express from "express";
import cors from "cors";

import usersRouter       from "./routes/users.routes";
import voiceRouter       from "./routes/voice.routes";
import ledgerRouter      from "./routes/ledger.routes";
import customersRouter   from "./routes/customers.routes";
import stockRouter       from "./routes/stock.routes";
import suppliersRouter   from "./routes/suppliers.routes";
import anomaliesRouter   from "./routes/anomalies.routes";
import intelligenceRouter from "./routes/intelligence.routes";
import alertsRouter      from "./routes/alerts.routes";
import adminRouter       from "./routes/admin.routes";

const app = express();

app.use(cors({
	origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use("/users",        usersRouter);
app.use("/voice",        voiceRouter);
app.use("/ledger",       ledgerRouter);
app.use("/customers",    customersRouter);
app.use("/stock",        stockRouter);
app.use("/suppliers",    suppliersRouter);
app.use("/anomalies",    anomaliesRouter);
app.use("/intelligence", intelligenceRouter);
app.use("/alerts",       alertsRouter);
app.use("/admin",        adminRouter);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

export default app;