import { Router, Request, Response } from "express";
import * as ctrl from "../controllers/ledger.controller";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const entry = await ctrl.createLedgerEntry(req.body);
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Earnings summary — must be before /user/:userId to avoid conflict
router.get("/user/:userId/summary", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const q = req.query as Record<string, string>;
    if (!q.fromDate || !q.toDate)
      return res.status(400).json({ error: "fromDate and toDate are required" });
    const summary = await ctrl.getEarningsSummary(userId, q.fromDate, q.toDate);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List entries — query: entryType, source, fromDate, toDate
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const q = req.query as Record<string, string>;
    const entries = await ctrl.listUserLedgerEntries(userId, {
      entryType: q.entryType as any,
      source: q.source as any,
      fromDate: q.fromDate,
      toDate: q.toDate,
    });
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const entry = await ctrl.getLedgerEntry(id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const entry = await ctrl.updateLedgerEntry(id, req.body);
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const entry = await ctrl.deleteLedgerEntry(id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json({ deleted: true, id: entry.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
