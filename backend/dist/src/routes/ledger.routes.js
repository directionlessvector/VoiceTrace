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
const ctrl = __importStar(require("../controllers/ledger.controller"));
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    try {
        const entry = await ctrl.createLedgerEntry(req.body);
        res.status(201).json(entry);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Earnings summary — must be before /user/:userId to avoid conflict
router.get("/user/:userId/summary", async (req, res) => {
    try {
        const { userId } = req.params;
        const q = req.query;
        if (!q.fromDate || !q.toDate)
            return res.status(400).json({ error: "fromDate and toDate are required" });
        const summary = await ctrl.getEarningsSummary(userId, q.fromDate, q.toDate);
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// List entries — query: entryType, source, fromDate, toDate
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const q = req.query;
        const entries = await ctrl.listUserLedgerEntries(userId, {
            entryType: q.entryType,
            source: q.source,
            fromDate: q.fromDate,
            toDate: q.toDate,
        });
        res.json(entries);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await ctrl.getLedgerEntry(id);
        if (!entry)
            return res.status(404).json({ error: "Entry not found" });
        res.json(entry);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await ctrl.updateLedgerEntry(id, req.body);
        if (!entry)
            return res.status(404).json({ error: "Entry not found" });
        res.json(entry);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await ctrl.deleteLedgerEntry(id);
        if (!entry)
            return res.status(404).json({ error: "Entry not found" });
        res.json({ deleted: true, id: entry.id });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
