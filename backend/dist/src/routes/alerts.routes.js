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
const drizzle_orm_1 = require("drizzle-orm");
const twilio_1 = __importDefault(require("twilio"));
const ctrl = __importStar(require("../controllers/alerts.controller"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const router = (0, express_1.Router)();
function normalizePhoneNumber(raw) {
    const cleaned = raw.replace(/\s+/g, "").trim();
    const digits = cleaned.replace(/\D+/g, "");
    if (digits.length === 10)
        return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91"))
        return `+${digits}`;
    if (cleaned.startsWith("+"))
        return `+${digits}`;
    return cleaned;
}
function toGreenApiChatId(phone) {
    const digits = phone.replace(/\D+/g, "");
    return `${digits}@c.us`;
}
async function sendWhatsAppViaGreenApi(targetPhone, message) {
    const hostUrl = process.env.GREENAPI_HOST_URL?.trim();
    const idInstance = process.env.GREENAPI_ID_INSTANCE?.trim();
    const apiToken = process.env.GREENAPI_API_TOKEN_INSTANCE?.trim();
    const hasPlaceholderValues = [idInstance, apiToken].some((v) => !!v && v.startsWith("your_"));
    if (!hostUrl || !idInstance || !apiToken || hasPlaceholderValues) {
        throw new Error("Missing Green API config. Set GREENAPI_HOST_URL, GREENAPI_ID_INSTANCE, GREENAPI_API_TOKEN_INSTANCE with real values.");
    }
    const base = hostUrl.endsWith("/") ? hostUrl.slice(0, -1) : hostUrl;
    const endpoint = `${base}/waInstance${idInstance}/sendMessage/${apiToken}`;
    const chatId = toGreenApiChatId(targetPhone);
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            chatId,
            message,
        }),
    });
    const payload = (await response.json().catch(() => ({})));
    if (!response.ok) {
        const rawDetails = payload?.message || payload?.error || `Green API request failed: ${response.status}`;
        const looksLike466 = response.status === 466 || payload?.code === 466 || /\b466\b/.test(String(rawDetails));
        const details = looksLike466
            ? "Green API request failed: 466. Check WhatsApp session authorization and ensure destination has country code (e.g. +91...)."
            : rawDetails;
        throw new Error(details);
    }
    return payload.idMessage;
}
// ─── Alerts ───────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const alert = await ctrl.createAlert(req.body);
        res.status(201).json(alert);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Read-all — must be before /user/:userId
router.patch("/user/:userId/read-all", async (req, res) => {
    try {
        const { userId } = req.params;
        await ctrl.markAllAlertsRead(userId);
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// query: isRead, alertType, severity
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const q = req.query;
        const alerts = await ctrl.listUserAlerts(userId, {
            isRead: q.isRead !== undefined ? q.isRead === "true" : undefined,
            alertType: q.alertType,
            severity: q.severity,
        });
        res.json(alerts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const alert = await ctrl.getAlert(id);
        if (!alert)
            return res.status(404).json({ error: "Alert not found" });
        res.json(alert);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch("/:id/read", async (req, res) => {
    try {
        const { id } = req.params;
        const alert = await ctrl.markAlertRead(id);
        if (!alert)
            return res.status(404).json({ error: "Alert not found" });
        res.json(alert);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// ─── Notifications ────────────────────────────────────────────────────────────
router.post("/notifications", async (req, res) => {
    try {
        const notification = await ctrl.createNotification(req.body);
        const channel = notification.channel;
        if (channel === "sms" || channel === "whatsapp") {
            const forcedTarget = process.env.NOTIFICATION_TARGET_PHONE;
            const forcedWhatsAppTarget = process.env.NOTIFICATION_TARGET_WHATSAPP_PHONE;
            const configuredTarget = forcedTarget ? normalizePhoneNumber(forcedTarget) : null;
            const configuredWhatsAppTarget = forcedWhatsAppTarget ? normalizePhoneNumber(forcedWhatsAppTarget) : null;
            const [user] = await client_1.db
                .select({ phone: schema_1.users.phone })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, notification.userId))
                .limit(1);
            const userPhone = user?.phone ? normalizePhoneNumber(user.phone) : null;
            const targetPhone = channel === "whatsapp"
                ? (configuredWhatsAppTarget || configuredTarget || userPhone)
                : (configuredTarget || userPhone);
            if (!targetPhone) {
                await ctrl.updateNotificationStatus(notification.id, "failed");
                return res.status(400).json({ error: "Recipient phone number not found for user" });
            }
            if (channel === "whatsapp") {
                const destination = `whatsapp:${targetPhone}`;
                try {
                    const providerMessageId = await sendWhatsAppViaGreenApi(targetPhone, notification.messageBody);
                    const updated = await ctrl.updateNotificationStatus(notification.id, "sent", providerMessageId);
                    return res.status(201).json({
                        ...updated,
                        destination,
                        provider: "greenapi",
                    });
                }
                catch (sendErr) {
                    await ctrl.updateNotificationStatus(notification.id, "failed");
                    return res.status(400).json({
                        error: sendErr?.message || "Failed to dispatch WhatsApp via Green API",
                        channel,
                        destination,
                        provider: "greenapi",
                    });
                }
            }
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const smsFrom = process.env.TWILIO_SMS_NUMBER || process.env.TWILIO_PHONE_NUMBER;
            const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
            if (!accountSid || !authToken) {
                await ctrl.updateNotificationStatus(notification.id, "failed");
                return res.status(400).json({ error: "Missing Twilio config. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN." });
            }
            if (channel === "sms" && !smsFrom) {
                if (!messagingServiceSid) {
                    await ctrl.updateNotificationStatus(notification.id, "failed");
                    return res.status(400).json({
                        error: "Missing SMS sender config. Set TWILIO_SMS_NUMBER (or TWILIO_PHONE_NUMBER) or TWILIO_MESSAGING_SERVICE_SID.",
                    });
                }
            }
            const destination = targetPhone;
            try {
                const client = (0, twilio_1.default)(accountSid, authToken);
                const provider = await client.messages.create(messagingServiceSid
                    ? {
                        messagingServiceSid,
                        to: destination,
                        body: notification.messageBody,
                    }
                    : {
                        from: smsFrom,
                        to: destination,
                        body: notification.messageBody,
                    });
                const updated = await ctrl.updateNotificationStatus(notification.id, "sent", provider.sid);
                return res.status(201).json({
                    ...updated,
                    destination,
                });
            }
            catch (sendErr) {
                await ctrl.updateNotificationStatus(notification.id, "failed");
                const providerCode = sendErr?.code;
                const providerMessage = sendErr?.message || "Failed to dispatch notification";
                const isTwilioTrialUnverified = providerCode === 21608;
                return res.status(isTwilioTrialUnverified ? 400 : 502).json({
                    error: providerMessage,
                    channel,
                    destination,
                    providerCode: providerCode ?? null,
                });
            }
        }
        res.status(201).json(notification);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Pending — for background dispatch job — must be before /notifications/user/:userId
router.get("/notifications/pending", async (_req, res) => {
    try {
        const notifications = await ctrl.listPendingNotifications();
        res.json(notifications);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// query: channel, status
router.get("/notifications/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const q = req.query;
        const notifications = await ctrl.listNotifications(userId, {
            channel: q.channel,
            status: q.status,
        });
        res.json(notifications);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch("/notifications/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status, providerMessageId } = req.body;
        const notification = await ctrl.updateNotificationStatus(id, status, providerMessageId);
        if (!notification)
            return res.status(404).json({ error: "Notification not found" });
        res.json(notification);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
const greenapi_1 = require("../services/greenapi");
router.post("/notifications/whatsapp/send", async (req, res) => {
    try {
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ error: "Phone and message are required in the request body." });
        }
        const success = await (0, greenapi_1.sendWhatsAppMessageViaGreenApi)(phone, message);
        if (success) {
            res.json({ success: true, message: "WhatsApp message sent successfully via Green API" });
        }
        else {
            res.status(500).json({ error: "Failed to send WhatsApp message via Green API. Check server logs." });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
