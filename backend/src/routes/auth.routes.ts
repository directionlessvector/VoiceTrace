import { Router, Request, Response } from "express";
import * as ctrl from "../controllers/auth.controller";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const result = await ctrl.register(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const result = await ctrl.login(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

export default router;
