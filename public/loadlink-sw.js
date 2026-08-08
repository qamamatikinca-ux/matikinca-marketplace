self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: "New LoadLink message" }; }
  const title = data.title || "LoadLink";
  const options = {
    body: data.body || "New message",
    icon: "/images/loadlink-logo-light.png",
    badge: "/images/loadlink-logo-light.png",
    tag: data.tag || "loadlink-message",
    renotify: true,
    data: { url: data.url || "/messages" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/messages";
  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if ("focus" in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
