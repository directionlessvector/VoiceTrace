# VoiceTrace API Documentation

This document provides a comprehensive overview of all API endpoints, their routes, expected request/response data, authentication requirements, and usage notes for the VoiceTrace backend.

---

## Table of Contents
- [Admin](#admin)
- [Alerts & Notifications](#alerts--notifications)
- [Anomalies](#anomalies)
- [Customers](#customers)
- [Intelligence](#intelligence)
- [Ledger](#ledger)
- [Stock](#stock)
- [Suppliers](#suppliers)
- [Users](#users)
- [Voice](#voice)

---

## Admin

### GET `/admin/stats`
- **Description:** Get vendor statistics (total, active, inactive).
- **Response:** `{ total: number, active: number, inactive: number }`

### GET `/admin/vendors/registrations`
- **Description:** Get vendor registrations by month.
- **Response:** `Array<{ month: string, count: number }>`

### GET `/admin/vendors`
- **Description:** List all vendor profiles.
- **Response:** `Array<VendorProfile>`

### POST `/admin/logs`
- **Description:** Log an admin activity.
- **Body:** `{ action: string, userId?: string, adminUserId?: string, metadata?: object }`
- **Response:** `ActivityLog`

### GET `/admin/logs`
- **Description:** List activity logs (filterable by userId, adminUserId, limit).
- **Query:** `userId`, `adminUserId`, `limit`
- **Response:** `Array<ActivityLog>`

---

## Alerts & Notifications

### POST `/alerts/`
- **Description:** Create an alert.
- **Body:** `{ userId: string, alertType: string, title: string, body: string, severity?: string, referenceId?: string, referenceType?: string }`
- **Response:** `Alert`

### PATCH `/alerts/user/:userId/read-all`
- **Description:** Mark all alerts as read for a user.
- **Response:** `{ success: true }`

### GET `/alerts/user/:userId`
- **Description:** List user alerts (filterable by isRead, alertType, severity).
- **Query:** `isRead`, `alertType`, `severity`
- **Response:** `Array<Alert>`

### GET `/alerts/:id`
- **Description:** Get a specific alert by ID.
- **Response:** `Alert`

### PATCH `/alerts/:id/read`
- **Description:** Mark a specific alert as read.
- **Response:** `Alert`

### POST `/alerts/notifications`
- **Description:** Create a notification.
- **Body:** `{ userId: string, channel: string, messageBody: string, alertId?: string }`
- **Response:** `Notification`

---

## Anomalies

### POST `/anomalies/`
- **Description:** Create an anomaly.
- **Body:** `{ userId: string, anomalyType: string, description: string, severity: string, ... }`
- **Response:** `Anomaly`

### GET `/anomalies/user/:userId/unresolved`
- **Description:** List unresolved anomalies for a user.
- **Response:** `Array<Anomaly>`

### GET `/anomalies/user/:userId`
- **Description:** List anomalies for a user (filterable by isResolved, severity, anomalyType).
- **Query:** `isResolved`, `severity`, `anomalyType`
- **Response:** `Array<Anomaly>`

### GET `/anomalies/:id`
- **Description:** Get a specific anomaly by ID.
- **Response:** `Anomaly`

### PATCH `/anomalies/:id/resolve`
- **Description:** Resolve an anomaly.
- **Response:** `Anomaly`

---

## Customers

### POST `/customers/`
- **Description:** Create a customer.
- **Body:** `{ userId: string, name: string, phone?: string, address?: string, notes?: string }`
- **Response:** `Customer`

### GET `/customers/user/:userId/balances`
- **Description:** List all customer balances for a vendor.
- **Response:** `Array<{ customerId: string, balance: number }>`

### GET `/customers/user/:userId`
- **Description:** List all customers for a user.
- **Response:** `Array<Customer>`

### GET `/customers/:id`
- **Description:** Get a specific customer by ID.
- **Response:** `Customer`

### PATCH `/customers/:id`
- **Description:** Update a customer.
- **Body:** `Partial<{ name, phone, address, notes }>`
- **Response:** `Customer`

### DELETE `/customers/:id`
- **Description:** Delete a customer.
- **Response:** `{ deleted: true, id: string }`

### POST `/customers/:id/ledger`
- **Description:** Create a customer ledger entry.
- **Body:** `{ customerId: string, userId: string, txnType: string, amount: string, ... }`
- **Response:** `CustomerLedgerEntry`

---

## Intelligence

### POST `/intelligence/patterns`
- **Description:** Create a pattern detection.
- **Body:** `{ userId: string, patternType: string, ... }`
- **Response:** `PatternDetection`

### GET `/intelligence/patterns/user/:userId`
- **Description:** List pattern detections for a user (filterable by patternType).
- **Query:** `patternType`
- **Response:** `Array<PatternDetection>`

### POST `/intelligence/scores`
- **Description:** Upsert a vendor score.
- **Body:** `{ userId: string, overallScore: string, ... }`
- **Response:** `VendorScore`

### GET `/intelligence/scores/user/:userId/latest`
- **Description:** Get the latest vendor score for a user.
- **Response:** `VendorScore`

### GET `/intelligence/scores/user/:userId/history`
- **Description:** List vendor score history for a user.
- **Response:** `Array<VendorScore>`

### POST `/intelligence/weather`
- **Description:** Create a weather suggestion.
- **Body:** `{ userId: string, suggestionText: string, ... }`
- **Response:** `WeatherSuggestion`

### GET `/intelligence/weather/user/:userId/active`
- **Description:** List active weather suggestions for a user.
- **Response:** `Array<WeatherSuggestion>`

---

## Ledger

### POST `/ledger/`
- **Description:** Create a ledger entry.
- **Body:** `{ userId: string, entryType: string, amount: string, ... }`
- **Response:** `LedgerEntry`

### GET `/ledger/user/:userId/summary`
- **Description:** Get earnings summary for a user (requires fromDate, toDate).
- **Query:** `fromDate`, `toDate`
- **Response:** `EarningsSummary`

### GET `/ledger/user/:userId`
- **Description:** List ledger entries for a user (filterable by entryType, source, fromDate, toDate).
- **Query:** `entryType`, `source`, `fromDate`, `toDate`
- **Response:** `Array<LedgerEntry>`

### GET `/ledger/:id`
- **Description:** Get a specific ledger entry by ID.
- **Response:** `LedgerEntry`

### PATCH `/ledger/:id`
- **Description:** Update a ledger entry.
- **Body:** `Partial<LedgerEntry>`
- **Response:** `LedgerEntry`

### DELETE `/ledger/:id`
- **Description:** Delete a ledger entry.
- **Response:** `{ deleted: true, id: string }`

---

## Stock

### POST `/stock/`
- **Description:** Create a stock item.
- **Body:** `{ userId: string, name: string, unit: string, ... }`
- **Response:** `StockItem`

### GET `/stock/user/:userId/low`
- **Description:** List low stock items for a user.
- **Response:** `Array<StockItem>`

### GET `/stock/user/:userId`
- **Description:** List all stock items for a user.
- **Response:** `Array<StockItem>`

### POST `/stock/movements`
- **Description:** Create a stock movement.
- **Body:** `{ stockItemId: string, userId: string, ... }`
- **Response:** `StockMovement`

### GET `/stock/movements/user/:userId`
- **Description:** List stock movements for a user (filterable by stockItemId, movementType).
- **Query:** `stockItemId`, `movementType`
- **Response:** `Array<StockMovement>`

### GET `/stock/:id`
- **Description:** Get a specific stock item by ID.
- **Response:** `StockItem`

### PATCH `/stock/:id`
- **Description:** Update a stock item.
- **Body:** `Partial<StockItem>`
- **Response:** `StockItem`

### DELETE `/stock/:id`
- **Description:** Delete a stock item.
- **Response:** `{ deleted: true, id: string }`

---

## Suppliers

### POST `/suppliers/`
- **Description:** Create a supplier.
- **Body:** `{ userId: string, name: string, ... }`
- **Response:** `Supplier`

### GET `/suppliers/user/:userId/mapped`
- **Description:** List mapped suppliers (with lat/lng) for a user.
- **Response:** `Array<Supplier>`

### GET `/suppliers/user/:userId`
- **Description:** List suppliers for a user (filterable by category, locationSource).
- **Query:** `category`, `locationSource`
- **Response:** `Array<Supplier>`

### GET `/suppliers/:id`
- **Description:** Get a specific supplier by ID.
- **Response:** `Supplier`

### PATCH `/suppliers/:id`
- **Description:** Update a supplier.
- **Body:** `Partial<Supplier>`
- **Response:** `Supplier`

### DELETE `/suppliers/:id`
- **Description:** Delete a supplier.
- **Response:** `{ deleted: true, id: string }`

---

## Users

### POST `/users/`
- **Description:** Create a user.
- **Body:** `{ phone: string, name: string, ... }`
- **Response:** `User`

### GET `/users/`
- **Description:** List all users (filterable by isActive).
- **Query:** `isActive`
- **Response:** `Array<User>`

### GET `/users/phone/:phone`
- **Description:** Get a user by phone number.
- **Response:** `User`

### GET `/users/:id`
- **Description:** Get a user by ID.
- **Response:** `User`

### PATCH `/users/:id`
- **Description:** Update a user.
- **Body:** `Partial<User>`
- **Response:** `User`

### PATCH `/users/:id/active`
- **Description:** Toggle user active status.
- **Body:** `{ isActive: boolean }`
- **Response:** `User`

---

## Voice

### POST `/voice/`
- **Description:** Create a voice session.
- **Body:** `{ userId: string, cloudinaryUrl: string, ... }`
- **Response:** `VoiceSession`

### GET `/voice/user/:userId`
- **Description:** List all voice sessions for a user.
- **Response:** `Array<VoiceSession>`

### GET `/voice/flags/pending/:userId`
- **Description:** List pending voice flags for a user.
- **Response:** `Array<VoiceFlag>`

### PATCH `/voice/flags/:flagId/resolve`
- **Description:** Resolve a voice flag.
- **Body:** `Partial<VoiceFlag>`
- **Response:** `VoiceFlag`

### GET `/voice/:id`
- **Description:** Get a voice session by ID.
- **Response:** `VoiceSession`

### PATCH `/voice/:id/transcription`
- **Description:** Update transcription for a voice session.
- **Body:** `{ transcriptionRaw: string, transcriptionClean: string, ... }`
- **Response:** `VoiceSession`

### PATCH `/voice/:id/status`
- **Description:** Update processing status for a voice session.
- **Body:** `{ processingStatus: string }`
- **Response:** `VoiceSession`

---

## General Notes
- All endpoints return JSON.
- Authentication (token-based) is required for all endpoints unless otherwise specified.
- Standard HTTP status codes are used for success and error responses.
- For detailed request/response schemas, refer to the controller and schema files.

---

*This documentation is auto-generated from the current codebase. For updates, please regenerate after code changes.*
