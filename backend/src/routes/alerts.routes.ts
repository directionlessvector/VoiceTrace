import { Router, Request, Response } from "express";
import * as ctrl from "../controllers/alerts.controller";

const router = Router();

// ─── Alerts ───────────────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  try {
    const alert = await ctrl.createAlert(req.body);
    res.status(201).json(alert);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Read-all — must be before /user/:userId
router.patch("/user/:userId/read-all", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    await ctrl.markAllAlertsRead(userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// query: isRead, alertType, severity
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const q = req.query as Record<string, string>;
    const alerts = await ctrl.listUserAlerts(userId, {
      isRead: q.isRead !== undefined ? q.isRead === "true" : undefined,
      alertType: q.alertType as any,
      severity: q.severity as any,
    });
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const alert = await ctrl.getAlert(id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const alert = await ctrl.markAlertRead(id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Notifications ────────────────────────────────────────────────────────────

router.post("/notifications", async (req: Request, res: Response) => {
  try {
    const notification = await ctrl.createNotification(req.body);
    res.status(201).json(notification);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Pending — for background dispatch job — must be before /notifications/user/:userId
router.get("/notifications/pending", async (_req: Request, res: Response) => {
  try {
    const notifications = await ctrl.listPendingNotifications();
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// query: channel, status
router.get("/notifications/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const q = req.query as Record<string, string>;
    const notifications = await ctrl.listNotifications(userId, {
      channel: q.channel as any,
      status: q.status as any,
    });
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/notifications/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as Record<string, string>;
    const { status, providerMessageId } = req.body;
    const notification = await ctrl.updateNotificationStatus(id, status, providerMessageId);
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json(notification);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

import { sendWhatsAppMessageViaGreenApi } from "../services/greenapi";

router.post("/notifications/whatsapp/send", async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: "Phone and message are required in the request body." });
    }
    const success = await sendWhatsAppMessageViaGreenApi(phone, message);
    if (success) {
      res.json({ success: true, message: "WhatsApp message sent successfully via Green API" });
    } else {
      res.status(500).json({ error: "Failed to send WhatsApp message via Green API. Check server logs." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
