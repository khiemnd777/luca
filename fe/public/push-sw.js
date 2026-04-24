self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function normalizePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return {
      title: "Bạn có thông báo mới",
      body: "Có cập nhật mới trong hệ thống.",
      deep_link: "/notification",
      data: {},
    };
  }

  return {
    title: payload.title || "Bạn có thông báo mới",
    body: payload.body || "Có cập nhật mới trong hệ thống.",
    deep_link: payload.deep_link || "/notification",
    data: payload.data || {},
    type: payload.type || "notification",
    notification_id: payload.notification_id || 0,
  };
}

self.addEventListener("push", (event) => {
  let parsed = null;

  try {
    parsed = event.data ? event.data.json() : null;
  } catch (_err) {
    parsed = null;
  }

  const payload = normalizePayload(parsed);

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/luca.jpeg",
      badge: "/luca.jpeg",
      tag: payload.type || "notification",
      data: {
        deep_link: payload.deep_link,
        payload: payload,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath =
    event.notification?.data?.deep_link || "/notification";
  const targetUrl = new URL(targetPath, self.location.origin).toString();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({
            type: "push-notification-click",
            deepLink: targetPath,
          });

          if (client.url.startsWith(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
