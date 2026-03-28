import { Router, Request, Response } from "express";
import * as ctrl from "../controllers/stock.controller";

const router = Router();

// ─── Stock Items ──────────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  try {
    const item = await ctrl.createStockItem(req.body);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Low stock items — must be before /user/:userId
router.get("/user/:userId/low", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const items = await ctrl.getLowStockItems(userId);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const items = await ctrl.listStockItems(userId);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Stock Movements — must be before /:id ────────────────────────────────────

router.post("/movements", async (req: Request, res: Response) => {
  try {
    const movement = await ctrl.createStockMovement(req.body);
    res.status(201).json(movement);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// query: stockItemId, movementType
router.get("/movements/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const q = req.query as Record<string, string>;
    const movements = await ctrl.listStockMovements(userId, {
      stockItemId: q.stockItemId,
      movementType: q.movementType as any,
    });
    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Single item ops ──────────────────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const item = await ctrl.getStockItem(id);
    if (!item) return res.status(404).json({ error: "Stock item not found" });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const item = await ctrl.updateStockItem(id, req.body);
    if (!item) return res.status(404).json({ error: "Stock item not found" });
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const item = await ctrl.deleteStockItem(id);
    if (!item) return res.status(404).json({ error: "Stock item not found" });
    res.json({ deleted: true, id: item.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
