/**
 * Offline support for a study app that travels.
 *
 * Deliberately small and written by hand: no build step, no Workbox, nothing
 * that could pull a script the CSP would refuse. Five rules only.
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
 * 5. The caches are named for the deployment (the app registers this file as
 *    `/sw.js?v=<release>`) and only the current one and the one before it are
 *    kept. With a fixed name every deployment left its old chunks behind for
 *    good: measured, about a quarter of a megabyte for the smallest change and
 *    more for a real one, on every visit after every deployment, forever. The
 *    one before is kept so that a tab opened before a deployment can still
 *    fetch the chunks it asks for.
 *
 * What an earlier version of this file claimed, wrongly: that serving the
 * offline document for an address never visited still ends with the real page,
 * because the router would render it from cached JavaScript. Measured with the
 * network off, every address except `/` showed the offline page - the document
 * a route boots from is per-route, so there is nothing for the router to
 * recover from. Hence the precache list below covers every fixed page, and the
 * app asks this worker to store today's lessons as well.
 */
const BUILD =
  (() => {
    try {
      return (new URL(self.location.href).searchParams.get("v") ?? "")
        .replace(/[^\w.-]/g, "")
        .slice(0, 40);
    } catch {
      return "";
    }
  })() || "dev";
const VERSION = `may-${BUILD}`;
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
/** A synthetic entry in the shell cache that says when this generation was installed. */
const STAMP = "/__may-installed";
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
  "/papers",
  "/vocabulary",
  "/mistakes",
  "/notes",
  "/progress",
  "/settings",
  "/guide",
];
/** A day's plan is at most six lessons; the cap keeps a bad message cheap. */
const WARM_LIMIT = 8;

/**
 * Stores one address and the build assets its document names.
 *
 * `cache.addAll` rejects as a whole when any single request fails, which would
 * lose the essential pages over one 404, so each page is stored on its own.
 *
 * The assets matter as much as the document. A page whose document is cached
 * but whose route chunk is not renders the app's error screen with the network
 * off - measured on `/exam` in CI, where nothing had prefetched that chunk
 * first. Each route boots from its own chunk, so the document is only half of
 * what "this page works offline" needs.
 */
async function store(cache, path) {
  try {
    const response = await fetch(path, { cache: "reload" });
    if (!response.ok) return false;
    const type = response.headers.get("content-type") ?? "";
    const html = type.includes("text/html")
      ? await response.clone().text()
      : "";
    // The assets go first: a page that is in the cache must open offline, and
    // it cannot if it was stored while the chunks it boots from were not.
    if (html) await storeAssets(html);
    await cache.put(path, response);
    return true;
  } catch {
    return false;
  }
}

/**
 * Every `/_next/static/...` address a document names, stored once each - in the
 * shell cache whichever cache the page itself goes to, so a lesson warmed for
 * the train does not keep a second copy of the chunks the shell already has.
 */
async function storeAssets(html) {
  const found = new Set(html.match(/\/_next\/static\/[^"'\\\s>)]+/g) ?? []);
  const cache = await caches.open(SHELL);
  for (const asset of found) {
    if (await cache.match(asset)) continue;
    try {
      const response = await fetch(asset);
      if (response.ok) await cache.put(asset, response);
    } catch {
      // One missing asset must not stop the rest of the page being stored.
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then(async (cache) => {
        await cache.put(STAMP, new Response(String(Date.now())));
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

/** `may-<build>-shell` or `may-<build>-pages`: the build, or null for any other name. */
function buildOf(key) {
  const found = /^may-(.+)-(?:shell|pages)$/.exec(key);
  return found ? found[1] : null;
}

/** When a generation was installed, 0 for one with no stamp (the first, fixed-name kind). */
async function installedAt(build) {
  try {
    const cache = await caches.open(`may-${build}-shell`);
    const stamp = await cache.match(STAMP);
    return stamp ? Number(await stamp.text()) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Keeps this deployment's caches and those of the most recently installed one
 * before it; everything else of ours goes.
 */
async function dropOldGenerations() {
  const keys = (await caches.keys()).filter((key) => key.startsWith("may-"));
  const others = new Set();
  for (const key of keys) {
    const build = buildOf(key);
    if (build === null) await caches.delete(key);
    else if (build !== BUILD) others.add(build);
  }
  let previous = null;
  let newest = -1;
  for (const build of others) {
    const at = await installedAt(build);
    if (at > newest) {
      newest = at;
      previous = build;
    }
  }
  for (const key of keys) {
    const build = buildOf(key);
    if (build !== null && build !== BUILD && build !== previous)
      await caches.delete(key);
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    dropOldGenerations()
      .catch(() => {
        // Tidying is not worth a worker that never activates.
      })
      .then(() => self.clients.claim()),
  );
});

/**
 * This deployment's caches first, then the earlier one: `caches.match` alone
 * asks the caches in the order they were made, so an old copy of a page would
 * answer before the new one.
 */
async function lookup(request) {
  for (const name of [PAGES, SHELL]) {
    const hit = await (await caches.open(name)).match(request);
    if (hit) return hit;
  }
  return caches.match(request);
}

async function cacheFirst(request) {
  const hit = await lookup(request);
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
    const hit = await lookup(request);
    if (hit) return hit;
    const fallback = await lookup(OFFLINE);
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
