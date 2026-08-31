/*
 * Service worker — spec §11.
 *
 * Precaches the app shell, the background image and the Press Start 2P
 * webfont, so the app survives a mid-conversation reload on dead wifi. With
 * the node graph bundled as static JSON, the whole conversation then runs
 * with no network at all.
 *
 * The stale-worker hazard is not optional to handle. Without all three of
 * the following, a hotfix during the event serves the OLD app to every
 * returning phone — and a fresh incognito window would pass the smoke test
 * while every real phone stayed broken:
 *
 *   1. the precache manifest is keyed to the build id, so a deploy
 *      invalidates it;
 *   2. skipWaiting, so a new worker does not sit behind the old one;
 *   3. clients.claim, so it applies on next load rather than after a tab
 *      close.
 *
 * Rehearse this on the dirty test phone, never on a cleared browser.
 */

// Replaced at registration time with the deployment's build id.
const BUILD_ID = new URL(self.location.href).searchParams.get('build') || 'dev';
const CACHE = `uob-booth-${BUILD_ID}`;

const PRECACHE = [
  '/',
  '/assets/background.webp',
  '/fonts/press-start-2p.woff2',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Individually, so one 404 cannot fail the whole install.
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('uob-booth-') && name !== CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the API. A stale lead submission or beacon is worse than
  // no response at all.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network first, cache as the fallback. This is what makes a
  // deploy reach a returning phone while still surviving dead wifi.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put('/', fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match('/', { ignoreSearch: true });
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Everything else — the shell's JS/CSS, the background, the font — is
  // immutable per build, so cache first.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh.ok && fresh.type === 'basic') {
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        return Response.error();
      }
    })(),
  );
});

/*
 * Background Sync. A bonus, never the guarantee: it never fires on iOS
 * Safari. The reliable path is the flush on next app open, driven by the
 * page rather than by this worker.
 */
self.addEventListener('sync', (event) => {
  if (event.tag !== 'uob-booth-submit') return;
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        client.postMessage({ type: 'flush-queue' });
      }
    })(),
  );
});
