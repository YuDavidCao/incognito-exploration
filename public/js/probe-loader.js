/**
 * Loads cacheable probe assets as part of page load. URLs are fixed (no
 * cache-busting) so the cache is genuinely exercised across reloads and browsing
 * contexts. HTTP-cache probes read these page-load requests from Resource Timing
 * rather than re-fetching. Sets window.__PROBE_ASSET_URL__ and __PROBE_FETCH_URL__.
 */
(function () {
  async function loadProbeAssets(scriptPath, fetchPath) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = scriptPath;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    window.__PROBE_ASSET_URL__ = scriptPath;

    const fetchUrl = fetchPath || scriptPath.replace(/\.js$/, '.json');
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`Fetch probe asset failed: HTTP ${res.status}`);
    window.__PROBE_FETCH_BODY__ = await res.json();
    window.__PROBE_FETCH_URL__ = fetchUrl;

    return { scriptUrl: scriptPath, fetchUrl };
  }

  window.loadProbeAssets = loadProbeAssets;
})();
