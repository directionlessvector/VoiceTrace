import { Router, Request, Response } from "express";
import multer from "multer";
import * as ctrl from "../controllers/users.controller";
import { uploadImageToCloudinary } from "../services/cloudinary-upload.service";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const user = await ctrl.createUser(req.body);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const isActive = q.isActive !== undefined ? q.isActive === "true" : undefined;
    const users = await ctrl.listAllUsers({ isActive });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/phone/:phone", async (req: Request, res: Response) => {
  try {
    const { phone } = req.params as Record<string, string>;
    const user = await ctrl.getUserByPhone(phone);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const user = await ctrl.getUserById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const user = await ctrl.updateUser(id, req.body);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/profile-image", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    if (!req.file) {
      return res.status(400).json({ error: "image file is required (form field: image)" });
    }

    const imageAsset = await uploadImageToCloudinary({
      buffer: req.file.buffer,
      originalFilename: req.file.originalname,
    });

    const user = await ctrl.updateUser(id, { profileImageUrl: imageAsset.cloudinaryUrl });
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      ok: true,
      imageUrl: imageAsset.cloudinaryUrl,
      user,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to upload profile image" });
  }
});

router.patch("/:id/active", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const { isActive } = req.body;
    const user = await ctrl.toggleUserActive(id, isActive);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
