# Sistem de Notificări și Alerte - Web Admin

## 📋 Descriere

Am adăugat un sistem complet și profesional de notificări și alerte în modulul **Alerte** al web-admin. Sistemul permite vizualizarea și managementul tuturor tipurilor de notificări din platforma Smart Parking.

## 🎯 Tipuri de Alerte Suportate

### 1. **Rezervări Active** 📅

- **Tip:** `reservation_active`
- **Descriere:** Utilizator cu o rezervare activă în sistem
- **Culoare:** Albastru (#3b82f6)
- **Severitate:** Info

### 2. **Abonamente Active** 🎟️

- **Tip:** `subscription_active`
- **Descriere:** Utilizator cu abonament activ
- **Culoare:** Violet (#8b5cf6)
- **Severitate:** Info

### 3. **QR Cod Invalid** ⚠️

- **Tip:** `qr_invalid`
- **Descriere:** Încercare de scanare cu QR cod invalid/expirat
- **Culoare:** Portocaliu (#d97706)
- **Severitate:** Warning

### 4. **Plată Eșuată** ❌

- **Tip:** `payment_failed`
- **Descriere:** Tranzacție de plată necompletată sau respinsă
- **Culoare:** Roșu (#dc2626)
- **Severitate:** Error

### 5. **Depășire Timp** ⏱️

- **Tip:** `time_exceeded`
- **Descriere:** Utilizator a depășit durata alocată pentru parcare
- **Culoare:** Portocaliu (#f59e0b)
- **Severitate:** Warning

### 6. **Loc Ocupat Fără Rezervare** 🚗

- **Tip:** `spot_occupied_no_reservation`
- **Descriere:** Loc parcare ocupat fără rezervare sau abonament activ valid
- **Culoare:** Roșu (#ef4444)
- **Severitate:** Error

### 7. **Notificări de Plată** 💳

- **Tip:** `payment`
- **Descriere:** Evenimente generale legate de plăți
- **Culoare:** Cyan (#06b6d4)
- **Severitate:** Info

## 🏗️ Componentă și Structură

### Fișiere Noi:

1. **`src/components/AlertsPanel.tsx`** - Componenta React principală
2. **`src/components/AlertsPanel.css`** - Stiluri dedicate
3. **`src/lib/notificationTypes.ts`** - Tipuri și utilitari pentru notificări

### Fișiere Modificate:

- **`src/App.tsx`** - Integrare AlertsPanel și funcție markNotificationAsRead

## 📱 Caracteristici Principale

### ✅ Filtrare Dinamică

- Filtrare după tip de alertă
- Buton "Toate alertele" cu contador
- Butoane categorii cu numărare automată

### 📊 Statistici în Timp Real

- Total alerte
- Alerte necitite cu accent vizual
- Contor pentru fiecare categorie

### 🎨 Design Profesional

- Coduri de culoare distinctive pentru fiecare tip
- Icon-uri emoji pentru recunoaștere rapidă
- Indicatori vizuali pentru alerte necitite
- Animații subtile la expandare/colapsare

### 🔍 Detalii Extinse

- Afișare expandabilă a detaliilor fiecărei alerte
- Secțiuni: Detalii, Mesaj Complet, Metadata
- ID-uri și timestampuri precise

### 📌 Acțiuni Disponibile

- Marcheaza ca citit/necitit
- Expandare/colapsare pentru mai multe detalii
- Status badge pentru fiecare alertă

## 🔧 Configurare Backend

### Endpoint: `/notifications` (GET)

Trebuie să returneze un array de notificări cu următoarea structură:

```json
[
  {
    "id": 1,
    "type": "reservation_active",
    "title": "Rezervare Activă",
    "body": "Utilizatorul ION POPESCU are o rezervare activă în locul A-15",
    "is_read": false,
    "created_at": "2026-05-12T10:30:00Z",
    "related_id": 42,
    "metadata": {
      "user_id": 5,
      "reservation_id": 42,
      "spot_code": "A-15"
    }
  },
  {
    "id": 2,
    "type": "payment_failed",
    "title": "Plată Eșuată",
    "body": "Plata pentru abonament a fost respinsă. Motiv: INSUFFICIENT_FUNDS",
    "is_read": false,
    "created_at": "2026-05-12T09:15:00Z",
    "related_id": 28,
    "metadata": {
      "user_id": 8,
      "subscription_id": 28,
      "amount": "150.00",
      "currency": "RON"
    }
  }
]
```

### Endpoint: `/notifications/{id}/read` (PATCH)

Marchează o notificare ca citită.

**Request:** (PATCH)

```json
{}
```

**Response:**

```json
{
  "id": 1,
  "is_read": true
}
```

## 📡 Socket.io Events

Sistemul ascultă următoarele socket events pentru actualizări în timp real:

```typescript
socket.on("notification.changed", async () => {
  // Reîncarcă notificările
  await loadNotificationsWithToken(token);
});
```

Asigură-te că backend-ul trimite acest event când o notificare nouă este creată sau marcată ca citită.

## 🎨 Integrare în Template

Componenta este deja integrată în App.tsx la pagina "Alerte". Pentru a o folosi în alte locuri:

```tsx
import AlertsPanel from "./components/AlertsPanel";
import "./components/AlertsPanel.css";

<AlertsPanel
  notifications={notifications}
  error={notificationsError}
  onMarkAsRead={markNotificationAsRead}
/>;
```

## 📋 Exemplu de Notificări per Categorie

### Rezervări Active

```json
{
  "type": "reservation_active",
  "title": "Rezervare Activă - Loc A-10",
  "body": "POPESCU ION a rezervat locul A-10 pentru azi 14:00-18:00"
}
```

### Abonamente Active

```json
{
  "type": "subscription_active",
  "title": "Abonament Lunar Activ",
  "body": "КОРИСТЕВ MARIA - Abonament lunar valabil până pe 12.06.2026"
}
```

### QR Invalid

```json
{
  "type": "qr_invalid",
  "title": "QR Cod Invalid",
  "body": "QR scanner la intrare: Cod invalid sau expirat scanat de POPESCU ANDREI"
}
```

### Plată Eșuată

```json
{
  "type": "payment_failed",
  "title": "Plată Eșuată",
  "body": "GOMEZ CARMEN - Plată abonament rejectată: CARD_DECLINED"
}
```

### Depășire Timp

```json
{
  "type": "time_exceeded",
  "title": "Depășire Timp",
  "body": "IACOB DANIEL - a depășit cu 45 minute durata rezervată pentru locul B-22"
}
```

### Loc Ocupat Fără Rezervare

```json
{
  "type": "spot_occupied_no_reservation",
  "title": "Loc Ocupat Fără Drept",
  "body": "Locul C-05 ocupat fără rezervare/abonament valabil de către vehicul AAA-111"
}
```

## 🔄 Flux de Actualizare

1. **Încărcare Inițială** - Notificări se încarcă când utilizatorul accesează pagina "Alerte"
2. **EventEmitter Socket.io** - Orice notificare nouă se reflectă în timp real
3. **Marcaj ca Citit** - Utilizatorul poate marca notificări ca citite individual
4. **Filtrare Automată** - Interfața se actualizează automat la filtrări

## 🛠️ Utilitare Disponibile

Fișierul `src/lib/notificationTypes.ts` oferă funcționalități helper:

```typescript
import {
  categorizeNotifications,
  getSortedByPriority,
  getUnreadNotifications,
  getNotificationsByType,
  getRecentNotifications,
  getNotificationStats,
  NotificationTypeConfig,
} from "./lib/notificationTypes";

// Exemplu de utilizare
const unread = getUnreadNotifications(notifications);
const stats = getNotificationStats(notifications);
const recent = getRecentNotifications(notifications, 24); // ultime 24 ore
```

## 📱 Responsive Design

Interfața este complet responsivă și optimizată pentru:

- Desktop (lat > 768px)
- Tabletă (481px - 768px)
- Mobil (< 480px)

## 🌙 Dark Mode Support

Stilurile includ suport pentru dark mode via `@media (prefers-color-scheme: dark)`

## ✨ Cerințe de Backend

Pentru funcționarea optimă a sistemului, asigură-te că backend-ul implementează:

1. ✅ Endpoint GET `/notifications` - returnează lista notificărilor
2. ✅ Endpoint PATCH `/notifications/{id}/read` - marchează ca citit
3. ✅ Socket.io event `notification.changed` - notificare în timp real
4. ✅ Tipuri corecte de notificări conform celor 6 categorii
5. ✅ Metadata structurată pentru fiecare notificare

## 🚀 Următori Pași

### Pentru Completare Funcționalitate:

1. **Ștergere Notificări** - Adaugă endpoint DELETE
2. **Marcare Masivă** - Funcție pentru marcarea mai multor alerte
3. **Export Notificări** - Export CSV/PDF a historicului
4. **Setări Notificări** - Preferințe utilizator pentru tipurile de alerte
5. **Webhook Integration** - Trimitere notificării prin email/SMS

## 📞 Support

Pentru probleme sau întrebări legate de sistem, contactează echipa de backend pentru a confirma că:

- Tipurile de notificări sunt trimise corect
- Structura datelor corespunde cu schema de mai sus
- Socket.io events sunt triggerizate corespunzător
