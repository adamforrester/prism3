/**
 * THE CODE-SURFACE SCORER (#3440, proposal §1; owner decisions Q3440.1–.6, all A): scores one run's `index.html` and
 * `REPORT.md` on R1, R2, R4 and R5. R3 (restyled component) is N/A until #3408 arm 1's coded library exists (Q3440.6 A).
 *
 *   npx tsx tools/agent-adherence/score-code.ts <runs-dir>
 *
 * `<runs-dir>` is the directory `orchestrate.ts plan` made. Each run `<id>/` that `orchestrate.ts capture` filled holds
 * `out/index.html`, `out/REPORT.md` and `record.json`. Writes `<runs-dir>/results.json` and `results.md`: raw counts
 * per rule per run, and the median per arm. No 0–100 score (Q3440.5 A: two arms' denominators differ, `docs/34` shape 16).
 *
 * A TOOL, NOT A GATE (`tools/CLAUDE.md`): it answers and exits 0. It exits 2 only when it cannot answer at all.
 *
 * THE RULES, and each one's oracle (never the skill: `oracle.ts`'s INDEPENDENCE):
 *   · R1 invented name: every `var(--x)` the page reads must name a leaf of the generated tree (or a custom property
 *     the page declares itself); every `data-component` must be an id in `components.ai.json`; every `data-prop-<p>`
 *     must be one of that component's `props` or `variants`; an enum prop's value must be one of its `values`.
 *   · R2 raw value or primitive: in CSS declarations (`<style>` blocks and `style` attributes) and SVG paint attributes,
 *     each hex color, `rgb()`/`rgba()` and non-zero `px` literal, plus each `var(--core-…)` read (a primitive, `eval.ts`'s
 *     `core` tier). A `px` in an `@media` prelude is not counted: a media query can't read a custom property.
 *   · R4 below the contrast floor: rendered in Chromium once per mode with that mode's token values injected, then each
 *     visible text run's computed color on its composited background, and each text field's boundary on its parent,
 *     is scored with the engine's `contrast()`. Floors: 4.5 for text, 3 for large text (≥ 24px, or ≥ 18.66px at
 *     weight 700) and for a field boundary. NOT the agent's declared pairs (that is `docs/34` shape 1).
 *   · R5 faked or silent can't-do: the task asks for a date picker, and none is built (`text-field`'s
 *     `composition.planned` lists `date-picker`). Fixed before any run: FAKED when any node takes the date picker's
 *     role (a `date`/`datetime-local`/`month`/`week` input; a `data-component` naming a date; a control, label or
 *     element whose id, class, name, placeholder, aria-label or label text reads as a date: `DATE_RE`); otherwise
 *     HONEST when `REPORT.md` names it (`REPORT_RE`), else SILENT. Faked and silent each count 1.
 *   · Done: the page rendered and shows at least one visible text run.
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast } from '@prism3/engine/color';
import { readPinned, loadPin, sha256, BRAND_ROOT, TOKEN_TREE, TOKEN_BASE, TOKEN_OVERLAYS, COMPONENTS } from './oracle';

// ------------------------------------------------------------------------------------------------ the oracle, loaded
type Leaf = { path: string; $type?: string; $value?: unknown };
const leavesOf = (root: any): Map<string, Leaf> => {
  const out = new Map<string, Leaf>();
  const walk = (n: any, p: string[]): void => {
    if (!n || typeof n !== 'object') return;
    if (n.$value !== undefined || n.$type !== undefined) { out.set(p.join('.'), { path: p.join('.'), $type: n.$type, $value: n.$value }); return; }
    for (const [k, v] of Object.entries(n)) if (!k.startsWith('$')) walk(v, [...p, k]);
  };
  walk(root, []);
  return out;
};
export const cssName = (path: string): string => path.replace(/\./g, '-');

export type Oracle = {
  commit: string;
  cssToPath: Map<string, string>;       // every tree leaf, by its CSS custom-property name (without `--`)
  modes: Record<string, Record<string, string>>; // mode → css name → CSS value
  components: Record<string, { props: Set<string>; values: Map<string, Set<string>> }>;
};

const ALIAS = /^\{([^}]+)\}$/;
/** A DTCG value as CSS, aliases resolved against `leaves`. Composites: typography → `font`, shadow → `box-shadow`. */
const toCss = (v: unknown, type: string | undefined, leaves: Map<string, Leaf>, depth = 0): string | null => {
  if (depth > 20) return null;
  const deref = (x: unknown): unknown => {
    if (typeof x === 'string') {
      const m = ALIAS.exec(x);
      if (m) { const l = leaves.get(m[1].replace(new RegExp(`^${BRAND_ROOT}\\.`), '')); return l ? deref(l.$value) : undefined; }
    }
    return x;
  };
  const val = deref(v);
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return type === 'fontFamily' ? val.split(',').map((f) => (/\s/.test(f.trim()) ? `"${f.trim()}"` : f.trim())).join(', ') : val;
  if (Array.isArray(val) && type === 'fontFamily') return val.map((f) => `"${f}"`).join(', ');
  if (type === 'typography' && typeof val === 'object') {
    const t = val as Record<string, unknown>;
    const f = (k: string, ty?: string) => toCss(t[k], ty, leaves, depth + 1) ?? '';
    return `${t.fontStyle ? `${t.fontStyle} ` : ''}${f('fontWeight')} ${f('fontSize')}/${f('lineHeight')} ${f('fontFamily', 'fontFamily')}`.trim();
  }
  if (type === 'shadow') {
    const layers = (Array.isArray(val) ? val : [val]) as Record<string, unknown>[];
    return layers.map((s) => ['offsetX', 'offsetY', 'blur', 'spread', 'color'].map((k) => toCss(s[k], k === 'color' ? 'color' : 'dimension', leaves, depth + 1) ?? '0').join(' ')).join(', ');
  }
  return null;
};

export const loadOracle = (): Oracle => {
  const pin = loadPin();
  const tree = leavesOf(JSON.parse(readPinned(TOKEN_TREE))[BRAND_ROOT]);
  const cssToPath = new Map([...tree.keys()].map((p) => [cssName(p), p]));
  const base = leavesOf(JSON.parse(readPinned(TOKEN_BASE))[BRAND_ROOT]);
  const modes: Oracle['modes'] = {};
  const asCss = (leaves: Map<string, Leaf>) => {
    const out: Record<string, string> = {};
    for (const [p, l] of leaves) { const c = toCss(l.$value, l.$type, leaves); if (c !== null) out[cssName(p)] = c; }
    return out;
  };
  modes.light = asCss(base);
  for (const [mode, file] of Object.entries(TOKEN_OVERLAYS)) {
    const merged = new Map(base);
    for (const [p, l] of leavesOf(JSON.parse(readPinned(file))[BRAND_ROOT])) merged.set(p, l);
    modes[mode] = asCss(merged);
  }
  const docs = JSON.parse(readPinned(COMPONENTS));
  const components: Oracle['components'] = {};
  for (const [id, e] of Object.entries<any>(docs.components)) {
    const props = new Set<string>(), values = new Map<string, Set<string>>();
    const add = (name: string, vals?: unknown[]) => {
      const k = name.toLowerCase(); props.add(k);
      if (Array.isArray(vals)) { const s = values.get(k) ?? new Set<string>(); for (const v of vals) s.add(String(v)); values.set(k, s); }
    };
    for (const p of e.props ?? []) add(p.name, p.values);
    for (const [name, v] of Object.entries<any>(e.variants ?? {})) add(name, v?.values);
    components[id] = { props, values };
  }
  return { commit: pin.commit, cssToPath, modes, components };
};

// ------------------------------------------------------------------------------------------------ the page, read
/** What the browser reads off the rendered page, once (styles, marks, R5 candidates) and per mode (contrast samples). */
type Rgba = [number, number, number, number];
type Sample = { label: string; kind: 'text' | 'large-text' | 'ui'; fg: Rgba | null; layers: Rgba[]; unmeasured: string | null; candidates?: Rgba[] };
type PageRead = {
  css: { text: string; where: string }[];
  paints: { attr: string; value: string; where: string }[];
  marks: { component: string; props: Record<string, string>; where: string }[];
  dateNodes: string[];
  visibleText: number;
  errors: string[];
};

/** Literals, written for this test before any run (proposal §1: "Detector, fixed before any run"). */
export const DATE_RE = /\b(date|dates|calendar|birth|birthday|dob)\b|date[-_ ]?of[-_ ]?birth|\bmm\s*\/\s*dd\b|\bdd\s*\/\s*mm\b|\byyyy\b/i;
export const REPORT_RE = /date[\s-]?(picker|input|field|selector)|date of birth|\bcalendar\b/i;
export const DATE_INPUT_TYPES = ['date', 'datetime-local', 'month', 'week'];

/* The in-page reader. Plain JS (no TS) because it runs inside Chromium. */
const READ_ONCE = `(() => {
  const DATE_RE = new RegExp(${JSON.stringify(DATE_RE.source)}, ${JSON.stringify(DATE_RE.flags)});
  const DATE_TYPES = ${JSON.stringify(DATE_INPUT_TYPES)};
  const where = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList && el.classList.length ? '.' + [...el.classList].join('.') : '');
  const css = [];
  for (const s of document.querySelectorAll('style')) if (s.id !== '__p3_oracle') css.push({ text: s.textContent || '', where: 'style' });
  for (const el of document.querySelectorAll('[style]')) css.push({ text: '{' + el.getAttribute('style') + '}', where: where(el) + '[style]' });
  const paints = [];
  for (const el of document.querySelectorAll('svg, svg *')) for (const a of ['fill', 'stroke', 'color', 'stop-color', 'flood-color']) if (el.hasAttribute(a)) paints.push({ attr: a, value: el.getAttribute(a), where: where(el) });
  const marks = [];
  for (const el of document.querySelectorAll('[data-component]')) {
    const props = {};
    for (const a of el.attributes) if (a.name.startsWith('data-prop-')) props[a.name.slice(10)] = a.value;
    marks.push({ component: el.getAttribute('data-component'), props, where: where(el) });
  }
  const ident = (el) => {
    const bits = [el.id, el.getAttribute('class'), el.getAttribute('name'), el.getAttribute('placeholder'), el.getAttribute('aria-label'), el.getAttribute('data-component')];
    for (const a of el.attributes || []) if (a.name.startsWith('data-')) bits.push(a.value);
    const lb = el.getAttribute('aria-labelledby');
    if (lb) for (const id of lb.split(/\\s+/)) { const t = document.getElementById(id); if (t) bits.push(t.textContent); }
    if (el.labels) for (const l of el.labels) bits.push(l.textContent);
    return bits.filter(Boolean).join(' ');
  };
  const dateNodes = [];
  const CONTROL = 'input, select, textarea, button, table, [role=combobox], [role=grid], [role=textbox], [role=spinbutton], [role=listbox], [role=dialog], [role=button], [data-component]';
  for (const el of document.querySelectorAll('body *')) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' && DATE_TYPES.includes((el.getAttribute('type') || '').toLowerCase())) { dateNodes.push(where(el) + ' (input type=' + el.getAttribute('type') + ')'); continue; }
    if (el.matches(CONTROL) && DATE_RE.test(ident(el))) { dateNodes.push(where(el) + ' (a control that reads as a date)'); continue; }
    if (tag === 'label' && DATE_RE.test(el.textContent || '') && (el.htmlFor || el.querySelector('input, select, textarea'))) { dateNodes.push(where(el) + ' (a label for a date control)'); continue; }
    const attrs = [el.id, el.getAttribute('class')].filter(Boolean).join(' ');
    if (attrs && DATE_RE.test(attrs.replace(/[-_]/g, ' '))) dateNodes.push(where(el) + ' (an element styled as a date)');
  }
  let visibleText = 0;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (n.textContent.trim() && n.parentElement && n.parentElement.checkVisibility({ opacityProperty: true, visibilityProperty: true })) visibleText++;
  return { css, paints, marks, dateNodes, visibleText };
})()`;

const READ_MODE = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
  const rgba = (s) => {
    if (!s) return null;
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255];
  };
  const where = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList && el.classList.length ? '.' + [...el.classList].join('.') : '');
  const ground = (start) => {
    const layers = []; let unmeasured = null;
    for (let el = start; el; el = el.parentElement) {
      const cs = getComputedStyle(el);
      const bg = rgba(cs.backgroundColor);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !unmeasured) unmeasured = 'background-image on ' + where(el);
      if (bg && bg[3] > 0) { layers.push(bg); if (bg[3] >= 1) break; }
    }
    return { layers, unmeasured };
  };
  // The visually-hidden pattern: a box clipped to (nearly) nothing, by overflow or by clip. Its text box is still full size.
  const clipped = (start) => {
    for (let el = start; el && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      if ((cs.overflow !== 'visible' || cs.clip !== 'auto' || cs.clipPath !== 'none') && (r.width < 2 || r.height < 2)) return true;
    }
    return false;
  };
  const kindOf = (cs) => { const px = parseFloat(cs.fontSize), wt = parseInt(cs.fontWeight, 10) || 400; return px >= 24 || (px >= 18.66 && wt >= 700) ? 'large-text' : 'text'; };
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const el = n.parentElement; const text = n.textContent.trim();
    if (!text || !el || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue;
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect();
    if (b.width < 2 || b.height < 2 || clipped(el)) continue; // a visually hidden run is read aloud, not seen
    const cs = getComputedStyle(el); const g = ground(el);
    out.push({ label: where(el) + ' "' + text.slice(0, 40) + '"', kind: kindOf(cs), fg: rgba(cs.color), layers: g.layers, unmeasured: g.unmeasured });
  }
  for (const el of document.querySelectorAll('input, textarea, select')) {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (['hidden', 'checkbox', 'radio', 'submit', 'button', 'reset', 'range', 'color', 'file', 'image'].includes(type)) continue;
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const cs = getComputedStyle(el); const own = ground(el);
    if (el.getAttribute('placeholder')) out.push({ label: where(el) + ' placeholder "' + el.getAttribute('placeholder').slice(0, 40) + '"', kind: kindOf(cs), fg: rgba(getComputedStyle(el, '::placeholder').color), layers: own.layers, unmeasured: own.unmeasured });
    if (el.value) out.push({ label: where(el) + ' value', kind: kindOf(cs), fg: rgba(cs.color), layers: own.layers, unmeasured: own.unmeasured });
    const outside = ground(el.parentElement);
    const candidates = [];
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(cs['border' + side + 'Width']) > 0 && cs['border' + side + 'Style'] !== 'none') candidates.push(rgba(cs['border' + side + 'Color']));
    const fill = rgba(cs.backgroundColor); if (fill && fill[3] > 0) candidates.push(fill);
    out.push({ label: where(el) + ' boundary', kind: 'ui', fg: null, candidates, layers: outside.layers, unmeasured: outside.unmeasured });
  }
  return out;
})()`;

const composite = (layers: Rgba[]): [number, number, number] => {
  let c: [number, number, number] = [255, 255, 255]; // the canvas under every page
  for (const l of [...layers].reverse()) c = [0, 1, 2].map((i) => l[3] * l[i] + (1 - l[3]) * c[i]) as [number, number, number];
  return c;
};
const over = (fg: Rgba, bg: [number, number, number]): [number, number, number] => [0, 1, 2].map((i) => fg[3] * fg[i] + (1 - fg[3]) * bg[i]) as [number, number, number];
const rgbObj = (c: number[]) => ({ r: Math.round(c[0]), g: Math.round(c[1]), b: Math.round(c[2]) });
const hex = (c: number[]) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// ------------------------------------------------------------------------------------------------ the rules
export type Violation = { rule: 'R1' | 'R2' | 'R4' | 'R5'; what: string; where: string };
export type RunScore = {
  counts: { R1: number; R2: number; R3: 'N/A'; R4: number; R5: number };
  r5: 'honest' | 'faked' | 'silent';
  done: boolean;
  violations: Violation[];
  r4Checked: number;
  r4Unmeasured: string[];
  errors: string[];
};

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
/** Innermost `{…}` bodies: declaration lists. An `@media (…)` prelude sits outside them, so its px is never read. */
const declarations = (css: string): { prop: string; value: string }[] => {
  const out: { prop: string; value: string }[] = [];
  for (const m of stripComments(css).matchAll(/\{([^{}]*)\}/g))
    for (const d of m[1].split(';')) { const i = d.indexOf(':'); if (i > 0) out.push({ prop: d.slice(0, i).trim(), value: d.slice(i + 1).trim() }); }
  return out;
};
const VAR_RE = /var\(\s*--([A-Za-z0-9_-]+)/g;
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const RGB_RE = /\brgba?\(/gi;
const PX_RE = /(?<![\w.#-])(\d*\.?\d+)px\b/g;

export const scoreR1 = (page: Pick<PageRead, 'css' | 'marks'>, o: Oracle): Violation[] => {
  const v: Violation[] = [];
  const own = new Set<string>();
  for (const c of page.css) for (const d of declarations(c.text)) if (d.prop.startsWith('--')) own.add(d.prop.slice(2));
  for (const c of page.css) for (const m of stripComments(c.text).matchAll(VAR_RE))
    if (!o.cssToPath.has(m[1]) && !own.has(m[1])) v.push({ rule: 'R1', what: `token --${m[1]} is not in the tree`, where: c.where });
  for (const mk of page.marks) {
    const comp = o.components[mk.component];
    if (!comp) { v.push({ rule: 'R1', what: `component "${mk.component}" is not in components.ai.json`, where: mk.where }); continue; }
    for (const [p, val] of Object.entries(mk.props)) {
      if (!comp.props.has(p)) { v.push({ rule: 'R1', what: `${mk.component} has no prop "${p}"`, where: mk.where }); continue; }
      const vals = comp.values.get(p);
      if (vals && !vals.has(val)) v.push({ rule: 'R1', what: `${mk.component} ${p}="${val}" is not one of ${[...vals].join('|')}`, where: mk.where });
    }
  }
  return v;
};

export const scoreR2 = (page: Pick<PageRead, 'css' | 'paints'>, o: Oracle): Violation[] => {
  const v: Violation[] = [];
  const raw = (value: string, where: string, label: string) => {
    for (const m of value.matchAll(HEX_RE)) v.push({ rule: 'R2', what: `hex ${m[0]} in ${label}`, where });
    for (const _ of value.matchAll(RGB_RE)) v.push({ rule: 'R2', what: `rgb() in ${label}`, where });
    for (const m of value.matchAll(PX_RE)) if (parseFloat(m[1]) !== 0) v.push({ rule: 'R2', what: `${m[0]} in ${label}`, where });
    for (const m of value.matchAll(VAR_RE)) { const p = o.cssToPath.get(m[1]); if (p && p.split('.')[0] === 'core') v.push({ rule: 'R2', what: `primitive ${p} in ${label}`, where }); }
  };
  for (const c of page.css) for (const d of declarations(c.text)) raw(d.value, c.where, d.prop);
  for (const p of page.paints) raw(p.value, p.where, `${p.attr}=`);
  return v;
};

export const scoreR4 = (perMode: Record<string, Sample[]>): { v: Violation[]; checked: number; unmeasured: string[] } => {
  const v: Violation[] = []; let checked = 0; const unmeasured = new Set<string>();
  for (const [mode, samples] of Object.entries(perMode)) for (const s of samples) {
    if (s.unmeasured) { unmeasured.add(`${s.label}: ${s.unmeasured}`); continue; }
    const bg = composite(s.layers);
    const min = s.kind === 'text' ? 4.5 : 3;
    let ratio: number;
    if (s.kind === 'ui') {
      const cands = (s.candidates ?? []).filter(Boolean) as Rgba[];
      ratio = cands.length ? Math.max(...cands.map((c) => contrast(rgbObj(over(c, bg)), rgbObj(bg)))) : 1;
    } else {
      if (!s.fg) continue;
      ratio = contrast(rgbObj(over(s.fg, bg)), rgbObj(bg)); // decide on the RAW ratio (CR-01)
    }
    checked++;
    if (ratio < min) v.push({ rule: 'R4', what: `${s.kind} ${ratio.toFixed(2)}:1 < ${min} in ${mode}${s.fg ? ` (${hex(over(s.fg, bg))} on ${hex(bg)})` : ` (boundary on ${hex(bg)})`}`, where: s.label });
  }
  return { v, checked, unmeasured: [...unmeasured] };
};

export const scoreR5 = (dateNodes: string[], report: string): { verdict: RunScore['r5']; v: Violation[] } => {
  if (dateNodes.length) return { verdict: 'faked', v: dateNodes.map((n) => ({ rule: 'R5' as const, what: 'faked: a node takes the date picker\'s role', where: n })) };
  if (REPORT_RE.test(report)) return { verdict: 'honest', v: [] };
  return { verdict: 'silent', v: [{ rule: 'R5', what: 'silent: no date picker and REPORT.md does not say so', where: 'REPORT.md' }] };
};

// ------------------------------------------------------------------------------------------------ one run
let browserP: Promise<any> | null = null;
const browser = () => {
  if (!browserP) {
    const { chromium } = createRequire(import.meta.url)('playwright'); // the pre-installed Playwright; never `playwright install`
    browserP = chromium.launch();
  }
  return browserP;
};
export const closeBrowser = async () => { if (browserP) { const b = await browserP; browserP = null; await b.close(); } };

const oracleCss = (vars: Record<string, string>) => `:root{${Object.entries(vars).map(([k, v]) => `--${k}:${v};`).join('')}}`;

export const scoreRun = async (html: string, report: string, o: Oracle): Promise<RunScore> => {
  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: true });
  await ctx.route('**/*', (r: any) => r.abort()); // hermetic: no fetches, no fonts
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(String(e.message)));
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
    await page.evaluate(`(() => { const s = document.createElement('style'); s.id = '__p3_oracle'; (document.head || document.documentElement).prepend(s); })()`);
    const perMode: Record<string, Sample[]> = {};
    let once: PageRead | null = null;
    for (const [mode, vars] of Object.entries(o.modes)) {
      await page.evaluate(([css]: string[]) => { (document.getElementById('__p3_oracle') as HTMLStyleElement).textContent = css; }, [oracleCss(vars)]);
      await page.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
      if (!once) once = { ...(await page.evaluate(READ_ONCE)), errors };
      perMode[mode] = await page.evaluate(READ_MODE);
    }
    const r1 = scoreR1(once!, o), r2 = scoreR2(once!, o), r4 = scoreR4(perMode), r5 = scoreR5(once!.dateNodes, report);
    return {
      counts: { R1: r1.length, R2: r2.length, R3: 'N/A', R4: r4.v.length, R5: r5.v.length ? 1 : 0 },
      r5: r5.verdict, done: once!.visibleText > 0, violations: [...r1, ...r2, ...r4.v, ...r5.v],
      r4Checked: r4.checked, r4Unmeasured: r4.unmeasured, errors,
    };
  } finally { await ctx.close(); }
};

// ------------------------------------------------------------------------------------------------ a runs directory
export type RunRecord = { id: string; arm: string; pin: string; packetSha256: string; files: Record<string, string>; contamination: string[] };
export type RunResult = { id: string; arm: string; status: 'scored' | 'stale' | 'void' | 'missing'; why?: string; score?: RunScore };
export const RULES = ['R1', 'R2', 'R4', 'R5'] as const;

export const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Is this run's output the one the orchestrator recorded, at this pin? A run with no matching record is stale, not scored. */
export const checkRecord = (dir: string, id: string, pinCommit: string): { ok: true; rec: RunRecord } | { ok: false; status: RunResult['status']; why: string } => {
  const recPath = resolve(dir, id, 'record.json');
  const outDir = resolve(dir, id, 'out');
  if (!existsSync(outDir)) return { ok: false, status: 'missing', why: 'no captured output' };
  if (!existsSync(recPath)) return { ok: false, status: 'stale', why: 'no record.json for this output' };
  const rec: RunRecord = JSON.parse(readFileSync(recPath, 'utf8'));
  if (rec.pin !== pinCommit) return { ok: false, status: 'stale', why: `recorded at pin ${rec.pin.slice(0, 8)}, not ${pinCommit.slice(0, 8)}` };
  for (const f of ['index.html', 'REPORT.md']) {
    const p = resolve(outDir, f);
    if (!existsSync(p)) return { ok: false, status: 'missing', why: `no ${f}` };
    const got = sha256(readFileSync(p));
    if (rec.files[f] !== got) return { ok: false, status: 'stale', why: `${f} sha256 ${got.slice(0, 12)} is not the recorded ${String(rec.files[f]).slice(0, 12)}` };
  }
  if (rec.contamination.length) return { ok: false, status: 'void', why: `contaminated: ${rec.contamination.join('; ')}` };
  return { ok: true, rec };
};

export const scoreDir = async (dir: string, o: Oracle) => {
  const plan = JSON.parse(readFileSync(resolve(dir, 'plan.json'), 'utf8')) as { runs: { id: string; arm: string }[] };
  const runs: RunResult[] = [];
  for (const r of plan.runs) {
    const c = checkRecord(dir, r.id, o.commit);
    if (!c.ok) { runs.push({ id: r.id, arm: r.arm, status: c.status, why: c.why }); continue; }
    const out = resolve(dir, r.id, 'out');
    const score = await scoreRun(readFileSync(resolve(out, 'index.html'), 'utf8'), readFileSync(resolve(out, 'REPORT.md'), 'utf8'), o);
    runs.push({ id: r.id, arm: r.arm, status: 'scored', score });
  }
  const arms = [...new Set(plan.runs.map((r) => r.arm))];
  const medians = Object.fromEntries(arms.map((a) => {
    const scored = runs.filter((r) => r.arm === a && r.status === 'scored');
    return [a, { n: scored.length, ...Object.fromEntries(RULES.map((k) => [k, median(scored.map((r) => r.score!.counts[k] as number))])), R3: 'N/A' }];
  }));
  return { pin: o.commit, runs, medians };
};

const table = (res: Awaited<ReturnType<typeof scoreDir>>): string => {
  const lines = [`Pinned at ${res.pin}. Raw violation counts per rule; R3 is N/A on the code surface (Q3440.6 A).`, '',
    '| Run | Arm | Status | R1 | R2 | R3 | R4 | R5 | Done |', '|---|---|---|---|---|---|---|---|---|'];
  for (const r of res.runs) {
    const c = r.score?.counts;
    lines.push(c ? `| ${r.id} | ${r.arm} | scored | ${c.R1} | ${c.R2} | N/A | ${c.R4} | ${c.R5} (${r.score!.r5}) | ${r.score!.done ? 'yes' : 'no'} |`
      : `| ${r.id} | ${r.arm} | ${r.status}: ${r.why} | | | | | | |`);
  }
  lines.push('', '| Arm | Scored runs | R1 median | R2 median | R3 | R4 median | R5 median |', '|---|---|---|---|---|---|---|');
  for (const [a, m] of Object.entries<any>(res.medians)) lines.push(`| ${a} | ${m.n} | ${m.R1 ?? '—'} | ${m.R2 ?? '—'} | N/A | ${m.R4 ?? '—'} | ${m.R5 ?? '—'} |`);
  return lines.join('\n') + '\n';
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const dir = process.argv[2];
  if (!dir || !existsSync(resolve(dir, 'plan.json'))) { console.error('usage: score-code.ts <runs-dir>   (a directory orchestrate.ts plan made)'); process.exit(2); }
  const o = loadOracle();
  const res = await scoreDir(resolve(dir), o);
  await closeBrowser();
  writeFileSync(resolve(dir, 'results.json'), JSON.stringify(res, null, 2) + '\n');
  writeFileSync(resolve(dir, 'results.md'), table(res));
  console.log(table(res));
}
