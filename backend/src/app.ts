import "dotenv/config";
import express from "express";

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

app.use(express.json());

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

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

export default app;
