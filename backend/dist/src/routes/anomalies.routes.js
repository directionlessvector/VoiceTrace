"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ctrl = __importStar(require("../controllers/anomalies.controller"));
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    try {
        const anomaly = await ctrl.createAnomaly(req.body);
        res.status(201).json(anomaly);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Unresolved — must be before /user/:userId
router.get("/user/:userId/unresolved", async (req, res) => {
    try {
        const { userId } = req.params;
        const anomalies = await ctrl.listUnresolvedAnomalies(userId);
        res.json(anomalies);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// query: isResolved, severity, anomalyType
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const q = req.query;
        const anomalies = await ctrl.listAnomalies(userId, {
            isResolved: q.isResolved !== undefined ? q.isResolved === "true" : undefined,
            severity: q.severity,
            anomalyType: q.anomalyType,
        });
        res.json(anomalies);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const anomaly = await ctrl.getAnomaly(id);
        if (!anomaly)
            return res.status(404).json({ error: "Anomaly not found" });
        res.json(anomaly);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch("/:id/resolve", async (req, res) => {
    try {
        const { id } = req.params;
        const anomaly = await ctrl.resolveAnomaly(id);
        if (!anomaly)
            return res.status(404).json({ error: "Anomaly not found" });
        res.json(anomaly);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
