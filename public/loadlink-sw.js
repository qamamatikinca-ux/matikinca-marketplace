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
  const supplied = event.notification.data?.url;
  const target = typeof supplied === "string" && supplied.startsWith("/") &&
    !supplied.startsWith("//") && !/[\\\u0000-\u001f\u007f]/.test(supplied) &&
    !/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(supplied) ? supplied : "/notifications";
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
