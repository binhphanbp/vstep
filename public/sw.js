/**
 * Offline support for a study app that travels.
 *
 * Deliberately small and written by hand: no build step, no Workbox, nothing
 * that could pull a script the CSP would refuse. Four rules only.
 *
 * 1. Hashed build assets are immutable, so serve them from the cache first.
 * 2. Page loads try the network first and fall back to the last copy, then to
 *    an offline page. A study app must never show a stale lesson list when the
 *    network is fine.
 * 3. The router fetches its own payload for a client-side navigation (an
 *    `?_rsc=` request, which is not a navigation as far as this worker is
 *    concerned). Those follow the same rule, so moving between pages inside
 *    the app works with no network.
 * 4. Anything that is not a same-origin GET - Supabase calls above all - is
 *    left alone. Nothing about her account or her data is cached here; her
 *    progress already lives in localStorage and IndexedDB.
 *
 * What an earlier version of this file claimed, wrongly: that serving the
 * offline document for an address never visited still ends with the real page,
 * because the router would render it from cached JavaScript. Measured with the
 * network off, every address except `/` showed the offline page - the document
 * a route boots from is per-route, so there is nothing for the router to
 * recover from. Hence the precache list below covers every fixed page, and the
 * app asks this worker to store today's lessons as well.
 */
const VERSION = "may-v2";
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const OFFLINE = "/offline";
/** Must be there or offline is broken, not merely thinner. */
const ESSENTIAL = ["/", OFFLINE];
/** Every fixed page of the app, so none of them needs a visit first. */
const PRECACHE = [
  ...ESSENTIAL,
  "/icon.svg",
  "/manifest.webmanifest",
  "/journey",
  "/practice",
  "/exam",
  "/vocabulary",
  "/mistakes",
  "/progress",
  "/settings",
  "/guide",
];
/** A day's plan is at most six lessons; the cap keeps a bad message cheap. */
const WARM_LIMIT = 8;

/**
 * Stores one address, ignoring a failure.
 *
 * `cache.addAll` rejects as a whole when any single request fails, which would
 * lose the essential pages over one 404. Each page is stored on its own.
 */
async function store(cache, path) {
  try {
    const response = await fetch(path, { cache: "reload" });
    if (response.ok) await cache.put(path, response);
    return response.ok;
  } catch {
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then(async (cache) => {
        for (const path of PRECACHE) await store(cache, path);
      })
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

/**
 * The app sends the addresses of today's plan once it has loaded.
 *
 * The worker cannot know which lessons today asks for - that is in her data -
 * and the lessons are what she would actually lose on a train.
 */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "may-warm" || !Array.isArray(data.paths)) return;
  const paths = data.paths
    .filter((path) => typeof path === "string" && path.startsWith("/"))
    .slice(0, WARM_LIMIT);
  if (!paths.length) return;
  event.waitUntil(
    caches.open(PAGES).then(async (cache) => {
      for (const path of paths) {
        if (await cache.match(path)) continue;
        await store(cache, path);
      }
    }),
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
  else if (
    request.mode === "navigate" ||
    url.searchParams.has("_rsc") ||
    url.pathname.endsWith(".webmanifest")
  )
    event.respondWith(networkFirst(request));
});
