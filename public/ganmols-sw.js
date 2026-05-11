self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  const defaultIcon = "/ganmosicon-removebg-preview.png";

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "GANM OLS";
  const options = {
    body: payload.body || "",
    badge: payload.badge || defaultIcon,
    icon: payload.icon || undefined,
    image: payload.image || undefined,
    tag: payload.tag || undefined,
    data: {
      url: payload.url || payload.link || "/",
      notificationId: payload.notificationId || "",
      trackingSource: payload.trackingSource || "browser_push",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationId = String(
    event.notification?.data?.notificationId || ""
  ).trim();
  const trackingSource = String(
    event.notification?.data?.trackingSource || "browser_push"
  ).trim();
  const fallbackTarget = String(
    event.notification?.data?.url ||
      event.notification?.data?.link ||
      "/"
  ).trim();
  const trackedPath = notificationId
    ? `/notificacoes/${encodeURIComponent(notificationId)}/abrir?source=${encodeURIComponent(trackingSource)}`
    : fallbackTarget || "/";
  const targetUrl = new URL(trackedPath, self.location.origin).toString();

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    const sameOriginClients = clients.filter((client) => {
      try {
        return new URL(client.url).origin === self.location.origin;
      } catch {
        return false;
      }
    });

    const exactClient = sameOriginClients.find((client) => {
      try {
        return new URL(client.url).toString() === targetUrl;
      } catch {
        return false;
      }
    });

    if (exactClient && "focus" in exactClient) {
      return exactClient.focus();
    }

    const reusableClient = sameOriginClients[0];
    if (reusableClient && "navigate" in reusableClient) {
      const navigatedClient = await reusableClient.navigate(targetUrl).catch(() => null);
      if (navigatedClient && "focus" in navigatedClient) {
        return navigatedClient.focus();
      }
      if ("focus" in reusableClient) {
        return reusableClient.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }

    return undefined;
  })());
});
