// Custom PWA Service Worker logic to be merged with Workbox

self.addEventListener("push", (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    
    event.waitUntil(
      self.registration.showNotification(
        data.title ?? "Custom Mail",
        {
          body: data.body,
          icon: data.icon ?? "/icons/icon-192.png",
          badge: data.badge ?? "/icons/icon-96.png",
          tag: data.tag,
          data: { url: data.url ?? "/" },
          actions: [
            { action: "open", title: "Open" },
            { action: "dismiss", title: "Dismiss" }
          ],
          requireInteraction: false,
          silent: false
        }
      )
    )
  } catch (error) {
    console.error("Error displaying push notification:", error)
  }
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  
  if (event.action === "dismiss") return
  
  const url = event.notification.data?.url ?? "/"
  
  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus()
          // If navigate is supported, use it to redirect the user
          if ("navigate" in client) {
            client.navigate(url)
          }
          return
        }
      }
      // Open new window if not open
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})

// App update handling
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

// Background sync for offline drafts
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-drafts") {
    event.waitUntil(syncPendingDrafts())
  }
})

async function syncPendingDrafts() {
  // Attempt to sync any pending offline drafts
  // This just ensures the app wakes up and runs sync logic
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({ type: "SYNC_DRAFTS" })
  })
}
