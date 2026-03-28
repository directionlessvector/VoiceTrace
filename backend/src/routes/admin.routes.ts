import { Router, Request, Response } from "express";
import * as ctrl from "../controllers/admin.controller";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const result = await ctrl.loginAdmin(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await ctrl.getVendorStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/vendors/registrations", async (_req: Request, res: Response) => {
  try {
    const data = await ctrl.getRegistrationsByMonth();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/vendors", async (_req: Request, res: Response) => {
  try {
    const vendors = await ctrl.getVendorProfiles();
    res.json(vendors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/logs", async (req: Request, res: Response) => {
  try {
    const log = await ctrl.logActivity(req.body);
    res.status(201).json(log);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// query: userId, adminUserId, limit
router.get("/logs", async (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const logs = await ctrl.listActivityLogs(
      { userId: q.userId, adminUserId: q.adminUserId },
      q.limit ? parseInt(q.limit) : 100
    );
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
