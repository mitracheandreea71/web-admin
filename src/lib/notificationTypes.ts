/**
 * Notification Types and Categorization for Smart Parking
 * This file helps categorize and handle different types of notifications/alerts
 */

export type NotificationType =
  | "reservation_active"
  | "subscription_active"
  | "qr_invalid"
  | "payment_failed"
  | "time_exceeded"
  | "spot_occupied_no_reservation"
  | "payment"
  | "unknown";

type NotificationSeverity = "error" | "warning" | "info";

export interface NotificationAlert {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  related_id?: number;
  metadata?: Record<string, any>;
}

export const NotificationTypeConfig = {
  reservation_active: {
    label: "Rezervare Activă",
    description: "Utilizator cu o rezervare activă",
    icon: "📅",
    color: "#3b82f6",
    bgColor: "#dbeafe",
    severity: "info",
  },
  subscription_active: {
    label: "Abonament Activ",
    description: "Utilizator cu abonament activ",
    icon: "🎟️",
    color: "#8b5cf6",
    bgColor: "#ede9fe",
    severity: "info",
  },
  qr_invalid: {
    label: "QR Cod Invalid",
    description: "Încercare de scanare cu QR invalid",
    icon: "⚠️",
    color: "#d97706",
    bgColor: "#fef3c7",
    severity: "warning",
  },
  payment_failed: {
    label: "Plată Eșuată",
    description: "Tranzacție de plată necompletată",
    icon: "❌",
    color: "#dc2626",
    bgColor: "#fee2e2",
    severity: "error",
  },
  time_exceeded: {
    label: "Depășire Timp",
    description: "Utilizator a depășit durata alocată",
    icon: "⏱️",
    color: "#f59e0b",
    bgColor: "#fef3c7",
    severity: "warning",
  },
  spot_occupied_no_reservation: {
    label: "Loc Ocupat Fără Rezervare",
    description: "Loc parcare ocupat fără rezervare sau abonament activ",
    icon: "🚗",
    color: "#ef4444",
    bgColor: "#fee2e2",
    severity: "error",
  },
  payment: {
    label: "Notificare Plată",
    description: "Eveniment legat de plată",
    icon: "💳",
    color: "#06b6d4",
    bgColor: "#cffafe",
    severity: "info",
  },
  unknown: {
    label: "Notificare Generală",
    description: "Notificare necategorizată",
    icon: "ℹ️",
    color: "#6b7280",
    bgColor: "#f3f4f6",
    severity: "info",
  },
};

/**
 * Categorizes and groups notifications by type
 */
export function categorizeNotifications(
  notifications: NotificationAlert[],
): Map<NotificationType, NotificationAlert[]> {
  const categorized = new Map<NotificationType, NotificationAlert[]>();

  Object.keys(NotificationTypeConfig).forEach((type) => {
    categorized.set(type as NotificationType, []);
  });

  notifications.forEach((notification) => {
    const type = (notification.type || "unknown") as NotificationType;
    if (!categorized.has(type)) {
      categorized.set(type, []);
    }
    categorized.get(type)!.push(notification);
  });

  return categorized;
}

/**
 * Gets priority-sorted list of notifications by severity
 */
export function getSortedByPriority(
  notifications: NotificationAlert[],
): NotificationAlert[] {
  const severityOrder = { error: 0, warning: 1, info: 2 };

  return [...notifications].sort((a, b) => {
    const typeA = (a.type || "unknown") as NotificationType;
    const typeB = (b.type || "unknown") as NotificationType;

    const severityA =
      severityOrder[
        (NotificationTypeConfig[typeA]?.severity ||
          "info") as keyof typeof severityOrder
      ];
    const severityB =
      severityOrder[
        (NotificationTypeConfig[typeB]?.severity ||
          "info") as keyof typeof severityOrder
      ];

    if (severityA !== severityB) {
      return severityA - severityB;
    }

    // Then by unread status
    if (a.is_read !== b.is_read) {
      return a.is_read ? 1 : -1;
    }

    // Finally by date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Filters unread notifications only
 */
export function getUnreadNotifications(
  notifications: NotificationAlert[],
): NotificationAlert[] {
  return notifications.filter((n) => !n.is_read);
}

/**
 * Filters notifications by type
 */
export function getNotificationsByType(
  notifications: NotificationAlert[],
  type: NotificationType,
): NotificationAlert[] {
  return notifications.filter((n) => (n.type || "unknown") === type);
}

/**
 * Gets recent notifications (last N hours)
 */
export function getRecentNotifications(
  notifications: NotificationAlert[],
  hoursBack: number = 24,
): NotificationAlert[] {
  const cutoffTime = new Date(
    Date.now() - hoursBack * 60 * 60 * 1000,
  ).getTime();
  return notifications.filter(
    (n) => new Date(n.created_at).getTime() >= cutoffTime,
  );
}

/**
 * Gets statistics about notifications
 */
export function getNotificationStats(notifications: NotificationAlert[]): {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  bySeverity: Record<NotificationSeverity, number>;
} {
  const stats = {
    total: notifications.length,
    unread: getUnreadNotifications(notifications).length,
    byType: {} as Record<NotificationType, number>,
    bySeverity: { error: 0, warning: 0, info: 0 },
  };

  notifications.forEach((notification) => {
    const type = (notification.type || "unknown") as NotificationType;
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    const severity = (NotificationTypeConfig[type]?.severity ||
      "info") as NotificationSeverity;
    stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
  });

  return stats;
}
