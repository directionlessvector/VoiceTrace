import { Router, Request, Response } from "express";
import * as ctrl from "../controllers/anomalies.controller";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const anomaly = await ctrl.createAnomaly(req.body);
    res.status(201).json(anomaly);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Unresolved — must be before /user/:userId
router.get("/user/:userId/unresolved", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const anomalies = await ctrl.listUnresolvedAnomalies(userId);
    res.json(anomalies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// query: isResolved, severity, anomalyType
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const q = req.query as Record<string, string>;
    const anomalies = await ctrl.listAnomalies(userId, {
      isResolved: q.isResolved !== undefined ? q.isResolved === "true" : undefined,
      severity: q.severity as any,
      anomalyType: q.anomalyType as any,
    });
    res.json(anomalies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const anomaly = await ctrl.getAnomaly(id);
    if (!anomaly) return res.status(404).json({ error: "Anomaly not found" });
    res.json(anomaly);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const anomaly = await ctrl.resolveAnomaly(id);
    if (!anomaly) return res.status(404).json({ error: "Anomaly not found" });
    res.json(anomaly);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
