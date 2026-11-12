// Update file dialog: redesign mocks (#3712). Shared by every direction: the states, the strings, the model the
// directions draw from, and small DOM helpers. A design exploration, not product code: nothing here ships.
//
// STRINGS. `C` is copied word for word from `UPDATE_COPY` (apps/studio/src/state/update-file.ts) and `STRIP_COPY`
// (apps/studio/src/state/status-strip.ts) as they stand on main. `U` holds the #3711 strings (Q-UF1–3), DRAFT until the
// owner approves them there. `D` holds the strings these mocks add, each DRAFT. Every node that shows a `U` or `D` string
// carries `data-draft`, and the DRAFT marks toggle in the toolbar outlines it.

/* global ICONS */
const plural = (n) => `${n} set${n === 1 ? '' : 's'}`;

const C = {
  title: 'Update file', tabUpdate: 'Update', tabClean: 'Clean up',
  checking: 'Checking the file…',
  leadFresh: 'This file isn’t set up for Prism3 yet. This first update sets it up.',
  lead: 'Tick what to write. Untick what should wait.',
  setup: 'Set up file',
  setupSub: 'The pages, the templates and the style-guide cells. The cover too, while Documentation has it on.',
  theme: 'Theme', themeSub: 'The brand’s variables and styles. Layers bound to them restyle at once.',
  themeCurrent: 'Up to date',
  components: 'Components', toAdd: 'To add',
  toAddSub: (n) => `${plural(n)} chosen on Components. Each is added with its usage panel while Documentation has panels on.`,
  removeSet: (name) => `Remove ${name} from To add`,
  alsoAdds: (names) => `Also adds: ${names.join(', ')}.`,
  removeAll: 'Remove all',
  queueFresh: (n) => `Nothing chosen yet. This file holds none of the ${n} component sets.`,
  addAll: (n) => `Add all ${n}`,
  due: 'Due', dueSub: (n) => `${plural(n)} to update in place. Ticked by default.`,
  whySettings: 'Due · its settings changed',
  whyExecutor: 'Engine update: Prism3 draws components differently',
  checkReading: 'Reading this file…',
  checkedOf: (done, total) => `Checked ${done} of ${plural(total)}`,
  checkingSet: 'Checking…',
  checked: (c) => c.upToDate ? 'No member changes' : [`${c.update} of ${c.members} members change`, c.add ? `${c.add} added` : '', c.drop ? `${c.drop} kept and marked deprecated` : '', c.handEdited ? `${c.handEdited} edited by hand` : ''].filter(Boolean).join(' · '),
  handHint: {
    keep: 'Keep: each edit stays. A set whose edits hold back changes is listed under Kept edits until resolved.',
    overwrite: 'Overwrite: the plan’s values replace each edit.',
    accept: 'Accept as baseline: each edit stays and becomes the record, so it is no longer listed.',
  },
  kept: 'Kept edits',
  keptSub: (n) => `${plural(n)} hold hand edits over changes the plan makes. Each stays here until Overwrite or Accept as baseline is chosen for it.`,
  keptLine: (h) => `${h.members} member${h.members === 1 ? ' keeps' : 's keep'} out ${h.changes.length} of the plan’s values${h.changes.length ? `: ${h.changes.slice(0, 3).join(', ')}${h.changes.length > 3 ? `, ${h.changes.length - 3} more` : ''}` : ''}`,
  keptChoice: (name) => `Hand edits on ${name}`,
  handChoice: { keep: 'Keep', overwrite: 'Overwrite', accept: 'Accept as baseline' },
  saves: 'Saves a version first. If Figma refuses the save, nothing is written.',
  guides: 'Style guides', guidesSub: 'Drawn with the settings in Documentation. A rerun updates each table in place.',
  go: 'Update file', goFresh: 'Set up and update', cancel: 'Cancel', close: 'Close',
  cleanLead: 'Things Prism3 wrote earlier and no longer writes. Nothing here rides Update file.',
  cleanNone: 'Nothing stale in this file.',
  page: (p) => `↳ ${p}`,
  details: 'Details in Activity.',
};

// #3711 (Q-UF1 A, Q-UF2 A, Q-UF3 A): the issue's own example strings. DRAFT there until the owner approves them.
const U = {
  ranWarn: (n, check) => `Updated ${n} sets · ${check} to check`,
  affects: (n, what) => `${n} change${n === 1 ? ' affects' : 's affect'} files that use this library: ${what}. Their instances keep working and show as deprecated.`,
  goWith: (n) => `Update, including ${n} library change${n === 1 ? '' : 's'}`,
};

// New strings these mocks need. Each DRAFT, for the owner's sign-off with the direction.
const D = {
  lastRun: 'Last update',
  toCheckSub: 'Each was written but differs from the plan. Fix it by hand, or run it again.',
  checkLines: {
    tabs: 'Its Indicator part is 24 wide; the plan draws it 32. Set it by hand.',
    slider: '2 members aren’t finished: Disabled and Focus. Run it again, or finish them by hand.',
  },
  blocked: 'Can’t be updated in place',
  blockedWhy: 'The plan replaces its Calendar layer, and an in-place update would drop the overrides instances hold on it. Rebuild it from Components.',
  offNothing: 'Nothing to write: Theme is up to date, Date picker can’t be updated in place, and each kept set is on Keep.',
  offClean: 'Nothing to write. Tick Theme or Style guides to write them again.',
  offWaiting: 'Waits for the check to finish.',
  allCurrent: 'Every set in this file is up to date.',
  libTitle: 'Library changes',
  needs: 'Needs a decision',
  writes: 'This update writes',
  off: 'Off',
  sets: (n) => plural(n),
  compSummary: (parts) => parts.filter(Boolean).join(' · '),
  blockedN: (n) => `${n} can’t update`,
  keptN: (n) => `${n} kept edits`,
  dueN: (n) => `${n} due`,
  addN: (n) => `${n} to add`,
  willRun: (n) => `${n} will run`,
  noneDue: 'Nothing due',
};

// ── the demo file ────────────────────────────────────────────────────────────────────────────────
// A neutral demo brand and the engine's own generic component names. No client, file or key.
const KEPT = [
  { id: 'button', name: 'Button', held: { members: 4, changes: ['padding', 'corner radius', 'label weight', 'focus ring', 'gap'] }, check: { members: 9, update: 4, add: 0, drop: 0, handEdited: 4 } },
  { id: 'icon-button', name: 'Icon button', held: { members: 2, changes: ['size', 'icon color'] }, check: { members: 12, update: 6, add: 0, drop: 2, handEdited: 2 }, lib: { n: 2, what: '2 Icon button members retired' } },
  { id: 'text-field', name: 'Text field', held: { members: 3, changes: ['border width', 'hint color', 'height'] }, check: { members: 8, update: 3, add: 0, drop: 0, handEdited: 3 } },
  { id: 'select', name: 'Select', held: { members: 1, changes: ['chevron size'] }, check: { members: 6, update: 1, add: 0, drop: 0, handEdited: 1 } },
  { id: 'checkbox', name: 'Checkbox', held: { members: 2, changes: ['box radius', 'label gap'] }, check: { members: 10, update: 2, add: 0, drop: 0, handEdited: 2 } },
];
const BLOCKED = { id: 'date-picker', name: 'Date picker', why: C.whyExecutor };
const TO_CHECK = [{ name: 'Tabs', line: D.checkLines.tabs }, { name: 'Slider', line: D.checkLines.slider }];
const QUEUE = [
  { id: 'button', name: 'Button', page: null }, { id: 'icon-button', name: 'Icon button', page: 'Button' },
  { id: 'checkbox', name: 'Checkbox', page: null }, { id: 'text-field', name: 'Text field', page: null },
  { id: 'select', name: 'Select', page: null }, { id: 'tabs', name: 'Tabs', page: null },
];
const CHECKING = [
  { id: 'button', name: 'Button', why: C.whySettings, line: { members: 9, update: 4, add: 0, drop: 0, handEdited: 0 } },
  { id: 'checkbox', name: 'Checkbox', why: C.whyExecutor, line: 'checking' },
  { id: 'tabs', name: 'Tabs', why: C.whySettings, line: null },
];

// ── the states ───────────────────────────────────────────────────────────────────────────────────
const CASES = {
  owner: { label: '2026-11-12 run', kept: {} },
  chosen: { label: '…Overwrite on 2', kept: { button: 'overwrite', 'icon-button': 'overwrite' } },
  clean: { label: 'All up to date' },
  fresh: { label: 'Fresh file' },
  checking: { label: 'Checking' },
};

const S = { case: 'owner', tab: 'update', theme: false, guides: false, setup: false, kept: {}, queue: [], open: {}, w: 'wide', mode: 'light', draft: true };
const load = (k) => {
  Object.assign(S, { case: k, tab: 'update', kept: { ...(CASES[k].kept ?? {}) }, open: {} });
  S.theme = k === 'fresh';
  S.setup = k === 'fresh';
  S.guides = k === 'fresh';
  S.queue = k === 'fresh' ? QUEUE.map((q) => q.id) : [];
};

// What the dialog shows, derived from the state, so every direction draws the same facts.
const model = () => {
  const k = S.case;
  const fresh = k === 'fresh';
  const owner = k === 'owner' || k === 'chosen';
  const kept = owner ? KEPT.map((s) => ({ ...s, choice: S.kept[s.id] ?? 'keep' })) : [];
  const keptRun = kept.filter((s) => s.choice !== 'keep');
  const lib = keptRun.filter((s) => s.choice === 'overwrite' && s.lib).map((s) => s.lib);
  const libN = lib.reduce((n, l) => n + l.n, 0);
  const queue = QUEUE.filter((q) => S.queue.includes(q.id));
  const due = k === 'checking' ? CHECKING : [];
  const blocked = owner ? [BLOCKED] : [];
  const waiting = k === 'checking';
  const runs = [
    fresh && S.setup && 'setup', S.theme && 'theme',
    (keptRun.length || (due.length && !waiting)) && 'update', queue.length && 'sets', S.guides && 'guides',
  ].filter(Boolean);
  const off = waiting ? D.offWaiting : runs.length ? null : owner ? D.offNothing : D.offClean;
  return {
    fresh, owner, kept, keptRun, lib, libN, queue, due, blocked, waiting, runs, off,
    lastRun: owner ? { what: U.ranWarn(47, 2), sets: TO_CHECK } : null,
    themeCurrent: !fresh,
    allCurrent: k === 'clean',
    progress: waiting ? { done: 1, total: 3 } : null,
    saves: keptRun.length > 0 || (due.length > 0 && !waiting),
    go: libN ? U.goWith(libN) : fresh ? C.goFresh : C.go,
    goDraft: libN > 0,
    also: fresh && queue.length ? ['Icon', 'Focus ring'] : [],
  };
};

// ── DOM helpers: the chrome's own classes wherever the dialog already uses one ───────────────────
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const draft = (n) => { n.dataset.draft = ''; return n; };
const ico = (name) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'p3-ico');
  svg.setAttribute('viewBox', '0 0 24 24');
  for (const [a, v] of [['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '1.5'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true']]) svg.setAttribute(a, v);
  for (const d of ICONS[name]) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); svg.append(p); }
  return svg;
};
const btn = (cls, text, onClick) => { const b = el('button', `p3-btn ${cls}`, text); b.type = 'button'; if (onClick) b.onclick = () => { onClick(); paint(); }; return b; };
/** The dialog's tick: `.p3-check` with its box, a label, and the click that toggles it. */
const tick = (on, label, toggle, cls = '') => {
  const b = el('button', `p3-btn p3-btn-page p3-check p3-upd-check ${cls}`);
  b.type = 'button';
  b.setAttribute('role', 'checkbox');
  b.setAttribute('aria-checked', String(on));
  const bx = el('span', 'p3-check-box');
  bx.append(ico('check'));
  b.append(bx, ...[label].flat());
  b.onclick = () => { toggle(); paint(); };
  return b;
};
const tag = (text, kind) => { const t = el('span', 'p3-sg-tag', text); if (kind) t.dataset.kind = kind; return t; };
const sub = (text, cls = '') => el('p', `p3-sub ${cls}`, text);
/** A kept set's choice, as the dialog draws it today: the chrome's select. */
const choiceSelect = (s) => {
  const sw = el('div', 'p3-selwrap');
  const sel = el('select', 'p3-select');
  sel.setAttribute('aria-label', C.keptChoice(s.name));
  for (const k of ['keep', 'overwrite', 'accept']) { const o = el('option', null, C.handChoice[k]); o.value = k; sel.append(o); }
  sel.value = s.choice;
  sel.onchange = () => { S.kept[s.id] = sel.value; paint(); };
  sw.append(sel, ico('chev'));
  return sw;
};
/** A kept set's choice as three visible segments (Direction B). */
const choiceSeg = (s) => {
  const seg = el('div', 'p3-seg mk-seg');
  seg.setAttribute('role', 'radiogroup');
  seg.setAttribute('aria-label', C.keptChoice(s.name));
  for (const k of ['keep', 'overwrite', 'accept']) {
    const b = el('button', 'p3-seg-tab', C.handChoice[k]);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(s.choice === k));
    b.onclick = () => { S.kept[s.id] = k; paint(); };
    seg.append(b);
  }
  return seg;
};
const progress = (p) => {
  const wrap = el('div', 'p3-upd-progress');
  const bar = el('progress', 'p3-op-prog p3-upd-prog');
  bar.max = p.total; bar.value = p.done;
  wrap.append(bar, sub(C.checkedOf(p.done, p.total), 'p3-upd-progtext'));
  return wrap;
};
/** The #3711 Q-UF2 callout: each library change, above the Update button. */
const libCallout = (m, cls = '') => {
  const box = el('div', `mk-lib ${cls}`);
  box.append(ico('warn'));
  const text = el('div', 'mk-lib-text');
  text.append(draft(el('b', null, D.libTitle)), ...m.lib.map((l) => draft(el('p', null, U.affects(l.n, l.what)))));
  box.append(text);
  return box;
};
/** The foot shared by every direction: the reason the action is off, or the check's progress; then Cancel and the action. */
const footRow = (m) => {
  const row = el('div', 'mk-footrow');
  if (m.progress) row.append(progress(m.progress));
  if (m.off) row.append(draft(el('p', 'p3-sub mk-off', m.off)));
  else row.append(el('span', 'mk-spacer'));
  const go = btn('p3-btn-primary', m.go);
  if (m.goDraft) draft(go);
  go.disabled = !!m.off;
  row.append(btn('p3-btn-page', C.cancel), go);
  return row;
};

// ── the frame every direction shares: head, tabs, body, foot ─────────────────────────────────────
let DIRECTION = null;
const paint = () => {
  document.documentElement.dataset.theme = S.mode;
  document.documentElement.dataset.drafts = String(S.draft);
  const win = document.querySelector('.mk-window');
  win.dataset.w = S.w;
  for (const b of document.querySelectorAll('[data-case]')) b.setAttribute('aria-pressed', String(b.dataset.case === S.case));
  for (const b of document.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode));
  for (const b of document.querySelectorAll('[data-width]')) b.setAttribute('aria-pressed', String(b.dataset.width === S.w));
  const m = model();
  const dlg = el('div', `p3-bardlg p3-upd mk-dlg mk-${DIRECTION.key}`);
  dlg.setAttribute('role', 'dialog');
  dlg.setAttribute('aria-label', C.title);
  const head = el('div', 'p3-bardlg-head');
  const x = btn('p3-btn-ghost p3-btn-icon');
  x.setAttribute('aria-label', C.close);
  x.append(ico('x'));
  head.append(el('h2', 'p3-bardlg-title', C.title), x);
  const tabs = el('div', 'p3-tabs p3-upd-tabs');
  tabs.setAttribute('role', 'tablist');
  for (const k of ['update', 'clean']) {
    const t = el('button', 'p3-tab', k === 'update' ? C.tabUpdate : C.tabClean);
    t.type = 'button';
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-selected', String(S.tab === k));
    t.onclick = () => { S.tab = k; paint(); };
    tabs.append(t);
  }
  const { body, foot } = S.tab === 'update' ? DIRECTION.update(m) : DIRECTION.clean(m);
  const bodyEl = el('div', `p3-bardlg-col p3-upd-body mk-body`);
  bodyEl.append(...body);
  const footEl = el('div', 'p3-bardlg-foot mk-foot');
  footEl.append(...foot);
  dlg.append(head, tabs, bodyEl, footEl);
  document.querySelector('.mk-scrim').replaceChildren(dlg);
};
const cleanDefault = () => ({
  body: [sub(C.cleanLead, 'mk-lead'), el('p', 'p3-upd-summary', C.cleanNone)],
  foot: [(() => { const r = el('div', 'mk-footrow'); r.append(el('span', 'mk-spacer'), btn('p3-btn-page', C.close)); return r; })()],
});

const mount = (direction) => {
  DIRECTION = direction;
  const tools = document.querySelector('.mk-cases');
  for (const [k, c] of Object.entries(CASES)) {
    const b = el('button', 'mk-tool', c.label);
    b.type = 'button';
    b.dataset.case = k;
    b.onclick = () => { load(k); paint(); };
    tools.append(b);
  }
  for (const b of document.querySelectorAll('[data-mode]')) b.onclick = () => { S.mode = b.dataset.mode; paint(); };
  for (const b of document.querySelectorAll('[data-width]')) b.onclick = () => { S.w = b.dataset.width; paint(); };
  document.querySelector('[data-drafts]').onclick = () => { S.draft = !S.draft; paint(); };
  // The screenshot script drives the same entry points through the URL: ?case=owner&mode=dark&w=narrow&drafts=0.
  const q = new URLSearchParams(location.search);
  load(q.get('case') && CASES[q.get('case')] ? q.get('case') : 'owner');
  if (q.get('mode')) S.mode = q.get('mode');
  if (q.get('w')) S.w = q.get('w');
  if (q.get('drafts') === '0') S.draft = false;
  // Full length: the window grows to the dialog, for a screenshot that shows every row. The real window scrolls the body.
  if (q.get('full') === '1') document.documentElement.dataset.full = 'true';
  if (q.get('open')) for (const k of q.get('open').split(',')) S.open[k] = true;
  paint();
};
