// public/sw.js
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "KroniX";
  const options = {
    body: data.body || "Tienes una nueva actualización.",
    icon: "/icons/kronix-icon.png",
    badge: "/icons/kronix-icon.png",
    tag: data.tag || "kronix-buyer",
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || "/",
      sound: data.sound || "buyer-default",
      tag: data.tag || "kronix-buyer",
      title,
      body: data.body || "Tienes una nueva actualización.",
    },
  };

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const focused = clientsArr.some((client) => client.focused);

      clientsArr.forEach((client) => {
        client.postMessage({
          type: "KRONIX_PUSH",
          payload: options.data,
        });
      });

      if (focused) return;

      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }

      return self.clients.openWindow(urlToOpen);
    })
  );
});