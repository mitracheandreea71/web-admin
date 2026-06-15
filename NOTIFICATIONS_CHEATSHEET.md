# Notificări & Alerte - Cheat Sheet

## 📌 Tipuri de Alerte Suportate

### 1️⃣ Rezervări Active

```
Type:       reservation_active
Icon:       📅
Color:      Blue (#3b82f6)
Severity:   INFO
Title:      "Rezervare Activă - Loc {spotCode}"
Body:       "{userName} a rezervat locul {spotCode} pentru {start} - {end}"
Metadata:   { user_id, reservation_id, spot_code, username }
```

### 2️⃣ Abonamente Active

```
Type:       subscription_active
Icon:       🎟️
Color:      Purple (#8b5cf6)
Severity:   INFO
Title:      "Abonament Lunar Activ"
Body:       "{userName} - Abonament valabil până pe {date}"
Metadata:   { user_id, subscription_id, plan_name, amount }
```

### 3️⃣ QR Cod Invalid

```
Type:       qr_invalid
Icon:       ⚠️
Color:      Orange (#d97706)
Severity:   WARNING
Title:      "QR Cod Invalid"
Body:       "Scanner la {location}: QR invalid sau expirat"
Metadata:   { location, timestamp, qr_code_hash }
```

### 4️⃣ Plată Eșuată

```
Type:       payment_failed
Icon:       ❌
Color:      Red (#dc2626)
Severity:   ERROR
Title:      "Plată Eșuată"
Body:       "Plata pentru {entity} a fost respinsă: {error_reason}"
Metadata:   { user_id, payment_id, subscription_id, amount, error_code }
```

### 5️⃣ Depășire Timp

```
Type:       time_exceeded
Icon:       ⏱️
Color:      Orange (#f59e0b)
Severity:   WARNING
Title:      "Depășire Timp"
Body:       "{userName} a depășit cu {minutes} minute durata pentru locul {spotCode}"
Metadata:   { user_id, spot_id, spot_code, excess_minutes, vehicle_plate }
```

### 6️⃣ Loc Ocupat Fără Rezervare

```
Type:       spot_occupied_no_reservation
Icon:       🚗
Color:      Red (#ef4444)
Severity:   ERROR
Title:      "Loc Ocupat Fără Drept"
Body:       "Locul {spotCode} ocupat fără rezervare/abonament valabil"
Metadata:   { spot_id, spot_code, vehicle_plate, occupancy_time }
```

### 7️⃣ Notificare Plată (Generic)

```
Type:       payment
Icon:       💳
Color:      Cyan (#06b6d4)
Severity:   INFO
Title:      "Notificare Plată"
Body:       Depinde de context
Metadata:   { user_id, payment_id, amount, currency }
```

---

## 🔧 API Quick Reference

### GET /notifications

```bash
curl -X GET http://localhost:3000/notifications \
  -H "Authorization: Bearer {token}"
```

Returns: `Notification[]`

### PATCH /notifications/{id}/read

```bash
curl -X PATCH http://localhost:3000/notifications/{id}/read \
  -H "Authorization: Bearer {token}"
```

Returns: `{ id, is_read }`

---

## 📊 Filter Keys (Frontend)

```
"all"                         - Toate alertele
"reservation_active"          - Doar rezervări
"subscription_active"         - Doar abonamente
"qr_invalid"                 - Doar QR invalide
"payment_failed"             - Doar plăți eșuate
"time_exceeded"              - Doar depășiri timp
"spot_occupied_no_reservation" - Locuri ocupate nelegal
"payment"                    - Notificări plăți
```

---

## 🎨 React Component Usage

```jsx
import AlertsPanel from "./components/AlertsPanel";

<AlertsPanel
  notifications={notifications}
  error={error}
  onMarkAsRead={(id) => markAsRead(id)}
/>;
```

---

## 📦 Required Package Structure

```typescript
interface Notification {
  id: number;
  type: string; // "payment_failed" etc
  title: string; // "Plată Eșuată"
  body: string; // Full message
  is_read: boolean; // true/false
  created_at: string; // ISO 8601 "2026-05-12T10:30:00Z"
  related_id?: number; // Entity ID
  metadata?: Record<string, any>; // Extra data
}
```

---

## 🚀 Creating a Notification (Backend)

```typescript
async function createNotification(
  type: string,
  title: string,
  body: string,
  relatedId?: number,
  metadata?: any,
) {
  const notification = await db.notification.create({
    type,
    title,
    body,
    is_read: false,
    created_at: new Date(),
    related_id: relatedId,
    metadata,
  });

  // Broadcast to admirals
  io.emit("notification.changed");

  return notification;
}
```

---

## 📡 Socket.io Event Listener

```typescript
socket.on("notification.changed", async () => {
  // Reload notifications
  const fresh = await fetch("/notifications").then((r) => r.json());
  setNotifications(fresh);
});
```

---

## ✨ Features Implemented

- ✅ 6-7 categorii de alerte distincte
- ✅ Filtrare dinamică după tip
- ✅ Statistici în timp real (unread count)
- ✅ Marcaj ca citit/necitit per notificare
- ✅ Expandare detalii cu metadata
- ✅ Design responsiv + Dark mode
- ✅ Timestamps formatate
- ✅ Indicatori vizuali (colori, iconuri, animații)
- ✅ Socket.io integration pentru updates în timp real

---

## 🔄 Status Codes

```
200 OK           - Success
400 Bad Request  - Invalid data
401 Unauthorized - Missing/invalid token
404 Not Found    - Resource not found
500 Server Error - Internal error
```

---

## 🎯 Example Notification Objects

### Reservation Active

```json
{
  "id": 1,
  "type": "reservation_active",
  "title": "Rezervare Activă - Loc A-15",
  "body": "POPESCU ION a rezervat locul A-15 pentru 14:00-18:00",
  "is_read": false,
  "created_at": "2026-05-12T10:30:00Z",
  "related_id": 42,
  "metadata": {
    "user_id": 5,
    "reservation_id": 42,
    "spot_code": "A-15"
  }
}
```

### Payment Failed

```json
{
  "id": 2,
  "type": "payment_failed",
  "title": "Plată Eșuată",
  "body": "Plata pentru subscription #28 a fost respinsă: CARD_DECLINED",
  "is_read": false,
  "created_at": "2026-05-12T09:15:00Z",
  "related_id": 28,
  "metadata": {
    "user_id": 8,
    "payment_id": 123,
    "subscription_id": 28,
    "amount": "150.00",
    "error_code": "CARD_DECLINED"
  }
}
```

### QR Invalid

```json
{
  "id": 3,
  "type": "qr_invalid",
  "title": "QR Cod Invalid",
  "body": "Scanner intrare: QR cod invalid scanat de POPESCU ANDREI",
  "is_read": false,
  "created_at": "2026-05-12T08:45:00Z",
  "metadata": {
    "location": "Intrare 1",
    "timestamp": "2026-05-12T08:45:00Z"
  }
}
```

### Time Exceeded

```json
{
  "id": 4,
  "type": "time_exceeded",
  "title": "Depășire Timp",
  "body": "IACOB DANIEL a depășit cu 45 minute durata pentru locul B-22",
  "is_read": false,
  "created_at": "2026-05-12T12:00:00Z",
  "related_id": 99,
  "metadata": {
    "user_id": 12,
    "spot_id": 99,
    "spot_code": "B-22",
    "excess_minutes": 45,
    "vehicle_plate": "AAA111"
  }
}
```

### Spot Occupied Without Reservation

```json
{
  "id": 5,
  "type": "spot_occupied_no_reservation",
  "title": "Loc Ocupat Fără Drept",
  "body": "Locul C-05 ocupat fără rezervare/abonament valabil de vehicul BBB222",
  "is_read": false,
  "created_at": "2026-05-12T11:30:00Z",
  "related_id": null,
  "metadata": {
    "spot_id": 150,
    "spot_code": "C-05",
    "vehicle_plate": "BBB222",
    "occupancy_time": "2026-05-12T11:20:00Z"
  }
}
```

---

## 🎬 Quick Start for Backend

1. Add `type` enum to Notification model
2. Implement GET `/notifications` endpoint
3. Implement PATCH `/notifications/{id}/read` endpoint
4. Emit socket event when notification created
5. Create trigger functions for each notification type
6. Test with provided example objects

Done! 🎉
