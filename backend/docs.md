# VoiceTrace API Documentation

Complete reference for all API endpoints, request/response schemas, authentication, and usage notes.

**Base URL:** `http://localhost:3000` (dev) — set via `VITE_API_BASE_URL` on the frontend
**Auth:** All endpoints except `/auth/register` and `/auth/login` require `Authorization: Bearer <token>` header.
**Content-Type:** All POST/PATCH requests with a JSON body must include `Content-Type: application/json`.

---

## Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Ledger](#ledger)
- [Ledger Upload (OCR)](#ledger-upload-ocr)
- [Voice](#voice)
- [Customers & UdhaarBook](#customers--udhaarbook)
- [Stock](#stock)
- [Suppliers](#suppliers)
- [Alerts & Notifications](#alerts--notifications)
- [Anomalies](#anomalies)
- [Intelligence](#intelligence)
- [Admin](#admin)
- [OSM Suppliers (Map)](#osm-suppliers-map)

---

## Authentication

### `POST /auth/register`
Register a new vendor account. Returns a JWT token valid for 7 days.

**Body:**
```json
{
  "phone": "+919876543210",
  "password": "minlength8",
  "name": "Ramesh Kumar",
  "businessName": "Ramesh Provision Store",
  "businessType": "retail",
  "languagePreference": "hi",
  "city": "Pune",
  "state": "Maharashtra"
}
```
**Required:** `phone`, `password`, `name`
**Response `201`:**
```json
{
  "token": "<jwt>",
  "user": {
    "id": "uuid",
    "phone": "+919876543210",
    "name": "Ramesh Kumar",
    "businessName": "Ramesh Provision Store",
    "businessType": "retail",
    "languagePreference": "hi",
    "city": "Pune",
    "state": "Maharashtra",
    "isActive": true,
    "createdAt": "2026-03-28T10:00:00Z"
  }
}
```
**Error `400`:** Phone already registered.

---

### `POST /auth/login`
Login with phone + password. Returns a JWT token.

**Body:**
```json
{
  "phone": "+919876543210",
  "password": "yourpassword"
}
```
**Response `200`:** Same shape as `/auth/register`.
**Error `401`:** Invalid phone or password (generic message, no user enumeration).

---

## Users

### `POST /users/`
Create a user directly (admin/internal use — prefer `/auth/register` for end-user signup).

**Body:**
```json
{
  "phone": "+919876543210",
  "name": "Ramesh Kumar",
  "businessName": "Ramesh Store",
  "businessType": "retail",
  "languagePreference": "hi",
  "city": "Pune",
  "state": "Maharashtra"
}
```
**Response `201`:** `User` object.

---

### `GET /users/`
List all users.

**Query:** `isActive=true|false` (optional filter)
**Response `200`:** `User[]`

---

### `GET /users/phone/:phone`
Look up a user by phone number.

**Response `200`:** `User` object
**Error `404`:** User not found.

---

### `GET /users/:id`
Get a user by UUID.

**Response `200`:** `User` object
**Error `404`:** User not found.

---

### `PATCH /users/:id`
Update user profile fields.

**Body (all optional):**
```json
{
  "name": "New Name",
  "businessName": "New Business",
  "businessType": "retail",
  "languagePreference": "en",
  "city": "Mumbai",
  "state": "Maharashtra"
}
```
**Response `200`:** Updated `User` object.

---

### `PATCH /users/:id/active`
Toggle active/inactive status for a user.

**Body:**
```json
{ "isActive": false }
```
**Response `200`:** Updated `User` object.

---

## Ledger

Ledger tracks all income and expense entries for a vendor.

**`entryType` values:** `sale`, `purchase`, `expense`, `income`
**`source` values:** `voice`, `ocr`, `manual`

---

### `POST /ledger/`
Create a new ledger entry.

**Body:**
```json
{
  "userId": "uuid",
  "entryType": "sale",
  "amount": "1500.00",
  "itemName": "Rice 25kg",
  "quantity": 5,
  "unit": "kg",
  "entryDate": "2026-03-28",
  "source": "manual",
  "notes": "Sold to Ramesh store",
  "confidence": 0.95
}
```
**Required:** `userId`, `entryType`, `amount`, `entryDate`
**Response `201`:** `LedgerEntry` object.

---

### `GET /ledger/user/:userId`
List all ledger entries for a user. Supports multiple filters.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `entryType` | string | Filter by `sale`, `purchase`, `expense`, `income` |
| `source` | string | Filter by `voice`, `ocr`, `manual` |
| `fromDate` | `YYYY-MM-DD` | Start of date range |
| `toDate` | `YYYY-MM-DD` | End of date range |

**Response `200`:** `LedgerEntry[]` sorted by `entryDate` descending.

---

### `GET /ledger/user/:userId/summary`
Aggregated earnings/expenses summary for a date range.

**Query params (both required):** `fromDate=YYYY-MM-DD`, `toDate=YYYY-MM-DD`
**Response `200`:**
```json
{
  "totalEarnings": "45000.00",
  "totalExpenses": "18000.00",
  "netProfit": "27000.00",
  "entryCount": 42
}
```

---

### `GET /ledger/:id`
Get a single ledger entry by UUID.

**Response `200`:** `LedgerEntry` object
**Error `404`:** Entry not found.

---

### `PATCH /ledger/:id`
Update a ledger entry.

**Body (all optional):** Any fields from the ledger schema (`amount`, `itemName`, `notes`, etc.)
**Response `200`:** Updated `LedgerEntry`.

---

### `DELETE /ledger/:id`
Delete a ledger entry.

**Response `200`:** `{ "deleted": true, "id": "uuid" }`

---

## Ledger Upload (OCR)

### `POST /ledger-upload/process`
Upload a photo of a paper ledger/bill. The backend runs OCR and extracts structured entries.

**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Type | Description |
|-------|------|-------------|
| `image` | File | Image file (JPG/PNG) |
| `userId` | string | Optional — also readable from `x-user-id` header |
| `confirmSave` | `"true"` | If present, parsed entries are saved to the ledger |

**Response `200`:**
```json
{
  "raw": "OCR extracted text",
  "entries": [
    {
      "entryType": "sale",
      "itemName": "Wheat",
      "amount": "800.00",
      "quantity": 10,
      "unit": "kg",
      "entryDate": "2026-03-28",
      "confidence": 0.88
    }
  ],
  "saved": false
}
```
If `confirmSave=true`, `saved` is `true` and entries are written to the ledger.

---

## Voice

### `POST /voice/process`
Upload an audio recording. The backend transcribes it, extracts structured ledger data, and returns both.

**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Type | Description |
|-------|------|-------------|
| `audio` | File | Audio file (mp3/wav/m4a/webm) |

**Response `200`:**
```json
{
  "voiceSessionId": "uuid",
  "transcription": "Sold 10 kg wheat for 500 rupees...",
  "structured": {
    "earnings": [
      { "label": "Wheat", "amount": 500, "quantity": 10, "unit": "kg", "sourceText": "...", "confidence": 0.92 }
    ],
    "expenses": []
  }
}
```

---

### `POST /voice/call/start`
Initiate an outbound call to a vendor's phone. The vendor talks to the AI assistant and entries are logged.

**Body:**
```json
{ "to": "+919876543210" }
```
**Response `200`:** `{ "callSid": "CA...", "status": "initiated" }`

---

### `GET /voice/call/incoming`
Twilio webhook — handles incoming calls. Returns TwiML. Not called directly by frontend.

---

### `POST /voice/call/respond`
Twilio webhook — handles call response. Returns TwiML. Not called directly by frontend.

---

### `POST /voice/`
Create a voice session record manually.

**Body:**
```json
{
  "userId": "uuid",
  "cloudinaryUrl": "https://res.cloudinary.com/...",
  "durationSeconds": 45,
  "language": "hi"
}
```
**Response `201`:** `VoiceSession` object.

---

### `GET /voice/user/:userId`
List all voice sessions for a user.

**Response `200`:** `VoiceSession[]` sorted by `createdAt` descending.

---

### `GET /voice/:id`
Get a voice session by UUID.

**Response `200`:** `VoiceSession` object.

---

### `PATCH /voice/:id/transcription`
Update transcription fields on a voice session.

**Body:**
```json
{
  "transcriptionRaw": "...",
  "transcriptionClean": "...",
  "language": "hi"
}
```
**Response `200`:** Updated `VoiceSession`.

---

### `PATCH /voice/:id/status`
Update the processing status of a voice session.

**Body:**
```json
{ "processingStatus": "completed" }
```
**`processingStatus` values:** `pending`, `processing`, `completed`, `failed`
**Response `200`:** Updated `VoiceSession`.

---

### `DELETE /voice/:id`
Delete a voice session.

**Response `200`:** `{ "deleted": true, "id": "uuid" }`

---

### `POST /voice/:id/flags`
Flag an anomaly within a voice session for manual review.

**Body:**
```json
{
  "userId": "uuid",
  "flagType": "wrong_amount",
  "description": "Amount seems too high",
  "suggestedValue": "200"
}
```
**Response `201`:** `VoiceFlag` object.

---

### `GET /voice/:id/flags`
List all flags for a voice session.

**Response `200`:** `VoiceFlag[]`

---

### `GET /voice/flags/pending/:userId`
List all unresolved flags for a user across all voice sessions.

**Response `200`:** `VoiceFlag[]`

---

### `PATCH /voice/flags/:flagId/resolve`
Resolve a flagged anomaly.

**Body (all optional):**
```json
{
  "resolvedValue": "200",
  "resolvedNote": "Confirmed correct amount"
}
```
**Response `200`:** Updated `VoiceFlag`.

---

## Customers & UdhaarBook

Tracks udhaar (credit) given to customers. `customer_ledger` uses `credit` (goods given, payment pending) and `debit` (payment received).

---

### `POST /customers/`
Create a new customer.

**Body:**
```json
{
  "userId": "uuid",
  "name": "Ramesh Store",
  "phone": "+919876543210",
  "address": "Sector 14, Main Market",
  "notes": "Regular customer"
}
```
**Required:** `userId`, `name`
**Response `201`:** `Customer` object.

---

### `GET /customers/user/:userId`
List all customers for a vendor, ordered by name.

**Response `200`:** `Customer[]`

---

### `GET /customers/user/:userId/balances`
Get per-customer balance, total collected, and last transaction date — all computed from `customer_ledger` grouped by `customer_id`.

**Response `200`:**
```json
[
  {
    "customerId": "uuid",
    "balance": "4500.00",
    "totalDebits": "1000.00",
    "lastTxnDate": "2026-03-20"
  }
]
```
- `balance` — net amount customer still owes (`credits - debits`). Positive = owes money.
- `totalDebits` — total payments received from this customer.
- `lastTxnDate` — date of most recent transaction (use to detect overdue).

> **Frontend usage:** Fetch both `GET /customers/user/:userId` and `GET /customers/user/:userId/balances` in parallel, then merge by `customerId` on the client side.

---

### `GET /customers/user/:userId/summary`
Single query returning customers joined with their ledger aggregates. Alternative to the two-endpoint approach above.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "name": "Ramesh Store",
    "phone": "+919876543210",
    "address": "Sector 14",
    "notes": null,
    "createdAt": "2026-01-01T00:00:00Z",
    "balance": "4500.00",
    "totalDebits": "1000.00",
    "lastTxnDate": "2026-03-20"
  }
]
```

---

### `GET /customers/user/:userId/ledger`
All `customer_ledger` entries across all customers for this vendor (joined with customer name/phone).

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "customerId": "uuid",
    "txnType": "credit",
    "amount": "4500.00",
    "description": "Rice 50kg",
    "txnDate": "2026-03-20",
    "createdAt": "...",
    "customerName": "Ramesh Store",
    "customerPhone": "+919876543210"
  }
]
```

---

### `GET /customers/:id`
Get a single customer by UUID.

**Response `200`:** `Customer` object
**Error `404`:** Customer not found.

---

### `PATCH /customers/:id`
Update customer details.

**Body (all optional):** `name`, `phone`, `address`, `notes`
**Response `200`:** Updated `Customer`.

---

### `DELETE /customers/:id`
Delete a customer and all their ledger entries (cascade).

**Response `200`:** `{ "deleted": true, "id": "uuid" }`

---

### `POST /customers/:id/ledger`
Add a transaction to a customer's ledger.

**Body:**
```json
{
  "userId": "uuid",
  "txnType": "credit",
  "amount": "4500.00",
  "description": "Rice 50kg",
  "txnDate": "2026-03-28"
}
```
**Required:** `userId`, `txnType`, `amount`, `txnDate`
**`txnType`:** `credit` (goods given, customer owes) or `debit` (payment received)
**Response `201`:** `CustomerLedgerEntry` object.

---

### `GET /customers/:id/ledger`
List all transactions for a specific customer, ordered by `txnDate` descending.

**Response `200`:** `CustomerLedgerEntry[]`

---

### `GET /customers/:id/balance`
Get the net balance for a single customer.

**Response `200`:** `{ "customerId": "uuid", "balance": "4500.00" }`

---

## Stock

### `POST /stock/`
Create a new stock item.

**Body:**
```json
{
  "userId": "uuid",
  "name": "Basmati Rice",
  "unit": "kg",
  "currentQuantity": "100",
  "minimumQuantity": "20",
  "costPrice": "45.00",
  "sellingPrice": "55.00"
}
```
**Required:** `userId`, `name`, `unit`
**Response `201`:** `StockItem` object.

---

### `GET /stock/user/:userId`
List all stock items for a user.

**Response `200`:** `StockItem[]`

---

### `GET /stock/user/:userId/low`
List stock items where `currentQuantity <= minimumQuantity`.

**Response `200`:** `StockItem[]`

---

### `GET /stock/:id`
Get a stock item by UUID.

**Response `200`:** `StockItem`
**Error `404`:** Not found.

---

### `PATCH /stock/:id`
Update a stock item.

**Body (all optional):** Any `StockItem` fields.
**Response `200`:** Updated `StockItem`.

---

### `DELETE /stock/:id`
Delete a stock item.

**Response `200`:** `{ "deleted": true, "id": "uuid" }`

---

### `POST /stock/movements`
Record a stock movement (restock, sale, adjustment).

**Body:**
```json
{
  "stockItemId": "uuid",
  "userId": "uuid",
  "movementType": "in",
  "quantity": "50",
  "notes": "Restocked from supplier"
}
```
**`movementType` values:** `in`, `out`, `adjustment`
**Response `201`:** `StockMovement` object.

---

### `GET /stock/movements/user/:userId`
List stock movements for a user.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `stockItemId` | uuid | Filter by specific item |
| `movementType` | string | Filter by `in`, `out`, `adjustment` |

**Response `200`:** `StockMovement[]`

---

## Suppliers

### `POST /suppliers/`
Create a supplier.

**Body:**
```json
{
  "userId": "uuid",
  "name": "Singh Wholesale",
  "phone": "+919876543210",
  "category": "grains",
  "address": "APMC Market, Pune",
  "lat": "18.5204",
  "lng": "73.8567",
  "locationSource": "manual",
  "notes": "Best rice supplier"
}
```
**Required:** `userId`, `name`
**Response `201`:** `Supplier` object.

---

### `GET /suppliers/user/:userId`
List all suppliers for a user.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category (e.g. `grains`, `spices`) |
| `locationSource` | string | Filter by `manual`, `osm`, `gps` |

**Response `200`:** `Supplier[]`

---

### `GET /suppliers/user/:userId/mapped`
List only suppliers that have `lat` and `lng` set (used for map view).

**Response `200`:** `Supplier[]`

---

### `GET /suppliers/:id`
Get a supplier by UUID.

**Response `200`:** `Supplier`
**Error `404`:** Not found.

---

### `PATCH /suppliers/:id`
Update supplier details.

**Body (all optional):** Any `Supplier` fields.
**Response `200`:** Updated `Supplier`.

---

### `DELETE /suppliers/:id`
Delete a supplier.

**Response `200`:** `{ "deleted": true, "id": "uuid" }`

---

## Alerts & Notifications

### `POST /alerts/`
Create an alert for a user.

**Body:**
```json
{
  "userId": "uuid",
  "alertType": "low_stock",
  "title": "Rice stock is low",
  "body": "Current stock: 5kg. Minimum required: 20kg.",
  "severity": "warning",
  "referenceId": "uuid",
  "referenceType": "stock_item"
}
```
**`alertType` values:** `low_stock`, `anomaly_detected`, `payment_due`, `weather_advisory`, `pattern_break`, `vendor_score_change`
**`severity` values:** `info`, `warning`, `critical`
**Response `201`:** `Alert` object.

---

### `GET /alerts/user/:userId`
List all alerts for a user.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `isRead` | `true`\|`false` | Filter by read status |
| `alertType` | string | Filter by alert type |
| `severity` | string | Filter by `info`, `warning`, `critical` |

**Response `200`:** `Alert[]` sorted by `createdAt` descending.

---

### `GET /alerts/:id`
Get a specific alert by UUID.

**Response `200`:** `Alert`
**Error `404`:** Not found.

---

### `PATCH /alerts/:id/read`
Mark a single alert as read.

**Response `200`:** Updated `Alert` with `isRead: true`.

---

### `PATCH /alerts/user/:userId/read-all`
Mark all alerts for a user as read.

**Response `200`:** `{ "success": true }`

---

### `POST /alerts/notifications`
Create a notification (delivery record for an alert via a channel).

**Body:**
```json
{
  "userId": "uuid",
  "channel": "sms",
  "messageBody": "Your rice stock is low.",
  "alertId": "uuid"
}
```
**`channel` values:** `sms`, `whatsapp`, `dashboard`, `pwa`
**Response `201`:** `Notification` object.

---

### `GET /alerts/notifications/user/:userId`
List notifications for a user.

**Query params:** `channel`, `status`
**Response `200`:** `Notification[]`

---

### `GET /alerts/notifications/pending`
List all notifications with `status = pending` (for delivery workers).

**Response `200`:** `Notification[]`

---

### `PATCH /alerts/notifications/:id/status`
Update notification delivery status.

**Body:**
```json
{ "status": "delivered" }
```
**`status` values:** `pending`, `delivered`, `failed`
**Response `200`:** Updated `Notification`.

---

## Anomalies

Anomalies are statistical outliers detected in the vendor's transaction data.

### `POST /anomalies/`
Create an anomaly record.

**Body:**
```json
{
  "userId": "uuid",
  "anomalyType": "high_expense",
  "description": "Expense 3x above weekly average",
  "severity": "warning",
  "detectedValue": "9000.00",
  "expectedValue": "3000.00",
  "referenceId": "uuid",
  "referenceType": "ledger_entry"
}
```
**`anomalyType` values:** `high_expense`, `low_sales`, `unusual_pattern`, `data_gap`
**`severity` values:** `info`, `warning`, `critical`
**Response `201`:** `Anomaly` object.

---

### `GET /anomalies/user/:userId`
List anomalies for a user.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `isResolved` | `true`\|`false` | Filter by resolution status |
| `severity` | string | Filter by severity |
| `anomalyType` | string | Filter by type |

**Response `200`:** `Anomaly[]`

---

### `GET /anomalies/user/:userId/unresolved`
Shortcut — list only unresolved anomalies for a user.

**Response `200`:** `Anomaly[]`

---

### `GET /anomalies/:id`
Get a specific anomaly by UUID.

**Response `200`:** `Anomaly`
**Error `404`:** Not found.

---

### `PATCH /anomalies/:id/resolve`
Mark an anomaly as resolved.

**Response `200`:** Updated `Anomaly` with `isResolved: true` and `resolvedAt` timestamp.

---

## Intelligence

AI-generated insights: pattern detection, vendor scoring, weather-based suggestions, and daily summaries.

---

### `POST /intelligence/patterns`
Record a detected usage/sales pattern.

**Body:**
```json
{
  "userId": "uuid",
  "patternType": "weekend_boost",
  "description": "Sales 40% higher on weekends",
  "confidence": 0.87,
  "metadata": {}
}
```
**Response `201`:** `PatternDetection` object.

---

### `GET /intelligence/patterns/user/:userId`
List pattern detections for a user.

**Query:** `patternType` (optional filter)
**Response `200`:** `PatternDetection[]`

---

### `POST /intelligence/scores`
Upsert a vendor score (creates or updates).

**Body:**
```json
{
  "userId": "uuid",
  "overallScore": "78.5",
  "consistencyScore": "82.0",
  "growthScore": "74.0",
  "riskScore": "21.0",
  "notes": "Steady growth month-on-month"
}
```
**Response `200`/`201`:** `VendorScore` object.

---

### `GET /intelligence/scores/user/:userId/latest`
Get the most recent vendor score for a user.

**Response `200`:** `VendorScore`
**Error `404`:** No score found.

---

### `GET /intelligence/scores/user/:userId/history`
Get the full vendor score history for a user.

**Response `200`:** `VendorScore[]` sorted by `createdAt` descending.

---

### `POST /intelligence/weather`
Create a weather-based sales suggestion.

**Body:**
```json
{
  "userId": "uuid",
  "suggestionText": "Rain expected this week — stock up on umbrellas and raincoats.",
  "weatherCondition": "rain",
  "validUntil": "2026-03-31"
}
```
**Response `201`:** `WeatherSuggestion` object.

---

### `GET /intelligence/weather/user/:userId/active`
List active weather suggestions (where `validUntil` is in the future).

**Response `200`:** `WeatherSuggestion[]`

---

### `POST /intelligence/summaries`
Create a daily summary record.

**Body:**
```json
{
  "userId": "uuid",
  "summaryDate": "2026-03-28",
  "totalEarnings": "4500.00",
  "totalExpenses": "1200.00",
  "netProfit": "3300.00",
  "topItem": "Rice",
  "summaryText": "Good sales day. Rice was the top seller."
}
```
**Response `201`:** `DailySummary` object.

---

### `GET /intelligence/summaries/user/:userId`
List daily summaries for a user.

**Query:** `limit` (number, default 30)
**Response `200`:** `DailySummary[]` sorted by `summaryDate` descending.

---

### `PATCH /intelligence/summaries/:id/delivered`
Mark a daily summary as delivered to the user.

**Response `200`:** Updated `DailySummary` with `isDelivered: true`.

---

## Admin

### `GET /admin/stats`
Get platform-level vendor stats.

**Response `200`:**
```json
{ "total": 120, "active": 98, "inactive": 22 }
```

---

### `GET /admin/vendors/registrations`
Vendor registration counts grouped by month.

**Response `200`:**
```json
[
  { "month": "2026-03", "count": 14 },
  { "month": "2026-02", "count": 11 }
]
```

---

### `GET /admin/vendors`
List all vendor profiles.

**Response `200`:** `User[]` (all vendors)

---

### `POST /admin/logs`
Log an admin activity.

**Body:**
```json
{
  "action": "user_deactivated",
  "userId": "uuid",
  "adminUserId": "uuid",
  "metadata": { "reason": "spam" }
}
```
**Response `201`:** `ActivityLog` object.

---

### `GET /admin/logs`
List activity logs.

**Query params:** `userId`, `adminUserId`, `limit` (default 50)
**Response `200`:** `ActivityLog[]` sorted by `createdAt` descending.

---

## OSM Suppliers (Map)

### `GET /api/osm-suppliers/`
Search OpenStreetMap for nearby suppliers/shops. Proxied by the backend to avoid CORS.

**Query params:**
| Param | Required | Description |
|-------|----------|-------------|
| `lat` | Yes | Latitude (e.g. `18.5204`) |
| `lng` | Yes | Longitude (e.g. `73.8567`) |
| `radius` | No | Search radius in metres (default `2000`) |
| `q` | No | Search query (e.g. `grocery`, `grain`) |

**Response `200`:**
```json
[
  {
    "id": "node/123456",
    "name": "Singh Wholesale",
    "lat": 18.521,
    "lng": 73.855,
    "category": "shop",
    "address": "..."
  }
]
```

---

## Common Response Schemas

### `User`
```json
{
  "id": "uuid",
  "phone": "+919876543210",
  "name": "Ramesh Kumar",
  "businessName": "Ramesh Store",
  "businessType": "retail",
  "languagePreference": "hi",
  "city": "Pune",
  "state": "Maharashtra",
  "isActive": true,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### `LedgerEntry`
```json
{
  "id": "uuid",
  "userId": "uuid",
  "voiceSessionId": "uuid | null",
  "entryType": "sale | purchase | expense | income",
  "amount": "1500.00",
  "itemName": "Rice 25kg",
  "quantity": 5,
  "unit": "kg",
  "entryDate": "2026-03-28",
  "source": "voice | ocr | manual",
  "notes": "...",
  "confidence": 0.95,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### `Customer`
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Ramesh Store",
  "phone": "+919876543210",
  "address": "Sector 14",
  "notes": "Regular customer",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### `CustomerLedgerEntry`
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "userId": "uuid",
  "voiceSessionId": "uuid | null",
  "txnType": "credit | debit",
  "amount": "4500.00",
  "description": "Rice 50kg",
  "txnDate": "2026-03-28",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### `Alert`
```json
{
  "id": "uuid",
  "userId": "uuid",
  "alertType": "low_stock",
  "title": "Rice stock is low",
  "body": "Current: 5kg. Min: 20kg.",
  "severity": "warning",
  "isRead": false,
  "referenceId": "uuid | null",
  "referenceType": "stock_item | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### `StockItem`
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Basmati Rice",
  "unit": "kg",
  "currentQuantity": "100.00",
  "minimumQuantity": "20.00",
  "costPrice": "45.00",
  "sellingPrice": "55.00",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

## Notes

- All UUIDs are PostgreSQL `uuid` type, generated via `gen_random_uuid()`.
- All `amount` / numeric fields are returned as **strings** (PostgreSQL `numeric` precision) — parse with `Number()` or `parseFloat()` on the client.
- Timestamps (`createdAt`, `updatedAt`) are ISO 8601 strings in UTC.
- Dates (`entryDate`, `txnDate`, `summaryDate`) are `YYYY-MM-DD` strings.
- Soft deletes are not used — `DELETE` endpoints permanently remove records.
- `customer_ledger` cascades on customer delete.
- HTTP errors always return `{ "error": "message string" }`.
