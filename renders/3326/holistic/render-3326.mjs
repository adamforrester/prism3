// Renders for #3326 (holistic, with #3308 Q1/Q2). Throwaway: drives the plugin's built dist/ui.html as test-chrome does
// (Figma theme stub, reduced motion, the prism3 example), posts host verdicts, and for the proposal states draws DOM
// prototypes into the real drawer with the chrome's own classes and tokens. Usage: node render-3326.mjs <repo> <outDir>
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [REPO, OUT] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const html = readFileSync(join(REPO, 'apps/plugin/dist/ui.html'), 'utf8');
const FIGMA = {
  light: { cls: 'figma-light', vars: { '--figma-color-bg': '#ffffff', '--figma-color-text': '#000000e5' } },
  dark: { cls: 'figma-dark', vars: { '--figma-color-bg': '#2c2c2c', '--figma-color-text': '#ffffff' } },
};
const themed = (t) => {
  const f = FIGMA[t];
  const style = `<style>:root{${Object.entries(f.vars).map(([k, v]) => `${k}:${v}`).join(';')}}</style>`;
  return html.replace(/<html([^>]*)>/, `<html$1 class="${f.cls}">`).replace(/<head>/, `<head>${style}`);
};
const server = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(themed(u.searchParams.get('figma') === 'dark' ? 'dark' : 'light'));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

// ── the host verdicts, in the writers' own words ────────────────────────────────────────────────────────
const TEMPLATE = 'No usage panels drawn: this file has no _Doc-block component. Run Set up file, then build again.';
const SETUP = { type: 'file-setup-result', ok: true, headline: '✓ file set up',
  summary: 'pages: 31 created (Cover, About, Foundations, Icons & assets…), built _Label + _Backdrop + _Scrim, _Doc-block not built: usage panels need it. Build Badge, Tag, List item, Divider, then run Set up file again, built _Swatch + _Type specimen' };
const THEME = { type: 'apply-result', ok: true, headline: '✓ applied', summary: 'palette 132 (+132)',
  lines: ['palette 132 (+132)', 'color 412 (+412)', 'dims/layout 4 collections (+186)', 'type 6 fonts loaded / 48 font vars (+48) / 22 text styles (+22)', 'motion 18 vars (+18)', '1186 bindings'] };
const GUIDES = { type: 'style-guide-result', ok: true, headline: '✓ style guide: 7 tables', summary: 'Drew 7 tables', lines: ['Drew 7 tables on Foundations'] };
// The queue's own verdict for the owner's nine sets (`runVerdict`, RUN_COPY): pages first, then one line per set.
const NINE = { type: 'component-result', ok: false, completed: true, headline: '⚠ Built 9 sets · 5 with problems',
  lines: ['Built Icon on ↳ Icons & assets.', 'Built Button, Button.Destructive, Button.Neutral on ↳ Buttons.', 'Built Checkbox.Control, Checkbox.Row, Checkbox.Group on ↳ Checkbox.', 'Built Link on ↳ Link.', 'Built Badge on ↳ Badge.',
    'Button: built with problems.', 'Checkbox.Row: built with problems.', 'Checkbox.Group: built with problems.', 'Link: built with problems.', 'Badge: built with problems.'] };
NINE.summary = NINE.lines.join(' ');
const EIGHT = { type: 'component-result', ok: false, completed: false, headline: 'Built 8 of 9 sets',
  lines: ['Built Icon on ↳ Icons & assets.', 'Built Button, Button.Destructive, Button.Neutral on ↳ Buttons.', 'Built Checkbox.Control, Checkbox.Row, Checkbox.Group on ↳ Checkbox.', 'Built Link on ↳ Link.', 'Badge: build failed.'] };
EIGHT.summary = EIGHT.lines.join(' ');
const LIB = { type: 'component-update-result', ok: false, headline: '⚠ updated 4 in place',
  lines: ['Button: 4 updated in place.', 'Button.Neutral: 2 updated in place.', 'Text field: 6 updated in place.', 'Select: 3 updated in place.', 'Saved a version first: "Prism3 update, 4 sets".', TEMPLATE.replace('build again', 'update again')] };
LIB.summary = LIB.lines.join('\n');

// ── the scenarios ────────────────────────────────────────────────────────────────────────────────────
// `posts`: [minute, message] in order. `strip`: the strip's verdict line (real node, filled). `proto`: the drawer rows.
const W = (x) => x;
const SCEN = {
  'now-a-first-run': { posts: [[30, SETUP], [31, THEME], [32, NINE], [33, GUIDES]], expand: ['components'],
    strip: { tone: 'warn', what: 'File updated', n: '1:48', sub: 'File set up, Theme applied, Sets added, Style guides drawn. Built 9 sets · 5 with problems. Details in Activity.' } },
  'now-b-stopped': { posts: [[30, SETUP], [31, THEME], [32, EIGHT]], expand: ['components'],
    strip: { tone: 'bad', what: 'Stopped at To add', n: '1:12', sub: 'Built 8 of 9 sets. Details in Activity.' } },
  'now-c-clean-rerun': { posts: [[30, LIB], [34, { type: 'apply-result', ok: true, headline: '✓ applied', summary: 'palette 132 (+0)', lines: ['palette 132 (+0)', 'color 412 (+0)', '1186 bindings'] }]], expand: ['components'],
    strip: { tone: 'ok', what: 'Theme applied', n: '0:09', sub: 'Details in Activity.' } },
  'after-a-first-run': { posts: [[33, NINE]], proto: 'firstRun', count: [['warn', '5 warnings']],
    strip: { tone: 'warn', what: 'File updated', n: '1:48', sub: 'File set up, Theme applied, Sets added, Style guides drawn. 5 sets built with problems.', link: true } },
  'after-b-stopped': { posts: [[32, EIGHT]], proto: 'stopped', count: [['bad', '1 failed']],
    strip: { tone: 'bad', what: 'Stopped at Badge', n: '8 of 9 sets · 1:12', sub: 'Badge could not be built: Figma refused a write. The 8 sets built before it stay.', link: true } },
  'after-c-library-note': { posts: [[30, LIB]], proto: 'libraryNote', count: [],
    strip: { tone: 'ok', what: 'File updated', n: '0:41', sub: 'Theme applied, 4 sets updated. 1 note.', link: true } },
  'after-d-clean-rerun': { posts: [[33, NINE]], proto: 'cleanRerun', count: [],
    strip: { tone: 'ok', what: 'Theme applied', n: '0:09', sub: '', link: true } },
};

// ── the prototypes (run in the page) ─────────────────────────────────────────────────────────────────
const PROTO_CSS = `
.p3x-sec { margin: 0; color: var(--p3-text-2); font-size: var(--p3-fs-10); letter-spacing: .02em; text-transform: uppercase; }
.p3x-causes, .p3x-steps, .p3x-notes { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--p3-space-050, 4px); min-width: 0; }
.p3x-cause, .p3x-step, .p3x-row { min-width: 0; }
.p3x-what { white-space: nowrap; flex: none; }
.p3x-cause > summary, .p3x-step > summary, .p3x-row { list-style: none; display: flex; align-items: baseline; gap: var(--p3-space-075, 6px); cursor: pointer; min-width: 0; }
.p3x-cause > summary::-webkit-details-marker, .p3x-step > summary::-webkit-details-marker { display: none; }
.p3x-row { cursor: default; }
.p3x-cause > summary > .p3-ico:first-child, .p3x-step > summary > .p3-ico:first-child { flex: none; color: var(--p3-icon-2); align-self: center; width: 14px; height: 14px; }
.p3x-cause[open] > summary > .p3-ico:first-child, .p3x-step[open] > summary > .p3-ico:first-child { transform: rotate(90deg); }
.p3x-cause .p3-op-mark, .p3x-step .p3-op-mark, .p3x-row .p3-op-mark { align-self: center; }
.p3x-mark[data-state="note"] { color: var(--p3-icon-2); }
.p3x-subj { font-weight: var(--p3-fw-emphasis); white-space: nowrap; }
.p3x-step-tag { color: var(--p3-text-2); white-space: nowrap; flex: none; }
.p3x-first { color: var(--p3-text-1, inherit); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1 1 auto; }
.p3x-cause[open] .p3x-first { display: none; }
.p3x-body { display: grid; gap: var(--p3-space-050, 4px); padding: var(--p3-space-050, 4px) 0 var(--p3-space-075, 6px) 40px; }
.p3x-reasons { margin: 0; padding: 0 0 0 1.1em; display: grid; gap: 2px; overflow-wrap: anywhere; }
.p3x-say { margin: 0; overflow-wrap: anywhere; }
.p3x-say b { font-weight: var(--p3-fw-emphasis); }
.p3x-muted { color: var(--p3-text-2); }
.p3x-step-words { color: var(--p3-text-2); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p3x-step .p3-op-summary { padding-left: 40px; }
.p3x-link { all: unset; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; color: inherit; }
.p3x-link:focus-visible { outline: var(--p3-focus-width) solid var(--p3-focus-ring); outline-offset: 2px; border-radius: 2px; }
button.p3-drawer-count { all: unset; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.p3x-focus { outline: var(--p3-focus-width, 2px) solid var(--p3-focus-ring); outline-offset: 2px; border-radius: var(--p3-radius-md, 4px); }
`;

const ICONS = {
  chevr: ['M9 6l6 6l-6 6'], warn: ['M12 9v4', 'M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0', 'M12 16h.01'],
  error: ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0', 'M12 8v4', 'M12 16h.01'], check: ['M5 12l5 5l10 -10'], info: ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0', 'M12 9h.01', 'M11 12h1v4h1'], dash: ['M5 12l14 0'],
};

const PROTOS = {
  // Update file's one row (Q3326.4 A): the causes first (Q3326.1 A: each a disclosure, the first open), then the notes,
  // then the steps (each its own verdict, its lines behind it), then the next steps.
  firstRun: {
    title: 'Update file', kind: 'warn', words: 'File updated · 5 sets with problems', t: '12:30',
    causes: ['Button', 'Checkbox.Row', 'Checkbox.Group', 'Link', 'Badge'].map((s, i) => ({ kind: 'warn', step: 'To add', subj: s, what: 'built with problems', open: i === 0,
      reasons: ['No usage panel drawn: this file has no _Doc-block component yet.'],
      why: 'Set up file ran before Badge, Tag, List item and Divider were in the file, and _Doc-block is built from them.',
      todo: 'Run Update file again: Set up file now builds _Doc-block, and each set gets its panel. Or turn off Usage panels in Documentation.' })),
    notes: [{ step: 'Set up file', text: '_Doc-block not built: usage panels need Badge, Tag, List item and Divider first.' }],
    steps: [['ok', 'Set up file', 'File set up', ['pages: 31 created (Cover, About, Foundations, Icons & assets…)', 'built _Label + _Backdrop + _Scrim', '_Doc-block not built: usage panels need it.', 'built _Swatch + _Type specimen']],
      ['ok', 'Theme', 'Applied', THEME.lines], ['warn', 'To add', 'Built 9 sets · 5 with problems', NINE.lines.slice(0, 5)], ['ok', 'Style guides', '7 tables', GUIDES.lines]],
    next: ['Update again'],
  },
  stopped: {
    title: 'Update file', kind: 'bad', words: 'Stopped at Badge', t: '12:30',
    causes: [{ kind: 'bad', step: 'To add', subj: 'Badge', what: 'could not be built', open: true,
      reasons: ['Figma refused a write: “in set: node is not a component” on Badge / Size=Small.'],
      stays: 'The 8 sets built before it stay. Nothing was written to Badge’s page.',
      todo: 'Run Update file again. To add still holds Badge, and Style guides runs after it.' }],
    notes: [],
    steps: [['ok', 'Set up file', 'File set up', ['pages: 31 created (Cover, About, Foundations, Icons & assets…)']], ['ok', 'Theme', 'Applied', THEME.lines],
      ['bad', 'To add', 'Built 8 of 9 sets', EIGHT.lines.slice(0, 4)], ['dash', 'Style guides', 'Not run', []]],
    next: ['Update again'],
  },
  libraryNote: {
    title: 'Update file', kind: 'ok', words: 'File updated', t: '12:30',
    causes: [],
    notes: [{ step: 'Update sets in place', text: 'No usage panels drawn: this file has no _Doc-block component. Turn off Usage panels in Documentation, or run Set up file to add it.' }],
    steps: [['ok', 'Theme', 'Applied', ['palette 132 (+0)', 'color 412 (+3)', '1186 bindings']], ['ok', 'Update sets in place', '4 sets updated', LIB.lines.slice(0, 5)]],
    next: [], open: true,
  },
  cleanRerun: {
    title: 'Update file', kind: 'ok', words: 'Theme applied', t: '12:34', causes: [], notes: [],
    steps: [['ok', 'Theme', 'Applied', ['palette 132 (+0)', 'color 412 (+0)', '1186 bindings']]], next: [], open: true,
    history: [['warn', '12:30', 'File updated · 5 sets with problems']],
  },
};

const scenario = async (name, s, theme, w) => {
  const narrow = w < 600;
  const ctx = await browser.newContext({ viewport: { width: w, height: narrow ? 720 : 800 }, colorScheme: theme, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-11-02T12:29:00') });
  await page.goto(`${ORIGIN}/?figma=${theme}`, { waitUntil: 'load' });
  await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'restore-input-empty' } }, '*'));
  await page.locator('[data-p3="start-example"]').filter({ hasText: 'prism3' }).first().click();
  await page.waitForSelector('[data-p3="frame"]');
  await page.clock.runFor(1500);
  for (const [min, m] of s.posts) {
    await page.clock.setFixedTime(new Date(`2026-11-02T12:${String(min).padStart(2, '0')}:05`));
    await page.evaluate((x) => window.postMessage({ pluginMessage: x }, '*'), m);
    await page.clock.runFor(300);
  }
  // Open the drawer if a clean result left it closed (a person clicked it open).
  await page.evaluate(() => { const d = document.querySelector('[data-p3="activity-drawer"]'); if (d?.dataset.open !== 'true') document.querySelector('[data-p3="activity-toggle"]')?.click(); });
  await page.clock.runFor(300);
  for (const k of s.expand ?? []) await page.evaluate((k) => { const r = document.querySelector(`[data-p3="activity-op"][data-op="${k}"] [data-p3="op-head"]`); if (r?.getAttribute('aria-expanded') !== 'true') r?.click(); }, k);
  await page.clock.runFor(300);
  await page.evaluate(({ s, css, protos, icons, narrow }) => {
    const ico = (n) => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'p3-ico'); svg.setAttribute('viewBox', '0 0 24 24');
      for (const [k, v] of [['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '1.5'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round']]) svg.setAttribute(k, v);
      for (const d of icons[n]) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); svg.append(p); } return svg; };
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const mark = (state) => { const m = el('span', 'p3-op-mark p3x-mark'); m.dataset.state = state; m.append(ico(state === 'ok' ? 'check' : state === 'warn' ? 'warn' : state === 'bad' ? 'error' : state === 'note' ? 'info' : 'dash')); return m; };
    // The strip's verdict line, in the real node.
    if (s.strip) {
      const st = document.querySelector('[data-p3="status-strip"]');
      st.hidden = false; st.dataset.kind = 'verdict'; st.dataset.tone = s.strip.tone;
      const mk = st.querySelector('[data-p3="status-mark"]'); mk.hidden = false; mk.dataset.state = s.strip.tone; mk.replaceChildren(ico(s.strip.tone === 'ok' ? 'check' : s.strip.tone === 'warn' ? 'warn' : 'error'));
      st.querySelector('[data-p3="status-what"]').textContent = s.strip.what;
      const n = st.querySelector('[data-p3="status-n"]'); n.textContent = s.strip.n; n.hidden = false;
      const bar = st.querySelector('[data-p3="status-bar"]'); if (bar) bar.hidden = true;
      const line = st.querySelector('[data-p3="status-line"]'); line.hidden = false; line.replaceChildren(s.strip.sub ? `${s.strip.sub} ` : '');
      if (s.strip.link) line.append(el('button', 'p3x-link', 'Details in Activity'));
      const stop = st.querySelector('[data-p3="status-stop"]'); if (stop) stop.hidden = true;
    }
    if (!s.proto) return;
    const st = document.createElement('style'); st.textContent = css; document.head.append(st);
    const P = protos[s.proto];
    // The bar row and the 380 sheet's header: Update file leads; the count is the latest run's (Q3326.2 A), a button.
    const bar = document.querySelector('[data-p3="activity-toggle"]');
    const leadMark = bar.querySelector(':scope > .p3-op-mark'); if (leadMark) leadMark.replaceWith(mark(P.kind));
    const last = bar.querySelector('.p3-drawer-last'); if (last) { last.querySelector('b').textContent = 'Update file'; const v = last.querySelector('[data-p3="activity-verdict"]'); v.textContent = P.words.split(' · ')[0]; v.dataset.state = P.kind; }
    const when = bar.querySelector('.p3-drawer-text > .p3-op-when'); if (when) when.textContent = P.t;
    const counts = (box) => { box.querySelectorAll('.p3-drawer-count').forEach((c) => c.remove());
      const at = box.querySelector('.p3-drawer-link') ?? null;
      for (const [k, words] of s.count) { const c = el('button', 'p3-drawer-count'); c.dataset.kind = k; c.append(ico(k === 'bad' ? 'error' : 'warn'), words); box.insertBefore(c, at); } };
    counts(bar.querySelector('.p3-drawer-text')); counts(document.querySelector('.p3-drawer-counts'));
    // The row.
    const row = el('div', 'p3-op'); row.dataset.op = 'update'; row.dataset.kind = P.kind;
    const head = el('button', 'p3-op-head'); head.setAttribute('aria-expanded', 'true');
    const words = el('span', 'p3-op-verdict', P.words); words.dataset.state = P.kind;
    head.append(ico('chevr'), mark(P.kind), el('b', null, P.title), words, el('span', 'p3-op-when', P.t));
    const body = el('div', 'p3-op-body');
    if (P.causes.length) {
      const ul = el('ul', 'p3x-causes');
      P.causes.forEach((c, i) => {
        const d = el('details', 'p3x-cause'); d.open = !!c.open;
        const sum = el('summary'); const subj = el('span', 'p3x-subj', `${c.subj}:`);
        sum.append(ico('chevr'), mark(c.kind), subj, el('span', 'p3x-what', c.what), el('span', 'p3x-first', `· ${c.reasons[0]}`));
        if (!narrow) sum.append(el('span', 'p3x-step-tag', c.step));
        if (i === 0) sum.classList.add('p3x-focus');
        const b = el('div', 'p3x-body');
        if (narrow) b.append(el('p', 'p3x-say p3x-muted', `Step: ${c.step}`));
        const rs = el('ul', 'p3x-reasons'); for (const r of c.reasons) rs.append(el('li', null, r)); b.append(rs);
        if (c.why) b.append(el('p', 'p3x-say p3x-muted', c.why));
        if (c.stays) { const p = el('p', 'p3x-say'); p.append(el('b', null, 'What stays: '), c.stays); b.append(p); }
        if (c.todo) { const p = el('p', 'p3x-say'); p.append(el('b', null, 'What to do: '), c.todo); b.append(p); }
        d.append(sum, b); ul.append(d);
      });
      body.append(ul);
    }
    if (P.notes.length) {
      body.append(el('p', 'p3x-sec', P.notes.length === 1 ? 'Note' : 'Notes'));
      const ul = el('ul', 'p3x-notes');
      for (const n of P.notes) { const li = el('li', 'p3x-row'); const t = el('span', 'p3x-say'); t.append(el('span', 'p3x-subj', `${n.step}: `), n.text); li.append(mark('note'), t); ul.append(li); }
      body.append(ul);
    }
    body.append(el('p', 'p3x-sec', 'Steps'));
    const steps = el('ul', 'p3x-steps');
    for (const [k, nm, wd, lines] of P.steps) {
      const d = el('details', 'p3x-step'); const sum = el('summary');
      sum.append(lines.length ? ico('chevr') : el('span', null, ''), mark(k), el('b', null, nm), el('span', 'p3x-step-words', wd));
      if (!lines.length) sum.firstChild.style.width = '14px';
      const ls = el('ul', 'p3-op-summary'); for (const l of lines) ls.append(el('li', 'p3-op-line', l));
      d.append(sum, ls); steps.append(d);
    }
    body.append(steps);
    if (P.next.length || P.causes.length) {
      const nx = el('div', 'p3-op-next');
      for (const n of P.next) nx.append(el('button', 'p3-btn', n));
      nx.append(el('button', 'p3-btn p3-btn-ghost', 'Copy details'));
      body.append(nx);
    }
    if (P.history) {
      const d = el('details', 'p3-op-history'); d.open = true; d.append(el('summary', null, `Earlier results (${P.history.length})`));
      const ul = el('ul');
      for (const [k, t, w] of P.history) { const li = el('li', 'p3-op-entry-row'); const hd = el('span', 'p3-op-entry-head'); hd.append(ico('chevr'), mark(k), el('span', 'p3-op-when', t), el('span', null, w)); li.append(hd); ul.append(li); }
      d.append(ul); body.append(d);
    }
    row.append(head, body);
    const ops = document.querySelector('.p3-ops');
    ops.replaceChildren(row);
  }, { s, css: PROTO_CSS, protos: PROTOS, icons: ICONS, narrow });
  await page.clock.runFor(300);
  await page.waitForTimeout(900);
  const file = join(OUT, `${name}-${w}-${theme}.png`);
  if (narrow) await page.screenshot({ path: file });
  else {
    const box = await page.locator('[data-p3="activity-drawer"]').boundingBox();
    const y = Math.max(0, box.y - 8);
    const x = Math.max(0, box.x - 8);
    await page.screenshot({ path: file, clip: { x, y, width: Math.min(w - x, box.width + 16), height: Math.min(800 - y, box.height + 8) } });
  }
  if (errors.length) console.log(`  ! ${name} ${w} ${theme}: ${errors.join(' | ')}`);
  await ctx.close();
  console.log(`  ✓ ${file}`);
};

const only = process.env.ONLY;
for (const [name, s] of Object.entries(SCEN)) {
  if (only && !name.includes(only)) continue;
  for (const theme of ['light', 'dark']) for (const w of [1280, 380]) await scenario(name, s, theme, w);
}
await browser.close();
server.close();
