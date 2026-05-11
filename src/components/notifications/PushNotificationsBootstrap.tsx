"use client";

import { useEffect } from "react";

import { ensureBrowserPushSubscription } from "@/lib/push/browser";
import {
  getNativeAppNotificationPermissionStatus,
  initializeNativeAppNotifications,
  isNativeAndroidApp,
  requestNativeAppNotificationPermission,
  revokeNativeAppPushRegistration,
  syncNativeAppPushRegistration,
} from "@/lib/push/native-app";
import { createClient } from "@/lib/supabase/client";

const PUSH_REPAIR_STORAGE_KEY = "ganmols_push_repair_v2";
const PUSH_REPAIR_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export default function PushNotificationsBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const supabase = createClient();
    let mounted = true;
    let registeredServiceWorker: ServiceWorkerRegistration | null = null;
    const nativeAndroid = isNativeAndroidApp();
    const browserPushAvailable = "serviceWorker" in navigator;

    const currentLocale = () =>
      window.location.pathname.startsWith("/en") ? "en" : "pt";

    const shouldRepairSubscription = () => {
      try {
        const rawValue = window.localStorage.getItem(PUSH_REPAIR_STORAGE_KEY);
        if (!rawValue) {
          return true;
        }

        const repairedAt = Number(rawValue);
        return (
          !Number.isFinite(repairedAt) ||
          Date.now() - repairedAt > PUSH_REPAIR_TTL_MS
        );
      } catch {
        return true;
      }
    };

    const markSubscriptionRepaired = () => {
      try {
        window.localStorage.setItem(
          PUSH_REPAIR_STORAGE_KEY,
          String(Date.now())
        );
      } catch {
        // ignore
      }
    };

    const syncPushSubscription = async (forceRefresh = false) => {
      if (
        !browserPushAvailable ||
        !mounted ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      const registration =
        registeredServiceWorker ?? (await navigator.serviceWorker.ready);

      const shouldForceRefresh = forceRefresh || shouldRepairSubscription();

      await ensureBrowserPushSubscription(currentLocale(), registration, {
        forceRefresh: shouldForceRefresh,
      })
        .then((result) => {
          if (result.ok && shouldForceRefresh) {
            markSubscriptionRepaired();
          }
        })
        .catch(() => {});
    };

    const syncNativePush = async () => {
      if (!nativeAndroid || !mounted) {
        return;
      }

      await initializeNativeAppNotifications().catch(() => false);
      await syncNativeAppPushRegistration().catch(() => null);
    };

    const maybeAutoRequestNativePermission = async () => {
      if (!nativeAndroid || !mounted || typeof window === "undefined") {
        return;
      }

      const status = await getNativeAppNotificationPermissionStatus().catch(
        () => null
      );

      if (!status || status.granted) {
        return;
      }

      if (
        status.pushPermission === "denied" ||
        status.localPermission === "denied"
      ) {
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1200));

      if (!mounted) {
        return;
      }

      await requestNativeAppNotificationPermission().catch(() => null);
    };

    if (browserPushAvailable) {
      navigator.serviceWorker
        .register("/ganmols-sw.js")
        .then(async (registration) => {
          registeredServiceWorker = registration;
          await syncPushSubscription();
          await maybeAutoRequestNativePermission();
          await syncNativePush();
        })
        .catch(async () => {
          await maybeAutoRequestNativePermission();
          await syncNativePush();
        });
    } else {
      void maybeAutoRequestNativePermission().then(() => syncNativePush());
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        void syncPushSubscription();
        if (!nativeAndroid) {
          return;
        }

        if (session?.user) {
          await maybeAutoRequestNativePermission();
          await syncNativePush();
          return;
        }

        await revokeNativeAppPushRegistration().catch(() => false);
      }
    );

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void syncPushSubscription();
        void maybeAutoRequestNativePermission();
        void syncNativePush();
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
