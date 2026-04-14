import { useState, useCallback, useEffect } from "react";

export function useNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    try {
      const saved = localStorage.getItem("borsacep-notifications");
      setEnabled(saved === "true");
    } catch {}
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      setEnabled(true);
      try { localStorage.setItem("borsacep-notifications", "true"); } catch {}
      return true;
    }
    return false;
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (enabled) {
      setEnabled(false);
      try { localStorage.setItem("borsacep-notifications", "false"); } catch {}
    } else {
      await requestPermission();
    }
  }, [enabled, requestPermission]);

  const sendNotification = useCallback((title: string, body: string) => {
    if (!enabled || permission !== "granted") return;
    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });
    } catch {}
  }, [enabled, permission]);

  return { enabled, permission, toggleNotifications, sendNotification };
}
