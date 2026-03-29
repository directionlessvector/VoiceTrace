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
const ctrl = __importStar(require("../controllers/stock.controller"));
const router = (0, express_1.Router)();
// ─── Stock Items ──────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const item = await ctrl.createStockItem(req.body);
        res.status(201).json(item);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Low stock items — must be before /user/:userId
router.get("/user/:userId/low", async (req, res) => {
    try {
        const { userId } = req.params;
        const items = await ctrl.getLowStockItems(userId);
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const items = await ctrl.listStockItems(userId);
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── Stock Movements — must be before /:id ────────────────────────────────────
router.post("/movements", async (req, res) => {
    try {
        const movement = await ctrl.createStockMovement(req.body);
        res.status(201).json(movement);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// query: stockItemId, movementType
router.get("/movements/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const q = req.query;
        const movements = await ctrl.listStockMovements(userId, {
            stockItemId: q.stockItemId,
            movementType: q.movementType,
        });
        res.json(movements);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── Single item ops ──────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const item = await ctrl.getStockItem(id);
        if (!item)
            return res.status(404).json({ error: "Stock item not found" });
        res.json(item);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const item = await ctrl.updateStockItem(id, req.body);
        if (!item)
            return res.status(404).json({ error: "Stock item not found" });
        res.json(item);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const item = await ctrl.deleteStockItem(id);
        if (!item)
            return res.status(404).json({ error: "Stock item not found" });
        res.json({ deleted: true, id: item.id });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
