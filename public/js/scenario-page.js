/**
 * Renders and wires a scenario page from window.SCENARIOS config.
 */
(function () {
  function label(ok) {
    const cls = ok ? 'yes' : 'no';
    const text = ok ? 'present' : 'missing';
    return `<span class="status-label ${cls}">${text}</span>`;
  }

  function presentValue(value) {
    if (value == null) return false;
    if (typeof value === 'object' && value.error) return false;
    return true;
  }

  function renderPanel(report, httpScript, httpFetch) {
    return `
      <table>
        <tr><th>Tab ID</th><td><pre>${report.tabId}</pre></td></tr>
        <tr><th>localStorage</th><td>${label(!!report.localStorage)}<pre>${JSON.stringify(report.localStorage, null, 2) || '—'}</pre></td></tr>
        <tr><th>sessionStorage</th><td>${label(!!report.sessionStorage)}<pre>${JSON.stringify(report.sessionStorage, null, 2) || '—'}</pre></td></tr>
        <tr><th>Cookie (JS)</th><td>${label(!!report.cookie)}<pre>${JSON.stringify(report.cookie, null, 2) || '—'}</pre></td></tr>
        <tr><th>Cookie (HttpOnly)</th><td>${label(!!report.httpOnlyCookie)}<pre>${JSON.stringify(report.httpOnlyCookie, null, 2) || '—'}</pre></td></tr>
        <tr><th>IndexedDB</th><td>${label(presentValue(report.indexedDB))}<pre>${JSON.stringify(report.indexedDB, null, 2) || '—'}</pre></td></tr>
        <tr><th>OPFS</th><td>${label(presentValue(report.opfs))}<pre>${JSON.stringify(report.opfs, null, 2) || '—'}</pre></td></tr>
        <tr><th>Service Worker</th><td>${label(!!report.serviceWorker?.registered)}<pre>${JSON.stringify(report.serviceWorker, null, 2) || '—'}</pre></td></tr>
        <tr><th>Cache API</th><td>${label(presentValue(report.cacheApi))}<pre>${JSON.stringify(report.cacheApi, null, 2) || '—'}</pre></td></tr>
        <tr><th>Loaded at</th><td><pre>${report.pageLoadedAt}</pre></td></tr>
        <tr><th>HTTP cache (script)</th><td><pre>${JSON.stringify(httpScript, null, 2)}</pre></td></tr>
        <tr><th>HTTP cache (fetch)</th><td><pre>${JSON.stringify(httpFetch, null, 2)}</pre></td></tr>
      </table>
    `;
  }

  function buildActions(scenario, pagePath) {
    const parts = [];
    const { actions } = scenario;
    if (actions.write) parts.push('<button id="btn-write">Write probe</button>');
    if (actions.refresh) parts.push('<button id="btn-refresh">Refresh readout</button>');
    if (actions.reload) parts.push('<button id="btn-reload">Soft reload</button>');
    if (actions.hardReload) {
      parts.push(
        '<p class="muted hard-reload-hint">Hard reload: <kbd>Cmd+Shift+R</kbd> / <kbd>Ctrl+Shift+R</kbd> (cannot be triggered from JS).</p>'
      );
    }
    if (actions.newTab) {
      parts.push(`<a class="button" href="${pagePath}" target="_blank" rel="noopener">Open in new tab</a>`);
    }
    if (actions.copyUrl) parts.push('<button id="btn-copy-url" type="button">Copy URL</button>');
    return parts.join('\n        ');
  }

  window.initScenarioPage = async function initScenarioPage() {
    const scenario = window.getScenarioFromPath(location.pathname);
    if (!scenario) {
      document.body.innerHTML = '<main><p>Unknown scenario.</p></main>';
      return;
    }

    const pagePath = `/${scenario.slug}.html`;
    const assetPath = `/assets/probe-${scenario.slug}.js`;
    const fetchPath = `/assets/probe-${scenario.slug}.json`;
    const assetKey = `__PROBE_ASSET_${scenario.id}__`;
    const kit = window.createProbeKit(scenario.id, assetKey);

    document.title = `${scenario.id} — ${scenario.title}`;

    const copyUrlBlock = scenario.actions.copyUrl
      ? `<p class="muted">Page URL to copy:</p>\n      <pre id="page-url"></pre>`
      : '';

    document.body.innerHTML = `
  <main>
    <p class="muted"><a href="/">Dashboard</a> · ${scenario.id}</p>
    <h1>${scenario.id} — ${scenario.title}</h1>
    <p class="muted">${scenario.intro} Record in <code>README.md</code> (Observations section).</p>

    <section>
      <h2>Steps</h2>
      <ol>
        ${scenario.steps.map((step) => `<li>${step}</li>`).join('\n        ')}
      </ol>
      ${copyUrlBlock}
      <div class="actions">
        ${buildActions(scenario, pagePath)}
      </div>
      <p id="status" class="muted"></p>
    </section>

    <section>
      <h2>Reset</h2>
      <p class="muted">Clear probe data in this browsing context. Clear HTTP cache sends Clear-Site-Data (Chrome still serves cached script/fetch assets on soft reload — use hard reload to bypass).</p>
      <div class="actions actions-wrap">
        <button id="btn-clear-all" type="button">Clear all</button>
        <button id="btn-clear-http-cache" type="button">Clear HTTP cache</button>
        <button id="btn-clear-local-storage" type="button">Clear localStorage</button>
        <button id="btn-clear-session-storage" type="button">Clear sessionStorage</button>
        <button id="btn-clear-cookie" type="button">Clear JS cookie</button>
        <button id="btn-clear-httponly-cookie" type="button">Clear HttpOnly cookie</button>
        <button id="btn-clear-indexed-db" type="button">Clear IndexedDB</button>
        <button id="btn-clear-opfs" type="button">Clear OPFS</button>
        <button id="btn-clear-sw-cache" type="button">Clear SW + Cache API</button>
      </div>
      <p id="reset-status" class="muted"></p>
    </section>

    <section>
      <h2>Readout</h2>
      <div id="panel"></div>
    </section>
  </main>`;

    const statusEl = document.getElementById('status');
    const resetStatusEl = document.getElementById('reset-status');
    const panelEl = document.getElementById('panel');

    if (scenario.actions.copyUrl) {
      document.getElementById('page-url').textContent = location.href;
    }

    async function refresh() {
      panelEl.innerHTML = renderPanel(
        await kit.readReport(),
        kit.probeHttpCache(assetPath),
        kit.probeHttpFetchCache(fetchPath)
      );
    }

    const writeBtn = document.getElementById('btn-write');
    if (writeBtn) {
      writeBtn.addEventListener('click', async () => {
        const stamp = await kit.writeProbe();
        await refresh();
        statusEl.textContent = scenario.writeStatus(stamp);
      });
    }

    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', refresh);

    const reloadBtn = document.getElementById('btn-reload');
    if (reloadBtn) reloadBtn.addEventListener('click', () => location.reload());

    const copyBtn = document.getElementById('btn-copy-url');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(location.href);
        statusEl.textContent = scenario.copyStatus || 'URL copied.';
      });
    }

    document.getElementById('btn-clear-all').addEventListener('click', async () => {
      resetStatusEl.textContent = 'Clearing all probe data…';
      try {
        await kit.clearAll();
        await refresh();
        resetStatusEl.textContent = 'All probe data cleared — HTTP cache may still apply on soft reload; hard reload to bypass.';
      } catch (err) {
        resetStatusEl.textContent = `Failed: ${err.message}`;
      }
    });

    document.getElementById('btn-clear-local-storage').addEventListener('click', async () => {
      kit.clearLocalStorage();
      await refresh();
      resetStatusEl.textContent = 'localStorage cleared (probe key removed).';
    });

    document.getElementById('btn-clear-session-storage').addEventListener('click', async () => {
      kit.clearSessionStorage();
      await refresh();
      resetStatusEl.textContent = 'sessionStorage cleared (probe keys removed).';
    });

    document.getElementById('btn-clear-cookie').addEventListener('click', async () => {
      kit.clearCookie();
      await refresh();
      resetStatusEl.textContent = 'JS cookie cleared.';
    });

    document.getElementById('btn-clear-httponly-cookie').addEventListener('click', async () => {
      await kit.clearHttpOnlyCookie();
      await refresh();
      resetStatusEl.textContent = 'HttpOnly cookie cleared.';
    });

    document.getElementById('btn-clear-indexed-db').addEventListener('click', async () => {
      await kit.clearIndexedDB();
      await refresh();
      resetStatusEl.textContent = 'IndexedDB cleared (probe record removed).';
    });

    document.getElementById('btn-clear-opfs').addEventListener('click', async () => {
      await kit.clearOpfsProbe();
      await refresh();
      resetStatusEl.textContent = 'OPFS cleared (probe file removed).';
    });

    document.getElementById('btn-clear-sw-cache').addEventListener('click', async () => {
      await kit.clearServiceWorkerCache();
      await refresh();
      resetStatusEl.textContent = 'Service worker unregistered and Cache API cleared.';
    });

    document.getElementById('btn-clear-http-cache').addEventListener('click', async () => {
      resetStatusEl.textContent = 'Clearing HTTP cache…';
      try {
        await window.clearHttpCache();
        resetStatusEl.textContent = 'Clear-Site-Data sent — Chrome may still serve cached probe assets on soft reload; hard reload (Cmd+Shift+R) bypasses HTTP cache.';
      } catch (err) {
        resetStatusEl.textContent = `Failed: ${err.message}`;
      }
    });

    await window.loadProbeAssets(assetPath, fetchPath);
    await refresh();
  };
})();
