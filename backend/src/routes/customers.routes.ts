import { Router, Request, Response } from "express";
import * as ctrl from "../controllers/customers.controller";

const router = Router();

// ─── Customers ────────────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  try {
    const customer = await ctrl.createCustomer(req.body);
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// All ledger entries across all customers for this user — must be before /user/:userId
router.get("/user/:userId/ledger", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const entries = await ctrl.listAllCustomerLedger(userId);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Customers with balance + last txn date — must be before /user/:userId
router.get("/user/:userId/summary", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const summary = await ctrl.listCustomerSummary(userId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// All customer balances for a vendor — must be before /user/:userId
router.get("/user/:userId/balances", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const balances = await ctrl.listCustomerBalances(userId);
    res.json(balances);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const customers = await ctrl.listCustomers(userId);
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const customer = await ctrl.getCustomer(id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const customer = await ctrl.updateCustomer(id, req.body);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const customer = await ctrl.deleteCustomer(id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json({ deleted: true, id: customer.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Customer Ledger ──────────────────────────────────────────────────────────

router.post("/:id/ledger", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const entry = await ctrl.createCustomerLedgerEntry({ customerId: id, ...req.body });
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id/ledger", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const entries = await ctrl.getCustomerLedger(id);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/balance", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const balance = await ctrl.getCustomerBalance(id);
    res.json(balance);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
