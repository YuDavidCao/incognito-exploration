/**
 * Shared probe helpers — write/read browser storage and check HTTP cache.
 * Each scenario gets its own ProbeKit instance and cacheable asset URLs.
 */
window.createProbeKit = function createProbeKit(scenarioId, assetKey) {
  const LS_KEY = 'probe:shared';
  const SS_TAB_KEY = 'probe:tabId';
  const SS_WRITE_KEY = 'probe:sessionWrite';
  const COOKIE_NAME = 'probe_cookie';
  const IDB_NAME = 'probe-db';
  const IDB_STORE = 'probes';
  const IDB_KEY = 'shared';
  const SW_CACHE_NAME = 'probe-sw-v1';
  const OPFS_FILE = 'probe-opfs.txt';

  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function writeIndexedDbProbe(payload) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ key: IDB_KEY, ...payload });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function readIndexedDbProbe() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      return { error: String(err) };
    }
  }

  async function writeOpfsProbe(payload) {
    if (!navigator.storage?.getDirectory) {
      return { error: 'unsupported' };
    }
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(OPFS_FILE, { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(payload));
    await writable.close();
  }

  async function readOpfsProbe() {
    if (!navigator.storage?.getDirectory) {
      return { error: 'unsupported' };
    }
    try {
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle(OPFS_FILE);
      const file = await handle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (err) {
      if (err.name === 'NotFoundError') return null;
      return { error: String(err) };
    }
  }

  async function clearOpfsProbe() {
    if (!navigator.storage?.getDirectory) return;
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(OPFS_FILE);
    } catch {
      /* ignore */
    }
  }

  async function clearIndexedDbProbe() {
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      /* ignore */
    }
  }

  function getTabId() {
    let tabId = sessionStorage.getItem(SS_TAB_KEY);
    if (!tabId) {
      tabId = uuid();
      sessionStorage.setItem(SS_TAB_KEY, tabId);
    }
    return tabId;
  }

  function readCookie(name) {
    const match = document.cookie
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
  }

  function cacheEntryUrl() {
    return new URL(`/probe-cache/${scenarioId}`, location.origin).href;
  }

  async function getServiceWorkerRegistration() {
    if (!('serviceWorker' in navigator)) {
      return { supported: false, registered: false, active: false, scope: null };
    }
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      supported: true,
      registered: !!reg,
      active: !!(reg && reg.active),
      scope: reg ? reg.scope : null,
    };
  }

  async function writeServiceWorkerCache(payload) {
    if (!('serviceWorker' in navigator) || !('caches' in window)) {
      return { ok: false, error: 'unsupported' };
    }

    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    const worker = reg.active || reg.waiting || reg.installing;
    if (!worker) return { ok: false, error: 'no active worker' };

    const result = await new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => resolve(event.data);
      worker.postMessage({ type: 'WRITE_PROBE', scenarioId, payload }, [channel.port2]);
    });

    if (!result.ok) return result;

    const cache = await caches.open(SW_CACHE_NAME);
    await cache.put(
      cacheEntryUrl(),
      new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json' },
      })
    );

    return { ok: true };
  }

  async function readCacheApiProbe() {
    if (!('caches' in window)) return { error: 'unsupported' };
    try {
      const cache = await caches.open(SW_CACHE_NAME);
      const res = await cache.match(cacheEntryUrl());
      if (!res) return null;
      return res.json();
    } catch (err) {
      return { error: String(err) };
    }
  }

  async function clearServiceWorkerCache() {
    if ('caches' in window) {
      await caches.delete(SW_CACHE_NAME);
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.unregister();
    }
  }

  async function setHttpOnlyCookie(stamp) {
    const params = new URLSearchParams({
      scenario: scenarioId,
      id: stamp.id,
      writtenAt: stamp.writtenAt,
      tabId: stamp.tabId,
    });
    const res = await fetch(`/admin/set-probe-httponly-cookie?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function readHttpOnlyCookie() {
    const res = await fetch('/api/probe-httponly-cookie');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.present ? data.value : null;
  }

  async function clearHttpOnlyCookie() {
    const res = await fetch('/admin/clear-probe-httponly-cookie');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function readResourceCacheEntry(absolute) {
    const entry = performance.getEntriesByType('resource').filter((e) => e.name === absolute).pop();
    if (!entry) {
      return { found: false, likelyFromCache: false };
    }

    const deliveryType = entry.deliveryType || null;
    let likelyFromCache = deliveryType === 'cache' || deliveryType === 'cache-storage';
    if (!likelyFromCache && !deliveryType) {
      likelyFromCache =
        entry.transferSize === 0 &&
        (entry.decodedBodySize > 0 || entry.encodedBodySize > 0);
    }

    return {
      found: true,
      deliveryType,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      duration: entry.duration,
      likelyFromCache,
    };
  }

  function probeResourceCache(urlPath, bodyCheck) {
    const absolute = new URL(urlPath, location.origin).href;
    const body = bodyCheck ?? null;
    return {
      url: absolute,
      body,
      ...readResourceCacheEntry(absolute),
    };
  }

  function probeHttpCache(fallbackPath) {
    const path = window.__PROBE_ASSET_URL__ || fallbackPath;
    const asset = window[assetKey] ?? null;
    return {
      ...probeResourceCache(path),
      asset,
      scriptRan: asset !== null,
    };
  }

  function probeHttpFetchCache(fallbackPath) {
    const path = window.__PROBE_FETCH_URL__ || fallbackPath;
    const body = window.__PROBE_FETCH_BODY__ ?? null;
    return {
      ...probeResourceCache(path),
      body,
      fetchCompleted: body !== null,
    };
  }

  async function writeProbe() {
    const tabId = getTabId();
    const stamp = {
      id: uuid(),
      writtenAt: new Date().toISOString(),
      tabId,
      scenario: scenarioId,
    };

    localStorage.setItem(LS_KEY, JSON.stringify(stamp));
    sessionStorage.setItem(SS_WRITE_KEY, JSON.stringify({ writtenAt: stamp.writtenAt, tabId }));

    const cookieValue = encodeURIComponent(JSON.stringify({ id: stamp.id, writtenAt: stamp.writtenAt }));
    document.cookie = `${COOKIE_NAME}=${cookieValue}; Max-Age=31536000; Path=/; SameSite=Lax`;

    await writeIndexedDbProbe({
      id: stamp.id,
      writtenAt: stamp.writtenAt,
      tabId,
      scenario: scenarioId,
    });

    await writeOpfsProbe({
      id: stamp.id,
      writtenAt: stamp.writtenAt,
      tabId,
      scenario: scenarioId,
    });

    await setHttpOnlyCookie(stamp);
    await writeServiceWorkerCache({
      id: stamp.id,
      writtenAt: stamp.writtenAt,
      tabId,
      scenario: scenarioId,
    });

    return stamp;
  }

  async function readReport() {
    const parse = (raw) => {
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return { raw };
      }
    };

    const cookieRaw = readCookie(COOKIE_NAME);
    const indexedDB = await readIndexedDbProbe();
    const opfs = await readOpfsProbe();
    const httpOnlyCookie = await readHttpOnlyCookie();
    const serviceWorker = await getServiceWorkerRegistration();
    const cacheApi = await readCacheApiProbe();

    return {
      tabId: getTabId(),
      localStorage: parse(localStorage.getItem(LS_KEY)),
      sessionStorage: parse(sessionStorage.getItem(SS_WRITE_KEY)),
      cookie: parse(cookieRaw),
      httpOnlyCookie,
      indexedDB,
      opfs,
      serviceWorker,
      cacheApi,
      pageLoadedAt: new Date().toISOString(),
    };
  }

  function clearLocalStorage() {
    localStorage.removeItem(LS_KEY);
  }

  function clearSessionStorage() {
    sessionStorage.removeItem(SS_TAB_KEY);
    sessionStorage.removeItem(SS_WRITE_KEY);
  }

  function clearCookie() {
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  }

  async function clearIndexedDB() {
    await clearIndexedDbProbe();
  }

  async function clearAll() {
    clearLocalStorage();
    clearSessionStorage();
    clearCookie();
    await clearHttpOnlyCookie();
    await clearIndexedDB();
    await clearOpfsProbe();
    await clearServiceWorkerCache();
    return window.clearHttpCache();
  }

  return {
    writeProbe,
    readReport,
    probeHttpCache,
    probeHttpFetchCache,
    clearLocalStorage,
    clearSessionStorage,
    clearCookie,
    clearHttpOnlyCookie,
    clearIndexedDB,
    clearOpfsProbe,
    clearServiceWorkerCache,
    clearAll,
  };
};

window.clearHttpCache = async function clearHttpCache() {
  const res = await fetch('/admin/clear-http-cache');
  const data = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return data;
};
