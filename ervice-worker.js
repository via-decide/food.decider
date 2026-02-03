/* =========================================
   | food.decide | OFFLINE ENGINE
   ========================================= */

const CACHE_NAME = "food-decide-v10.4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

/* 1. INSTALL EVENT
   - Caches the core app files immediately */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Caching App Shell");
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting(); // Activate immediately
});

/* 2. ACTIVATE EVENT
   - Cleans up old versions of the app */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        if (k !== CACHE_NAME) {
          console.log("[SW] Removing old cache:", k);
          return caches.delete(k);
        }
      }))
    )
  );
  self.clients.claim();
});

/* 3. FETCH EVENT (The Smart Proxy) */
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // A. GOOGLE SCRIPT API (Network Only)
  // We explicitly bypass the service worker cache for the API.
  // This ensures 'fetchMenuData' in index.html always tries to get LIVE prices.
  // If it fails, index.html handles the localStorage fallback itself.
  if (url.hostname.includes("script.google.com")) {
    return; // Let the browser handle it directly
  }

  // B. APP ASSETS (Cache First, Fallback to Network)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Return cached file if found
      if (cachedResponse) return cachedResponse;

      // 2. If not in cache, fetch from network
      return fetch(event.request).then(networkResponse => {
        // 3. Cache the new file for next time (Dynamic Caching)
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
