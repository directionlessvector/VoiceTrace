import { Router, Request, Response } from "express";
import * as ctrl from "../controllers/intelligence.controller";

const router = Router();

// ─── Patterns ─────────────────────────────────────────────────────────────────

router.post("/patterns", async (req: Request, res: Response) => {
  try {
    const pattern = await ctrl.createPatternDetection(req.body);
    res.status(201).json(pattern);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// query: patternType
router.get("/patterns/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const q = req.query as Record<string, string>;
    const patterns = await ctrl.listPatternDetections(userId, { patternType: q.patternType as any });
    res.json(patterns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Vendor Scores ────────────────────────────────────────────────────────────

router.post("/scores", async (req: Request, res: Response) => {
  try {
    const score = await ctrl.upsertVendorScore(req.body);
    res.status(201).json(score);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Latest score — must be before /scores/user/:userId
router.get("/scores/user/:userId/latest", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const score = await ctrl.getLatestVendorScore(userId);
    if (!score) return res.status(404).json({ error: "No score found" });
    res.json(score);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/scores/user/:userId/history", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const history = await ctrl.listVendorScoreHistory(userId);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Weather Suggestions ──────────────────────────────────────────────────────

router.post("/weather", async (req: Request, res: Response) => {
  try {
    const suggestion = await ctrl.createWeatherSuggestion(req.body);
    res.status(201).json(suggestion);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/weather/user/:userId/active", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const suggestions = await ctrl.listActiveWeatherSuggestions(userId);
    res.json(suggestions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Daily Summaries ──────────────────────────────────────────────────────────

router.post("/summaries", async (req: Request, res: Response) => {
  try {
    const summary = await ctrl.createDailySummary(req.body);
    res.status(201).json(summary);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// query: limit
router.get("/summaries/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const q = req.query as Record<string, string>;
    const summaries = await ctrl.listDailySummaries(userId, q.limit ? parseInt(q.limit) : 30);
    res.json(summaries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/summaries/:id/delivered", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const { deliveredVia } = req.body;
    const summary = await ctrl.markSummaryDelivered(id, deliveredVia);
    if (!summary) return res.status(404).json({ error: "Summary not found" });
    res.json(summary);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
