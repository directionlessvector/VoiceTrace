import { Router, Request, Response } from "express";
import * as ctrl from "../controllers/suppliers.controller";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const supplier = await ctrl.createSupplier(req.body);
    res.status(201).json(supplier);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Mapped suppliers (with lat/lng) — must be before /user/:userId
router.get("/user/:userId/mapped", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const suppliers = await ctrl.listMappedSuppliers(userId);
    res.json(suppliers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// query: category, locationSource
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const q = req.query as Record<string, string>;
    const suppliers = await ctrl.listSuppliers(userId, {
      category: q.category,
      locationSource: q.locationSource as any,
    });
    res.json(suppliers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const supplier = await ctrl.getSupplier(id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const supplier = await ctrl.updateSupplier(id, req.body);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const supplier = await ctrl.deleteSupplier(id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json({ deleted: true, id: supplier.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
