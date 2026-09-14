/**
 * Offline support for a study app that travels.
 *
 * Deliberately small and written by hand: no build step, no Workbox, nothing
 * that could pull a script the CSP would refuse. Three rules only.
 *
 * 1. Hashed build assets are immutable, so serve them from the cache first.
 * 2. Page loads try the network first and fall back to the last copy, then to
 *    an offline page. A study app must never show a stale lesson list when the
 *    network is fine.
 * 3. Anything that is not a same-origin GET - Supabase calls above all - is
 *    left alone. Nothing about her account or her data is cached here; her
 *    progress already lives in localStorage and IndexedDB.
 *
 * One consequence worth knowing: because the application bundle is cached,
 * serving the offline document for an address never visited still ends with
 * the real page on screen - the router renders it from cached JavaScript once
 * it hydrates. The offline page is what remains when even that cannot happen.
 */
const VERSION = "may-v1";
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const OFFLINE = "/offline";
const PRECACHE = ["/", OFFLINE, "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(SHELL);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGES);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const hit = await caches.match(request);
    if (hit) return hit;
    const fallback = await caches.match(OFFLINE);
    if (fallback) return fallback;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg")
    event.respondWith(cacheFirst(request));
  else if (request.mode === "navigate" || url.pathname.endsWith(".webmanifest"))
    event.respondWith(networkFirst(request));
});
