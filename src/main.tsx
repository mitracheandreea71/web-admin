import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import keycloak from "./auth/keycloak";
import "./index.css";

keycloak
  .init({
    onLoad: "login-required",
    checkLoginIframe: false,
  })
  .then((authenticated) => {
    if (!authenticated) {
      keycloak.login();
      return;
    }

    const roles = keycloak.tokenParsed?.realm_access?.roles ?? [];
    const normalizedRoles = roles.map((role) => String(role).toUpperCase());
    const isAdmin = normalizedRoles.includes("ADMIN");

    if (!isAdmin) {
      window.alert("Accesul in aplicatia web este permis doar conturilor ADMIN.");
      keycloak.logout();
      return;
    }

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        keycloak.login();
      });
    };

    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App keycloak={keycloak} />
      </React.StrictMode>,
    );
  })
  .catch((error) => {
    console.error("Keycloak init failed", error);
  });
