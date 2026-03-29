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
const ctrl = __importStar(require("../controllers/intelligence.controller"));
const router = (0, express_1.Router)();
// ─── Patterns ─────────────────────────────────────────────────────────────────
router.post("/patterns", async (req, res) => {
    try {
        const pattern = await ctrl.createPatternDetection(req.body);
        res.status(201).json(pattern);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// query: patternType
router.get("/patterns/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const q = req.query;
        const patterns = await ctrl.listPatternDetections(userId, { patternType: q.patternType });
        res.json(patterns);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── Vendor Scores ────────────────────────────────────────────────────────────
router.post("/scores", async (req, res) => {
    try {
        const score = await ctrl.upsertVendorScore(req.body);
        res.status(201).json(score);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Latest score — must be before /scores/user/:userId
router.get("/scores/user/:userId/latest", async (req, res) => {
    try {
        const { userId } = req.params;
        const score = await ctrl.getLatestVendorScore(userId);
        if (!score)
            return res.status(404).json({ error: "No score found" });
        res.json(score);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/scores/user/:userId/history", async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await ctrl.listVendorScoreHistory(userId);
        res.json(history);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── Weather Suggestions ──────────────────────────────────────────────────────
router.post("/weather", async (req, res) => {
    try {
        const suggestion = await ctrl.createWeatherSuggestion(req.body);
        res.status(201).json(suggestion);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get("/weather/user/:userId/active", async (req, res) => {
    try {
        const { userId } = req.params;
        const suggestions = await ctrl.listActiveWeatherSuggestions(userId);
        res.json(suggestions);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── Daily Summaries ──────────────────────────────────────────────────────────
router.post("/summaries", async (req, res) => {
    try {
        const summary = await ctrl.createDailySummary(req.body);
        res.status(201).json(summary);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// query: limit
router.get("/summaries/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const q = req.query;
        const summaries = await ctrl.listDailySummaries(userId, q.limit ? parseInt(q.limit) : 30);
        res.json(summaries);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch("/summaries/:id/delivered", async (req, res) => {
    try {
        const { id } = req.params;
        const { deliveredVia } = req.body;
        const summary = await ctrl.markSummaryDelivered(id, deliveredVia);
        if (!summary)
            return res.status(404).json({ error: "Summary not found" });
        res.json(summary);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
