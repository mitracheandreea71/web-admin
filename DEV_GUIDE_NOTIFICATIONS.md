# Dev Guide: Notificări și Alerte - Smart Parking

## 🎯 Rezumat Rapid

Am adăugat un sistem complet de vizualizare notificări/alerte în web-admin cu 6 categorii principale și suport pentru:

- Filtrare dinamică după tip
- Marcaj ca citit/necitit
- Detalii extinse și metadata
- Actualizare în timp real via Socket.io
- Design responsiv și profesional

## 📦 Ce a Fost Adăugat

### Fișiere Noi:

```
web-admin/
├── src/
│   ├── components/
│   │   ├── AlertsPanel.tsx          ← Componenta React principală
│   │   └── AlertsPanel.css          ← Stiluri (430 linii)
│   └── lib/
│       └── notificationTypes.ts     ← Tipuri și utilitare
└── NOTIFICATIONS_README.md          ← Documentație
```

### Modificări Existente:

- `src/App.tsx` - Import AlertsPanel, integrareclasă + funcție `markNotificationAsRead()`

## 🏗️ Arhitectură

```
┌─────────────────────────────────────┐
│        App.tsx (Parent)             │
│  - notifications state              │
│  - loadNotificationsWithToken()     │
│  - markNotificationAsRead()         │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│       AlertsPanel Component         │
│  ├─ Stats Cards                     │
│  ├─ Filter Buttons                  │
│  └─ Alert Items (Expandable)        │
└──────────────┬──────────────────────┘
               │
         ┌─────┴──────────┬─────────────┐
         ↓                ↓             ↓
    FilterBtns    AlertItems      AlertDetails
```

## 📋 Schema de Date

### Notificare (Backend Response)

```typescript
interface Notification {
  id: number; // ID unic
  type: string; // Tipul alertei (vezi mai jos)
  title: string; // Titlu scurt
  body: string; // Descriere completă
  is_read: boolean; // Status citit/necitit
  created_at: string; // ISO timestamp
  related_id?: number; // ID al entității (optional)
  metadata?: Record<string, any>; // Metadate suplimentare
}
```

## 🔔 Tipuri de Notificări

| Tip                  | Cod                            | Status  | Color | Icon |
| -------------------- | ------------------------------ | ------- | ----- | ---- |
| Rezervare Activă     | `reservation_active`           | Info    | 🔵    | 📅   |
| Abonament Activ      | `subscription_active`          | Info    | 🟣    | 🎟️   |
| QR Invalid           | `qr_invalid`                   | Warning | 🟠    | ⚠️   |
| Plată Eșuată         | `payment_failed`               | Error   | 🔴    | ❌   |
| Depășire Timp        | `time_exceeded`                | Warning | 🟠    | ⏱️   |
| Loc Ocupat (Nelegal) | `spot_occupied_no_reservation` | Error   | 🔴    | 🚗   |
| Notificare Plată     | `payment`                      | Info    | 🔵    | 💳   |

## 🔌 API Endpoints Necesare

### 1. GET `/notifications`

**Returnează:** Array cu ultimele notificări

```bash
curl -X GET http://localhost:3000/notifications \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "type": "reservation_active",
    "title": "Rezervare Activă",
    "body": "POPESCU ION a rezervat locul A-15 pentru 14:00-18:00",
    "is_read": false,
    "created_at": "2026-05-12T10:30:00Z",
    "related_id": 42,
    "metadata": {
      "user_id": 5,
      "reservation_id": 42,
      "spot_code": "A-15",
      "username": "popescu_ion"
    }
  },
  {
    "id": 2,
    "type": "payment_failed",
    "title": "Plată Eșuată",
    "body": "Card declined pentru subscription #28",
    "is_read": true,
    "created_at": "2026-05-12T09:15:00Z",
    "related_id": 28,
    "metadata": {
      "user_id": 8,
      "subscription_id": 28,
      "error_code": "INSUFFICIENT_FUNDS"
    }
  }
]
```

### 2. PATCH `/notifications/{id}/read`

**Marchează o notificare ca citită**

```bash
curl -X PATCH http://localhost:3000/notifications/1/read \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

**Request Body:**

```json
{}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "is_read": true
}
```

**Error Response (404 Not Found):**

```json
{
  "error": "Notification not found"
}
```

## 🔌 Socket.io Events

### Server → Client

```typescript
// Când o notificare nouă este creată
socket.emit("notification.changed");

// Exemplu pe client (App.tsx):
socket.on("notification.changed", async () => {
  const token = await getAccessToken();
  await loadNotificationsWithToken(token);
});
```

## 💻 Implementare Backend (Exemplu Node.js/Express)

### Model

```typescript
// models/Notification.ts
interface Notification {
  id: number;
  type:
    | "reservation_active"
    | "subscription_active"
    | "qr_invalid"
    | "payment_failed"
    | "time_exceeded"
    | "spot_occupied_no_reservation"
    | "payment";
  title: string;
  body: string;
  is_read: boolean;
  created_at: Date;
  related_id?: number;
  metadata?: Record<string, any>;
  admin_id?: number; // Pentru notificări admin-specific
}
```

### Controller

```typescript
// controllers/NotificationController.ts

// GET /notifications
async getNotifications(req, res) {
  try {
    const notifications = await db.notification.findAll({
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PATCH /notifications/:id/read
async markAsRead(req, res) {
  try {
    const { id } = req.params;
    const notification = await db.notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.is_read = true;
    await notification.save();

    // Emit socket event
    io.emit('notification.changed');

    res.json({ id: notification.id, is_read: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Trigger-uri Notificări

```typescript
// services/NotificationService.ts

class NotificationService {
  // Când o rezervare devine activă
  async createReservationActiveNotif(reservation) {
    return db.notification.create({
      type: "reservation_active",
      title: `Rezervare Activă - Loc ${reservation.spotCode}`,
      body: `${reservation.userName} a rezervat locul ${reservation.spotCode} 
             pentru ${reservation.start} - ${reservation.end}`,
      is_read: false,
      related_id: reservation.id,
      metadata: {
        user_id: reservation.userId,
        reservation_id: reservation.id,
        spot_code: reservation.spotCode,
      },
    });
  }

  // Când plată eșuează
  async createPaymentFailedNotif(payment, error) {
    return db.notification.create({
      type: "payment_failed",
      title: "Plată Eșuată",
      body: `Plata pentru subscription #${payment.subscriptionId} a fost respinsă: ${error}`,
      is_read: false,
      related_id: payment.subscriptionId,
      metadata: {
        user_id: payment.userId,
        payment_id: payment.id,
        subscription_id: payment.subscriptionId,
        error_code: error,
      },
    });
  }

  // Când QR este invalid
  async createQRInvalidNotif(scanResult) {
    return db.notification.create({
      type: "qr_invalid",
      title: "QR Cod Invalid",
      body: `Scanner la ${scanResult.location} a detectat QR invalid`,
      is_read: false,
      metadata: {
        location: scanResult.location,
        timestamp: scanResult.timestamp,
      },
    });
  }

  // Etc...
}
```

## 🎯 Exemplu de Utilizare

### React Component

```typescript
import AlertsPanel from './components/AlertsPanel';
import { getNotificationStats } from './lib/notificationTypes';

export function MyAlertsPage() {
  const [notifications, setNotifications] = useState([]);

  async function markAsRead(id: number) {
    await fetch(`/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Update local state
  }

  const stats = getNotificationStats(notifications);

  return (
    <div>
      <h1>Total: {stats.total} | Necitite: {stats.unread}</h1>
      <AlertsPanel
        notifications={notifications}
        onMarkAsRead={markAsRead}
      />
    </div>
  );
}
```

## 🧪 Testing

### Test data pentru debugging:

```json
[
  {
    "id": 1,
    "type": "reservation_active",
    "title": "Rezervare Activă",
    "body": "TEST: Utilizator cu o rezervare activă",
    "is_read": false,
    "created_at": "2026-05-12T10:00:00Z"
  },
  {
    "id": 2,
    "type": "payment_failed",
    "title": "Plată Eșuată",
    "body": "TEST: Card declined",
    "is_read": false,
    "created_at": "2026-05-12T09:30:00Z"
  }
]
```

## 🚀 Checklist pentru Backend Team

- [ ] GET `/notifications` endpoint implementat
- [ ] PATCH `/notifications/{id}/read` endpoint implementat
- [ ] Socket.io event `notification.changed` emis corect
- [ ] Tipurile de notificări mapping sunt corecte
- [ ] Metadata structurată pentru fiecare tip
- [ ] Timestamps în format ISO 8601
- [ ] Limitare la ultimele 100 notificări (pagination eventual)
- [ ] Auth token validation pe endpoints
- [ ] Error handling și logging
- [ ] Database schema pentru notificări
- [ ] Trigger logica pentru crearea notificărilor

## 📊 Statistici Disponibile

```typescript
import { getNotificationStats } from "./lib/notificationTypes";

const stats = getNotificationStats(notifications);
// {
//   total: 42,
//   unread: 5,
//   byType: {
//     reservation_active: 10,
//     payment_failed: 3,
//     ...
//   },
//   bySeverity: {
//     error: 8,
//     warning: 12,
//     info: 22
//   }
// }
```

## 🔒 Security Considerations

- ✅ Notificații sunt admin-only (acces controlat de `isAdmin`)
- ✅ Token validation pe fiecare endpoint
- ✅ Rate limiting recomandat pe `/notifications`
- ✅ Notificările nu ar trebui să conțină info sensibilă (ex: card details)
- ✅ Validate tip enum pe backend

## 📱 Mobile / API Consumers

Alte aplicații (mobile, alte web apps) pot consuma aceleași endpoints:

```javascript
// Exemplu React Native / TypeScript
const getAlerts = async (token) => {
  const response = await fetch("https://api.smartparking.ro/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};
```

## 🐛 Debugging Tips

```typescript
// In browser console
console.log("Notifications:", notifications);
console.log(
  "Filtered:",
  notifications.filter((n) => n.type === "payment_failed"),
);
console.log(
  "Unread:",
  notifications.filter((n) => !n.is_read),
);

// API test
fetch("/notifications", {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
})
  .then((r) => r.json())
  .then(console.log);
```

## 📞 Contact

Pentru intrebări despre implementare backend, contactează echipa frontend cu detaliile endpoint-urilor."
