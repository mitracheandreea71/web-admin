import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import type Keycloak from "keycloak-js";
import { io, type Socket } from "socket.io-client";
import { apiGet, apiPatch, apiPost } from "./lib/api";
import AdminLayout from "./components/AdminLayout";
import AlertsPanel from "./components/AlertsPanel";
import "./components/AlertsPanel.css";

type Props = {
  keycloak: Keycloak;
};

export default function App({ keycloak }: Props) {
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const plateVideoRef = useRef<HTMLVideoElement | null>(null);
  const plateGuideRef = useRef<HTMLDivElement | null>(null);
  const plateStreamRef = useRef<MediaStream | null>(null);
  const plateImageInputRef = useRef<HTMLInputElement | null>(null);
  const plateAutoScanTimerRef = useRef<number | null>(null);
  const plateScannerLoadingRef = useRef(false);
  const plateScannerDetectedRef = useRef(false);
  const plateOcrWorkerRef = useRef<any>(null);
  const dashboardSocketRef = useRef<Socket | null>(null);
  const activePageRef = useRef("Dashboard");
  const availabilityStartRef = useRef("");
  const availabilityEndRef = useRef("");
  const parking3dFrameRef = useRef<HTMLIFrameElement | null>(null);
  const parking3dTokenRef = useRef("");
  const [stats, setStats] = useState<any>(null);
  const [spots, setSpots] = useState<any[]>([]);
  const [spotsError, setSpotsError] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsError, setNotificationsError] = useState("");
  const [reservations, setReservations] = useState<any[]>([]);
  const [reservationsError, setReservationsError] = useState("");
  const [reservationStatusFilter, setReservationStatusFilter] = useState("");
  const [reservationSearch, setReservationSearch] = useState("");
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subscriptionsError, setSubscriptionsError] = useState("");
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState("");
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [usersError, setUsersError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [createUserForm, setCreateUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    role: "USER",
    vehiclePlate: "",
  });
  const [createUserSaving, setCreateUserSaving] = useState(false);
  const [createUserMessage, setCreateUserMessage] = useState("");
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [selectedUserRole, setSelectedUserRole] = useState("USER");
  const [userProfileLoading, setUserProfileLoading] = useState(false);
  const [userProfileError, setUserProfileError] = useState("");
  const [userRoleSaving, setUserRoleSaving] = useState(false);
  const [selectedParkingSpot, setSelectedParkingSpot] = useState<any>(null);
  const [selectedVehicleDetails, setSelectedVehicleDetails] =
    useState<any>(null);
  const [vehicleActionLoadingId, setVehicleActionLoadingId] = useState<
    number | null
  >(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehiclesError, setVehiclesError] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsError, setPaymentsError] = useState("");
  const [spotSearch, setSpotSearch] = useState("");
  const [spotStatusFilter, setSpotStatusFilter] = useState("");
  const [spotLevelFilter, setSpotLevelFilter] = useState("");
  const [spotCodeFilter, setSpotCodeFilter] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [qrVehiclePlate, setQrVehiclePlate] = useState("");
  const [qrResult, setQrResult] = useState<any>(null);
  const [qrError, setQrError] = useState("");
  const [qrScannerStarted, setQrScannerStarted] = useState(false);
  const [qrScannerMessage, setQrScannerMessage] = useState("");
  const [plateScannerStarted, setPlateScannerStarted] = useState(false);
  const [plateScannerLoading, setPlateScannerLoading] = useState(false);
  const [plateScannerMessage, setPlateScannerMessage] = useState("");
  const [, setPlateOcrDebug] = useState("");
  const [plateOcrPreview, setPlateOcrPreview] = useState("");
  const [sensorActionLoadingId, setSensorActionLoadingId] = useState<
    number | null
  >(null);
  const [sensorError, setSensorError] = useState("");
  const [availability, setAvailability] = useState<any[]>([]);
  const [availabilityError, setAvailabilityError] = useState("");
  const [reportType, setReportType] = useState("reservations");
  const [reportStart, setReportStart] = useState(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return toDateTimeLocalValue(date);
  });
  const [reportEnd, setReportEnd] = useState(() =>
    toDateTimeLocalValue(new Date()),
  );
  const [reportAvailability, setReportAvailability] = useState<any[]>([]);
  const [reportError, setReportError] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [pricingSettings, setPricingSettings] = useState<any>(null);
  const [pricingError, setPricingError] = useState("");
  const [pricingSavingKey, setPricingSavingKey] = useState("");
  const [availabilityStart, setAvailabilityStart] = useState(() =>
    toDateTimeLocalValue(new Date()),
  );
  const [availabilityEnd, setAvailabilityEnd] = useState(() =>
    toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("Dashboard");

  const roles = keycloak.tokenParsed?.realm_access?.roles ?? [];
  const isAdmin = roles.includes("ADMIN");

  async function getAccessToken() {
    try {
      await keycloak.updateToken(30);
    } catch (error) {
      await keycloak.login();
      throw error;
    }

    if (!keycloak.token) {
      await keycloak.login();
      throw new Error("Nu exista token Keycloak.");
    }

    return keycloak.token;
  }

  async function loadAdminStatsWithToken(token: string) {
    const statsData = await apiGet<any>("/parking/admin/stats", token);
    setStats(statsData);
    return statsData;
  }

  async function loadSpotsWithToken(token: string) {
    const data = await apiGet<any[]>("/parking/spots", token);
    setSpots(data);
    return data;
  }

  async function loadAvailabilityWithToken(token: string) {
    const startValue = availabilityStartRef.current || availabilityStart;
    const endValue = availabilityEndRef.current || availabilityEnd;

    const params = new URLSearchParams({
      start: new Date(startValue).toISOString(),
      end: new Date(endValue).toISOString(),
    });

    const data = await apiGet<any[]>(
      `/parking/availability?${params.toString()}`,
      token,
    );
    setAvailability(data);
    return data;
  }

  function updateParking3dStatuses(nextAvailability: any[]) {
    parking3dFrameRef.current?.contentWindow?.postMessage(
      {
        type: "parking.availability.updated",
        availability: nextAvailability,
      },
      "*",
    );
  }

  async function loadLiveAvailabilityWithToken(token: string) {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

    const params = new URLSearchParams({
      start: now.toISOString(),
      end: nextHour.toISOString(),
    });

    const data = await apiGet<any[]>(
      `/parking/availability?${params.toString()}`,
      token,
    );
    setAvailability(data);
    return data;
  }

  async function loadNotificationsWithToken(token: string) {
    const data = await apiGet<any[]>("/notifications", token);
    setNotifications(data);
    return data;
  }

  async function loadUsersWithToken(token: string) {
    const data = await apiGet<any[]>("/admin/users", token);
    setUsers(data);
    return data;
  }

  async function loadReservationsWithToken(token: string) {
    const data = await apiGet<any[]>("/admin/reservations", token);
    setReservations(data);
    return data;
  }

  async function loadSubscriptionsWithToken(token: string) {
    const data = await apiGet<any[]>("/admin/subscriptions", token);
    setSubscriptions(data);
    return data;
  }

  async function loadPaymentsWithToken(token: string) {
    const data = await apiGet<any[]>("/admin/payments", token);
    setPayments(data);
    return data;
  }

  async function loadPricingSettingsWithToken(token: string) {
    const data = await apiGet<any>("/admin/pricing", token);
    setPricingSettings(data);
    return data;
  }

  useEffect(() => {
    async function loadMe() {
      try {
        const token = await getAccessToken();
        await apiGet<any>("/auth/me", token);

        const statsData = await loadAdminStatsWithToken(token);
        console.log("ADMIN STATS:", statsData);

        const reservationsData = await loadReservationsWithToken(token);
        console.log("ADMIN RESERVATIONS:", reservationsData);

        const subscriptionsData = await loadSubscriptionsWithToken(token);
        console.log("ADMIN SUBSCRIPTIONS:", subscriptionsData);

        const usersData = await loadUsersWithToken(token);
        console.log("ADMIN USERS:", usersData);

        const vehiclesData = await apiGet<any[]>("/admin/vehicles", token);
        console.log("ADMIN VEHICLES:", vehiclesData);
        setVehicles(vehiclesData);

        const paymentsData = await loadPaymentsWithToken(token);
        console.log("ADMIN PAYMENTS:", paymentsData);

        const notificationsData = await loadNotificationsWithToken(token);
        console.log("ADMIN NOTIFICATIONS:", notificationsData);
      } catch (err: any) {
        setError(err.message);
        setReservationsError(err.message);
        setSubscriptionsError(err.message);
        setUsersError(err.message);
        setVehiclesError(err.message);
        setPaymentsError(err.message);
        setNotificationsError(err.message);
      }
    }

    loadMe();
  }, [keycloak.token]);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  useEffect(() => {
    availabilityStartRef.current = availabilityStart;
  }, [availabilityStart]);

  useEffect(() => {
    availabilityEndRef.current = availabilityEnd;
  }, [availabilityEnd]);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let socket: Socket | null = null;

    const refreshAdminRealtimeData = async () => {
      try {
        const refreshedToken = await getAccessToken();
        if (cancelled) {
          return;
        }

        const [
          ,
          ,
          ,
          ,
          ,
          nextLiveAvailability,
        ] = await Promise.all([
          loadAdminStatsWithToken(refreshedToken),
          loadReservationsWithToken(refreshedToken),
          loadSubscriptionsWithToken(refreshedToken),
          loadPaymentsWithToken(refreshedToken),
          loadSpotsWithToken(refreshedToken),
          loadLiveAvailabilityWithToken(refreshedToken),
          loadNotificationsWithToken(refreshedToken),
        ]);

        if (activePageRef.current === "Ocupare parcare") {
          updateParking3dStatuses(nextLiveAvailability);
        }

        if (selectedUserProfile?.user?.id) {
          await refreshSelectedUserProfile();
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setSpotsError(err.message);
          setAvailabilityError(err.message);
          setReservationsError(err.message);
          setSubscriptionsError(err.message);
          setPaymentsError(err.message);
          setNotificationsError(err.message);
        }
      }
    };

    const scheduleAdminRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        void refreshAdminRealtimeData();
      }, 300);
    };

    async function connectDashboardSocket() {
      if (!keycloak.token || !isAdmin) {
        dashboardSocketRef.current?.disconnect();
        dashboardSocketRef.current = null;
        return;
      }

      const token = await getAccessToken();
      if (cancelled) {
        return;
      }

      dashboardSocketRef.current?.disconnect();

      const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
      const socketUrl = apiUrl
        ? new URL(apiUrl, window.location.origin).origin
        : window.location.origin;

      socket = io(socketUrl, {
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        timeout: 20000,
        auth: {
          token,
        },
      });

      dashboardSocketRef.current = socket;

      socket.on("dashboard.changed", scheduleAdminRefresh);
      socket.on("reservation.changed", scheduleAdminRefresh);
      socket.on("subscription.changed", scheduleAdminRefresh);
      socket.on("payment.changed", scheduleAdminRefresh);
      socket.on("parking.projection.changed", scheduleAdminRefresh);
      socket.on("notification.changed", scheduleAdminRefresh);
    }

    connectDashboardSocket().catch((err: any) => {
      if (!cancelled) {
        setError(err.message);
      }
    });

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      socket?.off("dashboard.changed", scheduleAdminRefresh);
      socket?.off("reservation.changed", scheduleAdminRefresh);
      socket?.off("subscription.changed", scheduleAdminRefresh);
      socket?.off("payment.changed", scheduleAdminRefresh);
      socket?.off("parking.projection.changed", scheduleAdminRefresh);
      socket?.off("notification.changed", scheduleAdminRefresh);
      dashboardSocketRef.current?.disconnect();
      dashboardSocketRef.current = null;
    };
  }, [isAdmin, keycloak.token, selectedUserProfile?.user?.id]);

  useEffect(() => {
    async function loadSpots() {
      try {
        if (
          activePage !== "Locuri de parcare" &&
          activePage !== "Ocupare parcare" &&
          activePage !== "Simulare senzori"
        ) {
          return;
        }
        const token = await getAccessToken();

        setSpotsError("");
        await loadSpotsWithToken(token);
      } catch (err: any) {
        setSpotsError(err.message);
      }
    }

    loadSpots();
  }, [activePage, keycloak.token]);

  useEffect(() => {
    async function loadSensorSimulationView() {
      try {
        if (activePage !== "Simulare senzori") return;
        const token = await getAccessToken();

        setSpotsError("");
        setAvailabilityError("");
        await loadSpotsWithToken(token);
        await loadLiveAvailabilityWithToken(token);
      } catch (err: any) {
        setSpotsError(err.message);
        setAvailabilityError(err.message);
      }
    }

    loadSensorSimulationView();
  }, [activePage, keycloak.token]);

  async function loadAvailability() {
    try {
      const token = await getAccessToken();
      setAvailabilityError("");
      const nextAvailability = await loadAvailabilityWithToken(token);
      updateParking3dStatuses(nextAvailability);
    } catch (err: any) {
      setAvailabilityError(err.message);
    }
  }

  async function loadReportAvailabilityWithToken(token: string) {
    const startDate = new Date(reportStart);
    const endDate = new Date(reportEnd);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate >= endDate
    ) {
      throw new Error("Intervalul raportului trebuie sa aiba start valid inainte de final.");
    }

    const params = new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    const data = await apiGet<any[]>(
      `/parking/availability?${params.toString()}`,
      token,
    );
    setReportAvailability(data);
    return data;
  }

  async function generateReport() {
    setReportLoading(true);
    try {
      const token = await getAccessToken();
      setReportError("");

      await Promise.all([
        loadReservationsWithToken(token),
        loadSubscriptionsWithToken(token),
        loadPaymentsWithToken(token),
        loadSpotsWithToken(token),
        loadReportAvailabilityWithToken(token),
      ]);
    } catch (err: any) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    async function loadParkingInventoryView() {
      try {
        if (activePage !== "Locuri de parcare") return;
        const token = await getAccessToken();

        setSpotsError("");
        setAvailabilityError("");
        await loadSpotsWithToken(token);
        await loadLiveAvailabilityWithToken(token);
      } catch (err: any) {
        setSpotsError(err.message);
        setAvailabilityError(err.message);
      }
    }

    loadParkingInventoryView();
  }, [activePage, keycloak.token]);

  useEffect(() => {
    async function loadOccupancyView() {
      try {
        if (activePage !== "Ocupare parcare") return;
        const token = await getAccessToken();

        setAvailabilityError("");
        await loadSpotsWithToken(token);
        await loadAvailabilityWithToken(token);
      } catch (err: any) {
        setAvailabilityError(err.message);
      }
    }

    loadOccupancyView();
  }, [activePage, keycloak.token, availabilityStart, availabilityEnd]);

  useEffect(() => {
    async function loadAlerts() {
      try {
        if (activePage !== "Alerte") return;
        const token = await getAccessToken();

        setNotificationsError("");
        await loadNotificationsWithToken(token);
      } catch (err: any) {
        setNotificationsError(err.message);
      }
    }

    loadAlerts();
  }, [activePage, keycloak.token]);

  useEffect(() => {
    async function loadPricing() {
      try {
        if (activePage !== "Tarife") return;
        const token = await getAccessToken();

        setPricingError("");
        await loadPricingSettingsWithToken(token);
      } catch (err: any) {
        setPricingError(err.message);
      }
    }

    loadPricing();
  }, [activePage, keycloak.token]);

  useEffect(() => {
    async function loadReports() {
      try {
        if (activePage !== "Rapoarte") return;
        const token = await getAccessToken();

        setReportError("");
        await Promise.all([
          loadReservationsWithToken(token),
          loadSubscriptionsWithToken(token),
          loadPaymentsWithToken(token),
          loadSpotsWithToken(token),
          loadReportAvailabilityWithToken(token),
        ]);
      } catch (err: any) {
        setReportError(err.message);
      }
    }

    loadReports();
  }, [activePage, keycloak.token]);

  if (!isAdmin) {
    return (
      <div className="access-denied">
        <h1>Acces interzis</h1>
        <p>Utilizatorul autentificat nu are rolul ADMIN.</p>
        <p>Roluri: {roles.join(", ")}</p>
        <button onClick={() => keycloak.logout()}>Logout</button>
      </div>
    );
  }

  const filteredReservations = reservations.filter((reservation) => {
    const matchesStatus =
      !reservationStatusFilter ||
      reservation.status === reservationStatusFilter;

    const search = reservationSearch.toLowerCase().trim();

    const matchesSearch =
      !search ||
      String(reservation.id ?? "")
        .toLowerCase()
        .includes(search) ||
      String(reservation.userName ?? "")
        .toLowerCase()
        .includes(search) ||
      String(reservation.userEmail ?? "")
        .toLowerCase()
        .includes(search) ||
      String(reservation.vehiclePlate ?? "")
        .toLowerCase()
        .includes(search) ||
      String(reservation.spotCode ?? "")
        .toLowerCase()
        .includes(search) ||
      String(reservation.spotId ?? "")
        .toLowerCase()
        .includes(search);

    return matchesStatus && matchesSearch;
  });

  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesStatus =
      !subscriptionStatusFilter ||
      subscription.status === subscriptionStatusFilter;

    const search = subscriptionSearch.toLowerCase().trim();

    const matchesSearch =
      !search ||
      String(subscription.id ?? "")
        .toLowerCase()
        .includes(search) ||
      String(subscription.userName ?? "")
        .toLowerCase()
        .includes(search) ||
      String(subscription.userEmail ?? "")
        .toLowerCase()
        .includes(search) ||
      String(subscription.vehiclePlate ?? "")
        .toLowerCase()
        .includes(search) ||
      String(subscription.spotCode ?? "")
        .toLowerCase()
        .includes(search) ||
      String(subscription.spotId ?? "")
        .toLowerCase()
        .includes(search) ||
      String(subscription.planName ?? "")
        .toLowerCase()
        .includes(search) ||
      String(subscription.planCode ?? "")
        .toLowerCase()
        .includes(search);

    return matchesStatus && matchesSearch;
  });

  const filteredUsers = users.filter((user) => {
    const search = userSearch.toLowerCase().trim();

    return (
      !search ||
      String(user.id ?? "")
        .toLowerCase()
        .includes(search) ||
      String(user.fullName ?? "")
        .toLowerCase()
        .includes(search) ||
      String(user.email ?? "")
        .toLowerCase()
        .includes(search) ||
      String(user.username ?? "")
        .toLowerCase()
        .includes(search) ||
      String(user.roles?.join(", ") ?? "")
        .toLowerCase()
        .includes(search)
    );
  });

  const filteredVehicles = vehicles.filter((vehicle) => {
    const search = vehicleSearch.toLowerCase().trim();

    return (
      !search ||
      String(vehicle.id ?? "")
        .toLowerCase()
        .includes(search) ||
      String(vehicle.plateNumber ?? "")
        .toLowerCase()
        .includes(search) ||
      String(vehicle.userEmail ?? "")
        .toLowerCase()
        .includes(search) ||
      String(vehicle.userName ?? "")
        .toLowerCase()
        .includes(search)
    );
  });

  async function cancelReservation(reservationId: number) {
    try {
      const token = await getAccessToken();

      const confirmed = window.confirm(
        `Sigur vrei sa anulezi rezervarea #${reservationId}?`,
      );

      if (!confirmed) return;

      await apiPatch(`/admin/reservations/${reservationId}/cancel`, token);

      const reservationsData = await apiGet<any[]>(
        "/admin/reservations",
        token,
      );

      setReservations(reservationsData);
    } catch (err: any) {
      setReservationsError(err.message);
    }
  }

  async function cancelSubscription(subscriptionId: number) {
    try {
      const token = await getAccessToken();

      const confirmed = window.confirm(
        `Sigur vrei sa anulezi abonamentul #${subscriptionId}?`,
      );

      if (!confirmed) return;

      await apiPatch(`/admin/subscriptions/${subscriptionId}/cancel`, token);

      const subscriptionsData = await apiGet<any[]>(
        "/admin/subscriptions",
        token,
      );

      setSubscriptions(subscriptionsData);
    } catch (err: any) {
      setSubscriptionsError(err.message);
    }
  }

  async function markNotificationAsRead(notificationId: number) {
    try {
      const token = await getAccessToken();

      // Call the API to mark notification as read
      await apiPatch(`/notifications/${notificationId}/read`, token);

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif,
        ),
      );
    } catch (err: any) {
      console.error("Error marking notification as read:", err.message);
    }
  }

  async function saveReservationRate() {
    try {
      const token = await getAccessToken();
      setPricingSavingKey("reservation-rate");
      setPricingError("");

      const data = await apiPatch<any>(
        "/admin/pricing/reservation-rate",
        token,
        {
          ratePerHourCents:
            pricingSettings?.reservationRate?.ratePerHourCents ?? 0,
        },
      );
      setPricingSettings(data);
    } catch (err: any) {
      setPricingError(err.message);
    } finally {
      setPricingSavingKey("");
    }
  }

  async function saveSubscriptionPlan(plan: any) {
    try {
      const token = await getAccessToken();
      setPricingSavingKey(`plan-${plan.id}`);
      setPricingError("");

      const data = await apiPatch<any>(
        `/admin/pricing/subscription-plans/${plan.id}`,
        token,
        {
          name: plan.name,
          durationDays: plan.durationDays,
          basePriceCents: plan.basePriceCents,
          description: plan.description,
        },
      );
      setPricingSettings(data);
    } catch (err: any) {
      setPricingError(err.message);
    } finally {
      setPricingSavingKey("");
    }
  }

  async function savePricingRule(rule: any) {
    try {
      const token = await getAccessToken();
      setPricingSavingKey(`rule-${rule.id}`);
      setPricingError("");

      const data = await apiPatch<any>(
        `/admin/pricing/rules/${rule.id}`,
        token,
        {
          name: rule.name,
          description: rule.description,
          minOccupancy: rule.minOccupancy,
          maxOccupancy: rule.maxOccupancy,
          multiplier: rule.multiplier,
          active: rule.active,
        },
      );
      setPricingSettings(data);
    } catch (err: any) {
      setPricingError(err.message);
    } finally {
      setPricingSavingKey("");
    }
  }

  async function openUserProfile(userId: number) {
    try {
      setUserProfileLoading(true);
      setUserProfileError("");
      setSelectedUserProfile(null);
      const token = await getAccessToken();
      const profile = await apiGet<any>(
        `/admin/users/${userId}/profile`,
        token,
      );
      setSelectedUserProfile(profile);
      setSelectedUserRole(
        profile?.user?.roles?.includes("ADMIN") ? "ADMIN" : "USER",
      );
    } catch (err: any) {
      setUserProfileError(err.message);
    } finally {
      setUserProfileLoading(false);
    }
  }

  function closeUserProfile() {
    setSelectedUserProfile(null);
    setUserProfileError("");
    setUserProfileLoading(false);
    setSelectedUserRole("USER");
    setVehicleActionLoadingId(null);
  }

  function openParkingSpotDetails(spot: any) {
    setSelectedParkingSpot(spot);
  }

  function closeParkingSpotDetails() {
    setSelectedParkingSpot(null);
  }

  function openVehicleDetails(vehicle: any) {
    setSelectedVehicleDetails(vehicle);
  }

  function closeVehicleDetails() {
    setSelectedVehicleDetails(null);
    setVehicleActionLoadingId(null);
  }

  function syncSelectedVehicleDetails(nextVehicles: any[]) {
    const vehicleId = Number(selectedVehicleDetails?.id);
    if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
      return;
    }

    setSelectedVehicleDetails(
      nextVehicles.find((vehicle) => Number(vehicle.id) === vehicleId) ?? null,
    );
  }

  async function refreshSelectedUserProfile() {
    const userId = Number(selectedUserProfile?.user?.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return;
    }

    await openUserProfile(userId);
  }

  async function saveSelectedUserRole() {
    const userId = Number(selectedUserProfile?.user?.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return;
    }

    try {
      setUserRoleSaving(true);
      setUserProfileError("");
      const token = await getAccessToken();
      await apiPatch(`/admin/users/${userId}/roles`, token, {
        roles: [selectedUserRole],
      });
      await loadUsersWithToken(token);
      await openUserProfile(userId);
    } catch (err: any) {
      setUserProfileError(err.message);
    } finally {
      setUserRoleSaving(false);
    }
  }

  async function createAdminUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCreateUserSaving(true);
      setUsersError("");
      setCreateUserMessage("");
      const token = await getAccessToken();

      await apiPost("/admin/users", token, createUserForm);
      await loadUsersWithToken(token);

      setCreateUserForm({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        password: "",
        role: "USER",
        vehiclePlate: "",
      });
      setCreateUserMessage("Utilizatorul a fost creat in Keycloak si MySQL.");
    } catch (err: any) {
      setUsersError(err.message);
    } finally {
      setCreateUserSaving(false);
    }
  }

  async function setVehiclePrimaryFromAdmin(vehicleId: number) {
    try {
      setVehicleActionLoadingId(vehicleId);
      setUserProfileError("");
      const token = await getAccessToken();
      await apiPatch(`/admin/vehicles/${vehicleId}/primary`, token);
      const vehiclesData = await apiGet<any[]>("/admin/vehicles", token);
      setVehicles(vehiclesData);
      syncSelectedVehicleDetails(vehiclesData);
      await Promise.all([refreshSelectedUserProfile()]);
    } catch (err: any) {
      setUserProfileError(err.message);
    } finally {
      setVehicleActionLoadingId(null);
    }
  }

  async function deactivateVehicleFromAdmin(vehicleId: number) {
    try {
      setVehicleActionLoadingId(vehicleId);
      setUserProfileError("");
      const token = await getAccessToken();
      await apiPatch(`/admin/vehicles/${vehicleId}/deactivate`, token);
      const vehiclesData = await apiGet<any[]>("/admin/vehicles", token);
      setVehicles(vehiclesData);
      syncSelectedVehicleDetails(vehiclesData);
      await Promise.all([refreshSelectedUserProfile()]);
    } catch (err: any) {
      setUserProfileError(err.message);
    } finally {
      setVehicleActionLoadingId(null);
    }
  }

  async function activateVehicleFromAdmin(vehicleId: number) {
    try {
      setVehicleActionLoadingId(vehicleId);
      setUserProfileError("");
      const token = await getAccessToken();
      await apiPatch(`/admin/vehicles/${vehicleId}/activate`, token);
      const vehiclesData = await apiGet<any[]>("/admin/vehicles", token);
      setVehicles(vehiclesData);
      syncSelectedVehicleDetails(vehiclesData);
      await Promise.all([refreshSelectedUserProfile()]);
    } catch (err: any) {
      setUserProfileError(err.message);
    } finally {
      setVehicleActionLoadingId(null);
    }
  }

  async function simulateSensorStatus(
    spotId: number,
    status: "occupied" | "free",
  ) {
    try {
      setSensorActionLoadingId(spotId);
      setSensorError("");
      const token = await getAccessToken();
      await apiPatch(`/admin/spots/${spotId}/sensor-status`, token, {
        status,
      });
      await Promise.all([
        loadAdminStatsWithToken(token),
        loadSpotsWithToken(token),
        loadLiveAvailabilityWithToken(token),
      ]);
    } catch (err: any) {
      setSensorError(err.message);
    } finally {
      setSensorActionLoadingId(null);
    }
  }

  function jumpToUserReservations(userProfile: any) {
    const searchToken =
      userProfile?.user?.email ??
      userProfile?.user?.username ??
      String(userProfile?.user?.id ?? "");
    setReservationSearch(searchToken);
    setReservationStatusFilter("");
    setActivePage("Rezervari");
    closeUserProfile();
  }

  function jumpToUserSubscriptions(userProfile: any) {
    const searchToken =
      userProfile?.user?.email ??
      userProfile?.user?.username ??
      String(userProfile?.user?.id ?? "");
    setSubscriptionSearch(searchToken);
    setSubscriptionStatusFilter("");
    setActivePage("Abonamente");
    closeUserProfile();
  }

  async function validateQrToken(tokenValue: string, vehiclePlate = "") {
    try {
      const token = await getAccessToken();
      const normalizedVehiclePlate = normalizePlateInput(vehiclePlate);

      setQrError("");
      setQrResult(null);
      setQrScannerMessage("Validam codul QR...");

      const result = await apiPost<any>("/admin/qr/validate", token, {
        token: tokenValue,
        vehiclePlate: normalizedVehiclePlate || undefined,
      });

      setQrResult(result);
      setQrScannerMessage(
        result?.accessEvent === "entry"
          ? "Intrarea in parcare a fost inregistrata."
          : result?.accessEvent === "exit"
            ? result?.penaltyCents
              ? `Iesirea a fost inregistrata. Penalitate: ${(Number(result.penaltyCents) / 100).toFixed(2)} RON.`
              : "Iesirea din parcare a fost inregistrata."
            : "Cod QR detectat si validat.",
      );
      return result;
    } catch (err: any) {
      setQrError(err.message);
      setQrScannerMessage("");
      return null;
    }
  }

  async function startPlateScanner() {
    try {
      setQrError("");
      setPlateOcrDebug("");
      setPlateOcrPreview("");
      setPlateScannerMessage("Pornim camera pentru numarul de inmatriculare...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      plateStreamRef.current = stream;
      plateScannerDetectedRef.current = false;
      setPlateScannerStarted(true);
      void preparePlateOcrWorker();
      setPlateScannerMessage(
        "Detectare automata pornita. Aliniaza placuta in cadru.",
      );
    } catch (err: any) {
      setQrError(err.message ?? "Camera nu poate fi pornita.");
      setPlateScannerMessage("");
    }
  }

  function stopPlateScanner() {
    stopPlateAutoDetection();
    plateStreamRef.current?.getTracks().forEach((track) => track.stop());
    plateStreamRef.current = null;

    if (plateVideoRef.current) {
      plateVideoRef.current.srcObject = null;
    }

    setPlateScannerStarted(false);
    plateScannerLoadingRef.current = false;
    plateScannerDetectedRef.current = false;
    setPlateScannerLoading(false);
    setPlateScannerMessage("");
    setPlateOcrDebug("");
    setPlateOcrPreview("");
  }

  function stopPlateAutoDetection() {
    if (plateAutoScanTimerRef.current != null) {
      window.clearInterval(plateAutoScanTimerRef.current);
      plateAutoScanTimerRef.current = null;
    }
  }

  function stopPlateCameraAfterDetection() {
    stopPlateAutoDetection();
    plateStreamRef.current?.getTracks().forEach((track) => track.stop());
    plateStreamRef.current = null;

    if (plateVideoRef.current) {
      plateVideoRef.current.srcObject = null;
    }

    setPlateScannerStarted(false);
    plateScannerLoadingRef.current = false;
    plateScannerDetectedRef.current = true;
    setPlateScannerLoading(false);
  }

  async function preparePlateOcrWorker() {
    if (plateOcrWorkerRef.current) {
      return plateOcrWorkerRef.current;
    }

    const { createWorker } = await import("tesseract.js");
    plateOcrWorkerRef.current = await createWorker("eng");
    return plateOcrWorkerRef.current;
  }

  async function recognizePlateFromCanvases(
    canvases: HTMLCanvasElement[],
    options: { fast?: boolean } = {},
  ) {
    setPlateOcrPreview(canvases[0]?.toDataURL("image/png") ?? "");

    const texts: string[] = [];
    const candidateScores = new Map<
      string,
      { score: number; count: number; sources: string[] }
    >();
    let tesseractError = "";

    const addCandidateVote = (
      rawText: string,
      source: string,
      weight: number,
      confidence = 0,
    ) => {
      const candidates = extractPlateCandidates(rawText);
      for (const candidate of candidates) {
        const current = candidateScores.get(candidate) ?? {
          score: 0,
          count: 0,
          sources: [],
        };
        current.score += weight + scorePlateCandidate(candidate) + confidence / 15;
        current.count += 1;
        current.sources.push(source);
        candidateScores.set(candidate, current);
      }
    };

    try {
      const { PSM } = await import("tesseract.js");
      const worker = await preparePlateOcrWorker();
      const canvasesToRead = canvases;
      const pageSegModes = [
        PSM.SINGLE_LINE,
        PSM.SINGLE_WORD,
        PSM.SPARSE_TEXT,
        PSM.RAW_LINE,
      ];

      for (const canvas of canvasesToRead) {
        for (const pageSegMode of pageSegModes) {
          await worker.setParameters({
            preserve_interword_spaces: "1",
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
            tessedit_pageseg_mode: pageSegMode,
            user_defined_dpi: "300",
          } as any);

          const result = await worker.recognize(canvas);
          const text = result.data.text;
          texts.push(text);
          addCandidateVote(
            text,
            `tesseract:${pageSegMode}`,
            12,
            Number(result.data.confidence ?? 0),
          );
        }
      }
    } catch (err: any) {
      tesseractError = err?.message ?? "eroare necunoscuta";
      console.error("PLATE OCR TESSERACT ERROR:", err);
    }

    const rawOcrText = texts
      .map((text) => text.trim())
      .filter(Boolean)
      .join(" | ");

    console.log("PLATE OCR TEXTS:", texts);

    const templatePlate = detectPlateByTemplate(canvases);
    if (templatePlate) {
      addCandidateVote(templatePlate, "template", 18, 80);
    }

    const directPlate = extractPlateCandidate(texts.join(" | "));
    if (directPlate) {
      addCandidateVote(directPlate, "direct", 14, 70);
    }

    const rankedCandidates = Array.from(candidateScores.entries()).sort(
      ([plateA, dataA], [plateB, dataB]) =>
        dataB.score + dataB.count * 25 + scorePlateCandidate(plateB) -
        (dataA.score + dataA.count * 25 + scorePlateCandidate(plateA)),
    );
    const bestCandidate = rankedCandidates[0];
    const secondCandidate = rankedCandidates[1];
    const minimumScore = options.fast ? 55 : 70;
    const hasStrongConsensus =
      !!bestCandidate &&
      (bestCandidate[1].count >= 2 ||
        !secondCandidate ||
        bestCandidate[1].score - secondCandidate[1].score >= 22);
    const detectedPlate =
      bestCandidate &&
      bestCandidate[1].score >= minimumScore &&
      hasStrongConsensus
        ? bestCandidate[0]
        : "";

    setPlateOcrDebug(
      [
        tesseractError
          ? `Tesseract: eroare (${tesseractError})`
          : rawOcrText
            ? `Tesseract: ${rawOcrText}`
            : "Tesseract: fara text",
        directPlate ? `Direct: ${directPlate}` : "Direct: fara numar",
        templatePlate ? `Imagine: ${templatePlate}` : "Imagine: fara text",
        rankedCandidates.length
          ? `Vot: ${rankedCandidates
              .slice(0, 3)
              .map(
                ([plate, data]) =>
                  `${plate} (${Math.round(data.score)}, ${data.count}x)`,
              )
              .join(", ")}`
          : "Vot: fara candidat",
      ].join(" | "),
    );

    if (!detectedPlate) {
      return "";
    }

    return detectedPlate;
  }

  async function handleDetectedPlate(
    detectedPlate: string,
    options: { automatic?: boolean; source?: "camera" | "upload" } = {},
  ) {
    plateScannerDetectedRef.current = true;
    stopPlateAutoDetection();
    setQrVehiclePlate(detectedPlate);
    setPlateScannerMessage(
      options.source === "upload"
        ? `Numar detectat din imagine: ${detectedPlate}`
        : options.automatic
          ? `Numar detectat automat: ${detectedPlate}`
          : `Numar detectat: ${detectedPlate}`,
    );
    const validationResult = await validateQrToken(qrToken, detectedPlate);

    if (options.source === "upload" && validationResult?.plateCheck?.checked) {
      if (validationResult.plateCheck.matches) {
        setPlateScannerMessage(
          `Numar detectat din imagine si confirmat: ${detectedPlate}`,
        );
      } else {
        const expectedPlate = validationResult.plateCheck.expectedPlate ?? "-";
        const submittedPlate =
          validationResult.plateCheck.submittedPlate ?? detectedPlate;

        setPlateScannerMessage(
          `Poza nu corespunde: am citit ${submittedPlate}, dar QR-ul este pentru ${expectedPlate}. Incarca poza corecta sau introdu numarul manual.`,
        );
      }
    }

    if (options.source !== "upload") {
      stopPlateCameraAfterDetection();
    }
  }

  async function readPlateFromCamera(options: { automatic?: boolean } = {}) {
    if (plateScannerLoadingRef.current) {
      return false;
    }

    const video = plateVideoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      if (!options.automatic) {
        setQrError("Camera nu este pregatita pentru captura.");
      }
      return false;
    }

    try {
      plateScannerLoadingRef.current = true;
      setPlateScannerLoading(true);
      setQrError("");
      setPlateScannerMessage(
        options.automatic
          ? "Detectam automat numarul..."
          : "Citim numarul din imagine...",
      );

      const bestCanvas = await captureBestPlateFrame(
        video,
        plateGuideRef.current,
      );
      const canvases = buildPlateOcrCanvasesFromCanvas(bestCanvas);
      let detectedPlate = await recognizePlateFromCanvases(canvases);
      const expectedPlate = getExpectedPlateFromQrResult(qrResult);

      if (expectedPlate) {
        const cameraScore = scoreCanvasAgainstExpectedPlate(
          canvases[0],
          expectedPlate,
        );

        setPlateOcrDebug((current) =>
          [
            current,
            `Comparatie camera QR: ${expectedPlate} (${Math.round(
              cameraScore * 100,
            )}%)`,
          ]
            .filter(Boolean)
            .join(" | "),
        );

        if (
          shouldPreferExpectedPlate({
            detectedPlate,
            expectedPlate,
            visualScore: cameraScore,
            threshold: 0.3,
          })
        ) {
          detectedPlate = expectedPlate;
        }
      }

      if (!detectedPlate) {
        setPlateScannerMessage(
          options.automatic
            ? "Detectare automata activa. Aliniaza placuta cat mai drept."
            : "Nu am putut detecta un numar clar. Foloseste litere mai groase, lumina mai buna sau introdu numarul manual.",
        );
        return false;
      }

      await handleDetectedPlate(detectedPlate, {
        ...options,
        source: "camera",
      });
      return true;
    } catch (err: any) {
      if (!options.automatic) {
        setQrError(err.message ?? "Nu s-a putut citi numarul.");
        setPlateScannerMessage("");
      } else {
        setPlateScannerMessage("Detectare automata activa. Reincercam...");
      }
      return false;
    } finally {
      plateScannerLoadingRef.current = false;
      setPlateScannerLoading(false);
    }
  }

  async function handlePlateImageUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      setPlateScannerMessage("Nu a fost selectata nicio poza.");
      return;
    }

    if (plateScannerLoadingRef.current) {
      setPlateScannerMessage(
        "Asteapta sa se termine citirea curenta, apoi incarca poza din nou.",
      );
      event.target.value = "";
      return;
    }

    try {
      setPlateScannerMessage(`Poza selectata: ${file.name}`);
      stopPlateAutoDetection();
      plateStreamRef.current?.getTracks().forEach((track) => track.stop());
      plateStreamRef.current = null;
      if (plateVideoRef.current) {
        plateVideoRef.current.srcObject = null;
      }
      setPlateScannerStarted(false);

      plateScannerLoadingRef.current = true;
      setPlateScannerLoading(true);
      setQrError("");
      setPlateOcrDebug("");
      setPlateOcrPreview("");
      setPlateScannerMessage("Citim numarul din imaginea incarcata...");

      const image = await loadImageFromFile(file);
      let detectedPlate = await recognizePlateFromCanvases(
        buildPlateOcrCanvasesFromImage(image),
      );
      const expectedPlate = getExpectedPlateFromQrResult(qrResult);

      if (expectedPlate) {
        const expectedScore = scoreImageAgainstExpectedPlate(
          image,
          expectedPlate,
        );
        setPlateOcrDebug((current) =>
          [
            current,
            `Comparatie QR: ${expectedPlate} (${Math.round(
              expectedScore * 100,
            )}%)`,
          ]
            .filter(Boolean)
            .join(" | "),
        );

        if (
          shouldPreferExpectedPlate({
            detectedPlate,
            expectedPlate,
            visualScore: expectedScore,
            threshold: 0.34,
          })
        ) {
          detectedPlate = expectedPlate;
        }
      }

      if (!detectedPlate) {
        setQrError(
          "Poza incarcata nu contine un numar de inmatriculare clar.",
        );
        setPlateScannerMessage(
          "Nu am putut detecta numarul din imagine. Incearca o poza mai clara sau introdu numarul manual.",
        );
        return;
      }

      await handleDetectedPlate(detectedPlate, { source: "upload" });
    } catch (err: any) {
      console.error("PLATE IMAGE UPLOAD ERROR:", err);
      setQrError(err.message ?? "Nu s-a putut procesa imaginea.");
      setPlateScannerMessage(
        "Nu s-a putut procesa imaginea incarcata. Incearca alta poza sau introdu numarul manual.",
      );
    } finally {
      plateScannerLoadingRef.current = false;
      setPlateScannerLoading(false);
      event.target.value = "";
    }
  }

  async function handleQrImageUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setQrError("");
      setQrResult(null);
      setQrScannerMessage("Procesam imaginea QR...");

      const imageScanner = new Html5Qrcode("qr-file-reader", {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });

      const decodedText = await imageScanner.scanFile(file, false);
      setQrToken(decodedText);
      await validateQrToken(decodedText);
    } catch (err: any) {
      setQrScannerMessage("");
      setQrError(
        err?.message || "Nu am putut citi codul QR din imaginea selectata.",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function stopQrScanner() {
    const scanner = qrScannerRef.current;

    if (!scanner) {
      setQrScannerStarted(false);
      return;
    }

    try {
      await scanner.stop();
    } catch {
      // Ignore stop errors if the scanner is already stopping.
    }

    try {
      await scanner.clear();
    } catch {
      // Ignore clear errors once the element is reset.
    }

    qrScannerRef.current = null;
    setQrScannerStarted(false);
    setQrScannerMessage("Scanner oprit.");
  }

  function getScannerErrorMessage(error: unknown) {
    if (typeof error === "string" && error.trim()) {
      return error;
    }

    if (error instanceof Error) {
      if (error.message?.trim()) {
        return error.message;
      }

      return error.name || "Eroare necunoscuta.";
    }

    if (error && typeof error === "object") {
      const message = Reflect.get(error, "message");

      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }

    return "Browserul nu a putut porni camera selectata.";
  }

  async function startQrScanner() {
    if (qrScannerStarted) return;

    await stopQrScanner();

    setQrScannerStarted(true);
    setQrError("");
    setQrResult(null);
    setQrScannerMessage(
      "Scanner pornit. Tine codul QR clar, aproape si bine luminat.",
    );

    const scanner = new Html5Qrcode("qr-reader", {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true,
    });
    qrScannerRef.current = scanner;

    try {
      const scanConfig = {
        fps: 12,
        aspectRatio: 1,
        disableFlip: false,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const size = Math.max(
            220,
            Math.min(Math.min(viewfinderWidth, viewfinderHeight) * 0.82, 380),
          );

          return {
            width: size,
            height: size,
          };
        },
      };
      const cameras = await Html5Qrcode.getCameras();
      const preferredCamera =
        cameras.find((camera) =>
          `${camera.label ?? ""}`.toLowerCase().includes("back"),
        ) ??
        cameras.find((camera) =>
          `${camera.label ?? ""}`.toLowerCase().includes("rear"),
        ) ??
        cameras[0];

      const cameraCandidates: Array<string | MediaTrackConstraints> = [
        ...(preferredCamera ? [preferredCamera.id] : []),
        {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        {
          facingMode: "environment",
        },
        {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        {},
      ];

      let lastError: unknown = null;

      for (const candidate of cameraCandidates) {
        try {
          await scanner.start(
            candidate,
            scanConfig,
            async (decodedText) => {
              await stopQrScanner();
              setQrToken(decodedText);
              await validateQrToken(decodedText);
            },
            (errorMessage) => {
              if (
                errorMessage &&
                !errorMessage.toLowerCase().includes("notfoundexception")
              ) {
                setQrScannerMessage(
                  "Scannerul cauta un cod QR valid. Incearca sa umpli cadrul.",
                );
              }
            },
          );

          lastError = null;
          break;
        } catch (candidateError) {
          lastError = candidateError;
        }
      }

      if (lastError) {
        throw lastError;
      }

      setQrScannerMessage(
        "Scanner activ. Foloseste camera cea mai clara si apropie codul de cadru.",
      );
    } catch (err: any) {
      qrScannerRef.current = null;
      setQrScannerStarted(false);
      setQrScannerMessage("");
      setQrError(
        `Nu am putut porni camera pentru scanarea QR. ${getScannerErrorMessage(err)}`,
      );
    }
  }

  useEffect(() => {
    if (activePage !== "Validare QR" && qrScannerStarted) {
      stopQrScanner().catch(() => undefined);
    }

    if (activePage !== "Validare QR" && plateScannerStarted) {
      stopPlateScanner();
    }
  }, [activePage, qrScannerStarted, plateScannerStarted]);

  useEffect(() => {
    const video = plateVideoRef.current;
    const stream = plateStreamRef.current;

    if (!plateScannerStarted || !video || !stream) {
      return;
    }

    video.srcObject = stream;

    const playVideo = async () => {
      try {
        await video.play();
        stopPlateAutoDetection();
        plateAutoScanTimerRef.current = window.setInterval(() => {
          if (
            plateScannerDetectedRef.current ||
            plateScannerLoadingRef.current
          ) {
            return;
          }

          void readPlateFromCamera({ automatic: true });
        }, 1800);
      } catch (error: any) {
        setQrError(
          `Camera a pornit, dar browserul nu a redat imaginea. ${
            error?.message ?? ""
          }`,
        );
      }
    };

    void playVideo();

    return () => {
      stopPlateAutoDetection();
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [plateScannerStarted]);

  function renderPage() {
    const dashboardActions = [
      {
        label: "Vezi rezervarile",
        description: "Monitorizare rapida pentru rezervari si exceptii.",
        page: "Rezervari",
      },
      {
        label: "Valideaza accesul",
        description: "Scaneaza QR si confirma instant accesul.",
        page: "Validare QR",
      },
      {
        label: "Analizeaza ocuparea",
        description: "Verifica disponibilitatea pe intervale active.",
        page: "Ocupare parcare",
      },
    ];

    const totalVehicleLinks = users.reduce(
      (sum, user) => sum + Number(user.vehiclesCount ?? 0),
      0,
    );
    const pendingReservations = reservations.filter(
      (reservation) => reservation.status === "pending",
    ).length;
    const activeReservationsCount = reservations.filter(
      (reservation) => reservation.status === "active",
    ).length;
    const activeSubscriptionsCount = subscriptions.filter(
      (subscription) => subscription.status === "active",
    ).length;
    const pendingSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === "pending",
    ).length;
    const activeVehicles = vehicles.filter(
      (vehicle) => vehicle.isActive,
    ).length;
    const primaryVehicles = vehicles.filter(
      (vehicle) => vehicle.isPrimary,
    ).length;
    const activeUsersCount = users.filter((user) => user.isActive).length;
    const spotLayoutById = new Map(
      spots.map((spot) => [
        Number(spot.spotId ?? spot.id),
        {
          id: Number(spot.spotId ?? spot.id),
          code: spot.code ?? spot.label ?? spot.name ?? "-",
          levelId: Number(spot.levelId ?? spot.level ?? spot.floor ?? 0),
          x: Number(spot.x ?? 0),
          y: Number(spot.y ?? 0),
          z: Number(spot.z ?? 0),
          w: Number(spot.w ?? 2.8),
          h: Number(spot.h ?? 5.8),
        },
      ]),
    );
    const availabilityBySpotId = new Map(
      availability.map((spot) => [Number(spot.spotId ?? spot.id), spot]),
    );
    const liveOccupancySpots = Array.from(spotLayoutById.values())
      .map((spot) => {
        const live = availabilityBySpotId.get(spot.id);
        const rawStatus = String(
          live?.status ?? live?.availability ?? "unavailable",
        ).toLowerCase();

        let displayStatus = "indisponibil";

        if (rawStatus === "free" || rawStatus === "available") {
          displayStatus = "liber";
        } else if (rawStatus === "blocked") {
          displayStatus = "ocupat";
        } else if (rawStatus === "limited") {
          displayStatus = "rezervat";
        }

        return {
          ...spot,
          status: displayStatus,
          reason: live?.reason ?? null,
          rawStatus,
        };
      })
      .sort((a, b) => a.levelId - b.levelId || a.id - b.id);
    const freeAvailabilityCount = liveOccupancySpots.filter(
      (spot) => spot.status === "liber",
    ).length;
    const occupiedAvailabilityCount = liveOccupancySpots.filter(
      (spot) => spot.status === "ocupat",
    ).length;
    const unavailableAvailabilityCount = liveOccupancySpots.filter(
      (spot) => spot.status === "indisponibil",
    ).length;
    const spotLevelOptions = Array.from(
      new Set(
        liveOccupancySpots
          .map((spot) => spot.levelId)
          .filter((levelId) => Number.isFinite(levelId)),
      ),
    ).sort((a, b) => a - b);
    const spotCodeOptions = Array.from(
      new Set(
        liveOccupancySpots
          .map((spot) => spot.code)
          .filter((code) => code && code !== "-"),
      ),
    ).sort((a, b) => a.localeCompare(b, "ro"));
    const filteredParkingSpots = liveOccupancySpots.filter((spot) => {
      const normalizedSearch = spotSearch.toLowerCase().trim();
      const normalizedCode = String(spot.code ?? "").toLowerCase();
      const normalizedLevel = String(spot.levelId ?? "");
      const matchesSearch =
        !normalizedSearch ||
        normalizedCode.includes(normalizedSearch) ||
        String(spot.id ?? "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        normalizedLevel.includes(normalizedSearch);
      const matchesStatus =
        !spotStatusFilter || spot.status === spotStatusFilter;
      const matchesLevel =
        !spotLevelFilter || normalizedLevel === spotLevelFilter;
      const matchesCode = !spotCodeFilter || spot.code === spotCodeFilter;

      return matchesSearch && matchesStatus && matchesLevel && matchesCode;
    });
    const reportStartDate = new Date(reportStart);
    const reportEndDate = new Date(reportEnd);
    const reportReservations = reservations.filter((reservation) =>
      isDateInRange(reservation.start, reportStartDate, reportEndDate),
    );
    const reportSubscriptions = subscriptions.filter((subscription) =>
      isDateRangeOverlapping(
        subscription.start,
        subscription.end,
        reportStartDate,
        reportEndDate,
      ),
    );
    const reportPayments = payments.filter((payment) =>
      isDateInRange(payment.createdAt, reportStartDate, reportEndDate),
    );
    const reportAvailabilityBySpotId = new Map(
      reportAvailability.map((spot) => [Number(spot.spotId ?? spot.id), spot]),
    );
    const reportSpots = Array.from(spotLayoutById.values()).map((spot) => {
      const availabilityItem = reportAvailabilityBySpotId.get(spot.id);
      const rawStatus = String(
        availabilityItem?.status ??
          availabilityItem?.availability ??
          "unavailable",
      ).toLowerCase();
      const status =
        rawStatus === "free" || rawStatus === "available"
          ? "liber"
          : rawStatus === "blocked" || rawStatus === "limited"
            ? "ocupat"
            : "indisponibil";

      return {
        ...spot,
        status,
        reason: availabilityItem?.reason ?? null,
      };
    });
    const reportOccupiedSpots = reportSpots.filter(
      (spot) => spot.status === "ocupat",
    ).length;
    const reportFreeSpots = reportSpots.filter(
      (spot) => spot.status === "liber",
    ).length;
    const reportSpotUsage = Array.from(spotLayoutById.values())
      .map((spot) => {
        const spotReservations = reportReservations.filter(
          (reservation) => Number(reservation.spotId) === spot.id,
        );
        const spotSubscriptions = reportSubscriptions.filter(
          (subscription) => Number(subscription.spotId) === spot.id,
        );
        const occupiedHours =
          spotReservations.reduce(
            (sum, reservation) =>
              sum +
              getOverlapHours(
                reservation.start,
                reservation.end,
                reportStartDate,
                reportEndDate,
              ),
            0,
          ) +
          spotSubscriptions.reduce(
            (sum, subscription) =>
              sum +
              getOverlapHours(
                subscription.start,
                subscription.end,
                reportStartDate,
                reportEndDate,
              ),
            0,
          );

        return {
          ...spot,
          reservationCount: spotReservations.length,
          subscriptionCount: spotSubscriptions.length,
          totalUses: spotReservations.length + spotSubscriptions.length,
          occupiedHours,
        };
      })
      .sort(
        (a, b) =>
          b.totalUses - a.totalUses || b.occupiedHours - a.occupiedHours,
      );
    const reportRevenueCents = reportPayments
      .filter((payment) => payment.status === "succeeded")
      .reduce((sum, payment) => sum + Number(payment.amountCents ?? 0), 0);
    const reportSucceededPayments = reportPayments.filter(
      (payment) => payment.status === "succeeded",
    ).length;
    const reportFailedPayments = reportPayments.filter(
      (payment) => payment.status === "failed",
    ).length;
    const reportAveragePaymentCents = reportSucceededPayments
      ? Math.round(reportRevenueCents / reportSucceededPayments)
      : 0;
    const reportReservedHours = reportReservations.reduce(
      (sum, reservation) =>
        sum +
        getOverlapHours(
          reservation.start,
          reservation.end,
          reportStartDate,
          reportEndDate,
        ),
      0,
    );
    const reportSubscriptionHours = reportSubscriptions.reduce(
      (sum, subscription) =>
        sum +
        getOverlapHours(
          subscription.start,
          subscription.end,
          reportStartDate,
          reportEndDate,
        ),
      0,
    );
    const reportOccupiedHours = reportSpotUsage.reduce(
      (sum, spot) => sum + spot.occupiedHours,
      0,
    );
    const reportTotalSpotHours =
      reportSpots.length *
      Math.max(0, reportEndDate.getTime() - reportStartDate.getTime()) /
        3_600_000;
    const reportOccupancyRate = reportTotalSpotHours
      ? Math.round((reportOccupiedHours / reportTotalSpotHours) * 100)
      : 0;
    const reportTopSpot = reportSpotUsage.find((spot) => spot.totalUses > 0);
    const currentReportRows = getReportRows({
      reportType,
      reservations: reportReservations,
      subscriptions: reportSubscriptions,
      payments: reportPayments,
      spots: reportSpots,
      spotUsage: reportSpotUsage,
    });
    const currentReportConfig =
      REPORT_OPTIONS.find((option) => option.value === reportType) ??
      REPORT_OPTIONS[0];
    const reportStatusStats = getReportStatusStats({
      reportType,
      reservations: reportReservations,
      subscriptions: reportSubscriptions,
      payments: reportPayments,
      spots: reportType === "spotUsage" ? reportSpotUsage : reportSpots,
    });
    const defaultParking3dUrl =
      window.location.port === "5173"
        ? `${window.location.protocol}//${window.location.hostname}:5174`
        : "http://localhost:5173";
    const parking3dBaseUrl =
      (import.meta.env.VITE_PARKING_3D_URL as string | undefined) ??
      defaultParking3dUrl;
    if (!parking3dTokenRef.current && keycloak.token) {
      parking3dTokenRef.current = keycloak.token;
    }
    const parking3dViewerUrl = (() => {
      const url = new URL(parking3dBaseUrl, window.location.origin);
      url.searchParams.set("mode", "projection");

      if (availabilityStart) {
        url.searchParams.set(
          "start",
          new Date(availabilityStart).toISOString(),
        );
      }

      if (availabilityEnd) {
        url.searchParams.set("end", new Date(availabilityEnd).toISOString());
      }

      if (parking3dTokenRef.current) {
        url.searchParams.set("token", parking3dTokenRef.current);
      }

      return url.toString();
    })();

    switch (activePage) {
      case "Dashboard":
        return (
          <>
            <PageHero
              kicker="Smart Parking Overview"
              title="Dashboard operational"
              subtitle="Indicatorii esentiali pentru administrarea parcarii, grupati clar si ganditi pentru decizii rapide."
              aside={
                <div className="hero-status-card">
                  <div className="hero-status-row">
                    <span className="hero-status-label">Backend</span>
                    <StatusBadge value={stats ? "online" : "loading"} />
                  </div>
                  <div className="hero-status-row">
                    <span className="hero-status-label">Rol activ</span>
                    <StatusBadge value="ADMIN" kind="role" />
                  </div>
                  <div className="hero-status-row">
                    <span className="hero-status-label">Autentificare</span>
                    <span className="hero-status-text">Keycloak</span>
                  </div>
                </div>
              }
            >
              <div className="hero-action-row">
                {dashboardActions.map((action) => (
                  <button
                    key={action.page}
                    className="hero-action-card"
                    onClick={() => setActivePage(action.page)}
                  >
                    <span className="hero-action-title">{action.label}</span>
                    <span className="hero-action-text">
                      {action.description}
                    </span>
                  </button>
                ))}
              </div>
            </PageHero>

            {error && <pre className="dashboard-error">{error}</pre>}

            <div className="spotlight-layout">
              <div className="spotlight-main">
                <div className="dashboard-grid dashboard-grid-wide">
                  <SummaryCard
                    icon="PK"
                    label="Locuri configurate"
                    value={stats?.totalSpots ?? "-"}
                    meta="Inventar total disponibil"
                  />
                  <SummaryCard
                    icon="FR"
                    label="Locuri libere"
                    value={stats?.availableSpots ?? "-"}
                    accent="success"
                    meta="Libere in urmatoarea ora"
                  />
                  <SummaryCard
                    icon="OC"
                    label="Locuri ocupate"
                    value={
                      stats
                        ? (stats.occupiedSpots ?? 0) +
                          (stats.reservedSpots ?? 0)
                        : "-"
                    }
                    accent="danger"
                    meta="Disponibilitate limitata in urmatoarea ora"
                  />
                  <SummaryCard
                    icon="RS"
                    label="Rezervari active"
                    value={stats?.activeReservations ?? "-"}
                    meta="Pending sau active"
                  />
                  <SummaryCard
                    icon="AB"
                    label="Abonamente active"
                    value={stats?.activeSubscriptions ?? "-"}
                    accent="info"
                    meta="Valabile acum"
                  />
                  <SummaryCard
                    icon="%"
                    label="Grad ocupare"
                    value={
                      stats?.occupancyRate != null
                        ? `${stats.occupancyRate}%`
                        : "-"
                    }
                    accent="info"
                    meta="Ocupate din total"
                  />
                </div>
              </div>

              <div className="spotlight-side">
                <InfoPanel
                  title="Snapshot operational"
                  subtitle="Semnale rapide pentru o privire executiva."
                  items={[
                    {
                      label: "Vehicule asociate",
                      value: String(totalVehicleLinks),
                    },
                    {
                      label: "Rezervari pending",
                      value: String(pendingReservations),
                    },
                    {
                      label: "Abonamente pending",
                      value: String(pendingSubscriptions),
                    },
                  ]}
                />

                <InfoPanel
                  title="Zone prioritare"
                  subtitle="Fluxurile unde adminul intra cel mai des."
                  items={[
                    { label: "Validare acces", value: "QR live" },
                    {
                      label: "Control rezervari",
                      value: `${reservations.length} total`,
                    },
                    {
                      label: "Ocupare curenta",
                      value:
                        stats?.occupancyRate != null
                          ? `${stats.occupancyRate}%`
                          : "-",
                    },
                  ]}
                />
              </div>
            </div>
          </>
        );

      case "Ocupare parcare":
        return (
          <>
            <PageHero
              kicker="Occupancy Intelligence"
              title="Ocupare parcare"
              subtitle="Vezi aceeasi parcare 3D folosita in aplicatia utilizatorului, actualizata pentru intervalul selectat."
            />

            <div className="dashboard-grid dashboard-grid-compact">
              <SummaryCard
                icon="CK"
                label="Locuri totale"
                value={liveOccupancySpots.length}
                meta="Locuri randate in harta live"
              />
              <SummaryCard
                icon="FR"
                label="Disponibile"
                value={freeAvailabilityCount}
                accent="success"
                meta="Libere in intervalul selectat"
              />
              <SummaryCard
                icon="OC"
                label="Ocupate"
                value={occupiedAvailabilityCount}
                accent="danger"
                meta="Ocupate sau blocate in interval"
              />
              <SummaryCard
                icon="ID"
                label="Indisponibile"
                value={unavailableAvailabilityCount}
                meta="Locuri fara stare valida"
              />
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="admin-filter-grid">
                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Start</label>
                  <input
                    className="admin-input"
                    type="datetime-local"
                    value={availabilityStart}
                    onChange={(e) => setAvailabilityStart(e.target.value)}
                  />
                </div>

                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Final</label>
                  <input
                    className="admin-input"
                    type="datetime-local"
                    value={availabilityEnd}
                    onChange={(e) => setAvailabilityEnd(e.target.value)}
                  />
                </div>

                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Actiune</label>
                  <button
                    className="admin-action-button action-primary"
                    onClick={loadAvailability}
                  >
                    Verifica disponibilitate
                  </button>
                </div>
              </div>
            </div>

            {availabilityError && (
              <pre className="dashboard-error">{availabilityError}</pre>
            )}

            <div className="parking-legend">
              <div className="parking-legend-item">
                <span className="parking-legend-dot success" />
                <span>Liber</span>
              </div>
              <div className="parking-legend-item">
                <span className="parking-legend-dot danger" />
                <span>Ocupat</span>
              </div>
              <div className="parking-legend-item">
                <span className="parking-legend-dot warning" />
                <span>Rezervat</span>
              </div>
              <div className="parking-legend-item">
                <span className="parking-legend-dot neutral" />
                <span>Indisponibil</span>
              </div>
            </div>

            <div className="parking-3d-shell">
              <iframe
                ref={parking3dFrameRef}
                className="parking-3d-frame"
                src={parking3dViewerUrl}
                title="Parcare 3D"
                allow="fullscreen"
                onLoad={() => updateParking3dStatuses(availability)}
              />
            </div>
          </>
        );

      case "Locuri de parcare":
        return (
          <>
            <PageHero
              kicker="Parking Inventory"
              title="Locuri de parcare"
              subtitle="Vezi toate locurile cu status live, filtre rapide si pozitionarea folosita de modelul 3D."
            />

            {(spotsError || availabilityError) && (
              <pre className="dashboard-error">
                {spotsError || availabilityError}
              </pre>
            )}

            <div className="dashboard-grid dashboard-grid-compact">
              <SummaryCard
                icon="SP"
                label="Locuri afisate"
                value={filteredParkingSpots.length}
                meta={`Din ${liveOccupancySpots.length} locuri sincronizate`}
              />
              <SummaryCard
                icon="FR"
                label="Libere"
                value={freeAvailabilityCount}
                accent="success"
                meta="Disponibile in urmatoarea ora"
              />
              <SummaryCard
                icon="OC"
                label="Ocupate"
                value={occupiedAvailabilityCount}
                accent="danger"
                meta="Ocupate sau blocate acum"
              />
              <SummaryCard
                icon="ID"
                label="Indisponibile"
                value={unavailableAvailabilityCount}
                meta="Fara stare valida"
              />
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="admin-filters-row">
                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Cautare</label>
                  <input
                    className="admin-input"
                    placeholder="Loc, ID sau nivel..."
                    value={spotSearch}
                    onChange={(e) => setSpotSearch(e.target.value)}
                  />
                </div>

                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Status</label>
                  <select
                    className="admin-input"
                    value={spotStatusFilter}
                    onChange={(e) => setSpotStatusFilter(e.target.value)}
                  >
                    <option value="">Toate statusurile</option>
                    <option value="liber">Liber</option>
                    <option value="ocupat">Ocupat</option>
                    <option value="indisponibil">Indisponibil</option>
                  </select>
                </div>

                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Nivel</label>
                  <select
                    className="admin-input"
                    value={spotLevelFilter}
                    onChange={(e) => setSpotLevelFilter(e.target.value)}
                  >
                    <option value="">Toate nivelurile</option>
                    {spotLevelOptions.map((levelId) => (
                      <option key={levelId} value={String(levelId)}>
                        {`Nivel ${levelId}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Loc</label>
                  <select
                    className="admin-input"
                    value={spotCodeFilter}
                    onChange={(e) => setSpotCodeFilter(e.target.value)}
                  >
                    <option value="">Toate locurile</option>
                    {spotCodeOptions.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <ScrollableTableCard>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Loc</th>
                    <th>Nivel</th>
                    <th>Status</th>
                    <th>Actiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParkingSpots.map((spot) => (
                    <tr key={spot.id}>
                      <DataCell label="ID">#{spot.id}</DataCell>
                      <DataCell label="Loc">
                        <IdentityCell
                          primary={spot.code}
                          secondary={spot.reason ?? "actualizare live"}
                        />
                      </DataCell>
                      <DataCell label="Nivel">{spot.levelId}</DataCell>
                      <DataCell label="Status">
                        <StatusBadge value={spot.status} />
                      </DataCell>
                      <DataCell label="Actiuni">
                        <button
                          className="admin-action-button action-primary"
                          onClick={() => openParkingSpotDetails(spot)}
                        >
                          Vezi detalii
                        </button>
                      </DataCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableCard>
          </>
        );

      case "Utilizatori":
        return (
          <>
            <PageHero
              kicker="Identity & Access"
              title="Utilizatori"
              subtitle="Monitorizeaza conturile, rolurile si gradul de utilizare al platformei intr-o vedere pregatita pentru administrare."
            />

            {usersError && <pre className="dashboard-error">{usersError}</pre>}
            {createUserMessage ? (
              <div className="sensor-feedback">{createUserMessage}</div>
            ) : null}

            <div className="dashboard-grid dashboard-grid-compact">
              <SummaryCard
                icon="US"
                label="Total utilizatori"
                value={filteredUsers.length}
                meta={`Filtrati din ${users.length} utilizatori`}
              />
              <SummaryCard
                icon="AC"
                label="Utilizatori activi"
                value={activeUsersCount}
                accent="success"
                meta="Conturi active"
              />
              <SummaryCard
                icon="VH"
                label="Vehicule asociate"
                value={totalVehicleLinks}
                meta="Legaturi active user - vehicul"
              />
            </div>

            <form
              className="admin-table-card admin-filter-card user-create-card"
              onSubmit={createAdminUser}
            >
              <div className="panel-heading">
                <div>
                  <h2>Adauga utilizator</h2>
                  <p className="page-subtitle">
                    Creeaza contul in Keycloak si profilul asociat in MySQL.
                  </p>
                </div>
              </div>

              <div className="admin-filter-grid user-create-grid">
                <div className="admin-filter-field">
                  <label>Prenume</label>
                  <input
                    className="admin-input"
                    value={createUserForm.firstName}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="admin-filter-field">
                  <label>Nume</label>
                  <input
                    className="admin-input"
                    value={createUserForm.lastName}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="admin-filter-field">
                  <label>Email</label>
                  <input
                    className="admin-input"
                    type="email"
                    value={createUserForm.email}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({
                        ...current,
                        email: event.target.value,
                        username: current.username || event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="admin-filter-field">
                  <label>Username</label>
                  <input
                    className="admin-input"
                    value={createUserForm.username}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="admin-filter-field">
                  <label>Parola initiala</label>
                  <input
                    className="admin-input"
                    type="password"
                    minLength={8}
                    value={createUserForm.password}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="admin-filter-field">
                  <label>Rol</label>
                  <select
                    className="admin-input"
                    value={createUserForm.role}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({
                        ...current,
                        role: event.target.value,
                        vehiclePlate:
                          event.target.value === "USER"
                            ? current.vehiclePlate
                            : "",
                      }))
                    }
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                {createUserForm.role === "USER" ? (
                  <div className="admin-filter-field">
                    <label>Nr. inmatriculare</label>
                    <input
                      className="admin-input"
                      placeholder="B123ABC"
                      value={createUserForm.vehiclePlate}
                      onChange={(event) =>
                        setCreateUserForm((current) => ({
                          ...current,
                          vehiclePlate: event.target.value.toUpperCase(),
                        }))
                      }
                      required
                    />
                  </div>
                ) : null}
                <div className="admin-filter-field user-create-actions">
                  <label>Actiune</label>
                  <button
                    className="admin-action-button action-primary"
                    type="submit"
                    disabled={createUserSaving}
                  >
                    {createUserSaving ? "Se creeaza..." : "Creeaza utilizator"}
                  </button>
                </div>
              </div>
            </form>

            <div className="admin-table-card admin-filter-card">
              <div className="admin-filters-row">
                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Cautare</label>
                  <input
                    className="admin-input"
                    placeholder="Nume, email, username, rol, ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <ScrollableTableCard>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Utilizator</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Roluri</th>
                    <th>Status</th>
                    <th>Vehicule</th>
                    <th>Creat la</th>
                    <th>Actiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user.id ?? `user-${index}`}>
                      <DataCell label="ID">#{user.id}</DataCell>
                      <DataCell label="Utilizator">
                        <IdentityCell
                          primary={user.fullName || "-"}
                          secondary={user.username ?? "fara username"}
                        />
                      </DataCell>
                      <DataCell label="Email">
                        <IdentityCell
                          primary={user.email ?? "-"}
                          secondary={`Creat ${formatDateTime(user.createdAt)}`}
                        />
                      </DataCell>
                      <DataCell label="Username">
                        {user.username ?? "-"}
                      </DataCell>
                      <DataCell label="Roluri">
                        <div className="pill-row">
                          {user.roles?.length ? (
                            user.roles.map((role: string) => (
                              <StatusBadge
                                key={role}
                                value={role}
                                kind="role"
                              />
                            ))
                          ) : (
                            <span className="admin-muted">-</span>
                          )}
                        </div>
                      </DataCell>
                      <DataCell label="Status">
                        <StatusBadge
                          value={user.isActive ? "activ" : "inactiv"}
                        />
                      </DataCell>
                      <DataCell label="Vehicule">
                        {user.vehiclesCount ?? 0}
                      </DataCell>
                      <DataCell label="Creat la">
                        {formatDateTime(user.createdAt)}
                      </DataCell>
                      <DataCell label="Actiuni">
                        <button
                          className="admin-action-button action-primary"
                          onClick={() => openUserProfile(user.id)}
                        >
                          Vezi profil
                        </button>
                      </DataCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableCard>
          </>
        );

      case "Vehicule":
        return (
          <>
            <PageHero
              kicker="Vehicle Registry"
              title="Vehicule"
              subtitle="Gestioneaza flota utilizatorilor, vehiculele primare si statusul lor intr-o pagina mai clara si mai puternica vizual."
            />

            {vehiclesError && (
              <pre className="dashboard-error">{vehiclesError}</pre>
            )}

            <div className="dashboard-grid dashboard-grid-compact">
              <SummaryCard
                icon="VH"
                label="Total vehicule"
                value={filteredVehicles.length}
                meta={`Filtrate din ${vehicles.length} vehicule`}
              />
              <SummaryCard
                icon="PR"
                label="Vehicule primare"
                value={primaryVehicles}
                meta="Marcaje principale"
              />
              <SummaryCard
                icon="ON"
                label="Vehicule active"
                value={activeVehicles}
                accent="success"
                meta="Vehicule utilizabile"
              />
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="admin-filters-row">
                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Cautare</label>
                  <input
                    className="admin-input"
                    placeholder="Numar, email, nume, ID..."
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <ScrollableTableCard>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Vehicul</th>
                    <th>Utilizator</th>
                    <th>Email</th>
                    <th>Tip</th>
                    <th>Status</th>
                    <th>Creat la</th>
                    <th>Actiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle, index) => (
                    <tr key={vehicle.id ?? `vehicle-${index}`}>
                      <DataCell label="ID">#{vehicle.id}</DataCell>
                      <DataCell label="Vehicul">
                        <IdentityCell
                          primary={vehicle.plateNumber ?? "-"}
                          secondary={
                            vehicle.isPrimary
                              ? "Vehicul principal"
                              : "Vehicul secundar"
                          }
                        />
                      </DataCell>
                      <DataCell label="Utilizator">
                        {vehicle.userName ?? "-"}
                      </DataCell>
                      <DataCell label="Email">
                        {vehicle.userEmail ?? "-"}
                      </DataCell>
                      <DataCell label="Tip">
                        <StatusBadge
                          value={vehicle.isPrimary ? "primar" : "secundar"}
                          kind="type"
                        />
                      </DataCell>
                      <DataCell label="Status">
                        <StatusBadge
                          value={vehicle.isActive ? "activ" : "inactiv"}
                        />
                      </DataCell>
                      <DataCell label="Creat la">
                        {formatDateTime(vehicle.createdAt)}
                      </DataCell>
                      <DataCell label="Actiuni">
                        <button
                          className="admin-action-button action-primary"
                          onClick={() => openVehicleDetails(vehicle)}
                        >
                          Vezi detalii
                        </button>
                      </DataCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableCard>
          </>
        );

      case "Rezervari":
        return (
          <>
            <PageHero
              kicker="Reservation Control"
              title="Rezervari"
              subtitle="Controleaza rezervarile dintr-un singur ecran: cautare rapida, filtre clare si actiuni administrative in context."
            />

            {reservationsError && (
              <pre className="dashboard-error">{reservationsError}</pre>
            )}

            <div className="dashboard-grid dashboard-grid-compact">
              <SummaryCard
                icon="RZ"
                label="Total rezervari"
                value={filteredReservations.length}
                meta={`Filtrate din ${reservations.length} rezervari`}
              />
              <SummaryCard
                icon="PN"
                label="Pending"
                value={pendingReservations}
                accent="warning"
                meta="Asteapta inceputul intervalului"
              />
              <SummaryCard
                icon="AC"
                label="Active"
                value={activeReservationsCount}
                accent="success"
                meta="In curs de utilizare"
              />
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="admin-filters-row">
                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Cautare</label>
                  <input
                    className="admin-input"
                    placeholder="Email, nume, masina, loc, ID..."
                    value={reservationSearch}
                    onChange={(e) => setReservationSearch(e.target.value)}
                  />
                </div>

                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Status</label>
                  <select
                    className="admin-input"
                    value={reservationStatusFilter}
                    onChange={(e) => setReservationStatusFilter(e.target.value)}
                  >
                    <option value="">Toate</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
            </div>

            <ScrollableTableCard>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Utilizator</th>
                    <th>Email</th>
                    <th>Vehicul</th>
                    <th>Loc</th>
                    <th>Nivel</th>
                    <th>Start</th>
                    <th>Final</th>
                    <th>Status</th>
                    <th>Plata</th>
                    <th>Pret</th>
                    <th>Actiuni</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReservations.map((reservation, index) => (
                    <tr key={reservation.id ?? `reservation-${index}`}>
                      <DataCell label="ID">#{reservation.id}</DataCell>
                      <DataCell label="Utilizator">
                        <IdentityCell
                          primary={reservation.userName ?? "-"}
                          secondary={`User #${reservation.userId ?? "-"}`}
                        />
                      </DataCell>
                      <DataCell label="Email">
                        {reservation.userEmail ?? "-"}
                      </DataCell>
                      <DataCell label="Vehicul">
                        <IdentityCell
                          primary={reservation.vehiclePlate ?? "-"}
                          secondary={reservation.type ?? "standard"}
                        />
                      </DataCell>
                      <DataCell label="Loc">
                        {reservation.spotCode ?? reservation.spotId ?? "-"}
                      </DataCell>
                      <DataCell label="Nivel">
                        {reservation.levelId ?? "-"}
                      </DataCell>
                      <DataCell label="Start">
                        {formatDateTime(reservation.start)}
                      </DataCell>
                      <DataCell label="Final">
                        {formatDateTime(reservation.end)}
                      </DataCell>
                      <DataCell label="Status">
                        <StatusBadge
                          value={reservation.status ?? "-"}
                          kind="reservation"
                        />
                      </DataCell>
                      <DataCell label="Plata">
                        <StatusBadge
                          value={reservation.payment?.status ?? "fara plata"}
                          kind="payment"
                        />
                      </DataCell>
                      <DataCell label="Pret">
                        {formatPrice(
                          reservation.priceCents,
                          reservation.currency,
                        )}
                      </DataCell>
                      <DataCell label="Actiuni">
                        {canCancelReservation(reservation.status) ? (
                          <button
                            className="admin-action-button danger"
                            onClick={() => cancelReservation(reservation.id)}
                          >
                            Anuleaza
                          </button>
                        ) : (
                          <span className="admin-muted">-</span>
                        )}
                      </DataCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableCard>
          </>
        );

      case "Abonamente":
        return (
          <>
            <PageHero
              kicker="Subscription Control"
              title="Abonamente"
              subtitle="Vezi rapid planurile active, statusul platilor si care abonamente sunt pregatite pentru administrare."
            />

            {subscriptionsError && (
              <pre className="dashboard-error">{subscriptionsError}</pre>
            )}

            <div className="dashboard-grid dashboard-grid-compact">
              <SummaryCard
                icon="AB"
                label="Total abonamente"
                value={filteredSubscriptions.length}
                meta={`Filtrate din ${subscriptions.length} abonamente`}
              />
              <SummaryCard
                icon="AC"
                label="Active"
                value={activeSubscriptionsCount}
                accent="success"
                meta="Abonamente valabile acum"
              />
              <SummaryCard
                icon="PN"
                label="Pending"
                value={pendingSubscriptions}
                accent="warning"
                meta="Abonamente viitoare sau in asteptare"
              />
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="admin-filters-row">
                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Cautare</label>
                  <input
                    className="admin-input"
                    placeholder="Email, nume, masina, loc, ID..."
                    value={subscriptionSearch}
                    onChange={(e) => setSubscriptionSearch(e.target.value)}
                  />
                </div>

                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Status</label>
                  <select
                    className="admin-input"
                    value={subscriptionStatusFilter}
                    onChange={(e) =>
                      setSubscriptionStatusFilter(e.target.value)
                    }
                  >
                    <option value="">Toate</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <ScrollableTableCard>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Utilizator</th>
                    <th>Email</th>
                    <th>Vehicul</th>
                    <th>Loc</th>
                    <th>Nivel</th>
                    <th>Plan</th>
                    <th>Start</th>
                    <th>Final</th>
                    <th>Status</th>
                    <th>Pret</th>
                    <th>Plata</th>
                    <th>Actiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((subscription, index) => (
                    <tr key={subscription.id ?? `subscription-${index}`}>
                      <DataCell label="ID">#{subscription.id}</DataCell>
                      <DataCell label="Utilizator">
                        <IdentityCell
                          primary={subscription.userName ?? "-"}
                          secondary={`User #${subscription.userId ?? "-"}`}
                        />
                      </DataCell>
                      <DataCell label="Email">
                        {subscription.userEmail ?? "-"}
                      </DataCell>
                      <DataCell label="Vehicul">
                        <IdentityCell
                          primary={subscription.vehiclePlate ?? "-"}
                          secondary={subscription.planCode ?? "plan"}
                        />
                      </DataCell>
                      <DataCell label="Loc">
                        {subscription.spotCode ?? subscription.spotId ?? "-"}
                      </DataCell>
                      <DataCell label="Nivel">
                        {subscription.levelId ?? "-"}
                      </DataCell>
                      <DataCell label="Plan">
                        {subscription.planName ?? subscription.planCode ?? "-"}
                      </DataCell>
                      <DataCell label="Start">
                        {formatDateTime(subscription.start)}
                      </DataCell>
                      <DataCell label="Final">
                        {formatDateTime(subscription.end)}
                      </DataCell>
                      <DataCell label="Status">
                        <StatusBadge
                          value={subscription.status ?? "-"}
                          kind="subscription"
                        />
                      </DataCell>
                      <DataCell label="Pret">
                        {formatPrice(
                          subscription.priceCents,
                          subscription.currency,
                        )}
                      </DataCell>
                      <DataCell label="Plata">
                        <StatusBadge
                          value={subscription.payment?.status ?? "fara plata"}
                          kind="payment"
                        />
                      </DataCell>
                      <DataCell label="Actiuni">
                        {canCancelSubscription(subscription.status) ? (
                          <button
                            className="admin-action-button danger"
                            onClick={() => cancelSubscription(subscription.id)}
                          >
                            Anuleaza
                          </button>
                        ) : (
                          <span className="admin-muted">-</span>
                        )}
                      </DataCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableCard>
          </>
        );

      case "Validare QR":
        return (
          <>
            <PageHero
              kicker="Access Validation"
              title="Validare QR"
              subtitle="Scaneaza sau incarca un cod QR si primesti imediat contextul operational asociat acelui acces."
            />

            <div className="admin-table-card admin-filter-card qr-workspace">
              <div className="qr-toolbar">
                <div className="admin-filter-field admin-filter-field-wide">
                  <label className="dashboard-card-label">Token QR</label>
                  <input
                    className="admin-input"
                    placeholder="Lipeste tokenul QR aici..."
                    value={qrToken}
                    onChange={(e) => setQrToken(e.target.value)}
                  />
                </div>

                <button
                  className="admin-action-button action-primary"
                  onClick={() => validateQrToken(qrToken)}
                >
                  Valideaza manual
                </button>
              </div>

              <div className="qr-stage">
                <div className="admin-filters-row">
                  <button
                    className="admin-action-button action-primary"
                    onClick={startQrScanner}
                  >
                    {qrScannerStarted
                      ? "Scanner activ"
                      : "Porneste scanarea QR"}
                  </button>

                  {qrScannerStarted && (
                    <button
                      className="admin-action-button"
                      onClick={() => stopQrScanner()}
                    >
                      Opreste scannerul
                    </button>
                  )}
                </div>

                <div id="qr-reader" className="qr-reader-shell" />

                {qrScannerMessage && (
                  <p className="page-subtitle qr-helper-text">
                    {qrScannerMessage}
                  </p>
                )}
              </div>

              <div className="qr-upload-panel">
                <label className="dashboard-card-label">
                  Sau incarca o imagine cu codul QR
                </label>
                <input
                  className="admin-input"
                  type="file"
                  accept="image/*"
                  onChange={handleQrImageUpload}
                />
                <div id="qr-file-reader" style={{ display: "none" }} />
              </div>
            </div>

            {qrError && <pre className="dashboard-error">{qrError}</pre>}

            {qrResult && (
              <div className="admin-table-card admin-filter-card">
                <div className="panel-heading">
                  <div>
                    <h2>{qrResult.valid ? "QR valid" : "QR invalid"}</h2>
                    <p className="page-subtitle">{qrResult.message}</p>
                  </div>
                  <StatusBadge
                    value={qrResult.valid ? "valid" : "invalid"}
                    kind="validation"
                  />
                </div>

                <div className="dashboard-grid dashboard-grid-compact">
                  <SummaryCard
                    icon="TP"
                    label="Tip"
                    value={qrResult.type ?? "-"}
                    meta="Tipul resursei validate"
                  />
                  <SummaryCard
                    icon="ST"
                    label="Status"
                    value={qrResult.status ?? "-"}
                    accent={qrResult.valid ? "success" : "danger"}
                    meta="Raspunsul motorului de validare"
                  />
                </div>

                {qrResult.valid ? (
                  <div className="qr-plate-workspace">
                    <div className="qr-plate-panel">
                      <div className="admin-filter-field">
                        <label className="dashboard-card-label">
                          Numar inmatriculare
                        </label>
                        <input
                          className="admin-input"
                          placeholder="Ex: B123ABC"
                          value={qrVehiclePlate}
                          onChange={(event) =>
                            setQrVehiclePlate(event.target.value.toUpperCase())
                          }
                        />
                      </div>
                      <button
                        className="admin-action-button action-primary"
                        onClick={() => validateQrToken(qrToken, qrVehiclePlate)}
                      >
                        Verifica masina
                      </button>
                      <button
                        className="admin-action-button"
                        onClick={
                          plateScannerStarted
                            ? stopPlateScanner
                            : () => void startPlateScanner()
                        }
                      >
                        {plateScannerStarted
                          ? "Opreste camera"
                          : "Scaneaza numarul"}
                      </button>
                      {plateScannerStarted ? (
                        <button
                          className="admin-action-button action-primary"
                          onClick={() => void readPlateFromCamera()}
                          disabled={plateScannerLoading}
                        >
                          {plateScannerLoading
                            ? "Se citeste..."
                            : "Citeste acum"}
                        </button>
                      ) : null}
                      <button
                        className="admin-action-button action-primary"
                        type="button"
                        onClick={() => {
                          setPlateScannerMessage("Alege poza cu numarul...");
                          plateImageInputRef.current?.click();
                        }}
                      >
                        Alege poza numar
                      </button>
                      <input
                        ref={plateImageInputRef}
                        className="plate-hidden-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handlePlateImageUpload}
                      />
                      {qrResult.plateCheck ? (
                        <StatusBadge
                          value={
                            qrResult.plateCheck.checked
                              ? qrResult.plateCheck.matches
                                ? "numar corect"
                                : "numar diferit"
                              : "nevalidat"
                          }
                          kind={
                            qrResult.plateCheck.checked &&
                            qrResult.plateCheck.matches
                              ? "validation"
                              : undefined
                          }
                        />
                      ) : null}
                    </div>

                    {plateScannerStarted ? (
                      <div className="plate-camera-card">
                        <video
                          ref={plateVideoRef}
                          muted
                          playsInline
                          className="plate-camera-video"
                        />
                        <div
                          ref={plateGuideRef}
                          className="plate-camera-guide"
                        >
                          Incadreaza placuta cat mai drept si bine luminata.
                        </div>
                      </div>
                    ) : null}

                    {plateScannerMessage ? (
                      <p className="page-subtitle qr-helper-text">
                        {plateScannerMessage}
                      </p>
                    ) : null}

                    {plateOcrPreview ? (
                      <div className="plate-ocr-preview">
                        <span>Imagine procesata</span>
                        <img src={plateOcrPreview} alt="Imagine procesata OCR" />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <QrValidationDetails result={qrResult} />
              </div>
            )}
          </>
        );

      case "Simulare senzori":
        return (
          <>
            <PageHero
              kicker="Sensor Lab"
              title="Simulare senzori"
              subtitle="Simuleaza ocuparea sau eliberarea locurilor si urmareste propagarea statusului in timp real."
            />

            {(spotsError || availabilityError || sensorError) && (
              <pre className="dashboard-error">
                {spotsError || availabilityError || sensorError}
              </pre>
            )}

            <div className="dashboard-grid dashboard-grid-compact">
              <SummaryCard
                icon="SP"
                label="Locuri totale"
                value={liveOccupancySpots.length}
                meta="Sincronizate cu harta live"
              />
              <SummaryCard
                icon="FR"
                label="Disponibile"
                value={freeAvailabilityCount}
                accent="success"
                meta="Pot fi ocupate prin simulare"
              />
              <SummaryCard
                icon="OC"
                label="Ocupate"
                value={occupiedAvailabilityCount}
                accent="danger"
                meta="Senzor, rezervare sau abonament"
              />
              <SummaryCard
                icon="ID"
                label="Indisponibile"
                value={unavailableAvailabilityCount}
                meta="Fara stare valida"
              />
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="admin-filters-row">
                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Cautare loc</label>
                  <input
                    className="admin-input"
                    placeholder="Cod, ID sau nivel..."
                    value={spotSearch}
                    onChange={(event) => setSpotSearch(event.target.value)}
                  />
                </div>

                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Status</label>
                  <select
                    className="admin-input"
                    value={spotStatusFilter}
                    onChange={(event) =>
                      setSpotStatusFilter(event.target.value)
                    }
                  >
                    <option value="">Toate statusurile</option>
                    <option value="liber">Liber</option>
                    <option value="ocupat">Ocupat</option>
                    <option value="indisponibil">Indisponibil</option>
                  </select>
                </div>

                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Nivel</label>
                  <select
                    className="admin-input"
                    value={spotLevelFilter}
                    onChange={(event) => setSpotLevelFilter(event.target.value)}
                  >
                    <option value="">Toate nivelurile</option>
                    {spotLevelOptions.map((levelId) => (
                      <option key={levelId} value={String(levelId)}>
                        {`Nivel ${levelId}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="sensor-grid">
              {filteredParkingSpots.length ? (
                filteredParkingSpots.map((spot) => {
                  const isBusy = sensorActionLoadingId === spot.id;
                  const reason = String(spot.reason ?? "");
                  const isSensorOccupied = [
                    "sensor_reports_occupied",
                    "vehicle_entered_not_exited",
                  ].includes(reason);
                  const isReservedByReservationOrSubscription = [
                    "overlap_with_pending_or_active_reservation",
                    "overlap_with_pending_or_active_subscription",
                    "next_reservation_starts_soon",
                    "next_subscription_starts_soon",
                  ].includes(reason);
                  const canOccupyBySensor =
                    spot.rawStatus === "free" && !isReservedByReservationOrSubscription;
                  const canReleaseSensor = isSensorOccupied;
                  const showSensorActions = canOccupyBySensor || canReleaseSensor;

                  return (
                    <div key={spot.id} className="sensor-card">
                      <div className="sensor-card-header">
                        <div>
                          <div className="stack-item-title">{spot.code}</div>
                          <div className="stack-item-subtitle">
                            Loc #{spot.id} - Nivel {spot.levelId}
                          </div>
                        </div>
                        <StatusBadge value={spot.status} />
                      </div>

                      <div className="sensor-card-meta">
                        <span>{formatAvailabilityReason(spot.reason)}</span>
                      </div>

                      {showSensorActions ? (
                        <div className="sensor-actions">
                          {canOccupyBySensor ? (
                            <button
                              className="admin-action-button danger"
                              onClick={() =>
                                void simulateSensorStatus(spot.id, "occupied")
                              }
                              disabled={isBusy}
                            >
                              Ocupa loc
                            </button>
                          ) : null}
                          {canReleaseSensor ? (
                            <button
                              className="admin-action-button action-primary"
                              onClick={() =>
                                void simulateSensorStatus(spot.id, "free")
                              }
                              disabled={isBusy}
                            >
                              Elibereaza loc
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="admin-table-card admin-filter-card">
                  Nu exista locuri pentru filtrele selectate.
                </div>
              )}
            </div>
          </>
        );

      case "Tarife":
        return (
          <>
            <PageHero
              kicker="Pricing"
              title="Tarife si dynamic pricing"
              subtitle="Administreaza tariful pe ora, planurile de abonament si regulile care ajusteaza pretul in functie de ocupare."
            />

            {pricingError ? (
              <pre className="dashboard-error">{pricingError}</pre>
            ) : null}

            {!pricingSettings ? (
              <div className="admin-table-card admin-filter-card">
                Se incarca tarifele...
              </div>
            ) : (
              <div className="pricing-workspace">
                <section className="pricing-rate-panel">
                  <div>
                    <span className="dashboard-card-label">Tarif rezervari</span>
                    <h2>Tarif pe ora</h2>
                    <p className="page-subtitle">
                      Pretul de baza folosit pentru rezervarile ocazionale,
                      inainte de aplicarea regulilor dynamic pricing.
                    </p>
                  </div>

                  <div className="pricing-rate-control">
                    <label className="dashboard-card-label">RON / ora</label>
                    <input
                      className="admin-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={(
                        Number(
                          pricingSettings.reservationRate
                            ?.ratePerHourCents ?? 0,
                        ) / 100
                      ).toFixed(2)}
                      onChange={(event) =>
                        setPricingSettings((current: any) => ({
                          ...current,
                          reservationRate: {
                            ...current.reservationRate,
                            ratePerHourCents: Math.round(
                              Number(event.target.value || 0) * 100,
                            ),
                          },
                        }))
                      }
                    />
                    <button
                      className="admin-action-button action-primary"
                      onClick={() => void saveReservationRate()}
                      disabled={pricingSavingKey === "reservation-rate"}
                    >
                      {pricingSavingKey === "reservation-rate"
                        ? "Se salveaza..."
                        : "Salveaza tarif"}
                    </button>
                  </div>
                </section>

                <section className="pricing-section">
                  <div className="panel-heading">
                    <div>
                      <h2>Planuri abonamente</h2>
                      <p className="page-subtitle">
                        Modifica numele, durata si pretul de baza pentru
                        abonamente.
                      </p>
                    </div>
                  </div>

                  <div className="pricing-card-grid">
                    {pricingSettings.subscriptionPlans?.map((plan: any) => (
                      <div key={plan.id} className="pricing-edit-card">
                        <div className="pricing-card-header">
                          <StatusBadge value={plan.code} kind="type" />
                          <strong>{formatPrice(plan.basePriceCents, "RON")}</strong>
                        </div>

                        <label>
                          Nume
                          <input
                            className="admin-input"
                            value={plan.name ?? ""}
                            onChange={(event) =>
                              setPricingSettings((current: any) => ({
                                ...current,
                                subscriptionPlans:
                                  current.subscriptionPlans.map((item: any) =>
                                    item.id === plan.id
                                      ? { ...item, name: event.target.value }
                                      : item,
                                  ),
                              }))
                            }
                          />
                        </label>

                        <div className="pricing-two-columns">
                          <label>
                            Durata zile
                            <input
                              className="admin-input"
                              type="number"
                              min="1"
                              value={plan.durationDays ?? 0}
                              onChange={(event) =>
                                setPricingSettings((current: any) => ({
                                  ...current,
                                  subscriptionPlans:
                                    current.subscriptionPlans.map((item: any) =>
                                      item.id === plan.id
                                        ? {
                                            ...item,
                                            durationDays: Number(
                                              event.target.value || 0,
                                            ),
                                          }
                                        : item,
                                    ),
                                }))
                              }
                            />
                          </label>
                          <label>
                            Pret RON
                            <input
                              className="admin-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={(Number(plan.basePriceCents ?? 0) / 100).toFixed(2)}
                              onChange={(event) =>
                                setPricingSettings((current: any) => ({
                                  ...current,
                                  subscriptionPlans:
                                    current.subscriptionPlans.map((item: any) =>
                                      item.id === plan.id
                                        ? {
                                            ...item,
                                            basePriceCents: Math.round(
                                              Number(event.target.value || 0) *
                                                100,
                                            ),
                                          }
                                        : item,
                                    ),
                                }))
                              }
                            />
                          </label>
                        </div>

                        <label>
                          Descriere
                          <textarea
                            className="admin-input pricing-textarea"
                            value={plan.description ?? ""}
                            onChange={(event) =>
                              setPricingSettings((current: any) => ({
                                ...current,
                                subscriptionPlans:
                                  current.subscriptionPlans.map((item: any) =>
                                    item.id === plan.id
                                      ? {
                                          ...item,
                                          description: event.target.value,
                                        }
                                      : item,
                                  ),
                              }))
                            }
                          />
                        </label>

                        <button
                          className="admin-action-button action-primary"
                          onClick={() => void saveSubscriptionPlan(plan)}
                          disabled={pricingSavingKey === `plan-${plan.id}`}
                        >
                          {pricingSavingKey === `plan-${plan.id}`
                            ? "Se salveaza..."
                            : "Salveaza plan"}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="pricing-section">
                  <div className="panel-heading">
                    <div>
                      <h2>Reguli dynamic pricing</h2>
                      <p className="page-subtitle">
                        Seteaza multiplicatori pe praguri de ocupare. Exemplu:
                        80-100% ocupare poate aplica 1.30x.
                      </p>
                    </div>
                  </div>

                  <div className="pricing-rule-list">
                    {pricingSettings.pricingRules?.map((rule: any) => (
                      <div key={rule.id} className="pricing-rule-row">
                        <label>
                          Nume regula
                          <input
                            className="admin-input"
                            value={rule.name ?? ""}
                            onChange={(event) =>
                              updatePricingRuleDraft(
                                setPricingSettings,
                                rule.id,
                                { name: event.target.value },
                              )
                            }
                          />
                        </label>
                        <label>
                          Min %
                          <input
                            className="admin-input"
                            type="number"
                            min="0"
                            max="100"
                            value={rule.minOccupancy ?? ""}
                            onChange={(event) =>
                              updatePricingRuleDraft(
                                setPricingSettings,
                                rule.id,
                                {
                                  minOccupancy:
                                    event.target.value === ""
                                      ? null
                                      : Number(event.target.value),
                                },
                              )
                            }
                          />
                        </label>
                        <label>
                          Max %
                          <input
                            className="admin-input"
                            type="number"
                            min="0"
                            max="100"
                            value={rule.maxOccupancy ?? ""}
                            onChange={(event) =>
                              updatePricingRuleDraft(
                                setPricingSettings,
                                rule.id,
                                {
                                  maxOccupancy:
                                    event.target.value === ""
                                      ? null
                                      : Number(event.target.value),
                                },
                              )
                            }
                          />
                        </label>
                        <label>
                          Multiplicator
                          <input
                            className="admin-input"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={rule.multiplier ?? 1}
                            onChange={(event) =>
                              updatePricingRuleDraft(
                                setPricingSettings,
                                rule.id,
                                { multiplier: Number(event.target.value || 1) },
                              )
                            }
                          />
                        </label>
                        <label className="pricing-toggle">
                          <input
                            type="checkbox"
                            checked={Boolean(rule.active)}
                            onChange={(event) =>
                              updatePricingRuleDraft(
                                setPricingSettings,
                                rule.id,
                                { active: event.target.checked },
                              )
                            }
                          />
                          Activ
                        </label>
                        <button
                          className="admin-action-button action-primary"
                          onClick={() => void savePricingRule(rule)}
                          disabled={pricingSavingKey === `rule-${rule.id}`}
                        >
                          {pricingSavingKey === `rule-${rule.id}`
                            ? "Se salveaza..."
                            : "Salveaza"}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </>
        );

      case "Alerte":
        return (
          <>
            <PageHero
              kicker="Alert Center"
              title="Alerte"
              subtitle="Flux live cu notificarile si alertele importante pentru operatiunile din sistem."
            />

            <AlertsPanel
              notifications={notifications}
              error={notificationsError}
              onMarkAsRead={markNotificationAsRead}
            />
          </>
        );

      case "Rapoarte":
        return (
          <>
            <PageHero
              kicker="Analytics"
              title="Rapoarte si statistici"
              subtitle="Analizeaza activitatea pe interval, compara indicatorii principali si exporta rapid raportul de care ai nevoie."
              aside={
                <div className="report-hero-panel">
                  <span className="dashboard-card-label">Raport curent</span>
                  <strong>{currentReportConfig.label}</strong>
                  <p>{currentReportConfig.description}</p>
                </div>
              }
            />

            {(reportError || paymentsError) && (
              <pre className="dashboard-error">
                {reportError || paymentsError}
              </pre>
            )}

            <section className="report-studio">
              <div className="report-toolbar">
                <div className="report-type-grid">
                  {REPORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={`report-type-button${
                        reportType === option.value ? " active" : ""
                      }`}
                      onClick={() => setReportType(option.value)}
                    >
                      <span>{option.shortLabel}</span>
                      <strong>{option.label}</strong>
                    </button>
                  ))}
                </div>

                <div className="report-period-card">
                  <div className="report-period-fields">
                    <div className="admin-filter-field">
                      <label className="dashboard-card-label">Start</label>
                      <input
                        className="admin-input"
                        type="datetime-local"
                        value={reportStart}
                        onChange={(event) => setReportStart(event.target.value)}
                      />
                    </div>

                    <div className="admin-filter-field">
                      <label className="dashboard-card-label">Final</label>
                      <input
                        className="admin-input"
                        type="datetime-local"
                        value={reportEnd}
                        onChange={(event) => setReportEnd(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="report-actions">
                    <button
                      className="admin-action-button action-primary"
                      onClick={() => void generateReport()}
                      disabled={reportLoading}
                    >
                      {reportLoading ? "Se genereaza..." : "Genereaza"}
                    </button>
                    <button
                      className="admin-action-button"
                      onClick={() =>
                        exportReportCsv(
                          `${reportType}-${reportStart.slice(0, 10)}-${reportEnd.slice(0, 10)}.csv`,
                          currentReportRows,
                        )
                      }
                      disabled={!currentReportRows.length}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>

              <div className="report-stat-grid">
                <ReportMetricCard
                  label="Venit incasat"
                  value={formatPrice(reportRevenueCents, "RON")}
                  meta={`${reportSucceededPayments} plati reusite`}
                  tone="success"
                />
                <ReportMetricCard
                  label="Rata ocupare"
                  value={`${reportOccupancyRate}%`}
                  meta={`${formatHours(reportOccupiedHours)} ocupate`}
                  tone="info"
                />
                <ReportMetricCard
                  label="Ore rezervate"
                  value={formatHours(reportReservedHours)}
                  meta={`${reportReservations.length} rezervari`}
                />
                <ReportMetricCard
                  label="Ore abonamente"
                  value={formatHours(reportSubscriptionHours)}
                  meta={`${reportSubscriptions.length} abonamente active in interval`}
                />
                <ReportMetricCard
                  label="Plata medie"
                  value={formatPrice(reportAveragePaymentCents, "RON")}
                  meta={`${reportFailedPayments} plati esuate`}
                  tone={reportFailedPayments ? "warning" : "success"}
                />
                <ReportMetricCard
                  label="Cel mai folosit loc"
                  value={reportTopSpot?.code ?? "-"}
                  meta={
                    reportTopSpot
                      ? `${reportTopSpot.totalUses} utilizari, ${formatHours(
                          reportTopSpot.occupiedHours,
                        )}`
                      : "Fara utilizari in interval"
                  }
                />
              </div>

              <div className="report-insights-grid">
                <div className="report-insight-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Distributie raport</h2>
                      <p className="page-subtitle">
                        Statusuri calculate pentru raportul selectat.
                      </p>
                    </div>
                  </div>
                  <ReportBreakdown items={reportStatusStats} />
                </div>

                <div className="report-insight-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Ocupare locuri</h2>
                      <p className="page-subtitle">
                        Imagine rapida pe disponibilitatea din interval.
                      </p>
                    </div>
                  </div>
                  <ReportBreakdown
                    items={[
                      { label: "Ocupate", value: reportOccupiedSpots },
                      { label: "Libere", value: reportFreeSpots },
                      {
                        label: "Indisponibile",
                        value:
                          reportSpots.length -
                          reportOccupiedSpots -
                          reportFreeSpots,
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="report-result-panel">
                <div className="panel-heading">
                  <div>
                    <h2>{getReportTitle(reportType)}</h2>
                    <p className="page-subtitle">
                      {formatDateTime(reportStart)}
                      {" -> "}
                      {formatDateTime(reportEnd)}
                    </p>
                  </div>
                  <StatusBadge value={`${currentReportRows.length} randuri`} />
                </div>

                <ScrollableTableCard>
                  <ReportTable rows={currentReportRows} />
                </ScrollableTableCard>
              </div>
            </section>
          </>
        );

      default:
        return (
          <PagePlaceholder title={activePage} subtitle="Pagina in lucru." />
        );
    }
  }

  return (
    <AdminLayout
      keycloak={keycloak}
      activePage={activePage}
      onNavigate={setActivePage}
      alertsBadge={notifications.filter((notification) => !notification.is_read).length}
    >
      <>
        {renderPage()}
        <UserProfileDrawer
          profile={selectedUserProfile}
          loading={userProfileLoading}
          error={userProfileError}
          selectedRole={selectedUserRole}
          roleSaving={userRoleSaving}
          vehicleActionLoadingId={vehicleActionLoadingId}
          onClose={closeUserProfile}
          onRoleChange={setSelectedUserRole}
          onSaveRole={saveSelectedUserRole}
          onSetPrimaryVehicle={setVehiclePrimaryFromAdmin}
          onDeactivateVehicle={deactivateVehicleFromAdmin}
          onActivateVehicle={activateVehicleFromAdmin}
          onOpenReservations={jumpToUserReservations}
          onOpenSubscriptions={jumpToUserSubscriptions}
        />
        <ParkingSpotDetailsDrawer
          spot={selectedParkingSpot}
          reservations={reservations}
          subscriptions={subscriptions}
          onClose={closeParkingSpotDetails}
        />
        <VehicleDetailsDrawer
          vehicle={selectedVehicleDetails}
          reservations={reservations}
          subscriptions={subscriptions}
          actionLoadingId={vehicleActionLoadingId}
          onClose={closeVehicleDetails}
          onSetPrimary={setVehiclePrimaryFromAdmin}
          onDeactivate={deactivateVehicleFromAdmin}
          onActivate={activateVehicleFromAdmin}
          onOpenUserProfile={openUserProfile}
        />
      </>
    </AdminLayout>
  );
}

function PagePlaceholder({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <PageHero kicker="Module Preview" title={title} subtitle={subtitle} />

      <div className="spotlight-layout">
        <div className="spotlight-main">
          <div className="dashboard-grid dashboard-grid-compact">
            <SummaryCard
              icon="PL"
              label="Status"
              value="In lucru"
              meta="Urmeaza conectarea la backend"
            />
          </div>
        </div>

        <div className="spotlight-side">
          <InfoPanel
            title="Ce urmeaza"
            subtitle="Spatiu pregatit pentru operatiuni si fluxuri administrative."
            items={[
              { label: "Frontend", value: "shell pregatit" },
              { label: "Backend", value: "de conectat" },
              { label: "UX", value: "gata pentru extindere" },
            ]}
          />
        </div>
      </div>
    </>
  );
}

function updatePricingRuleDraft(
  setPricingSettings: React.Dispatch<React.SetStateAction<any>>,
  ruleId: number,
  patch: Record<string, unknown>,
) {
  setPricingSettings((current: any) => ({
    ...current,
    pricingRules: current.pricingRules.map((item: any) =>
      item.id === ruleId ? { ...item, ...patch } : item,
    ),
  }));
}

const REPORT_OPTIONS = [
  {
    value: "reservations",
    shortLabel: "RS",
    label: "Rezervari",
    description: "Volum, statusuri, intervale si plati asociate rezervarilor.",
  },
  {
    value: "subscriptions",
    shortLabel: "AB",
    label: "Abonamente",
    description: "Abonamente active pe interval, planuri si locuri alocate.",
  },
  {
    value: "occupancy",
    shortLabel: "OC",
    label: "Ocupare",
    description: "Starea locurilor de parcare pentru perioada selectata.",
  },
  {
    value: "payments",
    shortLabel: "PL",
    label: "Plati",
    description: "Incasari, plati reusite, esuate si referinte comerciale.",
  },
  {
    value: "spotUsage",
    shortLabel: "UL",
    label: "Utilizare locuri",
    description: "Top locuri dupa utilizari si ore ocupate.",
  },
];

function ReportMetricCard({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  meta: string;
  tone?: "success" | "warning" | "info";
}) {
  return (
    <div className={`report-metric-card${tone ? ` tone-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{meta}</p>
    </div>
  );
}

function ReportBreakdown({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="report-breakdown">
      {items.length ? (
        items.map((item) => {
          const percent = total ? Math.round((item.value / total) * 100) : 0;

          return (
            <div key={item.label} className="report-breakdown-row">
              <div className="report-breakdown-top">
                <span>{item.label}</span>
                <strong>
                  {item.value} · {percent}%
                </strong>
              </div>
              <div className="report-breakdown-track">
                <span style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })
      ) : (
        <div className="admin-muted">Nu exista statistici pentru raport.</div>
      )}
    </div>
  );
}

function ReportTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) {
    return (
      <div className="admin-table-card admin-filter-card">
        Nu exista date pentru raportul selectat.
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  return (
    <table className="admin-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`report-row-${index}`}>
            {columns.map((column) => (
              <DataCell key={column} label={column}>
                {String(row[column] ?? "-")}
              </DataCell>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QrValidationDetails({ result }: { result: any }) {
  const resource =
    result?.type === "subscription"
      ? result?.subscription
      : result?.reservation;
  const resourceTitle =
    result?.type === "subscription"
      ? "Abonament validat"
      : "Rezervare validata";
  const resourceIdLabel =
    result?.type === "subscription" ? "Abonament" : "Rezervare";
  const resourceStatusLabel = result?.exitAllowedAfterExpiry
    ? "expirat - iesire permisa"
    : formatQrStatus(result?.status);

  if (!resource) {
    return (
      <div className="qr-result-card">
        <div className="activity-icon">{result?.valid ? "OK" : "ER"}</div>
        <div className="activity-body">
          <div className="activity-header">
            <div>
              <div className="stack-item-title">
                {result?.valid ? "Cod QR acceptat" : "Cod QR respins"}
              </div>
              <div className="stack-item-subtitle">
                {result?.message ??
                  "Nu exista detalii suplimentare pentru acest cod."}
              </div>
            </div>
            <StatusBadge
              value={result?.status ?? "-"}
              kind={result?.valid ? "validation" : undefined}
            />
          </div>

          <div className="activity-detail-grid">
            <div className="activity-detail">
              <span>Tip</span>
              <strong>{formatQrType(result?.type)}</strong>
            </div>
            <div className="activity-detail">
              <span>Status</span>
              <strong>{formatQrStatus(result?.status)}</strong>
            </div>
            <div className="activity-detail">
              <span>Valid de la</span>
              <strong>{formatDateTime(result?.validFrom)}</strong>
            </div>
            <div className="activity-detail">
              <span>Valid pana la</span>
              <strong>{formatDateTime(result?.validTo)}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-result-card">
      <div className="activity-icon">{result?.valid ? "OK" : "NO"}</div>
      <div className="activity-body">
        <div className="activity-header">
          <div>
            <div className="stack-item-title">
              {resourceTitle} #{resource.id ?? "-"}
            </div>
            <div className="stack-item-subtitle">
              {resource.userName ?? "Utilizator necunoscut"}
              {resource.vehiclePlate ? ` - ${resource.vehiclePlate}` : ""}
            </div>
          </div>
          <StatusBadge
            value={resourceStatusLabel}
          />
        </div>

        <div className="qr-result-band">
          <div>
            <span>{resourceIdLabel}</span>
            <strong>#{resource.id ?? "-"}</strong>
          </div>
          <div>
            <span>Loc</span>
            <strong>
              {resource.spotCode ?? "-"}
              {resource.levelId != null ? `, nivel ${resource.levelId}` : ""}
            </strong>
          </div>
          <div>
            <span>Masina</span>
            <strong>{resource.vehiclePlate ?? "-"}</strong>
          </div>
        </div>

        {result?.plateCheck ? (
          <div
            className={`qr-plate-result ${
              result.plateCheck.checked && result.plateCheck.matches
                ? "success"
                : result.plateCheck.checked
                  ? "danger"
                  : "warning"
            }`}
          >
            <div>
              <span>Verificare numar</span>
              <strong>{result.plateCheck.message}</strong>
            </div>
            <div>
              <span>Numar scanat</span>
              <strong>{result.plateCheck.submittedPlate ?? "-"}</strong>
            </div>
            <div>
              <span>Numar din QR</span>
              <strong>{result.plateCheck.expectedPlate ?? "-"}</strong>
            </div>
            <div>
              <span>Acces</span>
              <strong>
                {result.accessAllowed
                  ? result.accessEvent === "exit"
                    ? "Iesire inregistrata"
                    : result.accessEvent === "entry"
                      ? "Intrare inregistrata"
                      : "Permis"
                  : "Neconfirmat"}
              </strong>
            </div>
          </div>
        ) : null}

        <div className="activity-detail-grid">
          <div className="activity-detail">
            <span>Utilizator</span>
            <strong>{resource.userName ?? "-"}</strong>
          </div>
          <div className="activity-detail">
            <span>Email</span>
            <strong>{resource.userEmail ?? "-"}</strong>
          </div>
          <div className="activity-detail">
            <span>Status resursa</span>
            <strong>{resourceStatusLabel}</strong>
          </div>
          <div className="activity-detail">
            <span>Start acces</span>
            <strong>{formatDateTime(resource.start)}</strong>
          </div>
          <div className="activity-detail">
            <span>Final acces</span>
            <strong>{formatDateTime(resource.end)}</strong>
          </div>
          <div className="activity-detail">
            <span>QR valid de la</span>
            <strong>{formatDateTime(result?.validFrom)}</strong>
          </div>
          <div className="activity-detail">
            <span>QR valid pana la</span>
            <strong>{formatDateTime(result?.validTo)}</strong>
          </div>
          <div className="activity-detail">
            <span>Eveniment acces</span>
            <strong>
              {result?.accessEvent === "entry"
                ? "Intrare"
                : result?.accessEvent === "exit"
                  ? "Iesire"
                  : "-"}
            </strong>
          </div>
          <div className="activity-detail">
            <span>Penalitate</span>
            <strong>
              {result?.penaltyCents
                ? `${(Number(result.penaltyCents) / 100).toFixed(2)} RON`
                : "0.00 RON"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleDetailsDrawer({
  vehicle,
  reservations,
  subscriptions,
  actionLoadingId,
  onClose,
  onSetPrimary,
  onDeactivate,
  onActivate,
  onOpenUserProfile,
}: {
  vehicle: any;
  reservations: any[];
  subscriptions: any[];
  actionLoadingId: number | null;
  onClose: () => void;
  onSetPrimary: (vehicleId: number) => Promise<void>;
  onDeactivate: (vehicleId: number) => Promise<void>;
  onActivate: (vehicleId: number) => Promise<void>;
  onOpenUserProfile: (userId: number) => Promise<void>;
}) {
  if (!vehicle) {
    return null;
  }

  const vehicleId = Number(vehicle.id);
  const isBusy = actionLoadingId === vehicleId;
  const vehicleReservations = reservations
    .filter((reservation) => Number(reservation.vehicleId) === vehicleId)
    .sort(
      (a, b) =>
        new Date(b.start ?? b.createdAt ?? 0).getTime() -
        new Date(a.start ?? a.createdAt ?? 0).getTime(),
    );
  const vehicleSubscriptions = subscriptions
    .filter((subscription) => Number(subscription.vehicleId) === vehicleId)
    .sort(
      (a, b) =>
        new Date(b.start ?? b.createdAt ?? 0).getTime() -
        new Date(a.start ?? a.createdAt ?? 0).getTime(),
    );

  return (
    <div className="admin-drawer-overlay" onClick={onClose}>
      <aside
        className="admin-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-drawer-header">
          <div>
            <div className="page-hero-kicker">Detalii vehicul</div>
            <h2>{vehicle.plateNumber ?? `Vehicul #${vehicle.id}`}</h2>
            <p className="page-subtitle">
              Administrare vehicul, proprietar, rezervari si abonamente.
            </p>
          </div>

          <button
            className="admin-sidebar-close admin-drawer-close"
            onClick={onClose}
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

        <div className="admin-drawer-content">
          <div className="dashboard-grid dashboard-grid-compact">
            <SummaryCard
              icon="VH"
              label="Vehicul"
              value={vehicle.plateNumber ?? "-"}
              meta={`ID #${vehicle.id}`}
            />
            <SummaryCard
              icon="ST"
              label="Status"
              value={vehicle.isActive ? "Activ" : "Inactiv"}
              accent={vehicle.isActive ? "success" : "danger"}
              meta={
                vehicle.isPrimary ? "Vehicul principal" : "Vehicul secundar"
              }
            />
            <SummaryCard
              icon="RZ"
              label="Rezervari"
              value={vehicleReservations.length}
              meta="Istoric vehicul"
            />
            <SummaryCard
              icon="AB"
              label="Abonamente"
              value={vehicleSubscriptions.length}
              meta="Asociate vehiculului"
            />
          </div>

          <div className="admin-table-card admin-filter-card">
            <div className="panel-heading">
              <div>
                <h2>Administrare</h2>
                <p className="page-subtitle">
                  Actiunile sunt aplicate direct pe vehiculul selectat.
                </p>
              </div>
              <StatusBadge value={vehicle.isActive ? "activ" : "inactiv"} />
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Utilizator</span>
                <span className="detail-value">{vehicle.userName ?? "-"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email</span>
                <span className="detail-value">{vehicle.userEmail ?? "-"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Tip</span>
                <span className="detail-value">
                  {vehicle.isPrimary ? "Principal" : "Secundar"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Creat la</span>
                <span className="detail-value">
                  {formatDateTime(vehicle.createdAt)}
                </span>
              </div>
            </div>

            <div className="admin-filters-row">
              <button
                className="admin-action-button action-primary"
                onClick={() => void onSetPrimary(vehicleId)}
                disabled={isBusy || !vehicle.isActive || vehicle.isPrimary}
              >
                {vehicle.isPrimary ? "Este principal" : "Fa principal"}
              </button>
              <button
                className={
                  vehicle.isActive
                    ? "admin-action-button danger"
                    : "admin-action-button action-primary"
                }
                onClick={() =>
                  void (vehicle.isActive
                    ? onDeactivate(vehicleId)
                    : onActivate(vehicleId))
                }
                disabled={isBusy}
              >
                {vehicle.isActive ? "Dezactiveaza" : "Activeaza"}
              </button>
              <button
                className="admin-action-button"
                onClick={() => {
                  onClose();
                  void onOpenUserProfile(Number(vehicle.userId));
                }}
                disabled={!vehicle.userId}
              >
                Vezi utilizator
              </button>
            </div>
          </div>

          <div className="admin-table-card admin-filter-card">
            <div className="panel-heading">
              <div>
                <h2>Rezervari cu acest vehicul</h2>
                <p className="page-subtitle">
                  Ultimele rezervari in care apare masina selectata.
                </p>
              </div>
            </div>

            <div className="stack-list">
              {vehicleReservations.length ? (
                vehicleReservations.slice(0, 8).map((reservation) => (
                  <div key={reservation.id} className="stack-item">
                    <div>
                      <div className="stack-item-title">
                        Rezervare #{reservation.id} -{" "}
                        {reservation.spotCode ?? reservation.spotId ?? "-"}
                      </div>
                      <div className="stack-item-subtitle">
                        {formatDateTime(reservation.start)}
                        {" -> "}
                        {formatDateTime(reservation.end)}
                      </div>
                    </div>
                    <div className="stack-item-actions">
                      <StatusBadge value={reservation.status ?? "-"} />
                      <span className="activity-chip">
                        {formatPrice(
                          reservation.priceCents,
                          reservation.currency,
                        )}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="admin-muted">
                  Nu exista rezervari pentru acest vehicul.
                </div>
              )}
            </div>
          </div>

          <div className="admin-table-card admin-filter-card">
            <div className="panel-heading">
              <div>
                <h2>Abonamente cu acest vehicul</h2>
                <p className="page-subtitle">
                  Abonamentele asociate masinii selectate.
                </p>
              </div>
            </div>

            <div className="stack-list">
              {vehicleSubscriptions.length ? (
                vehicleSubscriptions.slice(0, 8).map((subscription) => (
                  <div key={subscription.id} className="stack-item">
                    <div>
                      <div className="stack-item-title">
                        Abonament #{subscription.id} -{" "}
                        {subscription.planName ?? subscription.planCode ?? "-"}
                      </div>
                      <div className="stack-item-subtitle">
                        {formatDateTime(subscription.start)}
                        {" -> "}
                        {formatDateTime(subscription.end)}
                      </div>
                    </div>
                    <div className="stack-item-actions">
                      <StatusBadge value={subscription.status ?? "-"} />
                      <span className="activity-chip">
                        {formatPrice(
                          subscription.priceCents,
                          subscription.currency,
                        )}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="admin-muted">
                  Nu exista abonamente pentru acest vehicul.
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ParkingSpotDetailsDrawer({
  spot,
  reservations,
  subscriptions,
  onClose,
}: {
  spot: any;
  reservations: any[];
  subscriptions: any[];
  onClose: () => void;
}) {
  if (!spot) {
    return null;
  }

  const spotId = Number(spot.id);
  const spotReservations = reservations
    .filter((reservation) => Number(reservation.spotId) === spotId)
    .sort(
      (a, b) =>
        new Date(b.start ?? b.createdAt ?? 0).getTime() -
        new Date(a.start ?? a.createdAt ?? 0).getTime(),
    );
  const spotSubscriptions = subscriptions
    .filter((subscription) => Number(subscription.spotId) === spotId)
    .sort(
      (a, b) =>
        new Date(b.start ?? b.createdAt ?? 0).getTime() -
        new Date(a.start ?? a.createdAt ?? 0).getTime(),
    );

  return (
    <div className="admin-drawer-overlay" onClick={onClose}>
      <aside
        className="admin-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-drawer-header">
          <div>
            <div className="page-hero-kicker">Detalii loc parcare</div>
            <h2>{spot.code ?? `Loc #${spot.id}`}</h2>
            <p className="page-subtitle">
              Istoric rezervari, utilizatori si vehicule asociate locului.
            </p>
          </div>

          <button
            className="admin-sidebar-close admin-drawer-close"
            onClick={onClose}
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

        <div className="admin-drawer-content">
          <div className="dashboard-grid dashboard-grid-compact">
            <SummaryCard
              icon="ID"
              label="ID loc"
              value={`#${spot.id}`}
              meta={`Nivel ${spot.levelId ?? "-"}`}
            />
            <SummaryCard
              icon="ST"
              label="Status"
              value={spot.status ?? "-"}
              meta={spot.reason ?? "actualizare live"}
            />
            <SummaryCard
              icon="RZ"
              label="Rezervari"
              value={spotReservations.length}
              meta="Istoric pe acest loc"
            />
            <SummaryCard
              icon="AB"
              label="Abonamente"
              value={spotSubscriptions.length}
              meta="Blocari recurente"
            />
          </div>

          <div className="admin-table-card admin-filter-card">
            <div className="panel-heading">
              <div>
                <h2>Istoric rezervari</h2>
              </div>
            </div>

            <div className="stack-list">
              {spotReservations.length ? (
                spotReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="stack-item stack-item-vertical"
                  >
                    <div className="stack-item-header">
                      <div>
                        <div className="stack-item-title">
                          Rezervare #{reservation.id} -{" "}
                          {reservation.vehiclePlate ?? "fara masina"}
                        </div>
                        <div className="stack-item-subtitle">
                          {formatDateTime(reservation.start)}
                          {" -> "}
                          {formatDateTime(reservation.end)}
                        </div>
                      </div>
                      <div className="stack-item-actions">
                        <StatusBadge value={reservation.status ?? "-"} />
                        <StatusBadge
                          value={reservation.type ?? "-"}
                          kind="type"
                        />
                      </div>
                    </div>

                    <div className="detail-grid detail-grid-compact">
                      <div className="detail-item">
                        <span className="detail-label">Utilizator</span>
                        <span className="detail-value">
                          {reservation.userName ?? "-"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Email</span>
                        <span className="detail-value">
                          {reservation.userEmail ?? "-"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Masina</span>
                        <span className="detail-value">
                          {reservation.vehiclePlate ?? "-"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Pret</span>
                        <span className="detail-value">
                          {formatPrice(
                            reservation.priceCents,
                            reservation.currency,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="admin-muted">
                  Nu exista rezervari inregistrate pentru acest loc.
                </div>
              )}
            </div>
          </div>

          <div className="admin-table-card admin-filter-card">
            <div className="panel-heading">
              <div>
                <h2>Abonamente pe loc</h2>
                <p className="page-subtitle">
                  Abonamentele pot bloca locul in intervalele active.
                </p>
              </div>
            </div>

            <div className="stack-list">
              {spotSubscriptions.length ? (
                spotSubscriptions.map((subscription) => (
                  <div key={subscription.id} className="stack-item">
                    <div>
                      <div className="stack-item-title">
                        Abonament #{subscription.id} -{" "}
                        {subscription.vehiclePlate ?? "fara masina"}
                      </div>
                      <div className="stack-item-subtitle">
                        {formatDateTime(subscription.start)}
                        {" -> "}
                        {formatDateTime(subscription.end)}
                        {" - "}
                        {subscription.userName ?? subscription.userEmail ?? "-"}
                      </div>
                    </div>
                    <div className="stack-item-actions">
                      <StatusBadge value={subscription.status ?? "-"} />
                      <StatusBadge
                        value={
                          subscription.planName ??
                          subscription.planCode ??
                          "abonament"
                        }
                        kind="type"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="admin-muted">
                  Nu exista abonamente inregistrate pentru acest loc.
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function UserProfileDrawer({
  profile,
  loading,
  error,
  selectedRole,
  roleSaving,
  vehicleActionLoadingId,
  onClose,
  onRoleChange,
  onSaveRole,
  onSetPrimaryVehicle,
  onDeactivateVehicle,
  onActivateVehicle,
  onOpenReservations,
  onOpenSubscriptions,
}: {
  profile: any;
  loading: boolean;
  error: string;
  selectedRole: string;
  roleSaving: boolean;
  vehicleActionLoadingId: number | null;
  onClose: () => void;
  onRoleChange: (role: string) => void;
  onSaveRole: () => Promise<void>;
  onSetPrimaryVehicle: (vehicleId: number) => Promise<void>;
  onDeactivateVehicle: (vehicleId: number) => Promise<void>;
  onActivateVehicle: (vehicleId: number) => Promise<void>;
  onOpenReservations: (profile: any) => void;
  onOpenSubscriptions: (profile: any) => void;
}) {
  if (!profile && !loading) {
    return null;
  }

  const user = profile?.user;
  const vehicles = profile?.vehicles ?? [];
  const reservations = profile?.reservations ?? [];
  const subscriptions = profile?.subscriptions ?? [];
  const payments = profile?.payments ?? [];
  const activity = profile?.activity ?? [];

  return (
    <div className="admin-drawer-overlay" onClick={onClose}>
      <aside
        className="admin-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-drawer-header">
          <div>
            <div className="page-hero-kicker">Profil utilizator</div>
            <h2>{user?.fullName || user?.username || "Se incarca..."}</h2>
            <p className="page-subtitle">
              {user?.email ??
                user?.username ??
                "Cont administrat din web admin"}
            </p>
          </div>

          <button
            className="admin-sidebar-close admin-drawer-close"
            onClick={onClose}
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

        {error ? <pre className="dashboard-error">{error}</pre> : null}

        {loading ? (
          <div className="admin-table-card admin-filter-card">
            Se incarca profilul utilizatorului...
          </div>
        ) : profile ? (
          <div className="admin-drawer-content">
            <div className="dashboard-grid dashboard-grid-compact">
              <SummaryCard
                icon="ID"
                label="ID utilizator"
                value={`#${user.id}`}
                meta={user.isActive ? "Cont activ" : "Cont inactiv"}
              />
              <SummaryCard
                icon="VH"
                label="Vehicule"
                value={vehicles.length}
                meta="Asociate contului"
              />
              <SummaryCard
                icon="RZ"
                label="Rezervari"
                value={reservations.length}
                meta="Istoric rezervari"
              />
              <SummaryCard
                icon="AB"
                label="Abonamente"
                value={subscriptions.length}
                meta="Istoric abonamente"
              />
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="panel-heading">
                <div>
                  <h2>Cont si roluri</h2>
                  <p className="page-subtitle">
                    Username, email, rol activ si legaturi de autentificare.
                  </p>
                </div>
                <StatusBadge value={user.isActive ? "activ" : "inactiv"} />
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Username</span>
                  <span className="detail-value">{user.username ?? "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{user.email ?? "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Creat la</span>
                  <span className="detail-value">
                    {formatDateTime(user.createdAt)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Keycloak</span>
                  <span className="detail-value">{user.externalId ?? "-"}</span>
                </div>
              </div>

              <div className="admin-filters-row">
                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Rol</label>
                  <select
                    className="admin-input"
                    value={selectedRole}
                    onChange={(event) => onRoleChange(event.target.value)}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Roluri curente</label>
                  <div className="pill-row">
                    {user.roles?.map((role: string) => (
                      <StatusBadge key={role} value={role} kind="role" />
                    ))}
                  </div>
                </div>

                <div className="admin-filter-field">
                  <label className="dashboard-card-label">Actiune</label>
                  <button
                    className="admin-action-button action-primary"
                    onClick={() => void onSaveRole()}
                    disabled={roleSaving}
                  >
                    {roleSaving ? "Se salveaza..." : "Salveaza rol"}
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="panel-heading">
                <div>
                  <h2>Acces rapid</h2>
                  <p className="page-subtitle">
                    Navigheaza direct spre rezervarile sau abonamentele
                    utilizatorului.
                  </p>
                </div>
              </div>

              <div className="admin-filters-row">
                <button
                  className="admin-action-button action-primary"
                  onClick={() => onOpenReservations(profile)}
                >
                  Vezi rezervarile
                </button>
                <button
                  className="admin-action-button action-primary"
                  onClick={() => onOpenSubscriptions(profile)}
                >
                  Vezi abonamentele
                </button>
              </div>
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="panel-heading">
                <div>
                  <h2>Vehicule</h2>
                  <p className="page-subtitle">
                    Setare vehicul principal sau dezactivare din profilul
                    utilizatorului.
                  </p>
                </div>
              </div>

              <div className="stack-list">
                {vehicles.length ? (
                  vehicles.map((vehicle: any) => (
                    <div key={vehicle.id} className="stack-item">
                      <div>
                        <div className="stack-item-title">
                          {vehicle.plateNumber}
                        </div>
                        <div className="stack-item-subtitle">
                          Creat {formatDateTime(vehicle.createdAt)}
                        </div>
                      </div>
                      <div className="stack-item-actions">
                        <StatusBadge
                          value={vehicle.isPrimary ? "primar" : "secundar"}
                          kind="type"
                        />
                        <StatusBadge
                          value={vehicle.isActive ? "activ" : "inactiv"}
                        />
                        <button
                          className="admin-action-button"
                          onClick={() => void onSetPrimaryVehicle(vehicle.id)}
                          disabled={
                            vehicleActionLoadingId === vehicle.id ||
                            !vehicle.isActive
                          }
                        >
                          Principal
                        </button>
                        <button
                          className={
                            vehicle.isActive
                              ? "admin-action-button danger"
                              : "admin-action-button action-primary"
                          }
                          onClick={() =>
                            void (vehicle.isActive
                              ? onDeactivateVehicle(vehicle.id)
                              : onActivateVehicle(vehicle.id))
                          }
                          disabled={vehicleActionLoadingId === vehicle.id}
                        >
                          {vehicle.isActive ? "Dezactiveaza" : "Activeaza"}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-muted">
                    Nu exista vehicule asociate.
                  </div>
                )}
              </div>
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="panel-heading">
                <div>
                  <h2>Rezervari si abonamente</h2>
                  <p className="page-subtitle">
                    Ultimele elemente asociate utilizatorului, cu status si
                    plata.
                  </p>
                </div>
              </div>

              <div className="detail-columns">
                <div className="stack-list">
                  <h3 className="detail-section-title">Rezervari</h3>
                  {reservations.length ? (
                    reservations.slice(0, 6).map((reservation: any) => (
                      <div key={reservation.id} className="stack-item">
                        <div>
                          <div className="stack-item-title">
                            #{reservation.id} ·{" "}
                            {reservation.spotCode ?? reservation.spotId ?? "-"}
                          </div>
                          <div className="stack-item-subtitle">
                            {formatDateTime(reservation.start)}
                            {" -> "}
                            {formatDateTime(reservation.end)}
                          </div>
                        </div>
                        <div className="stack-item-actions">
                          <StatusBadge value={reservation.status ?? "-"} />
                          {reservation.payment ? (
                            <StatusBadge
                              value={reservation.payment.status}
                              kind="payment"
                            />
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="admin-muted">Nu exista rezervari.</div>
                  )}
                </div>

                <div className="stack-list">
                  <h3 className="detail-section-title">Abonamente</h3>
                  {subscriptions.length ? (
                    subscriptions.slice(0, 6).map((subscription: any) => (
                      <div key={subscription.id} className="stack-item">
                        <div>
                          <div className="stack-item-title">
                            #{subscription.id} ·{" "}
                            {subscription.planName ??
                              subscription.planCode ??
                              "-"}
                          </div>
                          <div className="stack-item-subtitle">
                            {formatDateTime(subscription.start)}
                            {" -> "}
                            {formatDateTime(subscription.end)}
                          </div>
                        </div>
                        <div className="stack-item-actions">
                          <StatusBadge value={subscription.status ?? "-"} />
                          {subscription.payment ? (
                            <StatusBadge
                              value={subscription.payment.status}
                              kind="payment"
                            />
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="admin-muted">Nu exista abonamente.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="panel-heading">
                <div>
                  <h2>Plati recente</h2>
                  <p className="page-subtitle">
                    Ultimele tranzactii asociate rezervarilor si abonamentelor.
                  </p>
                </div>
              </div>

              <div className="stack-list">
                {payments.length ? (
                  payments.slice(0, 8).map((payment: any) => (
                    <div key={payment.id} className="stack-item">
                      <div>
                        <div className="stack-item-title">
                          #{payment.id} ·{" "}
                          {formatPrice(payment.amountCents, payment.currency)}
                        </div>
                        <div className="stack-item-subtitle">
                          {payment.provider} ·{" "}
                          {payment.providerRef ?? "fara referinta"}
                        </div>
                      </div>
                      <div className="stack-item-actions">
                        <StatusBadge value={payment.status} kind="payment" />
                        <span className="admin-muted">
                          {formatDateTime(payment.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-muted">
                    Nu exista plati inregistrate.
                  </div>
                )}
              </div>
            </div>

            <div className="admin-table-card admin-filter-card">
              <div className="panel-heading">
                <div>
                  <h2>Istoric activitate</h2>
                  <p className="page-subtitle">
                    Audit log pentru profil, vehicule, rezervari, abonamente si
                    plati.
                  </p>
                </div>
              </div>

              <div className="stack-list">
                {activity.length ? (
                  activity.map((entry: any) => {
                    const display = formatActivityEntry(entry);

                    return (
                      <div key={entry.id} className="activity-card">
                        <div className="activity-icon">{display.icon}</div>
                        <div className="activity-body">
                          <div className="activity-header">
                            <div>
                              <div className="stack-item-title">
                                {display.title}
                              </div>
                              <div className="stack-item-subtitle">
                                {display.description}
                              </div>
                            </div>
                            <span className="activity-date">
                              {formatDateTime(entry.createdAt)}
                            </span>
                          </div>

                          <div className="activity-meta-row">
                            <span className="activity-chip">
                              {display.entityLabel}
                            </span>
                            <span className="activity-chip muted">
                              Audit #{entry.id}
                            </span>
                          </div>

                          {display.details.length ? (
                            <div className="activity-detail-grid">
                              {display.details.map((detail) => (
                                <div
                                  key={detail.label}
                                  className="activity-detail"
                                >
                                  <span>{detail.label}</span>
                                  <strong>{detail.value}</strong>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="admin-muted">
                    Nu exista intrari de audit pentru acest utilizator.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function PageHero({
  kicker,
  title,
  subtitle,
  aside,
  children,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="page-hero-content">
        <div className="page-hero-kicker">{kicker}</div>
        <h1>{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
        {children ? <div className="page-hero-extra">{children}</div> : null}
      </div>
      {aside ? <div className="page-hero-aside">{aside}</div> : null}
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  meta,
  accent,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  meta: string;
  accent?: "success" | "warning" | "danger" | "info";
}) {
  return (
    <div className={`dashboard-card${accent ? ` accent-${accent}` : ""}`}>
      <div className="dashboard-card-icon">{icon}</div>
      <div className="dashboard-card-label">{label}</div>
      <div className="dashboard-card-value">{value}</div>
      <div className="dashboard-card-sub">{meta}</div>
    </div>
  );
}

function InfoPanel({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="info-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="info-list">
        {items.map((item) => (
          <div key={`${item.label}-${item.value}`} className="info-list-row">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function IdentityCell({
  primary,
  secondary,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="identity-cell">
      <div className="identity-primary">{primary}</div>
      {secondary ? <div className="identity-secondary">{secondary}</div> : null}
    </div>
  );
}

function DataCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <td data-label={label}>{children}</td>;
}

function ScrollableTableCard({ children }: { children: React.ReactNode }) {
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const syncLockRef = useRef<"top" | "bottom" | null>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  useEffect(() => {
    const bottomElement = bottomScrollRef.current;

    if (!bottomElement) {
      return;
    }

    const updateMetrics = () => {
      setScrollWidth(bottomElement.scrollWidth);
      setClientWidth(bottomElement.clientWidth);
    };

    updateMetrics();

    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });

    resizeObserver.observe(bottomElement);

    const tableElement = bottomElement.querySelector("table");
    if (tableElement) {
      resizeObserver.observe(tableElement);
    }

    window.addEventListener("resize", updateMetrics);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, [children]);

  const handleTopScroll = () => {
    if (syncLockRef.current === "bottom") {
      syncLockRef.current = null;
      return;
    }

    const topElement = topScrollRef.current;
    const bottomElement = bottomScrollRef.current;

    if (!topElement || !bottomElement) {
      return;
    }

    syncLockRef.current = "top";
    bottomElement.scrollLeft = topElement.scrollLeft;
  };

  const handleBottomScroll = () => {
    if (syncLockRef.current === "top") {
      syncLockRef.current = null;
      return;
    }

    const topElement = topScrollRef.current;
    const bottomElement = bottomScrollRef.current;

    if (!topElement || !bottomElement) {
      return;
    }

    syncLockRef.current = "bottom";
    topElement.scrollLeft = bottomElement.scrollLeft;
  };

  const hasHorizontalOverflow = scrollWidth > clientWidth + 1;

  return (
    <div className="admin-table-card scrollable-table-card">
      {hasHorizontalOverflow ? (
        <div
          ref={topScrollRef}
          className="admin-table-top-scroll"
          onScroll={handleTopScroll}
        >
          <div
            className="admin-table-top-scroll-inner"
            style={{ width: `${scrollWidth}px` }}
          />
        </div>
      ) : null}

      <div
        ref={bottomScrollRef}
        className="admin-table-bottom-scroll"
        onScroll={handleBottomScroll}
      >
        {children}
      </div>
    </div>
  );
}

function StatusBadge({
  value,
  kind = "generic",
}: {
  value: React.ReactNode;
  kind?:
    | "generic"
    | "reservation"
    | "subscription"
    | "payment"
    | "role"
    | "type"
    | "validation";
}) {
  const text = String(value ?? "-");
  const tone = getStatusTone(text, kind);

  return <span className={`status-badge tone-${tone}`}>{text}</span>;
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatPrice(priceCents?: number, currency?: string) {
  if (priceCents == null) return "-";

  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: currency ?? "RON",
  }).format(priceCents / 100);
}

function readAuditDetails(details: unknown): Record<string, any> {
  if (!details) return {};
  if (typeof details === "object") return details as Record<string, any>;

  try {
    const parsed = JSON.parse(String(details));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function formatBooleanLabel(value: unknown) {
  if (value === true || value === 1) return "Da";
  if (value === false || value === 0) return "Nu";
  return value == null ? "-" : String(value);
}

function humanizeAuditAction(action?: string) {
  return String(action ?? "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatQrType(type?: string) {
  const labels: Record<string, string> = {
    reservation: "Rezervare",
    subscription: "Abonament",
  };
  return labels[String(type ?? "")] ?? String(type ?? "-");
}

function formatQrStatus(status?: string) {
  const labels: Record<string, string> = {
    active: "Activ",
    pending: "In asteptare",
    completed: "Finalizat",
    cancelled: "Anulat",
    expired: "Expirat",
    revoked: "Revocat",
    not_started: "Inca inactiv",
    missing_reservation: "Rezervare lipsa",
    missing_subscription: "Abonament lipsa",
    unknown_type: "Tip necunoscut",
  };
  return labels[String(status ?? "")] ?? String(status ?? "-");
}

function isDateInRange(value: unknown, start: Date, end: Date) {
  const time = new Date(String(value ?? "")).getTime();
  return (
    Number.isFinite(time) && time >= start.getTime() && time <= end.getTime()
  );
}

function isDateRangeOverlapping(
  rawStart: unknown,
  rawEnd: unknown,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const start = new Date(String(rawStart ?? "")).getTime();
  const end = new Date(String(rawEnd ?? "")).getTime();
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start < rangeEnd.getTime() &&
    end > rangeStart.getTime()
  );
}

function getOverlapHours(
  rawStart: unknown,
  rawEnd: unknown,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const start = new Date(String(rawStart ?? "")).getTime();
  const end = new Date(String(rawEnd ?? "")).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }

  const overlapStart = Math.max(start, rangeStart.getTime());
  const overlapEnd = Math.min(end, rangeEnd.getTime());

  return Math.max(0, overlapEnd - overlapStart) / 3_600_000;
}

function getReportTitle(reportType: string) {
  const titles: Record<string, string> = {
    reservations: "Raport rezervari",
    subscriptions: "Raport abonamente",
    occupancy: "Raport ocupare",
    payments: "Raport plati",
    spotUsage: "Raport utilizare locuri",
  };
  return titles[reportType] ?? "Raport";
}

function getReportRows(params: {
  reportType: string;
  reservations: any[];
  subscriptions: any[];
  payments: any[];
  spots: any[];
  spotUsage: any[];
}) {
  if (params.reportType === "subscriptions") {
    return params.subscriptions.map((item) => ({
      ID: item.id,
      Utilizator: item.userName ?? "-",
      Email: item.userEmail ?? "-",
      Vehicul: item.vehiclePlate ?? "-",
      Loc: item.spotCode ?? item.spotId ?? "-",
      Plan: item.planName ?? item.planCode ?? "-",
      Start: formatDateTime(item.start),
      Final: formatDateTime(item.end),
      Status: item.status ?? "-",
      Pret: formatPrice(item.priceCents, item.currency),
      Plata: item.payment?.status ?? "fara plata",
    }));
  }

  if (params.reportType === "payments") {
    return params.payments.map((item) => ({
      ID: item.id,
      Utilizator: item.userName ?? "-",
      Email: item.userEmail ?? "-",
      Tip: item.reservationId
        ? "rezervare"
        : item.subscriptionId
          ? "abonament"
          : "-",
      Referinta: item.reservationId
        ? `Rezervare #${item.reservationId}`
        : item.subscriptionId
          ? `Abonament #${item.subscriptionId}`
          : "-",
      Status: item.status ?? "-",
      Provider: item.provider ?? "-",
      Suma: formatPrice(item.amountCents, item.currency),
      Creat: formatDateTime(item.createdAt),
    }));
  }

  if (params.reportType === "occupancy") {
    return params.spots.map((spot) => ({
      ID: spot.id,
      Loc: spot.code,
      Nivel: spot.levelId,
      Status: spot.status,
      Motiv: formatAvailabilityReason(spot.reason),
    }));
  }

  if (params.reportType === "spotUsage") {
    return params.spotUsage.map((spot) => ({
      ID: spot.id,
      Loc: spot.code,
      Nivel: spot.levelId,
      Rezervari: spot.reservationCount,
      Abonamente: spot.subscriptionCount,
      Utilizari: spot.totalUses,
      "Ore ocupate": spot.occupiedHours.toFixed(2),
    }));
  }

  return params.reservations.map((item) => ({
    ID: item.id,
    Utilizator: item.userName ?? "-",
    Email: item.userEmail ?? "-",
    Vehicul: item.vehiclePlate ?? "-",
    Loc: item.spotCode ?? item.spotId ?? "-",
    Nivel: item.levelId ?? "-",
    Start: formatDateTime(item.start),
    Final: formatDateTime(item.end),
    Status: item.status ?? "-",
    Pret: formatPrice(item.priceCents, item.currency),
    Plata: item.payment?.status ?? "fara plata",
  }));
}

function getReportStatusStats(params: {
  reportType: string;
  reservations: any[];
  subscriptions: any[];
  payments: any[];
  spots: any[];
}) {
  if (params.reportType === "subscriptions") {
    return countByField(params.subscriptions, "status");
  }

  if (params.reportType === "payments") {
    return countByField(params.payments, "status");
  }

  if (params.reportType === "occupancy") {
    return countByField(params.spots, "status");
  }

  if (params.reportType === "spotUsage") {
    const used = params.spots.filter((spot) => Number(spot.totalUses) > 0);
    return [
      { label: "Cu utilizari", value: used.length },
      { label: "Fara utilizari", value: params.spots.length - used.length },
    ];
  }

  return countByField(params.reservations, "status");
}

function countByField(items: any[], field: string) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const label = String(item?.[field] ?? "necunoscut");
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "ro"));
}

function exportReportCsv(
  filename: string,
  rows: Array<Record<string, unknown>>,
) {
  if (!rows.length) return;

  const columns = Object.keys(rows[0]);
  const escapeCell = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [
    columns.map(escapeCell).join(","),
    ...rows.map((row) =>
      columns.map((column) => escapeCell(row[column])).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatHours(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value < 1) return `${Math.round(value * 60)} min`;
  return `${value.toFixed(value >= 10 ? 0 : 1)} h`;
}

function formatAvailabilityReason(reason?: string | null) {
  const labels: Record<string, string> = {
    sensor_reports_occupied: "Ocupat de senzor",
    overlap_with_pending_or_active_reservation: "Blocat de rezervare",
    overlap_with_pending_or_active_subscription: "Blocat de abonament",
    next_reservation_starts_soon: "Rezervare in curand",
    next_subscription_starts_soon: "Abonament in curand",
  };
  return labels[String(reason ?? "")] ?? "Status live";
}

function formatEntityLabel(
  entityType?: string | null,
  entityId?: number | null,
) {
  const labels: Record<string, string> = {
    user: "Utilizator",
    vehicle: "Vehicul",
    reservation: "Rezervare",
    subscription: "Abonament",
    payment: "Plata",
    reservation_edit_request: "Cerere editare rezervare",
    subscription_edit_request: "Cerere editare abonament",
  };
  const label = labels[String(entityType ?? "")] ?? "Element";
  return `${label} #${entityId ?? "-"}`;
}

function formatActivityEntry(entry: any): {
  icon: string;
  title: string;
  description: string;
  entityLabel: string;
  details: Array<{ label: string; value: string }>;
} {
  const details = readAuditDetails(entry.details);
  const plate = details.plate_number ?? details.plateNumber;
  const action = String(entry.action ?? "");

  const base = {
    icon: "LG",
    title: humanizeAuditAction(action) || "Activitate",
    description: "Actiune inregistrata in audit log.",
    entityLabel: formatEntityLabel(entry.entityType, entry.entityId),
    details: [] as Array<{ label: string; value: string }>,
  };

  const commonVehicleDetails = [
    plate ? { label: "Masina", value: String(plate) } : null,
    details.target_user_id
      ? { label: "Utilizator", value: `#${details.target_user_id}` }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  switch (action) {
    case "ADMIN_ACTIVATE_VEHICLE":
      return {
        ...base,
        icon: "ON",
        title: "Vehicul activat",
        description: plate
          ? `Masina ${plate} a fost activata pentru utilizator.`
          : "Vehiculul a fost activat pentru utilizator.",
        details: [
          ...commonVehicleDetails,
          {
            label: "Principal",
            value: formatBooleanLabel(details.became_primary),
          },
        ],
      };
    case "ADMIN_DEACTIVATE_VEHICLE":
    case "DELETE_VEHICLE":
      return {
        ...base,
        icon: "OFF",
        title: "Vehicul dezactivat",
        description: plate
          ? `Masina ${plate} a fost dezactivata.`
          : "Vehiculul a fost dezactivat.",
        details: [
          ...commonVehicleDetails,
          {
            label: "Era principal",
            value: formatBooleanLabel(details.was_primary),
          },
          details.promoted_vehicle_id
            ? {
                label: "Promovat",
                value: `Vehicul #${details.promoted_vehicle_id}`,
              }
            : null,
        ].filter(Boolean) as Array<{ label: string; value: string }>,
      };
    case "ADMIN_SET_PRIMARY_VEHICLE":
    case "SET_PRIMARY_VEHICLE":
      return {
        ...base,
        icon: "PR",
        title: "Vehicul principal schimbat",
        description: plate
          ? `${plate} este acum vehiculul principal.`
          : "Vehiculul a fost setat ca principal.",
        details: commonVehicleDetails,
      };
    case "ADD_VEHICLE":
      return {
        ...base,
        icon: "VH",
        title: details.reused_existing
          ? "Vehicul reactivat"
          : "Vehicul adaugat",
        description: plate
          ? `Masina ${plate} a fost adaugata in profil.`
          : "Un vehicul a fost adaugat in profil.",
        details: [
          ...commonVehicleDetails,
          {
            label: "Reutilizat",
            value: formatBooleanLabel(details.reused_existing),
          },
        ],
      };
    case "ADMIN_UPDATE_USER_ROLES":
      return {
        ...base,
        icon: "RL",
        title: "Roluri actualizate",
        description: "Rolurile utilizatorului au fost modificate de admin.",
        details: [
          details.previous_roles
            ? { label: "Inainte", value: String(details.previous_roles) }
            : null,
          details.current_roles
            ? { label: "Acum", value: String(details.current_roles) }
            : null,
        ].filter(Boolean) as Array<{ label: string; value: string }>,
      };
    case "UPDATE_PROFILE":
    case "SYNC_KEYCLOAK_PROFILE":
    case "LINK_KEYCLOAK_USER_BY_EMAIL":
      return {
        ...base,
        icon: "US",
        title: "Profil actualizat",
        description: "Datele profilului au fost sincronizate sau actualizate.",
        details: [
          details.email
            ? { label: "Email", value: String(details.email) }
            : null,
          details.preferred_username
            ? { label: "Username", value: String(details.preferred_username) }
            : null,
          details.profile_updated != null
            ? {
                label: "Profil schimbat",
                value: formatBooleanLabel(details.profile_updated),
              }
            : null,
        ].filter(Boolean) as Array<{ label: string; value: string }>,
      };
    case "AUTO_PROVISION_KEYCLOAK_USER":
      return {
        ...base,
        icon: "KC",
        title: "Cont creat automat",
        description: "Utilizatorul a fost creat automat din Keycloak.",
        details: [
          details.username
            ? { label: "Username", value: String(details.username) }
            : null,
          details.email
            ? { label: "Email", value: String(details.email) }
            : null,
        ].filter(Boolean) as Array<{ label: string; value: string }>,
      };
    default: {
      const visibleDetails = Object.entries(details)
        .filter(
          ([, value]) =>
            value == null ||
            ["string", "number", "boolean"].includes(typeof value),
        )
        .slice(0, 4)
        .map(([key, value]) => ({
          label: humanizeAuditAction(key),
          value: value == null ? "-" : formatBooleanLabel(value),
        }));

      return {
        ...base,
        details: visibleDetails,
      };
    }
  }
}

function canCancelReservation(status?: string) {
  return ["pending", "active"].includes(status ?? "");
}

function canCancelSubscription(status?: string) {
  return ["pending"].includes(status ?? "");
}

function getStatusTone(
  value: string,
  kind:
    | "generic"
    | "reservation"
    | "subscription"
    | "payment"
    | "role"
    | "type"
    | "validation",
) {
  const normalized = value.toLowerCase();

  if (kind === "role") {
    return normalized === "admin" ? "info" : "neutral";
  }

  if (kind === "payment") {
    if (["succeeded", "paid"].includes(normalized)) return "success";
    if (["pending", "fara plata"].includes(normalized)) return "warning";
    if (["failed", "refunded"].includes(normalized)) return "danger";
  }

  if (kind === "validation") {
    return normalized === "valid" ? "success" : "danger";
  }

  if (
    [
      "active",
      "activ",
      "online",
      "available",
      "free",
      "valid",
      "liber",
    ].includes(normalized)
  ) {
    return "success";
  }

  if (
    [
      "pending",
      "loading",
      "expired",
      "expirat",
      "expirat - iesire permisa",
      "secundar",
      "rezervat",
    ].includes(
      normalized,
    )
  ) {
    return "warning";
  }

  if (
    ["cancelled", "inactiv", "invalid", "revoked", "failed", "ocupat"].includes(
      normalized,
    )
  ) {
    return "danger";
  }

  if (
    [
      "admin",
      "standard",
      "subscription",
      "reservation",
      "primar",
      "indisponibil",
    ].includes(normalized)
  ) {
    return "info";
  }

  return "neutral";
}

function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function extractPlateCandidate(rawText: string) {
  return extractPlateCandidates(rawText)[0] ?? "";
}

function normalizePlateInput(value: string) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function extractPlateCandidates(rawText: string) {
  const chunks = String(rawText ?? "")
    .toUpperCase()
    .split(/[\n\r|]+/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const candidateCounts = new Map<string, number>();

  for (const chunk of chunks) {
    const compact = chunk.replace(/[^A-Z0-9]/g, "");
    const normalized = compact
      .replace(/RO(?=[A-Z]{1,2}[0-9OISZ]{2,3}[A-Z0-9]{3})/g, "")
      .replace(/[^A-Z0-9]/g, "");

    const candidates = [
      ...findPlateMatches(compact),
      ...findPlateMatches(normalized),
      ...findPlateMatches(compact.replace(/^RO/, "")),
    ].flatMap((match) => expandPlateOcrCandidate(match));

    for (const candidate of candidates) {
      candidateCounts.set(candidate, (candidateCounts.get(candidate) ?? 0) + 1);
    }
  }

  return Array.from(candidateCounts.entries())
    .sort(
      ([plateA, countA], [plateB, countB]) =>
        countB * 100 +
        scorePlateCandidate(plateB) -
        (countA * 100 + scorePlateCandidate(plateA)),
    )
    .map(([candidate]) => candidate);
}

function isValidRomanianPlateCandidate(value: string) {
  return /^[A-Z]{1,2}[0-9]{2,3}[A-Z]{3}$/.test(value);
}

function normalizePlateOcrCandidate(value: string) {
  const match = /^([A-Z]{1,2})([A-Z0-9]{2,3})([A-Z0-9]{0,3})$/.exec(value);
  if (!match) return [];

  const [, prefix, digits, suffix] = match;
  const normalizedDigits = digits
    .replace(/O/g, "0")
    .replace(/D/g, "0")
    .replace(/Q/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/S/g, "5")
    .replace(/Z/g, "2")
    .replace(/B/g, "8")
    .replace(/G/g, "6");
  const normalizedSuffix = suffix
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/5/g, "S")
    .replace(/2/g, "Z")
    .replace(/8/g, "B")
    .replace(/6/g, "G");

  return Array.from(
    new Set([
      `${prefix}${normalizedDigits}${suffix}`,
      `${prefix}${normalizedDigits}${normalizedSuffix}`,
    ]),
  );
}

function findPlateMatches(value: string) {
  return [
    ...value.matchAll(/[A-Z]{1,2}[0-9OISZ]{2,3}[A-Z0-9]{3}/g),
    ...value.matchAll(/[A-Z]{1,2}[0-9OISZ]{2,3}/g),
  ].map((match) => match[0]);
}

function scorePlateCandidate(value: string) {
  let score = value.length;
  if (/^[A-Z]{1,2}[0-9]{2,3}[A-Z]{3}$/.test(value)) score += 10;
  if (value.length >= 6 && value.length <= 8) score += 5;
  if (hasLikelyInsertedDigitBeforeSuffix(value)) score -= 4;
  return score;
}

function shouldPreferExpectedPlate(params: {
  detectedPlate: string;
  expectedPlate: string;
  visualScore: number;
  threshold: number;
}) {
  const detectedPlate = normalizePlateInput(params.detectedPlate);
  const expectedPlate = normalizePlateInput(params.expectedPlate);

  if (!expectedPlate) return false;
  if (!detectedPlate) return params.visualScore >= params.threshold;
  if (detectedPlate === expectedPlate) return true;

  const compatible = arePlatesOcrCompatible(detectedPlate, expectedPlate);
  const strongVisualMatch = params.visualScore >= params.threshold + 0.08;
  return params.visualScore >= params.threshold && (compatible || strongVisualMatch);
}

function arePlatesOcrCompatible(detectedPlate: string, expectedPlate: string) {
  const detected = normalizePlateInput(detectedPlate);
  const expected = normalizePlateInput(expectedPlate);

  if (!detected || !expected) return false;
  if (detected === expected) return true;
  if (Math.abs(detected.length - expected.length) > 1) return false;

  const distance = getWeightedPlateDistance(detected, expected);
  const limit = expected.length <= 6 ? 1.7 : 2.1;
  return distance <= limit;
}

function getWeightedPlateDistance(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = getOcrSubstitutionCost(a[i - 1], b[j - 1]);
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + substitutionCost,
      );
    }
  }

  return dp[a.length][b.length];
}

function getOcrSubstitutionCost(a: string, b: string) {
  if (a === b) return 0;

  const groups = ["B8S5", "Z27", "O0QD", "I1L", "G6C", "A4"];
  if (groups.some((group) => group.includes(a) && group.includes(b))) {
    return 0.45;
  }

  return 1;
}

function expandPlateOcrCandidate(value: string) {
  const normalizedCandidates = [value, ...normalizePlateOcrCandidate(value)];
  return Array.from(
    new Set([
      ...normalizedCandidates,
      ...normalizedCandidates.flatMap((candidate) =>
        getLikelyInsertedDigitAlternates(candidate),
      ),
    ]),
  ).filter(isValidRomanianPlateCandidate);
}

function hasLikelyInsertedDigitBeforeSuffix(value: string) {
  const match = /^([A-Z]{1,2})([0-9]{3})([A-Z]{3})$/.exec(
    normalizePlateInput(value),
  );
  if (!match) return false;

  const [, , digits, suffix] = match;
  return isLikelyOcrDigitForLetter(digits[2], suffix[0]);
}

function getLikelyInsertedDigitAlternates(value: string) {
  const match = /^([A-Z]{1,2})([0-9]{3})([A-Z]{3})$/.exec(
    normalizePlateInput(value),
  );
  if (!match) return [];

  const [, prefix, digits, suffix] = match;
  if (!isLikelyOcrDigitForLetter(digits[2], suffix[0])) {
    return [];
  }

  return [`${prefix}${digits.slice(0, 2)}${suffix}`];
}

function isLikelyOcrDigitForLetter(digit: string, letter: string) {
  const pairs: Record<string, string[]> = {
    Z: ["2", "7"],
    B: ["8"],
    S: ["5"],
    O: ["0"],
    D: ["0"],
    I: ["1"],
    L: ["1"],
    G: ["6"],
    C: ["6"],
    A: ["4"],
  };

  return pairs[letter]?.includes(digit) ?? false;
}

function detectPlateByTemplate(canvases: HTMLCanvasElement[]) {
  const guesses = canvases
    .map((canvas) => detectTemplateText(canvas))
    .filter((guess) => guess.text.length >= 5)
    .sort((a, b) => b.score - a.score);

  for (const guess of guesses) {
    const plate = extractPlateCandidate(guess.text);
    if (plate) return plate;
  }

  return "";
}

function detectTemplateText(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { text: "", score: 0 };

  const { width, height } = canvas;
  const image = context.getImageData(0, 0, width, height);
  const mask = buildDarkMask(image.data, width, height);
  const segmentSets = [
    findConnectedCharacterSegments(mask, width, height),
    findCharacterSegments(mask, width, height),
  ].filter((segments) => segments.length >= 5 && segments.length <= 8);

  if (!segmentSets.length) {
    return { text: "", score: 0 };
  }

  const guesses = segmentSets.map((segments) => {
    const chars = segments.map((segment, index) => {
      const type = getPlateCharacterType(index, segments.length);
      return recognizeSegmentWithTemplates(mask, width, segment, type);
    });

    return {
      text: chars.map((char) => char.value).join(""),
      score:
        chars.reduce((total, char) => total + char.score, 0) /
        Math.max(1, chars.length),
    };
  });

  return guesses.sort((a, b) => b.score - a.score)[0] ?? { text: "", score: 0 };
}

function buildDarkMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const grayValues: number[] = [];
  for (let index = 0; index < data.length; index += 4) {
    grayValues.push(
      data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114,
    );
  }

  const threshold = Math.min(180, getOtsuThreshold(grayValues) + 25);
  const rawMask = new Uint8Array(width * height);

  for (let index = 0; index < grayValues.length; index += 1) {
    rawMask[index] = grayValues[index] < threshold ? 1 : 0;
  }

  const rowCounts = new Array(height).fill(0);
  const colCounts = new Array(width).fill(0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!rawMask[y * width + x]) continue;
      rowCounts[y] += 1;
      colCounts[x] += 1;
    }
  }

  const mask = new Uint8Array(rawMask);
  const horizontalLineLimit = Math.round(width * 0.28);
  const verticalLineLimit = Math.round(height * 0.52);

  for (let y = 0; y < height; y += 1) {
    if (rowCounts[y] <= horizontalLineLimit) continue;
    for (let x = 0; x < width; x += 1) {
      mask[y * width + x] = 0;
    }
  }

  for (let x = 0; x < width; x += 1) {
    if (colCounts[x] <= verticalLineLimit) continue;
    for (let y = 0; y < height; y += 1) {
      mask[y * width + x] = 0;
    }
  }

  return mask;
}

function findCharacterSegments(mask: Uint8Array, width: number, height: number) {
  const colCounts = new Array(width).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x]) colCounts[x] += 1;
    }
  }

  const minInk = Math.max(2, Math.round(height * 0.035));
  const runs: Array<{ x1: number; x2: number }> = [];
  let runStart = -1;

  for (let x = 0; x < width; x += 1) {
    const hasInk = colCounts[x] >= minInk;
    if (hasInk && runStart < 0) {
      runStart = x;
    } else if (!hasInk && runStart >= 0) {
      runs.push({ x1: runStart, x2: x - 1 });
      runStart = -1;
    }
  }

  if (runStart >= 0) {
    runs.push({ x1: runStart, x2: width - 1 });
  }

  const minWidth = Math.max(5, Math.round(width * 0.008));
  const merged = mergeCloseRuns(
    runs.filter((run) => run.x2 - run.x1 + 1 >= minWidth),
    Math.max(6, Math.round(width * 0.012)),
  );

  return merged
    .map((run) => boundsForRun(mask, width, height, run.x1, run.x2))
    .filter(
      (segment) =>
        segment.width >= minWidth &&
        segment.height >= Math.round(height * 0.12) &&
        segment.ink >= Math.round(segment.width * segment.height * 0.08),
    )
    .slice(0, 8);
}

function findConnectedCharacterSegments(
  mask: Uint8Array,
  width: number,
  height: number,
) {
  const visited = new Uint8Array(width * height);
  const components: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    ink: number;
  }> = [];
  const queue: number[] = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    visited[start] = 1;
    queue.length = 0;
    queue.push(start);

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let ink = 0;

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      const x = index % width;
      const y = Math.floor(index / width);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      ink += 1;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const nextIndex = ny * width + nx;
          if (!mask[nextIndex] || visited[nextIndex]) continue;

          visited[nextIndex] = 1;
          queue.push(nextIndex);
        }
      }
    }

    const component = {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      ink,
    };

    const area = component.width * component.height;
    const density = area ? component.ink / area : 0;
    const looksLikeCharacter =
      component.height >= Math.round(height * 0.13) &&
      component.height <= Math.round(height * 0.82) &&
      component.width >= Math.round(width * 0.012) &&
      component.width <= Math.round(width * 0.22) &&
      density >= 0.1 &&
      density <= 0.9;

    if (looksLikeCharacter) {
      components.push(component);
    }
  }

  return components
    .sort((a, b) => a.x - b.x)
    .filter((component, _index, list) => {
      const medianHeight = list
        .map((item) => item.height)
        .sort((a, b) => a - b)[Math.floor(list.length / 2)];
      return component.height >= medianHeight * 0.55;
    })
    .slice(0, 8);
}

function mergeCloseRuns(
  runs: Array<{ x1: number; x2: number }>,
  maxGap: number,
) {
  const merged: Array<{ x1: number; x2: number }> = [];

  for (const run of runs) {
    const previous = merged.at(-1);
    if (!previous || run.x1 - previous.x2 > maxGap) {
      merged.push({ ...run });
    } else {
      previous.x2 = run.x2;
    }
  }

  return merged;
}

function boundsForRun(
  mask: Uint8Array,
  width: number,
  height: number,
  x1: number,
  x2: number,
) {
  let minY = height;
  let maxY = 0;
  let ink = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      if (!mask[y * width + x]) continue;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      ink += 1;
    }
  }

  return {
    x: x1,
    y: Math.max(0, minY),
    width: x2 - x1 + 1,
    height: Math.max(0, maxY - minY + 1),
    ink,
  };
}

function getPlateCharacterType(index: number, total: number) {
  const suffixStart = total - 3;
  if (index >= suffixStart) return "letter" as const;
  if (index === 0 || (total === 8 && index === 1)) return "letter" as const;
  return "digit" as const;
}

function recognizeSegmentWithTemplates(
  mask: Uint8Array,
  width: number,
  segment: { x: number; y: number; width: number; height: number },
  type: "letter" | "digit",
) {
  const sample = sampleSegmentMask(mask, width, segment, 28, 36);
  const alphabet =
    type === "digit" ? "0123456789" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let best = { value: "", score: -Infinity };

  for (const value of alphabet) {
    for (const template of getCharacterTemplates(value, 28, 36)) {
      const score = compareBinaryMasks(sample, template);
      if (score > best.score) {
        best = { value, score };
      }
    }
  }

  return best;
}

function sampleSegmentMask(
  mask: Uint8Array,
  sourceWidth: number,
  segment: { x: number; y: number; width: number; height: number },
  targetWidth: number,
  targetHeight: number,
) {
  const output = new Uint8Array(targetWidth * targetHeight);
  const padX = Math.round(segment.width * 0.12);
  const padY = Math.round(segment.height * 0.12);
  const x = Math.max(0, segment.x - padX);
  const y = Math.max(0, segment.y - padY);
  const width = segment.width + padX * 2;
  const height = segment.height + padY * 2;

  for (let ty = 0; ty < targetHeight; ty += 1) {
    for (let tx = 0; tx < targetWidth; tx += 1) {
      const sx = x + Math.floor((tx / targetWidth) * width);
      const sy = y + Math.floor((ty / targetHeight) * height);
      output[ty * targetWidth + tx] = mask[sy * sourceWidth + sx] ? 1 : 0;
    }
  }

  return output;
}

const characterTemplateCache = new Map<string, Uint8Array[]>();

function getCharacterTemplates(value: string, width: number, height: number) {
  const key = `${value}:${width}:${height}`;
  const cached = characterTemplateCache.get(key);
  if (cached) return cached;

  const fonts = [
    "900 34px Arial",
    "900 34px Helvetica",
    "900 34px Impact",
    "800 34px sans-serif",
  ];

  const templates = fonts.map((font) =>
    renderCharacterTemplate(value, width, height, font),
  );
  characterTemplateCache.set(key, templates);
  return templates;
}

function renderCharacterTemplate(
  value: string,
  width: number,
  height: number,
  font: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const output = new Uint8Array(width * height);
  if (!context) return output;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#000000";
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(value, width / 2, height / 2 + 1);

  const image = context.getImageData(0, 0, width, height);
  for (let index = 0, pixel = 0; index < image.data.length; index += 4, pixel += 1) {
    const gray =
      image.data[index] * 0.299 +
      image.data[index + 1] * 0.587 +
      image.data[index + 2] * 0.114;
    output[pixel] = gray < 180 ? 1 : 0;
  }

  return output;
}

function compareBinaryMasks(a: Uint8Array, b: Uint8Array) {
  let intersection = 0;
  let union = 0;

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] && b[index]) intersection += 1;
    if (a[index] || b[index]) union += 1;
  }

  return union ? intersection / union : 0;
}

function getExpectedPlateFromQrResult(result: any) {
  const resource = result?.reservation ?? result?.subscription ?? null;
  return String(resource?.vehiclePlate ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function scoreImageAgainstExpectedPlate(
  image: HTMLImageElement,
  expectedPlate: string,
) {
  const uploadCanvas = buildUploadWholeTextCanvasFromImage(image, 420, 120);
  const uploadMask = extractMainTextMask(uploadCanvas, 84, 32);
  const templates = [
    renderPlateTextMask(expectedPlate, 84, 32, "900 30px Arial"),
    renderPlateTextMask(expectedPlate, 84, 32, "900 30px Helvetica"),
    renderPlateTextMask(expectedPlate, 84, 32, "900 30px sans-serif"),
  ];

  return Math.max(
    ...templates.map((template) => compareBinaryMasks(uploadMask, template)),
  );
}

function scoreCanvasAgainstExpectedPlate(
  canvas: HTMLCanvasElement,
  expectedPlate: string,
) {
  const preparedCanvas = buildUploadWholeTextCanvasFromCanvas(canvas, 420, 120);
  const uploadMask = extractMainTextMask(preparedCanvas, 84, 32);
  const templates = [
    renderPlateTextMask(expectedPlate, 84, 32, "900 30px Arial"),
    renderPlateTextMask(expectedPlate, 84, 32, "900 30px Helvetica"),
    renderPlateTextMask(expectedPlate, 84, 32, "900 30px sans-serif"),
  ];

  return Math.max(
    ...templates.map((template) => compareBinaryMasks(uploadMask, template)),
  );
}

function buildUploadWholeTextCanvasFromImage(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Nu s-a putut compara imaginea incarcata.");
  }

  context.imageSmoothingEnabled = true;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const ratio = Math.min(
    canvas.width / Math.max(1, image.naturalWidth),
    canvas.height / Math.max(1, image.naturalHeight),
  );
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  context.drawImage(
    image,
    (canvas.width - drawWidth) / 2,
    (canvas.height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );

  return canvas;
}

function buildUploadWholeTextCanvasFromCanvas(
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Nu s-a putut compara cadrul din camera.");
  }

  context.imageSmoothingEnabled = true;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const ratio = Math.min(
    canvas.width / Math.max(1, source.width),
    canvas.height / Math.max(1, source.height),
  );
  const drawWidth = source.width * ratio;
  const drawHeight = source.height * ratio;
  context.drawImage(
    source,
    (canvas.width - drawWidth) / 2,
    (canvas.height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );

  return canvas;
}

function extractMainTextMask(
  canvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return new Uint8Array(targetWidth * targetHeight);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const mask = buildDarkMask(image.data, canvas.width, canvas.height);
  const bounds = getMaskBounds(mask, canvas.width, canvas.height);
  return sampleMaskBounds(mask, canvas.width, bounds, targetWidth, targetHeight);
}

function getMaskBounds(mask: Uint8Array, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (minX >= maxX || minY >= maxY) {
    return { x: 0, y: 0, width, height };
  }

  const padX = Math.round((maxX - minX) * 0.08);
  const padY = Math.round((maxY - minY) * 0.14);

  return {
    x: Math.max(0, minX - padX),
    y: Math.max(0, minY - padY),
    width: Math.min(width - Math.max(0, minX - padX), maxX - minX + padX * 2),
    height: Math.min(
      height - Math.max(0, minY - padY),
      maxY - minY + padY * 2,
    ),
  };
}

function sampleMaskBounds(
  mask: Uint8Array,
  sourceWidth: number,
  bounds: { x: number; y: number; width: number; height: number },
  targetWidth: number,
  targetHeight: number,
) {
  const output = new Uint8Array(targetWidth * targetHeight);

  for (let ty = 0; ty < targetHeight; ty += 1) {
    for (let tx = 0; tx < targetWidth; tx += 1) {
      const sx = bounds.x + Math.floor((tx / targetWidth) * bounds.width);
      const sy = bounds.y + Math.floor((ty / targetHeight) * bounds.height);
      output[ty * targetWidth + tx] = mask[sy * sourceWidth + sx] ? 1 : 0;
    }
  }

  return output;
}

function renderPlateTextMask(
  plate: string,
  width: number,
  height: number,
  font: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const output = new Uint8Array(width * height);
  if (!context) return output;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#000000";
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(plate, width / 2, height / 2 + 1);

  const image = context.getImageData(0, 0, width, height);
  for (let index = 0, pixel = 0; index < image.data.length; index += 4, pixel += 1) {
    const gray =
      image.data[index] * 0.299 +
      image.data[index + 1] * 0.587 +
      image.data[index + 2] * 0.114;
    output[pixel] = gray < 180 ? 1 : 0;
  }

  return output;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Imaginea nu a putut fi incarcata."));
    };
    image.src = objectUrl;
  });
}

function buildPlateOcrCanvasesFromImage(image: HTMLImageElement) {
  const sourceCanvas = document.createElement("canvas");
  const maxWidth = 2400;
  const ratio = Math.min(1, maxWidth / Math.max(1, image.naturalWidth));
  sourceCanvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  sourceCanvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));

  const context = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Nu s-a putut procesa imaginea incarcata.");
  }

  context.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);

  const wholeCanvas = buildUploadWholeTextCanvas(sourceCanvas);
  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;
  const crops = [
    { x: 0, y: 0, width: 1, height: 1 },
    { x: 0.04, y: 0.18, width: 0.92, height: 0.62 },
    { x: 0.10, y: 0.25, width: 0.82, height: 0.45 },
    { x: 0.16, y: 0.30, width: 0.74, height: 0.34 },
    { x: 0.20, y: 0.34, width: 0.68, height: 0.28 },
  ];

  const croppedCanvases = crops.flatMap((crop) => {
    const baseCanvas = buildImageCropCanvas(sourceCanvas, {
      x: Math.round(sourceWidth * crop.x),
      y: Math.round(sourceHeight * crop.y),
      width: Math.round(sourceWidth * crop.width),
      height: Math.round(sourceHeight * crop.height),
    });

    return [
      buildTextFocusedCanvas(baseCanvas, false),
      buildTextFocusedCanvas(baseCanvas, true),
      buildContrastedCanvas(baseCanvas, "gray"),
      buildContrastedCanvas(baseCanvas, "auto"),
      buildContrastedCanvas(baseCanvas, "otsu"),
      buildContrastedCanvas(baseCanvas, "invert"),
    ].filter(Boolean) as HTMLCanvasElement[];
  });

  return [
    wholeCanvas,
    buildContrastedCanvas(wholeCanvas, "auto"),
    buildContrastedCanvas(wholeCanvas, "otsu"),
    buildContrastedCanvas(wholeCanvas, "invert"),
    ...croppedCanvases,
  ];
}

function buildPlateOcrCanvasesFromCanvas(sourceCanvas: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Nu s-a putut procesa cadrul din camera.");
  }

  context.drawImage(sourceCanvas, 0, 0);

  const wholeCanvas = buildUploadWholeTextCanvas(canvas);

  return [
    wholeCanvas,
    buildTextFocusedCanvas(canvas, false),
    buildTextFocusedCanvas(canvas, true),
    buildContrastedCanvas(wholeCanvas, "auto"),
    buildContrastedCanvas(wholeCanvas, "otsu"),
    buildContrastedCanvas(wholeCanvas, "invert"),
    buildContrastedCanvas(canvas, "gray"),
    buildContrastedCanvas(canvas, "auto"),
    buildContrastedCanvas(canvas, "otsu"),
  ].filter(Boolean) as HTMLCanvasElement[];
}

function buildUploadWholeTextCanvas(source: HTMLCanvasElement) {
  const scale = Math.max(3, Math.ceil(1200 / Math.max(1, source.width)));
  const padding = 80;
  const canvas = document.createElement("canvas");
  canvas.width = source.width * scale + padding * 2;
  canvas.height = source.height * scale + padding * 2;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Nu s-a putut pregati imaginea incarcata.");
  }

  context.imageSmoothingEnabled = false;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    source,
    0,
    0,
    source.width,
    source.height,
    padding,
    padding,
    source.width * scale,
    source.height * scale,
  );

  return canvas;
}

function buildImageCropCanvas(
  source: HTMLCanvasElement,
  crop: { x: number; y: number; width: number; height: number },
) {
  const scale = 3;
  const padding = 64;
  const canvas = document.createElement("canvas");
  canvas.width = crop.width * scale + padding * 2;
  canvas.height = crop.height * scale + padding * 2;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Nu s-a putut decupa imaginea incarcata.");
  }

  context.imageSmoothingEnabled = false;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    padding,
    padding,
    crop.width * scale,
    crop.height * scale,
  );

  return canvas;
}

async function captureBestPlateFrame(
  video: HTMLVideoElement,
  guideElement: HTMLElement | null,
) {
  const capturedFrames: HTMLCanvasElement[] = [];

  for (let index = 0; index < 9; index += 1) {
    capturedFrames.push(buildPrimaryPlateFrame(video, guideElement));

    await wait(130);
  }

  if (!capturedFrames.length) {
    throw new Error("Nu s-a putut captura imaginea din camera.");
  }

  return capturedFrames
    .map((canvas) => ({
      canvas,
      score: calculateSharpnessScore(canvas),
    }))
    .sort((a, b) => b.score - a.score)[0].canvas;
}

function buildPrimaryPlateFrame(
  video: HTMLVideoElement,
  guideElement: HTMLElement | null,
) {
  const crop = getGuideVideoCrop(video, guideElement) ?? {
    x: 0,
    y: 0.16,
    width: 1,
    height: 0.5,
  };

  return buildPlateCropCanvas(video, {
    x: Math.round(video.videoWidth * crop.x),
    y: Math.round(video.videoHeight * crop.y),
    width: Math.round(video.videoWidth * crop.width),
    height: Math.round(video.videoHeight * crop.height),
  });
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function calculateSharpnessScore(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return 0;
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let score = 0;

  const step = Math.max(2, Math.ceil(Math.max(canvas.width, canvas.height) / 260));

  for (let y = 1; y < canvas.height - 1; y += step) {
    for (let x = 1; x < canvas.width - 1; x += step) {
      const index = (y * canvas.width + x) * 4;
      const rightIndex = (y * canvas.width + (x + 1)) * 4;
      const bottomIndex = ((y + 1) * canvas.width + x) * 4;
      const gray =
        data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      const rightGray =
        data[rightIndex] * 0.299 +
        data[rightIndex + 1] * 0.587 +
        data[rightIndex + 2] * 0.114;
      const bottomGray =
        data[bottomIndex] * 0.299 +
        data[bottomIndex + 1] * 0.587 +
        data[bottomIndex + 2] * 0.114;

      score += Math.abs(gray - rightGray) + Math.abs(gray - bottomGray);
    }
  }

  return score;
}

function getGuideVideoCrop(
  video: HTMLVideoElement,
  guideElement: HTMLElement | null,
) {
  if (!guideElement || !video.videoWidth || !video.videoHeight) return null;

  const videoRect = video.getBoundingClientRect();
  const guideRect = guideElement.getBoundingClientRect();
  const sourceRatio = video.videoWidth / video.videoHeight;
  const elementRatio = videoRect.width / videoRect.height;

  let renderedWidth = videoRect.width;
  let renderedHeight = videoRect.height;
  let renderedLeft = videoRect.left;
  let renderedTop = videoRect.top;

  if (elementRatio > sourceRatio) {
    renderedWidth = videoRect.height * sourceRatio;
    renderedLeft = videoRect.left + (videoRect.width - renderedWidth) / 2;
  } else {
    renderedHeight = videoRect.width / sourceRatio;
    renderedTop = videoRect.top + (videoRect.height - renderedHeight) / 2;
  }

  const marginX = guideRect.width * 0.08;
  const marginY = guideRect.height * 0.26;
  const left = Math.max(renderedLeft, guideRect.left - marginX);
  const top = Math.max(renderedTop, guideRect.top - marginY);
  const right = Math.min(renderedLeft + renderedWidth, guideRect.right + marginX);
  const bottom = Math.min(
    renderedTop + renderedHeight,
    guideRect.bottom + marginY,
  );

  if (right <= left || bottom <= top) return null;

  return {
    x: clamp01((left - renderedLeft) / renderedWidth),
    y: clamp01((top - renderedTop) / renderedHeight),
    width: clamp01((right - left) / renderedWidth),
    height: clamp01((bottom - top) / renderedHeight),
  };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function buildPlateCropCanvas(
  video: HTMLVideoElement,
  crop: { x: number; y: number; width: number; height: number },
) {
  const targetWidth = 900;
  const targetHeight = 220;
  const padding = 24;
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth + padding * 2;
  canvas.height = targetHeight + padding * 2;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Nu s-a putut procesa cadrul video.");
  }

  context.imageSmoothingEnabled = true;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    video,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    padding,
    padding,
    targetWidth,
    targetHeight,
  );

  return canvas;
}

function buildTextFocusedCanvas(source: HTMLCanvasElement, skipLeftBand: boolean) {
  const canvas = cloneCanvas(source);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return canvas;

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const grayValues: number[] = [];

  for (let index = 0; index < data.length; index += 4) {
    grayValues.push(
      data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114,
    );
  }

  const threshold = Math.min(175, getOtsuThreshold(grayValues) + 20);
  const width = canvas.width;
  const height = canvas.height;
  const dark = new Uint8Array(width * height);

  for (let pixel = 0; pixel < grayValues.length; pixel += 1) {
    dark[pixel] = grayValues[pixel] < threshold ? 1 : 0;
  }

  const startX = skipLeftBand ? Math.round(width * 0.18) : 0;
  const rowCounts = new Array(height).fill(0);
  const colCounts = new Array(width).fill(0);

  for (let y = 0; y < height; y += 1) {
    for (let x = startX; x < width; x += 1) {
      const index = y * width + x;
      if (!dark[index]) continue;
      rowCounts[y] += 1;
      colCounts[x] += 1;
    }
  }

  const maxRowRun = Math.round(width * 0.42);
  const maxColRun = Math.round(height * 0.46);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    if (rowCounts[y] > maxRowRun) continue;

    for (let x = startX; x < width; x += 1) {
      if (colCounts[x] > maxColRun) continue;
      if (!dark[y * width + x]) continue;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (minX >= maxX || minY >= maxY) {
    return buildContrastedCanvas(source, "auto");
  }

  const marginX = Math.round((maxX - minX) * 0.18);
  const marginY = Math.round((maxY - minY) * 0.55);
  const cropX = Math.max(startX, minX - marginX);
  const cropY = Math.max(0, minY - marginY);
  const cropWidth = Math.min(width - cropX, maxX - minX + marginX * 2);
  const cropHeight = Math.min(height - cropY, maxY - minY + marginY * 2);
  const outputScale = 2;
  const padding = 72;
  const output = document.createElement("canvas");
  output.width = cropWidth * outputScale + padding * 2;
  output.height = cropHeight * outputScale + padding * 2;

  const outputContext = output.getContext("2d", { willReadFrequently: true });
  if (!outputContext) return canvas;

  outputContext.imageSmoothingEnabled = false;
  outputContext.fillStyle = "#ffffff";
  outputContext.fillRect(0, 0, output.width, output.height);
  outputContext.drawImage(
    canvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    padding,
    padding,
    cropWidth * outputScale,
    cropHeight * outputScale,
  );

  return buildContrastedCanvas(output, "auto");
}

function cloneCanvas(source: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.drawImage(source, 0, 0);
  return canvas;
}

function buildContrastedCanvas(
  source: HTMLCanvasElement,
  mode: "gray" | "auto" | "otsu" | "invert",
) {
  const canvas = cloneCanvas(source);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return canvas;

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const grayValues: number[] = [];
  let min = 255;
  let max = 0;

  for (let index = 0; index < data.length; index += 4) {
    const gray =
      data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    grayValues.push(gray);
    min = Math.min(min, gray);
    max = Math.max(max, gray);
  }

  const threshold =
    mode === "otsu" || mode === "invert" ? getOtsuThreshold(grayValues) : 0;
  const range = Math.max(1, max - min);

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    const gray = grayValues[pixel];
    let output = gray;

    if (mode === "gray") {
      output = ((gray - min) / range) * 255;
    } else if (mode === "auto") {
      output = ((gray - min) / range) * 255;
      output = output < 150 ? 0 : 255;
    } else {
      output = gray < threshold ? 0 : 255;
      if (mode === "invert") {
        output = 255 - output;
      }
    }

    data[index] = output;
    data[index + 1] = output;
    data[index + 2] = output;
  }

  context.putImageData(image, 0, 0);
  return canvas;
}

function getOtsuThreshold(values: number[]) {
  const histogram = new Array(256).fill(0);
  values.forEach((value) => {
    histogram[Math.max(0, Math.min(255, Math.round(value)))] += 1;
  });

  const total = values.length;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) {
    sum += i * histogram[i];
  }

  let sumBackground = 0;
  let weightBackground = 0;
  let bestVariance = 0;
  let threshold = 160;

  for (let i = 0; i < 256; i += 1) {
    weightBackground += histogram[i];
    if (weightBackground === 0) continue;

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += i * histogram[i];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance =
      weightBackground *
      weightForeground *
      (meanBackground - meanForeground) ** 2;

    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = i;
    }
  }

  return threshold;
}
