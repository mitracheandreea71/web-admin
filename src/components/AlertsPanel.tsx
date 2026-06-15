import { useMemo, useState } from "react";

type AlertTone = "info" | "warning" | "danger";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  related_id?: number;
  metadata?: Record<string, any>;
}

interface AlertsPanelProps {
  notifications: Notification[];
  error?: string;
  onMarkAsRead?: (id: number) => void;
}

const ALERT_TYPES: Array<{
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  tone: AlertTone;
}> = [
  {
    key: "reservation_active",
    label: "Rezervari active",
    shortLabel: "RA",
    description: "Rezervari in desfasurare care pot ocupa locuri.",
    tone: "info",
  },
  {
    key: "subscription_active",
    label: "Abonamente active",
    shortLabel: "AA",
    description: "Abonamente valide care blocheaza sau folosesc locuri.",
    tone: "info",
  },
  {
    key: "qr_invalid",
    label: "QR invalid",
    shortLabel: "QR",
    description: "Incercari de validare cu token invalid sau expirat.",
    tone: "warning",
  },
  {
    key: "payment_failed",
    label: "Plata esuata",
    shortLabel: "PE",
    description: "Tranzactii respinse sau nefinalizate.",
    tone: "danger",
  },
  {
    key: "time_exceeded",
    label: "Depasire timp",
    shortLabel: "DT",
    description: "Utilizatori care au depasit intervalul permis.",
    tone: "warning",
  },
  {
    key: "spot_occupied_no_reservation",
    label: "Loc ocupat fara rezervare",
    shortLabel: "LR",
    description: "Loc detectat ocupat fara rezervare sau abonament activ.",
    tone: "danger",
  },
];

const ALERT_TYPE_BY_KEY = ALERT_TYPES.reduce(
  (acc, alertType) => {
    acc[alertType.key] = alertType;
    return acc;
  },
  {} as Record<string, (typeof ALERT_TYPES)[number]>,
);

export default function AlertsPanel({
  notifications,
  error,
  onMarkAsRead,
}: AlertsPanelProps) {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const unread = notifications.filter((notification) => !notification.is_read);
    const critical = notifications.filter((notification) =>
      ["payment_failed", "spot_occupied_no_reservation"].includes(
        notification.type,
      ),
    );
    const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = notifications.filter(
      (notification) =>
        new Date(notification.created_at).getTime() >= recentCutoff,
    );

    return {
      total: notifications.length,
      unread: unread.length,
      critical: critical.length,
      recent: recent.length,
    };
  }, [notifications]);

  const alertTypeCounts = useMemo(() => {
    return ALERT_TYPES.reduce(
      (acc, alertType) => {
        const items = notifications.filter(
          (notification) => notification.type === alertType.key,
        );
        acc[alertType.key] = {
          total: items.length,
          unread: items.filter((item) => !item.is_read).length,
        };
        return acc;
      },
      {} as Record<string, { total: number; unread: number }>,
    );
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return [...notifications]
      .filter((notification) => {
        if (selectedFilter === "unread" && notification.is_read) return false;
        if (
          selectedFilter === "critical" &&
          !["payment_failed", "spot_occupied_no_reservation"].includes(
            notification.type,
          )
        ) {
          return false;
        }
        if (
          !["all", "unread", "critical"].includes(selectedFilter) &&
          notification.type !== selectedFilter
        ) {
          return false;
        }

        return (
          !normalizedSearch ||
          String(notification.id).includes(normalizedSearch) ||
          notification.type.toLowerCase().includes(normalizedSearch) ||
          notification.title.toLowerCase().includes(normalizedSearch) ||
          notification.body.toLowerCase().includes(normalizedSearch) ||
          String(notification.related_id ?? "")
            .toLowerCase()
            .includes(normalizedSearch)
        );
      })
      .sort(compareAlertsByPriority);
  }, [notifications, search, selectedFilter]);

  return (
    <section className="alerts-workspace">
      {error ? <pre className="dashboard-error">{error}</pre> : null}

      <div className="alerts-stat-grid">
        <AlertStatCard label="Total alerte" value={stats.total} meta="In sistem" />
        <AlertStatCard
          label="Necitite"
          value={stats.unread}
          meta="Necesita verificare"
          tone="warning"
        />
        <AlertStatCard
          label="Critice"
          value={stats.critical}
          meta="Plati si locuri ocupate ilegal"
          tone="danger"
        />
        <AlertStatCard
          label="Ultimele 24h"
          value={stats.recent}
          meta="Activitate recenta"
          tone="info"
        />
      </div>

      <div className="alerts-type-grid">
        {ALERT_TYPES.map((alertType) => {
          const counts = alertTypeCounts[alertType.key] ?? {
            total: 0,
            unread: 0,
          };

          return (
            <button
              key={alertType.key}
              className={`alert-type-card tone-${alertType.tone}${
                selectedFilter === alertType.key ? " active" : ""
              }`}
              onClick={() => setSelectedFilter(alertType.key)}
            >
              <span className="alert-type-icon">{alertType.shortLabel}</span>
              <span className="alert-type-content">
                <strong>{alertType.label}</strong>
                <span>{alertType.description}</span>
              </span>
              <span className="alert-type-count">
                {counts.total}
                {counts.unread ? <small>{counts.unread} noi</small> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="alerts-filter-panel">
        <div className="alerts-filter-tabs">
          <button
            className={selectedFilter === "all" ? "active" : ""}
            onClick={() => setSelectedFilter("all")}
          >
            Toate
          </button>
          <button
            className={selectedFilter === "unread" ? "active" : ""}
            onClick={() => setSelectedFilter("unread")}
          >
            Necitite
          </button>
          <button
            className={selectedFilter === "critical" ? "active" : ""}
            onClick={() => setSelectedFilter("critical")}
          >
            Critice
          </button>
        </div>

        <input
          className="admin-input alerts-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cauta dupa titlu, mesaj, tip sau ID"
        />
      </div>

      <div className="alerts-list-panel">
        <div className="panel-heading">
          <div>
            <h2>Flux alerte</h2>
            <p className="page-subtitle">
              {filteredNotifications.length} rezultate pentru filtrul curent.
            </p>
          </div>
        </div>

        {filteredNotifications.length ? (
          <div className="alerts-list">
            {filteredNotifications.map((notification) => (
              <AlertListItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
              />
            ))}
          </div>
        ) : (
          <div className="alerts-empty-state">
            Nu exista alerte pentru filtrul selectat.
          </div>
        )}
      </div>
    </section>
  );
}

function AlertStatCard({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: number;
  meta: string;
  tone?: AlertTone;
}) {
  return (
    <div className={`alert-stat-card${tone ? ` tone-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{meta}</p>
    </div>
  );
}

function AlertListItem({
  notification,
  onMarkAsRead,
}: {
  notification: Notification;
  onMarkAsRead?: (id: number) => void;
}) {
  const config = ALERT_TYPE_BY_KEY[notification.type] ?? {
    label: notification.type || "Alerta",
    shortLabel: "AL",
    description: "Notificare din sistem.",
    tone: "info" as AlertTone,
  };
  const metadataEntries = Object.entries(notification.metadata ?? {})
    .filter(([, value]) => value == null || ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 4);

  return (
    <article
      className={`alert-list-item tone-${config.tone}${
        notification.is_read ? " is-read" : " is-unread"
      }`}
    >
      <div className="alert-list-icon">{config.shortLabel}</div>

      <div className="alert-list-body">
        <div className="alert-list-header">
          <div>
            <div className="alert-list-title-row">
              <strong>{notification.title || config.label}</strong>
              <span className={`alert-pill tone-${config.tone}`}>
                {config.label}
              </span>
              {!notification.is_read ? (
                <span className="alert-pill tone-warning">Nou</span>
              ) : null}
            </div>
            <p>{notification.body}</p>
          </div>
          <time>{formatAlertDateTime(notification.created_at)}</time>
        </div>

        <div className="alert-list-meta">
          <span>#{notification.id}</span>
          {notification.related_id ? (
            <span>Referinta #{notification.related_id}</span>
          ) : null}
          <span>{notification.is_read ? "Citita" : "Necitita"}</span>
        </div>

        {metadataEntries.length ? (
          <div className="alert-metadata-grid">
            {metadataEntries.map(([key, value]) => (
              <div key={key}>
                <span>{humanizeMetadataKey(key)}</span>
                <strong>{formatMetadataValue(value)}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="alert-list-actions">
        <button
          className="admin-action-button"
          onClick={() => onMarkAsRead?.(notification.id)}
          disabled={notification.is_read}
        >
          {notification.is_read ? "Citit" : "Marcheaza citit"}
        </button>
      </div>
    </article>
  );
}

function compareAlertsByPriority(a: Notification, b: Notification) {
  const severityOrder: Record<AlertTone, number> = {
    danger: 0,
    warning: 1,
    info: 2,
  };
  const severityA = severityOrder[ALERT_TYPE_BY_KEY[a.type]?.tone ?? "info"];
  const severityB = severityOrder[ALERT_TYPE_BY_KEY[b.type]?.tone ?? "info"];

  if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
  if (severityA !== severityB) return severityA - severityB;

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function formatAlertDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function humanizeMetadataKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

function formatMetadataValue(value: unknown) {
  if (value === true) return "Da";
  if (value === false) return "Nu";
  if (value == null) return "-";
  return String(value);
}
