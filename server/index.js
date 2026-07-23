/**
 * Static server for scenario pages (S01–S11).
 *
 * - public/index.html   → dashboard
 * - public/scenario.html → shared template served at /s01.html … /s11.html
 * - /assets/probe-sNN.js → per-scenario cacheable probe script assets
 */
const express = require('express');
const path = require('path');

const PORT = 3847;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SCENARIO_HTML = path.join(PUBLIC_DIR, 'scenario.html');
const SCENARIO_COUNT = 11;

const app = express();

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    out[key] = decodeURIComponent(value);
  }
  return out;
}

/**
 * Attempt to clear the origin HTTP cache via Clear-Site-Data. Chrome does not
 * reliably evict cached script/fetch assets from this fetch response — hard
 * reload is the reliable bypass. Kept to observe Clear-Site-Data behavior.
 */
app.get('/admin/clear-http-cache', (_req, res) => {
  res.setHeader('Clear-Site-Data', '"cache"');
  res.type('json').send({
    cleared: 'cache',
    origin: `http://localhost:${PORT}`,
  });
});

app.get('/admin/set-probe-httponly-cookie', (req, res) => {
  const { scenario, id, writtenAt, tabId } = req.query;
  if (!scenario || !id || !writtenAt) {
    res.status(400).json({ error: 'scenario, id, and writtenAt are required' });
    return;
  }

  const payload = JSON.stringify({ scenario, id, writtenAt, tabId: tabId || null });
  res.setHeader(
    'Set-Cookie',
    `probe_httponly=${encodeURIComponent(payload)}; Max-Age=31536000; Path=/; HttpOnly; SameSite=Lax`
  );
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, scenario, id, writtenAt });
});

app.get('/admin/clear-probe-httponly-cookie', (_req, res) => {
  res.setHeader('Set-Cookie', 'probe_httponly=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
  res.setHeader('Cache-Control', 'no-store');
  res.json({ cleared: 'probe_httponly' });
});

app.get('/api/probe-httponly-cookie', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies.probe_httponly;
  if (!raw) {
    res.json({ present: false, value: null });
    return;
  }

  try {
    res.json({ present: true, value: JSON.parse(raw) });
  } catch {
    res.json({ present: true, value: { raw } });
  }
});

app.get('/sw.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(PUBLIC_DIR, 'sw.js'));
});

for (let i = 1; i <= SCENARIO_COUNT; i += 1) {
  const nn = String(i).padStart(2, '0');
  const slug = `s${nn}`;
  const scenarioId = `S${nn}`;

  app.get(`/assets/probe-${slug}.js`, (_req, res) => {
    const generatedAt = new Date().toISOString();
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Generated-At', generatedAt);
    res.send(`window.__PROBE_ASSET_${scenarioId}__ = { generatedAt: "${generatedAt}" };\n`);
  });

  app.get(`/assets/probe-${slug}.json`, (_req, res) => {
    const generatedAt = new Date().toISOString();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Generated-At', generatedAt);
    res.json({ scenario: scenarioId, generatedAt });
  });

  app.get(`/s${nn}.html`, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(SCENARIO_HTML);
  });
}

app.use(
  express.static(PUBLIC_DIR, {
    setHeaders(res, filePath) {
      if (
        filePath.endsWith('.html') ||
        filePath.endsWith('probe-loader.js') ||
        filePath.endsWith('scenarios.js') ||
        filePath.endsWith('sw.js')
      ) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

app.listen(PORT, () => {
  console.log(`Harness: http://localhost:${PORT}/`);
  for (let i = 1; i <= SCENARIO_COUNT; i += 1) {
    const nn = String(i).padStart(2, '0');
    console.log(`  S${nn}: http://localhost:${PORT}/s${nn}.html`);
  }
});
