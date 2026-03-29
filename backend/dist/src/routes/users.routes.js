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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const ctrl = __importStar(require("../controllers/users.controller"));
const cloudinary_upload_service_1 = require("../services/cloudinary-upload.service");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
});
router.post("/", async (req, res) => {
    try {
        const user = await ctrl.createUser(req.body);
        res.status(201).json(user);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get("/", async (req, res) => {
    try {
        const q = req.query;
        const isActive = q.isActive !== undefined ? q.isActive === "true" : undefined;
        const users = await ctrl.listAllUsers({ isActive });
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/phone/:phone", async (req, res) => {
    try {
        const { phone } = req.params;
        const user = await ctrl.getUserByPhone(phone);
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const user = await ctrl.getUserById(id);
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const user = await ctrl.updateUser(id, req.body);
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.json(user);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post("/:id/profile-image", upload.single("image"), async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: "image file is required (form field: image)" });
        }
        const imageAsset = await (0, cloudinary_upload_service_1.uploadImageToCloudinary)({
            buffer: req.file.buffer,
            originalFilename: req.file.originalname,
        });
        const user = await ctrl.updateUser(id, { profileImageUrl: imageAsset.cloudinaryUrl });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        return res.json({
            ok: true,
            imageUrl: imageAsset.cloudinaryUrl,
            user,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to upload profile image" });
    }
});
router.patch("/:id/active", async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const user = await ctrl.toggleUserActive(id, isActive);
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.json(user);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
