/**
 * Probe service worker — stores scenario payload in Cache API on WRITE_PROBE.
 */
const CACHE_NAME = 'probe-sw-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'WRITE_PROBE') return;

  const { scenarioId, payload } = event.data;
  const url = new URL(`/probe-cache/${scenarioId}`, self.location.origin).href;

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.put(
          url,
          new Response(JSON.stringify(payload), {
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
      .then(() => {
        if (event.ports[0]) event.ports[0].postMessage({ ok: true });
      })
      .catch((err) => {
        if (event.ports[0]) event.ports[0].postMessage({ ok: false, error: String(err) });
      })
  );
});
