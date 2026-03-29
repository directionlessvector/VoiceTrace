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
const ctrl = __importStar(require("../controllers/customers.controller"));
const router = (0, express_1.Router)();
// ─── Customers ────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const customer = await ctrl.createCustomer(req.body);
        res.status(201).json(customer);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// All ledger entries across all customers for this user — must be before /user/:userId
router.get("/user/:userId/ledger", async (req, res) => {
    try {
        const { userId } = req.params;
        const entries = await ctrl.listAllCustomerLedger(userId);
        res.json(entries);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Customers with balance + last txn date — must be before /user/:userId
router.get("/user/:userId/summary", async (req, res) => {
    try {
        const { userId } = req.params;
        const summary = await ctrl.listCustomerSummary(userId);
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// All customer balances for a vendor — must be before /user/:userId
router.get("/user/:userId/balances", async (req, res) => {
    try {
        const { userId } = req.params;
        const balances = await ctrl.listCustomerBalances(userId);
        res.json(balances);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const customers = await ctrl.listCustomers(userId);
        res.json(customers);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await ctrl.getCustomer(id);
        if (!customer)
            return res.status(404).json({ error: "Customer not found" });
        res.json(customer);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await ctrl.updateCustomer(id, req.body);
        if (!customer)
            return res.status(404).json({ error: "Customer not found" });
        res.json(customer);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await ctrl.deleteCustomer(id);
        if (!customer)
            return res.status(404).json({ error: "Customer not found" });
        res.json({ deleted: true, id: customer.id });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── Customer Ledger ──────────────────────────────────────────────────────────
router.post("/:id/ledger", async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await ctrl.createCustomerLedgerEntry({ customerId: id, ...req.body });
        res.status(201).json(entry);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get("/:id/ledger", async (req, res) => {
    try {
        const { id } = req.params;
        const entries = await ctrl.getCustomerLedger(id);
        res.json(entries);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/:id/balance", async (req, res) => {
    try {
        const { id } = req.params;
        const balance = await ctrl.getCustomerBalance(id);
        res.json(balance);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
