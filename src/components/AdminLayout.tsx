import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type Keycloak from "keycloak-js";
import appLogo from "../assets/icon.png";

type Props = {
  keycloak: Keycloak;
  children: ReactNode;
  activePage?: string;
  onNavigate?: (page: string) => void;
  alertsBadge?: number;
};

// SVG icon map — each key matches a menu item name
const NavIcons: Record<string, JSX.Element> = {
  Dashboard: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2"
        y="2"
        width="7"
        height="7"
        rx="2"
        fill="currentColor"
        opacity=".9"
      />
      <rect
        x="11"
        y="2"
        width="7"
        height="7"
        rx="2"
        fill="currentColor"
        opacity=".5"
      />
      <rect
        x="2"
        y="11"
        width="7"
        height="7"
        rx="2"
        fill="currentColor"
        opacity=".5"
      />
      <rect
        x="11"
        y="11"
        width="7"
        height="7"
        rx="2"
        fill="currentColor"
        opacity=".7"
      />
    </svg>
  ),
  "Ocupare parcare": (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 5v5l3.5 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  "Locuri de parcare": (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2"
        y="5"
        width="16"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6 5V4a4 4 0 0 1 8 0v1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 11h2.5a1.5 1.5 0 0 0 0-3H8v5m0-2h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Utilizatori: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2 17c0-3.314 2.686-5 6-5s6 1.686 6 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M15 7h4M17 5v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Vehicule: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 11l1.5-4.5A2 2 0 0 1 6.4 5h7.2a2 2 0 0 1 1.9 1.5L17 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="2"
        y="11"
        width="16"
        height="5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="6" cy="16" r="1.5" fill="currentColor" />
      <circle cx="14" cy="16" r="1.5" fill="currentColor" />
    </svg>
  ),
  Rezervari: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="3"
        y="4"
        width="14"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3 8h14M7 2v4M13 2v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Abonamente: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2"
        y="5"
        width="16"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M2 9h16" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="13" r="1" fill="currentColor" />
    </svg>
  ),
  "Validare QR": (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2"
        y="2"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="12"
        y="2"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="2"
        y="12"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 12h2v2h-2zM16 12h2v2h-2zM14 14h2v2h-2zM12 16h2v2h-2zM16 16h2v2h-2z"
        fill="currentColor"
      />
    </svg>
  ),
  "Simulare senzori": (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 14a8 8 0 0 1 0-8M7 12a4 4 0 0 1 0-4M10 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM13 12a4 4 0 0 0 0-4M16 14a8 8 0 0 0 0-8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Tarife: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6v1m0 6v1M7.5 8.5a2.5 2 0 0 1 5 0c0 2-5 2-5 4a2.5 2 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Alerte: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 2l1.8 5.4H17l-4.6 3.3 1.8 5.4L10 13l-4.2 3.1 1.8-5.4L3 7.4h5.2L10 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Rapoarte: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="3"
        y="2"
        width="14"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 7h6M7 11h6M7 15h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const menuSections = [
  {
    label: "General",
    items: [
      { name: "Dashboard" },
      { name: "Ocupare parcare" },
      { name: "Locuri de parcare" },
    ],
  },
  {
    label: "Administrare",
    items: [
      { name: "Utilizatori" },
      { name: "Vehicule" },
      { name: "Rezervari" },
      { name: "Abonamente" },
    ],
  },
  {
    label: "Operatiuni",
    items: [
      { name: "Validare QR" },
      { name: "Simulare senzori" },
      { name: "Tarife" },
      { name: "Alerte", badge: 3 },
      { name: "Rapoarte" },
    ],
  },
];

export default function AdminLayout({
  keycloak,
  children,
  activePage = "Dashboard",
  onNavigate,
  alertsBadge = 0,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activePage]);

  const username = keycloak.tokenParsed?.preferred_username ?? "admin";
  const initials = username.slice(0, 2).toUpperCase();

  const activeSection = useMemo(() => {
    return (
      menuSections.find((section) =>
        section.items.some((item) => item.name === activePage),
      )?.label ?? "Panou"
    );
  }, [activePage]);

  return (
    <div className="admin-layout">
      <button
        className={`admin-sidebar-backdrop${sidebarOpen ? " visible" : ""}`}
        aria-label="Inchide meniul"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="admin-sidebar-top">
          <div className="admin-sidebar-logo">
            <div className="admin-sidebar-logo-wrap">
              <img
                className="admin-sidebar-logo-icon"
                src={appLogo}
                alt="Smart Parking"
              />
            </div>
            <div>
              <div className="admin-sidebar-title">Smart Parking</div>
              <div className="admin-sidebar-subtitle">Control Center</div>
            </div>
          </div>

          <button
            className="admin-sidebar-close"
            aria-label="Inchide meniul"
            onClick={() => setSidebarOpen(false)}
          >
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="admin-nav">
          {menuSections.map((section) => (
            <div key={section.label} className="admin-nav-group">
              <div className="admin-nav-section">{section.label}</div>
              {section.items.map((item) => (
                <button
                  key={item.name}
                  className={`admin-nav-item${activePage === item.name ? " active" : ""}`}
                  onClick={() => onNavigate?.(item.name)}
                >
                  <span className="nav-icon">
                    {NavIcons[item.name] ?? (
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="10" cy="10" r="3" />
                      </svg>
                    )}
                  </span>
                  <span className="nav-text">{item.name}</span>
                  {(item.name === "Alerte" ? alertsBadge : item.badge) ? (
                    <span className="nav-badge">
                      {item.name === "Alerte" ? alertsBadge : item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              className="admin-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Deschide meniul"
            >
              <span />
              <span />
              <span />
            </button>

            <div className="admin-header-breadcrumb">
              <div className="admin-header-kicker">
                <span className="kicker-dot" />
                {activeSection}
              </div>
              <div className="admin-header-title-row">
                <h1 className="admin-header-title">{activePage}</h1>
                <div className="admin-header-badge">
                  <span className="badge-dot" />
                  Online
                </div>
              </div>
            </div>
          </div>

          <div className="admin-header-right">
            <div className="admin-user-chip">
              <div className="admin-user-avatar">{initials}</div>
              <div>
                <div className="admin-user-chip-name">{username}</div>
                <div className="admin-user-chip-meta">Administrator</div>
              </div>
            </div>
            <button
              className="admin-logout-button"
              onClick={() => keycloak.logout()}
            >
              <svg viewBox="0 0 20 20" fill="none" width="15" height="15">
                <path
                  d="M7 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M13 14l4-4-4-4M17 10H7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Logout
            </button>
          </div>
        </header>

        <section className="admin-content">
          <div className="admin-page-shell">{children}</div>
        </section>
      </main>
    </div>
  );
}
