"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const pino_http_1 = __importDefault(require("pino-http"));
const pino_1 = __importDefault(require("pino"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const voice_routes_1 = __importDefault(require("./routes/voice.routes"));
const ledger_upload_routes_1 = __importDefault(require("./routes/ledger-upload.routes"));
const ledger_routes_1 = __importDefault(require("./routes/ledger.routes"));
const customers_routes_1 = __importDefault(require("./routes/customers.routes"));
const stock_routes_1 = __importDefault(require("./routes/stock.routes"));
const suppliers_routes_1 = __importDefault(require("./routes/suppliers.routes"));
const osm_suppliers_routes_1 = __importDefault(require("./routes/osm-suppliers.routes"));
const anomalies_routes_1 = __importDefault(require("./routes/anomalies.routes"));
const intelligence_routes_1 = __importDefault(require("./routes/intelligence.routes"));
const insights_routes_1 = __importDefault(require("./routes/insights.routes"));
const alerts_routes_1 = __importDefault(require("./routes/alerts.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    const startedAt = Date.now();
    logger.info({
        event: "request_start",
        method: req.method,
        path: req.originalUrl,
        query: req.query,
        params: req.params,
        body: req.body,
    }, `--> ${req.method} ${req.originalUrl}`);
    res.on("finish", () => {
        const durationMs = Date.now() - startedAt;
        logger.info({
            event: "request_end",
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs,
        }, `<-- ${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`);
    });
    next();
});
/* ---------- PINO LOGGER (FINAL CLEAN SETUP) ---------- */
const colorStatus = (status) => {
    if (status >= 500)
        return `\x1b[31m${status}\x1b[0m`; // red
    if (status >= 400)
        return `\x1b[33m${status}\x1b[0m`; // yellow
    if (status >= 300)
        return `\x1b[36m${status}\x1b[0m`; // cyan
    return `\x1b[32m${status}\x1b[0m`; // green
};
const logger = (0, pino_1.default)({
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
app.use((0, pino_http_1.default)({
    logger,
    customLogLevel: (req, res) => {
        const status = res.statusCode ?? 200;
        if (status >= 500)
            return "error";
        if (status >= 400)
            return "warn";
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
}));
/* --------------------------------------------------- */
app.use("/auth", auth_routes_1.default);
app.use("/users", users_routes_1.default);
app.use("/voice", voice_routes_1.default);
app.use("/ledger-upload", ledger_upload_routes_1.default);
app.use("/ledger", ledger_routes_1.default);
app.use("/customers", customers_routes_1.default);
app.use("/stock", stock_routes_1.default);
app.use("/suppliers", suppliers_routes_1.default);
app.use("/api/osm-suppliers", osm_suppliers_routes_1.default);
app.use("/anomalies", anomalies_routes_1.default);
app.use("/intelligence", intelligence_routes_1.default);
app.use("/api/insights", insights_routes_1.default);
app.use("/alerts", alerts_routes_1.default);
app.use("/admin", admin_routes_1.default);
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
});
exports.default = app;
