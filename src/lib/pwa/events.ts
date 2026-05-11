export const APP_ANALYTICS_EVENT_TYPES = {
  installClick: "app_install_cta_click",
  pwaInstalled: "pwa_installed",
  pwaOpen: "pwa_app_open",
  nativeAndroidOpen: "native_app_open",
} as const;

export type AppAnalyticsEventType =
  (typeof APP_ANALYTICS_EVENT_TYPES)[keyof typeof APP_ANALYTICS_EVENT_TYPES];
