// ✅ 1. Import Firebase scripts
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAWaL9PudugFC6PmFvORuUgY6ypFD3RiKI",
  authDomain: "open-chat-ece02.firebaseapp.com",
  projectId: "open-chat-ece02",
  storageBucket: "open-chat-ece02.firebasestorage.app",
  messagingSenderId: "33272456665",
  appId: "1:33272456665:web:4b02cdb56f87c16845a5c8"
});

const messaging = firebase.messaging();

// ✅ 3. PWA Cache Settings
const CACHE_NAME = "chat-cache-v2.2";
const OFFLINE_URLS = [
  "/chat-open/",
  "/chat-open/index.html",
  "/chat-open/login.html",
  "/chat-open/app.js",
  "/chat-open/favicon.png",
  "/chat-open/manifest.json"
];

// Install and cache all required files
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing and caching core assets...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
});

// Activate (clean up old caches)
self.addEventListener("activate", event => {
  const allowedCaches = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (!allowedCaches.includes(cacheName)) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});


// Fetch handler for offline support
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).catch(() =>
        caches.match("/chat-open/index.html")
      );
    })
  );

});



