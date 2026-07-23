# Incognito exploration

Local harness for testing what Chrome caches and stores across normal tabs, incognito tabs, and windows, tested on Google Chrome version 150.0.7871.181 (Official Build) (arm64)

## Run

```bash
npm install
npm run dev
```

Open **http://localhost:3847**

- **Dashboard** — links to all scenarios (S01–S11)
- **Scenarios** — `/s01.html` … `/s11.html` (shared template, per-scenario config in `public/js/scenarios.js`)

## Scenarios (S01–S11)

Each scenario has a **source** context (where you click **Write probe**) and a **target** context (where you read the probe). Pages live at `/s01.html` … `/s11.html`.

| ID | Title | Write probe (source) | Read probe (target) | What it tests |
|----|-------|----------------------|---------------------|---------------|
| **S01** | Same normal tab — soft reload | Normal tab | Same normal tab after soft reload (Cmd+R / Ctrl+R) | All storage types and HTTP cache survive a soft reload in one tab |
| **S02** | Another normal tab | Normal tab A | New normal tab B (same profile, same window or another) | Shared vs per-tab storage across normal tabs (`sessionStorage` is per-tab; others shared) |
| **S03** | Incognito while normal open | Normal tab | New incognito window (normal tab may stay open) | Incognito is isolated from normal profile — no shared storage or cache |
| **S04** | Another incognito tab | Incognito tab A | New incognito tab B (same incognito window) | Storage and cache shared within one incognito session across tabs |
| **S05** | Another incognito window (session alive) | Incognito window A | Incognito window B (window A stays open) | Same incognito session spans multiple incognito windows |
| **S06** | New incognito after all incognito closed | Incognito window | Fresh incognito window after closing **every** incognito window | Incognito data is wiped when the incognito session ends |
| **S07** | Restart → incognito (was normal) | Normal tab | Incognito window after quitting and restarting Chrome | Whether normal-profile data leaks into incognito after a full browser restart |
| **S08** | Incognito → normal (reverse isolation) | Incognito tab | Normal tab (incognito may stay open) | Bidirectional isolation — incognito data must not appear in normal |
| **S09** | Restart → normal (persistence baseline) | Normal tab | Normal tab after quitting and restarting Chrome | Normal-profile storage and cache persist across browser restart |
| **S10** | Same normal tab — hard reload | Normal tab | Same normal tab after hard reload (Cmd+Shift+R / Ctrl+Shift+R) | Storage persists; HTTP cache bypassed on hard reload |
| **S11** | Same incognito tab — hard reload | Incognito tab | Same incognito tab after hard reload (Cmd+Shift+R / Ctrl+Shift+R) | Same as S10 within an incognito session |

## Observations

Record results for each core scenario. **Write probe** in source context, **Read probe** in target.

**Legend:** ✅ - persisted data · ❌ - data missing & gone & not persisted

| ID | localStorage | cookies | HttpOnly | sessionStorage | IndexedDB | OPFS | SW | Cache API | HTTP cache (script) | HTTP cache (fetch) |
|----|--------------|---------|----------|----------------|-----------|------|-----|-----------|---------------------|--------------------|
| S01 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| S02 | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| S03 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| S04 | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| S05 | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| S06 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| S07 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| S08 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| S09 | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| S10 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| S11 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

## How to test

1. Open a scenario page in the right browsing context (normal vs incognito).
2. Click **Write probe**.
3. Follow the steps on that page (reload, new tab, new window, etc.).
4. Fill in the matching row in the **Observations** table above.

DevTools → Network: keep **Disable cache** off unless you intentionally bypass cache.

**Reset buttons** on each scenario page clear probe localStorage, sessionStorage, cookies (JS and HttpOnly),
IndexedDB, OPFS, or Service Worker / Cache API. **Clear HTTP cache** sends `Clear-Site-Data: "cache"` via
fetch — in Chrome this does **not** evict cached script/fetch probe assets; only a hard reload
(Cmd+Shift+R) bypasses the HTTP cache (see Pitfalls).

## Probe types

| Probe | How it is written | How it is read |
|-------|-------------------|----------------|
| localStorage / sessionStorage | `document` storage APIs | Same APIs |
| Cookie (JS) | `document.cookie` | Same |
| Cookie (HttpOnly) | Server `Set-Cookie` via `/admin/set-probe-httponly-cookie` | Server echoes via `/api/probe-httponly-cookie` |
| IndexedDB | Client IDB put | Client IDB get |
| OPFS | `navigator.storage.getDirectory()` file write | Same file read |
| Service Worker | Registers `/sw.js` on write | `navigator.serviceWorker.getRegistration()` |
| Cache API | SW message + `caches.put` | `caches.match(/probe-cache/SNN)` |
| HTTP cache (script) | Cacheable `/assets/probe-sNN.js` via `<script>` | Performance Resource Timing (page-load request) |
| HTTP cache (fetch) | Cacheable `/assets/probe-sNN.json` via `fetch()` on load | Performance Resource Timing (page-load request) |

## Repo layout

```
server/index.js          Express server (port 3847)
public/
  index.html             Dashboard
  scenario.html          Shared scenario page template
  js/scenarios.js        S01–S11 definitions (steps, actions)
  js/probe-kit.js        Shared write/read/cache probe logic
  js/scenario-page.js    Shared UI wiring
  js/probe-loader.js     Loads the cacheable probe script asset
  sw.js                  Service worker for Cache API writes
```
