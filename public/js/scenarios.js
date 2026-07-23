/**
 * All 11 scenario definitions (S01–S11).
 * Each scenario gets its own cacheable probe asset: /assets/probe-sNN.js
 */
window.SCENARIOS = [
  {
    id: 'S01',
    slug: 's01',
    title: 'Same normal tab — soft reload',
    intro: 'Write probe → soft reload this same tab.',
    steps: [
      'Open in a <strong>normal</strong> Chrome tab.',
      'Click <strong>Write probe</strong> — note values below.',
      'Soft reload (Cmd+R / Ctrl+R).',
      'Check what persisted.',
    ],
    actions: { write: true, reload: true, refresh: false, newTab: false, copyUrl: false },
    writeStatus: (s) => `Wrote ${s.writtenAt}. Soft reload next.`,
  },
  {
    id: 'S02',
    slug: 's02',
    title: 'Another normal tab',
    intro: 'Tab A: write probe. Tab B: open this URL in a <strong>new normal tab</strong>.',
    steps: [
      '<strong>Tab A</strong> — open this page, click <strong>Write probe</strong>, note <code>tabId</code>.',
      '<strong>Tab B</strong> — open the same URL in a <strong>new normal tab</strong> (link below or Cmd+click).',
      'Compare readouts between tab A and tab B.',
    ],
    actions: { write: true, reload: false, refresh: true, newTab: true, copyUrl: false },
    writeStatus: (s) => `Wrote ${s.writtenAt} (tab ${s.tabId}). Open new tab next.`,
  },
  {
    id: 'S03',
    slug: 's03',
    title: 'Incognito while normal open',
    intro:
      'Normal tab: write probe. Then open this URL in a <strong>new incognito window</strong> (normal tab can stay open).',
    steps: [
      '<strong>Normal tab</strong> — open this page, click <strong>Write probe</strong>, note the readout.',
      '<strong>Incognito</strong> — open a new incognito window (Cmd+Shift+N / Ctrl+Shift+N), go to this same URL.',
      'Compare readouts: normal vs incognito.',
    ],
    actions: { write: true, reload: false, refresh: true, newTab: false, copyUrl: true },
    writeStatus: (s) => `Wrote ${s.writtenAt} (tab ${s.tabId}). Open incognito window next.`,
    copyStatus: 'URL copied — paste in incognito window.',
  },
  {
    id: 'S04',
    slug: 's04',
    title: 'Another incognito tab',
    intro:
      'Incognito tab A: write probe. Incognito tab B: open this URL in a <strong>new incognito tab</strong> (same window).',
    steps: [
      'Open an <strong>incognito window</strong> (Cmd+Shift+N / Ctrl+Shift+N), go to this page.',
      '<strong>Tab A</strong> — click <strong>Write probe</strong>, note <code>tabId</code>.',
      '<strong>Tab B</strong> — open the same URL in a <strong>new incognito tab</strong> (link below, Cmd+click, or Cmd+T).',
      'Compare readouts between tab A and tab B.',
    ],
    actions: { write: true, reload: false, refresh: true, newTab: true, copyUrl: true },
    writeStatus: (s) => `Wrote ${s.writtenAt} (tab ${s.tabId}). Open new incognito tab next.`,
    copyStatus: 'URL copied — open in a new incognito tab.',
  },
  {
    id: 'S05',
    slug: 's05',
    title: 'Another incognito window (session alive)',
    intro:
      'Incognito window A: write probe. Keep it open; open a <strong>second incognito window</strong> and load this URL.',
    steps: [
      '<strong>Window A</strong> — incognito window, open this page, click <strong>Write probe</strong>.',
      'Leave window A open. Open a <strong>second incognito window</strong> (Cmd+Shift+N / Ctrl+Shift+N again).',
      'In window B, go to this same URL and compare readouts.',
    ],
    actions: { write: true, reload: false, refresh: true, newTab: false, copyUrl: true },
    writeStatus: (s) => `Wrote ${s.writtenAt} (tab ${s.tabId}). Open second incognito window next.`,
    copyStatus: 'URL copied — paste in the second incognito window.',
  },
  {
    id: 'S06',
    slug: 's06',
    title: 'New incognito after all incognito closed',
    intro:
      'Write probe in incognito, close <strong>all</strong> incognito windows, then open a fresh incognito window.',
    steps: [
      '<strong>Incognito</strong> — open this page, click <strong>Write probe</strong>.',
      'Close <strong>every</strong> incognito window (incognito session ends).',
      'Open a <strong>fresh</strong> incognito window and go to this URL again.',
      'Readout should be empty — incognito data is wiped when the last window closes.',
    ],
    actions: { write: true, reload: false, refresh: true, newTab: false, copyUrl: true },
    writeStatus: (s) => `Wrote ${s.writtenAt}. Close all incognito windows, then open fresh incognito.`,
    copyStatus: 'URL copied — paste after opening fresh incognito.',
  },
  {
    id: 'S07',
    slug: 's07',
    title: 'Restart → incognito (was normal)',
    intro:
      'Normal tab: write probe. <strong>Quit Chrome completely</strong>, restart, open incognito, load this URL.',
    steps: [
      '<strong>Normal tab</strong> — write probe on this page.',
      'Quit Chrome completely (Cmd+Q / Alt+F4 — not just close the window).',
      'Restart Chrome, open an <strong>incognito window</strong>, go to this URL.',
      'Check whether normal-profile data appears in incognito.',
    ],
    actions: { write: true, reload: false, refresh: true, newTab: false, copyUrl: true },
    writeStatus: (s) => `Wrote ${s.writtenAt}. Quit Chrome, restart, open incognito.`,
    copyStatus: 'URL copied — paste in incognito after restart.',
  },
  {
    id: 'S08',
    slug: 's08',
    title: 'Incognito → normal (reverse isolation)',
    intro:
      'Incognito tab: write probe. Then open this URL in a <strong>normal tab</strong> (incognito can stay open).',
    steps: [
      '<strong>Incognito</strong> — open this page, click <strong>Write probe</strong>, note the readout.',
      '<strong>Normal tab</strong> — open a normal window/tab and go to this same URL.',
      'Compare readouts: incognito vs normal — incognito data should not appear in normal.',
    ],
    actions: { write: true, reload: false, hardReload: false, refresh: true, newTab: false, copyUrl: true },
    writeStatus: (s) => `Wrote ${s.writtenAt} (tab ${s.tabId}). Open normal tab next.`,
    copyStatus: 'URL copied — paste in a normal tab.',
  },
  {
    id: 'S09',
    slug: 's09',
    title: 'Restart → normal (persistence baseline)',
    intro:
      'Normal tab: write probe. <strong>Quit Chrome completely</strong>, restart, open a normal tab, load this URL.',
    steps: [
      '<strong>Normal tab</strong> — write probe on this page.',
      'Quit Chrome completely (Cmd+Q / Alt+F4 — not just close the window).',
      'Restart Chrome, open a <strong>normal tab</strong>, go to this URL.',
      'Normal-profile storage and cache should persist after restart.',
    ],
    actions: { write: true, reload: false, hardReload: false, refresh: true, newTab: false, copyUrl: true },
    writeStatus: (s) => `Wrote ${s.writtenAt}. Quit Chrome, restart, open normal tab.`,
    copyStatus: 'URL copied — paste in normal tab after restart.',
  },
  {
    id: 'S10',
    slug: 's10',
    title: 'Same normal tab — hard reload',
    intro: 'Write probe → <strong>hard reload</strong> this same normal tab (Cmd+Shift+R / Ctrl+Shift+R).',
    steps: [
      'Open in a <strong>normal</strong> Chrome tab.',
      'Click <strong>Write probe</strong> — note values below.',
      'Hard reload (Cmd+Shift+R / Ctrl+Shift+R) — bypasses HTTP cache.',
      'Storage should persist; script cache should show likelyFromCache: false.',
    ],
    actions: { write: true, reload: false, hardReload: true, refresh: true, newTab: false, copyUrl: false },
    writeStatus: (s) => `Wrote ${s.writtenAt}. Hard reload next (Cmd+Shift+R).`,
  },
  {
    id: 'S11',
    slug: 's11',
    title: 'Same incognito tab — hard reload',
    intro:
      'Write probe in an <strong>incognito tab</strong> → <strong>hard reload</strong> (Cmd+Shift+R / Ctrl+Shift+R).',
    steps: [
      'Open an <strong>incognito window</strong> (Cmd+Shift+N / Ctrl+Shift+N), go to this page.',
      'Click <strong>Write probe</strong> — note values below.',
      'Hard reload (Cmd+Shift+R / Ctrl+Shift+R) — bypasses HTTP cache.',
      'Storage should persist within the incognito session; cache entries should bypass disk/memory cache.',
    ],
    actions: { write: true, reload: false, hardReload: true, refresh: true, newTab: false, copyUrl: false },
    writeStatus: (s) => `Wrote ${s.writtenAt}. Hard reload next (Cmd+Shift+R).`,
  },
];

window.getScenario = function getScenario(slugOrId) {
  const key = String(slugOrId).toLowerCase();
  return window.SCENARIOS.find((s) => s.slug === key || s.id.toLowerCase() === key);
};

window.getScenarioFromPath = function getScenarioFromPath(pathname) {
  const match = pathname.match(/\/(s\d{2})\.html$/i);
  if (!match) return null;
  return window.getScenario(match[1]);
};
