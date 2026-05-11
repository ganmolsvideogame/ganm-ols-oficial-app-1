import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ganmols.app",
  appName: "GANM OLS",
  webDir: "mobile-shell",
  server: {
    url: "https://www.ganmols.com",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: ["www.ganmols.com", "ganmols.com"],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_ganmols_notification",
      iconColor: "#111827",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
