/**
 * Prism3 web dashboard (docs/08 §7 B3, docs/09).
 *
 * The FIRST rendering host over the engine core. It imports the SAME pure modules
 * the Figma plugin will (`theme`, `levers`, `preview`, `resolve-preview`, `color`,
 * `ramp`) and renders from the shared contracts:
 *   1. the theming knobs — from the lever manifest (`levers.ts`)
 *   2. a live component preview + per-mode contrast overlay — from `previewSpec`
 *      resolved through `resolvePreview(theme)`
 *   3. the generated palette ramps — straight off `brandTheme(input).palettes`
 *
 * The shell is a FOUR-STAGE build order (primitives → semantic → type → form),
 * mirroring how a theme actually composes: primitives first, then the semantic
 * roles that alias them, then type, then form. Stage 1 (Brand primitives) is the
 * bespoke redesign — a scalable brand-color list, a tunable neutral cast with a
 * Derive⇄Pin toggle (surfacing the engine's `neutral.anchor`), and the generated
 * ramps shown as labelled specimens. Later stages render their lever groups + the
 * live preview/overlay. Colour-axis edits re-resolve the engine and repaint only the
 * volatile region (ramps or preview), so knob focus is never lost; a failed brand
 * combination is caught and surfaced with the last-good render preserved.
 */
import { brandTheme, ALL_MODES, normalizeDisabledStrategy, HEADING_SIZE_FLOOR, PER_MODE_SIZE_GROUPS } from '../../Prism3/engine/theme';
import type { BrandInput, Theme, GradientInput, TypeComposite, PerModeSizeGroup, TypographyInput } from '../../Prism3/engine/theme';
import { hex, oklchToRgb, hexToRgb, rgbToOklch, contrast } from '../../Prism3/engine/color';
import { autoPlaceStep } from '../../Prism3/engine/ramp';
import { leverManifest, leverGroups } from '../../Prism3/engine/levers';
import type { Lever } from '../../Prism3/engine/levers';
import { previewSpec } from '../../Prism3/engine/preview';
import { resolvePreview } from '../../Prism3/engine/resolve-preview';
import type { ResolvedPreview } from '../../Prism3/engine/resolve-preview';
import { resolveAllModes } from '../../Prism3/engine/modes';
import { parseDesignMd, toDesignMd } from '../../Prism3/engine/design-md';
import { buildTree, deref, subNode, numOf, remPxOf, familyOf, type TreeNode } from '../../Prism3/engine/tree';
import { hostCommit } from './write-adapter';
import { persistInput, restoreInput } from './persist-local';
import exampleBrands from '../../Prism3/schema/example-brands.json';

type Mode = ResolvedPreview['modes'][number];

// Boot from a VALIDATED example brand — the emitted schema/example-brands.json (a
// test.ts gate asserts every brand there resolves all-green on the preview
// contracts). aurora: indigo anchor, action DECOUPLED onto an azure accent, tinted
// page. brandState is the mutable working copy the inputs edit.
const BRANDS = exampleBrands as Record<string, BrandInput>;
// Web persists the working brand to localStorage; the plugin uses Figma shared-data instead (restored
// via the host `restore-input` message below). `PRISM3_HOST` is a build-time define (`'figma'` in the
// plugin), so this guard is `'figma' !== 'figma'` → the localStorage path is INERT in the plugin —
// never executed — exactly as the web export-bar commit path is inert in the plugin bundle. On web
// boot, reopen on the persisted brand if one is stored AND still resolves; otherwise it's a first run —
// `firstRun` gates the start screen (below), and brandState still holds the demo so the app is in a
// valid state behind it. (Web only: the plugin never sets firstRun — it seeds via the host restore-input
// message; a plugin fresh-file start moment is a later cross-lane follow-up.)
let firstRun = false;
const bootBrand = (): BrandInput => {
  if (PRISM3_HOST !== 'figma') {
    const restored = restoreInput(localStorage);
    // Validate the SHAPE (brandTheme must accept it) before booting on it — a stale blob from an older
    // build could deserialise past the version guard yet fail to resolve; on reject, fall back to the demo.
    if (restored) { try { brandTheme(restored); return restored; } catch { /* stale/incompatible — fall through */ } }
    firstRun = true;   // web, nothing valid stored → show the start screen instead of the silent demo
  }
  return structuredClone(BRANDS.aurora);
};
let brandState: BrandInput = bootBrand();

// A minimal, known-good starting point for "New brand": one mid-indigo primary + a
// derived neutral, action defaults to primary, namespace at the 'prism' placeholder.
const NEW_BRAND = (): BrandInput => ({
  id: 'untitled', root: 'prism',
  modes: ['light'],                               // most brands ship light only (docs/11 Pillar 1)
  primary: { l: 0.55, c: 0.15, h: 262 },
  neutral: { hue: 262, chroma: 0.006, auto: true },   // neutral hue auto-follows primary (262 = primary.h → identical ramp; now live-linked)
});
const ROOT_RE = /^[a-z][a-z0-9-]*$/;

// Every ATOMIC control is live — it edits brandState and re-runs the engine on change.
// Liveness is by control TYPE, not a per-key allowlist: sliders, enums, palette-refs, and
// toggles all have real handlers (a bad value just surfaces the error bar, never crashes —
// rebuild() is try/caught). Object/list levers (families, surfaces, brand colors) stay
// read-only until their bespoke editors land (#97). Not every live axis is mirrored in the
// shared preview yet (density/motion/shadow need specimens, #99) — but the control works.
const LIVE_CONTROLS = new Set(['slider', 'enum', 'palette-ref', 'toggle']);

const MODE_LABEL: Record<string, string> = { light: 'Light', dark: 'Dark', 'hc-light': 'HC light', 'hc-dark': 'HC dark', wireframe: 'Wireframe' };

// ---- stages ----------------------------------------------------------------
// The rail is data (docs/23 §7): a flat list of focused destinations, each one page. A page's facets
// are sections within it, not separate rail rows. `view:true` marks a non-authoring destination
// (Preview) — it sits after a divider with no ordinal. Order is the sequence a theme composes in:
// primitives → how they're applied (surfaces / interactive) → type → form (elevation/size/layout/motion)
// → look at the whole (Preview).
const NAV = [
  { key: 'palettes', label: 'Palettes', sub: 'Brand hues & neutrals → ramps' },
  { key: 'surfaces', label: 'Surfaces & fills', sub: 'Backgrounds, text, gradients' },
  { key: 'interactive', label: 'Interactive', sub: 'Action colors, states, a11y' },
  { key: 'typography', label: 'Typography', sub: 'Families, weights → type scale' },
  { key: 'elevation', label: 'Elevation', sub: 'Shadows' },
  { key: 'sizeRadius', label: 'Size & radius', sub: 'Size, density, corner radius' },
  { key: 'layout', label: 'Layout', sub: 'Breakpoints & containers' },
  { key: 'motion', label: 'Motion', sub: 'Tempo & easing' },
  { key: 'preview', label: 'Preview', sub: 'Components & contrast, all modes', view: true },
] as const;
type PageKey = (typeof NAV)[number]['key'];
let page: PageKey = 'palettes';

// Which page a lever belongs to. The manifest groups levers under a few axes; the focused pages slice
// finer. Palette colour primitives get a bespoke UI, so they're excluded from the generic knob render.
// Status hues are edited inline on Palettes ramps (they're advanced + colour-control, so they filter
// out of every generic panel anyway). The `color` + `advanced` groups split by key across pages.
const PRIMITIVE_KEYS = new Set(['primary', 'neutral.hue', 'neutral.chroma', 'neutral.anchor', 'brandColors']);
const pageOfLever = (l: Lever): PageKey => {
  if (l.group === 'type') return 'typography';
  if (l.group === 'motion') return 'motion';
  if (l.group === 'elevation') return 'elevation';
  if (l.group === 'layout') return 'layout';
  if (l.group === 'form') return 'sizeRadius';   // radiusScale, density, + advanced grid/space dims
  if (l.key === 'gradients' || l.key === 'surfaces') return 'surfaces';
  return 'interactive';   // remaining colour/advanced: action palette, interactive treatment, disabled, icon, inverse, neutralEmphasis, interactivePalettes
};
const leversFor = (key: PageKey): Lever[] => leverManifest.filter((l) => !l.advanced && !PRIMITIVE_KEYS.has(l.key) && pageOfLever(l) === key);
const leverByKey = (k: string): Lever | undefined => leverManifest.find((l) => l.key === k);

// ---- engine read-model -----------------------------------------------------
let theme: Theme = brandTheme(brandState);
// The last input that resolved cleanly — the ramps + anchor badges render from THIS, so when a
// live edit fails (lastError set) the flagged anchor swatch still matches the shown ramp (M-16).
let lastGoodInput: BrandInput = structuredClone(brandState);
let rp: ResolvedPreview = resolvePreview(theme);
let currentMode: Mode = rp.modes[0];
let lastError: string | null = null;

const getPath = (o: any, p: string): any => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const setPath = (o: any, p: string, v: unknown): void => {
  const ks = p.split('.');
  const last = ks.pop()!;
  let cur = o;
  for (const k of ks) { if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; }
  cur[last] = v;
};

/** Re-resolve from the current brandState. On failure keep the last-good theme/rp and
 *  record the message (the render stays coherent; the edit is what's flagged). */
const rebuild = (): void => {
  try {
    const t = brandTheme(brandState);
    rp = resolvePreview(t);
    theme = t;
    lastGoodInput = structuredClone(brandState);   // M-16: anchor badges read this, not the (maybe failing) live state
    lastError = null;
    if (PRISM3_HOST !== 'figma') persistInput(localStorage, brandState);   // persist the last-good brand (web only; inert in the plugin, best-effort)
  } catch (e) {
    lastError = (e as Error).message;
  }
};

// paint() repaints only the current stage's volatile region (ramps or preview) so
// input focus is never lost; applyFull() re-renders the whole workspace (structural
// edits — add/remove color, Derive⇄Pin, stage switch); build() re-renders the shell.
let paintVolatile: () => void = () => {};
// renderModeStrip repaints the persistent header mode-selector (#171 promoted to the global header,
// docs/23 §7) — its per-mode contrast ✓/✗ marks track the theme, so every edit refreshes it too.
const apply = (): void => { rebuild(); renderModeStrip(); paintVolatile(); };
const applyFull = (): void => { rebuild(); renderModeStrip(); renderWorkspace(); };

// ---- DOM helpers -----------------------------------------------------------
const el = (tag: string, cls?: string, text?: string): HTMLElement => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const chunk = <T>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

// ---- control kit — the reusable vocabulary every knob + select is built from ----------------------
// Small structural primitives shared by renderControl and the bespoke editors, so a control (or a whole
// screen in the IA reorg) composes from these rather than re-deriving the `knob` scaffold and the
// `<option>` boilerplate each time. Purely structural — they produce exactly the nodes the hand-rolled
// versions did; behaviour and styling are unchanged.
/** An `<option>` with value/text and optional pre-selection — replaces the per-site opt/optE/mkOpt closures. */
const optionEl = (value: string, text: string, selected = false): HTMLOptionElement => {
  const o = document.createElement('option');
  o.value = value; o.textContent = text; if (selected) o.selected = true;
  return o;
};
/** The dashboard `<select>` (doc 24 C1). One `.select` base class owns all dropdown cosmetics — border,
 *  radius, background, and the shared chevron — so a styling tweak lands in one place. Size / context are
 *  additive modifiers: `sm` (compact inline) · `fill` (flex to its row) · `cap` (max-width, for cards).
 *  Callers append their own `<option>`s (option-building varies too much to generalise). */
const selectEl = (mods = ''): HTMLSelectElement => el('select', mods ? `select ${mods}` : 'select') as HTMLSelectElement;
/** A number `<input>` (doc 24 C2). The `.num` base owns the shared field cosmetics (border, radius,
 *  background, padding); the caller passes a context class for width/size and wires its own `onchange`. */
const numberField = (o: { value: string | number; min?: number | string; max?: number | string; step?: number | string; className?: string; title?: string }): HTMLInputElement => {
  const inp = el('input', o.className ? `num ${o.className}` : 'num') as HTMLInputElement;
  inp.type = 'number';
  if (o.min != null) inp.min = String(o.min);
  if (o.max != null) inp.max = String(o.max);
  if (o.step != null) inp.step = String(o.step);
  inp.value = String(o.value);
  if (o.title) inp.title = o.title;
  return inp;
};
/** A range `<input>` (doc 24 C5b). Just the element construction (type/bounds/value/class) — the
 *  readout + wiring stay per-site, since the surrounding layouts genuinely differ (a `.slider-top`
 *  readout, a `.knob-val`, an auto-pruning knob, a label-as-readout). `className` may be omitted for
 *  the knob-context sliders styled by the `.knob input[type=range]` descendant rule. */
const rangeInput = (o: { value: string | number; min?: number | string; max?: number | string; step?: number | string; className?: string }): HTMLInputElement => {
  const inp = el('input', o.className) as HTMLInputElement;
  inp.type = 'range';
  if (o.min != null) inp.min = String(o.min);
  if (o.max != null) inp.max = String(o.max);
  if (o.step != null) inp.step = String(o.step);
  inp.value = String(o.value);
  return inp;
};
/** The on/off toggle switch (doc 24 C3) — a `.toggle` checkbox paired with its On/Off `.knob-val`
 *  readout, returned as a `knobBody`. `onToggle(checked)` fires after the readout updates; the caller
 *  runs its own `apply()` / `applyFull()`. */
const toggleField = (checked: boolean, onToggle: (checked: boolean) => void): HTMLElement => {
  const input = el('input') as HTMLInputElement;
  input.type = 'checkbox'; input.className = 'toggle'; input.checked = checked;
  const val = el('span', 'knob-val', checked ? 'On' : 'Off');
  input.onchange = () => { val.textContent = input.checked ? 'On' : 'Off'; onToggle(input.checked); };
  return knobBody(input, val);
};
/** A token-path chip (doc 24 C4) — the small mono pill that shows a DTCG/role path.
 *
 *  A long path ELIDES FROM THE LEFT instead of wrapping to two lines (#289): the CSS gives the pill
 *  `direction:rtl`, which moves where `text-overflow:ellipsis` bites to the start, so
 *  `color.background.inverse.primary` renders as `…kground.inverse.primary`.
 *
 *  Why not the obvious right-truncation: these paths share long prefixes and differ only in the tail.
 *  `color.foreground.brand` and `color.foreground.brand-subtle` — or the six
 *  `color.interactive.destructive.on-inverse.{text,fill}.{rest,hover,pressed}`, whose first 40
 *  characters are identical — all collapse to the SAME visual stub if you cut from the right. The
 *  discriminating information lives at the end, so that is the end worth keeping. The cost is that the
 *  namespace prefix is the part hidden when space is tight; `title` and (on style-guide pills) the
 *  hover bubble both carry the full path, and the emitted path itself is unchanged, which is what
 *  doc-26's namespace rule is actually about.
 *
 *  The path stays a SINGLE text node and the elision is purely visual, which is what keeps a text
 *  `text-overflow` bites), which is what keeps a text selection exact — today's pill is one text node
 *  too, so anything that split it would REGRESS copy/paste. Two earlier attempts did exactly that:
 *  `inline-flex` head+tail laid out correctly but flex items are blockified, so a selection came back
 *  as `color\n.background.primary`; switching to `inline-block` with the tail's width reserved in `ch`
 *  fixed the newline but the head's `max-width:100%` resolved against the pill's own shrink-to-fit
 *  width — circular — which collapsed the head to nothing on 181 of 198 pills. Both measured, not
 *  reasoned about. `title` carries the full path for the elided case. */
const tokenPill = (path: string): HTMLElement => {
  const p = el('span', 'tpill mono', path);
  p.title = path;
  return p;
};
/** A dashed "+ add" button (doc 24 C4). `.addbtn` owns the styling; pass context classes (width/margin)
 *  via `cls`. */
const addButton = (label: string, onClick: () => void, cls = ''): HTMLButtonElement => {
  const btn = el('button', cls ? `addbtn ${cls}` : 'addbtn', label) as HTMLButtonElement;
  btn.onclick = onClick;
  return btn;
};
/** A round "×" remove button (doc 24 C4). */
const removeButton = (onClick: () => void, title = 'Remove', cls = ''): HTMLButtonElement => {
  const btn = el('button', cls ? `rx ${cls}` : 'rx', '×') as HTMLButtonElement;
  btn.title = title; btn.onclick = onClick;
  return btn;
};
/** The `div.knob-body` row — a control input paired with its `knob-val` readout (slider / toggle). */
const knobBody = (...kids: Node[]): HTMLElement => { const r = el('div', 'knob-body'); r.append(...kids); return r; };
/** The knob scaffold: `label.knob-label`, the control body (one node or several), then `p.knob-desc`.
 *  Every control — generic or bespoke — shares this shape. */
const knob = (label: string, body: Node | Node[], desc: string): HTMLElement => {
  const wrap = el('div', 'knob');
  wrap.append(el('label', 'knob-label', label));
  wrap.append(...(Array.isArray(body) ? body : [body]));
  wrap.append(el('p', 'knob-desc', desc));
  return wrap;
};
// The COMMIT host (docs/22 #110) — distinct from the preview: "materialise this theme".
// On web it's inert (the export bar downloads); in the Figma plugin it posts the BrandInput to
// the main thread (→ #108 applyWritePlan) and receives the #109 read-back seed summary on boot.
const commit = hostCommit();
let seedInfo: { ok: boolean; summary: string } | null = null;   // set by the host's boot read-back (#109)
// Host → UI notifications: the #109 read-back seed summary, and the #131 knob-rehydration (the
// persisted BrandInput). restore-input loads the brand wholesale (loadBrand rebuilds + re-renders),
// so re-opening a themed Figma file boots on that brand instead of the default. loadBrand is a
// const defined below — this callback only fires async (after ui-ready), so the ref is resolved.
commit.onHostMessage((m) => {
  if (m.kind === 'restore-input') {
    // The blob is public shared-data (any plugin can write it) — validate the SHAPE the same way
    // Import does (brandTheme must accept it) before loading. A versioned-but-malformed payload
    // (e.g. `{}`) that clears the persist envelope but has no `primary` would otherwise crash the
    // boot render (renderBar reads `brandState.primary`); on reject we silently keep defaults.
    try { brandTheme(m.input as BrandInput); } catch { return; }
    loadBrand(m.input as BrandInput);
    return;
  }
  seedInfo = { ok: m.ok, summary: m.summary };
  if (barHost) renderBar();
});

// ===========================================================================
// STAGE 1 — BRAND PRIMITIVES (bespoke)
// ===========================================================================

/** The per-palette pinned anchor step (null = derived, no anchor). */
const anchorStepFor = (palette: string): number | null => {
  // Read the LAST-GOOD input (M-16): the ramps paint from the last-good theme, so the anchor
  // badge must be computed from the same source — else a failing live edit flags the wrong swatch.
  if (palette === 'primary') return autoPlaceStep(lastGoodInput.primary.l);
  if (palette === 'neutral') return lastGoodInput.neutral.anchor ? autoPlaceStep(lastGoodInput.neutral.anchor.l) : null;
  const bc = (lastGoodInput.brandColors ?? []).find((b) => b.name === palette);
  if (bc) return autoPlaceStep(bc.oklch.l);
  // A Custom-hue-seeded status role (#157): the picked hue IS the anchor color, same treatment as
  // primary/neutral/brandColors above. `roleToPalette` defaults each status role to its own name, so
  // a non-borrowed status ramp's palette name equals the role name.
  const seed = (STATUS_ROLES as readonly string[]).includes(palette) ? lastGoodInput.status?.[palette as StatusRole] : undefined;
  return seed ? autoPlaceStep(seed.l) : null;
};

/** Just the ramp bands — 10 swatches per row, labels beneath. The VOLATILE part of a palette row
 *  (#59): the head (identity / origin / anchor) is stable so open color dialogs + slider drags
 *  survive, and only these bands (plus the derived readouts) repaint on `apply()`. The anchor now
 *  reads on the right of the head + the ◆ step label, so the old on-swatch "anchor" flag is retired. */
const rampBands = (steps: { num: number; key: string; hex: string }[], anchorStep: number | null): HTMLElement => {
  const wrap = el('div', 'pramp');
  const sorted = [...steps].sort((a, b) => a.num - b.num);
  for (const rowSteps of chunk(sorted, 10)) {
    const band = el('div', 'band');
    const strip = el('div', 'strip');
    const labs = el('div', 'labs');
    for (const s of rowSteps) {
      const isAnchor = s.num === anchorStep;
      const sw = el('div', 'sw' + (isAnchor ? ' is-anchor' : ''));
      sw.style.background = s.hex;
      strip.append(sw);
      const lab = el('div', 'lab');
      lab.append(el('span', 'lab-step mono' + (isAnchor ? ' on' : ''), s.key), el('span', 'lab-hex mono', s.hex));
      labs.append(lab);
    }
    band.append(strip, labs);
    wrap.append(band);
  }
  return wrap;
};

// Brand-color reference integrity (docs/24 #53) — when an accent is renamed or removed, every place that
// references its palette NAME must follow, or the alias graph dangles (e.g. `roleColors.success → 'accent'`
// stops resolving). Covers the four name-referencing fields: actionPalette, roleColors (borrows),
// interactivePalettes (accent columns), and gradient stops.
const cascadeRename = (prev: string, next: string): void => {
  if (brandState.actionPalette === prev) brandState.actionPalette = next;
  const rc = brandState.roleColors as Record<string, string> | undefined;
  if (rc) for (const r of Object.keys(rc)) if (rc[r] === prev) rc[r] = next;
  brandState.interactivePalettes?.forEach((e) => { if (e.palette === prev) e.palette = next; });
  if (Array.isArray(brandState.gradients)) brandState.gradients.forEach((g) => g.stops.forEach((s) => { if (s.palette === prev) s.palette = next; }));
};
const cascadeRemove = (removed: string): void => {
  if (brandState.actionPalette === removed) brandState.actionPalette = 'primary';
  const rc = brandState.roleColors as Record<string, string> | undefined;
  if (rc) { for (const r of Object.keys(rc)) if (rc[r] === removed) delete rc[r]; if (!Object.keys(rc).length) brandState.roleColors = undefined; }
  if (brandState.interactivePalettes) {
    brandState.interactivePalettes = brandState.interactivePalettes.filter((e) => e.palette !== removed);
    if (!brandState.interactivePalettes.length) brandState.interactivePalettes = undefined;
  }
  // A gradient stop can't just vanish (a gradient needs ≥2 stops), so repoint any dangling stop to primary.
  if (Array.isArray(brandState.gradients)) brandState.gradients.forEach((g) => g.stops.forEach((s) => { if (s.palette === removed) s.palette = 'primary'; }));
};

// ---- Palettes page (#59): full-width palette rows grouped in per-role section containers. ----
// Each row is a STABLE head (identity swatch + name/path + origin control + anchor readout) above a
// VOLATILE ramp; `apply()` repaints only the bands + derived readouts (swatch / hex / anchor), so open
// color dialogs and slider drags survive. Structural source changes (which control is live) go through
// applyFull. The swatch is a color INPUT when the color is author-chosen (brand always, neutral Pinned,
// status Custom hue) and a read-out otherwise — and the hex-by-name shows only then.

// A per-role section container with a heading.
const palSection = (title: string, sub: string): HTMLElement => {
  const sec = el('div', 'psec');
  const head = el('div', 'psec-head');
  head.append(el('h3', 'psec-t', title), el('p', 'psec-d', sub));
  sec.append(head);
  return sec;
};

// A labelled control column (Source / Hue / Chroma / Anchor). `right` aligns it to the row's end.
const pfield = (label: string, control: HTMLElement, right = false): HTMLElement => {
  const f = el('div', 'pfield' + (right ? ' r' : ''));
  f.append(el('span', 'pfk', label), control);
  return f;
};

// The right-side anchor readout — ◆ step, a "borrowing <src>" note, or "derived". Returns a setter.
const anchorField = (): { field: HTMLElement; set: (key: string | undefined, note?: string) => void } => {
  const v = el('span', 'panchor mono');
  const field = pfield('Anchor', v, true);
  const set = (key: string | undefined, note?: string): void => {
    v.textContent = note ? note : (key ? key : 'derived');
    v.className = 'panchor mono' + (note ? ' note' : key ? ' dia' : ' none');
  };
  return { field, set };
};

/** One brand palette row — the swatch is always the color picker (author-chosen), the hex always shows.
 *  `paletteName` keys the volatile ramp; `nameEl` is the editable accent name (null → the fixed primary). */
const brandRow = (getHex: () => string, setHex: (h: string) => void, name: string, path: string | null,
                  isAction: boolean, paletteName: string, nameEl: HTMLElement | null,
                  removable: (() => void) | null): { row: HTMLElement; refresh: () => void } => {
  const row = el('div', 'prow authored show-hex');
  const head = el('div', 'phead');
  const ident = el('div', 'pident');
  const picker = el('input', 'pswatch') as HTMLInputElement;
  picker.type = 'color'; picker.value = getHex(); picker.title = 'Edit color';
  const idcol = el('div', 'pidcol');
  idcol.append(nameEl ?? el('span', 'pname', name));
  const sub = el('div', 'psub');
  const hexLab = el('span', 'phex mono', picker.value);
  sub.append(hexLab);
  if (path) sub.append(tokenPill(path));
  if (isAction) {
    const badge = el('span', 'prole');
    const dot = el('span', 'prole-dot'); dot.style.background = picker.value;
    badge.append(dot, document.createTextNode('default interactive color'));
    sub.append(badge);
  }
  idcol.append(sub);
  ident.append(picker, idcol);
  if (removable) ident.append(removeButton(removable, 'Remove color', 'prm'));
  const anchor = anchorField();
  head.append(ident, anchor.field);
  const bands = el('div', 'pramp-wrap');
  row.append(head, bands);
  picker.oninput = () => { setHex(picker.value); hexLab.textContent = picker.value; apply(); };
  const refresh = (): void => {
    const pal = theme.palettes.find((p) => p.palette === paletteName);
    const aStep = anchorStepFor(paletteName);
    anchor.set(aStep != null ? pal?.steps.find((s) => s.num === aStep)?.key : undefined);
    bands.replaceChildren(rampBands(pal?.steps ?? [], aStep));
  };
  return { row, refresh };
};

// The neutral row — three sources: Auto (hue live-follows the brand primary; swatch is a read-out),
// Custom tint (Hue + Chroma sliders drive the scale; swatch is a read-out) and Pinned color (the swatch
// IS the color picker → an exact grey pinned to `neutral.anchor`). The padlock marks the two read-out
// sources — Auto + Custom tint — where the swatch is derived, not directly editable; Pinned's swatch has
// no lock because it's the one editable picker. Source is a select, matching Validation.
const neutralRow = (): { row: HTMLElement; refresh: () => void } => {
  const pinned = !!brandState.neutral.anchor;
  const auto = !pinned && !!brandState.neutral.auto;       // Auto: hue live-follows the brand primary
  const editable = !pinned && !auto;                        // Custom tint is the only editable source
  const effHue = auto ? brandState.primary.h : brandState.neutral.hue;   // the hue currently in effect
  const row = el('div', 'prow' + (pinned ? ' authored show-hex' : ''));
  const head = el('div', 'phead');
  const ident = el('div', 'pident');

  const swWrap = el('div', 'pswrap');
  let swatch: HTMLElement;
  let hexLab: HTMLElement | null = null;
  if (pinned) {
    const a = brandState.neutral.anchor!;
    const picker = el('input', 'pswatch') as HTMLInputElement;
    picker.type = 'color'; picker.value = hex(oklchToRgb(a)); picker.title = 'Edit color';
    picker.oninput = () => { const o = rgbToOklch(hexToRgb(picker.value)); a.l = o.l; a.c = o.c; a.h = o.h; if (hexLab) hexLab.textContent = picker.value; apply(); };
    swatch = picker;
    swWrap.append(swatch);
  } else {
    // Auto + Custom tint derive the swatch from the scale — mark it locked (not directly editable).
    swatch = el('div', 'pswatch ro');
    const lock = el('span', 'plock');
    lock.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="3" y="6.4" width="8" height="5.4" rx="1.3"/><path d="M4.6 6.4V5a2.4 2.4 0 0 1 4.8 0v1.4" fill="none"/></svg>';
    swWrap.append(swatch, lock);
  }
  const idcol = el('div', 'pidcol');
  idcol.append(el('span', 'pname', 'neutral'));
  const sub = el('div', 'psub');
  if (pinned) { hexLab = el('span', 'phex mono', (swatch as HTMLInputElement).value); sub.append(hexLab); }
  sub.append(tokenPill('palette.neutral'));
  idcol.append(sub);
  ident.append(swWrap, idcol);

  // origin — Source select + Hue/Chroma. Editable only under Custom tint; Auto shows the
  // primary-derived hue read-only, Pinned shows the pinned grey's tint read-only.
  const origin = el('div', 'porigin');
  const src = selectEl('sm');
  src.append(optionEl('auto', 'Auto', auto), optionEl('custom', 'Custom tint', editable), optionEl('pinned', 'Pinned color', pinned));
  src.onchange = () => {
    const n = brandState.neutral;
    if (src.value === 'auto') { delete n.anchor; n.auto = true; }
    // snapshot the current effective hue so the Custom-tint slider starts where Auto left it (no jump)
    else if (src.value === 'custom') { delete n.anchor; if (n.auto) { n.hue = brandState.primary.h; delete n.auto; } }
    else { n.anchor = { l: 0.5, c: Math.min(n.chroma, 0.02), h: effHue }; delete n.auto; }
    applyFull();
  };
  origin.append(pfield('Source', src));
  const a = brandState.neutral.anchor;
  const nSlider = (key: string, label: string, max: number, step: number, value: number, fmt: (v: number) => string): HTMLElement => {
    const f = el('div', 'pfield slider' + (editable ? '' : ' ro'));
    const top = el('div', 'psl-top');
    const val = el('span', 'psl-val mono', fmt(value));
    top.append(el('span', 'pfk', label), val);
    const input = rangeInput({ className: 'range psl-range', min: 0, max, step, value });
    if (!editable) input.disabled = true;
    else input.oninput = () => { setPath(brandState, key, Number(input.value)); val.textContent = fmt(Number(input.value)); apply(); };
    f.append(top, input);
    return f;
  };
  const hueField = nSlider('neutral.hue', 'Hue', 360, 1, pinned ? a!.h : effHue, (v) => `${Math.round(v)}°`);
  origin.append(hueField, nSlider('neutral.chroma', 'Chroma', 0.03, 0.001, pinned ? a!.c : brandState.neutral.chroma, (v) => v.toFixed(3)));
  const hueVal = hueField.querySelector('.psl-val') as HTMLElement;
  const hueInput = hueField.querySelector('.psl-range') as HTMLInputElement;

  const anchor = anchorField();
  head.append(ident, origin, anchor.field);
  const bands = el('div', 'pramp-wrap');
  row.append(head, bands);
  const refresh = (): void => {
    const pal = theme.palettes.find((p) => p.palette === 'neutral');
    const aStep = anchorStepFor('neutral');
    anchor.set(aStep != null ? pal?.steps.find((s) => s.num === aStep)?.key : undefined);
    if (!pinned) { const mid = pal?.steps.find((s) => s.num === 500)?.hex; if (mid) swatch.style.background = mid; }
    // Auto: keep the read-only hue in step with the brand primary as it changes.
    if (auto) { const h = brandState.primary.h; hueVal.textContent = `${Math.round(h)}°`; hueInput.value = String(h); }
    bands.replaceChildren(rampBands(pal?.steps ?? [], aStep));
  };
  return { row, refresh };
};

const renderPrimitives = (host: HTMLElement): void => {
  host.append(hero('Start from your brand colors.',
    'Give the engine your exact hues. It grows each into a gamut-aware, contrast-placed ramp and pins your color as the anchor — never shifted. Every semantic role downstream aliases these.'));

  const refreshers: Array<() => void> = [];

  // Brand — primary + accents, each a full-width row; the swatch is the color picker.
  const brandSec = palSection('Brand palettes', 'Each brand color grown into a gamut-aware, contrast-placed ramp — your color pinned as the anchor, never shifted.');
  const errBar = el('div', 'errbar'); errBar.style.display = 'none';
  brandSec.append(errBar);
  const action = brandState.actionPalette ?? 'primary';
  {
    const b = brandRow(
      () => hex(oklchToRgb(brandState.primary)),
      (h) => setPath(brandState, 'primary', rgbToOklch(hexToRgb(h))),
      'primary', 'palette.primary', action === 'primary', 'primary', null, null);
    brandSec.append(b.row); refreshers.push(b.refresh);
  }
  const list = brandState.brandColors ?? (brandState.brandColors = []);
  list.forEach((bc, i) => {
    const nameEl = el('input', 'pname-input mono') as HTMLInputElement;
    nameEl.type = 'text'; nameEl.value = bc.name; nameEl.spellcheck = false;
    nameEl.onchange = () => {
      const prev = bc.name, next = nameEl.value.trim() || bc.name;
      if (next === prev) return;
      // Don't rename onto another palette's name — it would collide / merge the alias graph. Revert.
      const taken = new Set(['primary', 'neutral', ...list.filter((_, j) => j !== i).map((b) => b.name)]);
      if (taken.has(next)) { nameEl.value = prev; return; }
      bc.name = next; cascadeRename(prev, next); applyFull();
    };
    const b = brandRow(
      () => hex(oklchToRgb(bc.oklch)),
      (h) => { bc.oklch = rgbToOklch(hexToRgb(h)); },
      bc.name, `palette.${bc.name}`, action === bc.name, bc.name, nameEl,
      () => { const removed = list[i].name; list.splice(i, 1); cascadeRemove(removed); applyFull(); });
    brandSec.append(b.row); refreshers.push(b.refresh);
  });
  brandSec.append(addButton('+ Add brand color', () => {
    const names = new Set(list.map((b) => b.name));
    let n = list.length + 1, nm = `accent${n}`;
    while (names.has(nm)) nm = `accent${++n}`;
    list.push({ name: nm, oklch: { l: 0.55, c: 0.15, h: 235 } });
    applyFull();
  }, 'padd'));
  host.append(brandSec);

  // Neutral — one row, two sources (Custom tint / Pinned color).
  const neuSec = palSection('Neutral', 'A tinted gray scale that follows your brand hue automatically. Switch to Custom tint to tune it, or Pinned color to lock an exact brand gray.');
  { const n = neutralRow(); neuSec.append(n.row); refreshers.push(n.refresh); }
  host.append(neuSec);

  // Validation — status ramps every semantic role aliases; each sourced Auto / Custom hue / borrow.
  const valSec = palSection('Validation', 'The success / warning / danger / info ramps every semantic role aliases — auto-derived, seeded from a custom hue, or borrowed from a brand palette.');
  for (const role of STATUS_ROLES) { const s = statusRow(role); valSec.append(s.row); refreshers.push(s.refresh); }
  host.append(valSec);

  paintVolatile = () => {
    errBar.style.display = lastError ? '' : 'none';
    if (lastError) errBar.textContent = `This combination doesn't resolve: ${lastError} — showing the last valid palettes.`;
    refreshers.forEach((r) => r());
  };
  paintVolatile();
};

// ===========================================================================
// Generic lever controls + the bespoke editors the focused pages compose from
// ===========================================================================

const renderControl = (lever: Lever): HTMLElement => {
  const live = LIVE_CONTROLS.has(lever.control);
  let body: HTMLElement;

  if (lever.control === 'slider') {
    const input = rangeInput({ min: lever.min, max: lever.max, step: lever.step, value: (getPath(brandState, lever.key) ?? lever.default ?? lever.min ?? 0) as number });
    input.disabled = !live;
    const val = el('span', 'knob-val', `${input.value}${lever.unit ?? ''}`);
    if (live) input.oninput = () => { setPath(brandState, lever.key, Number(input.value)); val.textContent = `${input.value}${lever.unit ?? ''}`; apply(); };
    body = knobBody(input, val);
  } else if (lever.control === 'palette-ref' && live) {
    const sel = selectEl('sm');
    const palettes = ['primary', ...(brandState.brandColors ?? []).map((b) => b.name)];
    const cur = String(getPath(brandState, lever.key) ?? lever.default ?? 'primary');
    for (const p of palettes) sel.append(optionEl(p, p, p === cur));
    sel.onchange = () => { setPath(brandState, lever.key, sel.value); apply(); };
    body = sel;
  } else if (lever.control === 'enum') {
    const sel = selectEl('sm');
    const cur = getPath(brandState, lever.key) ?? lever.default;
    for (const o of lever.options ?? []) sel.append(optionEl(String(o.value), o.label, o.value === cur));
    sel.disabled = !live;
    if (live) sel.onchange = () => { setPath(brandState, lever.key, sel.value); apply(); };
    body = sel;
  } else if (lever.control === 'toggle') {
    // Boolean axis. `checked` reads truthy — so `gradients` renders "on" whether it's `true`
    // or an explicit gradient array (the array is only reset if the user toggles off). Toggling
    // writes a plain boolean: on → the default (single gradient / inverse inks), off → false.
    body = toggleField(!!(getPath(brandState, lever.key) ?? lever.default), (checked) => { setPath(brandState, lever.key, checked); apply(); });
  } else {
    const v = getPath(brandState, lever.key) ?? lever.default;
    let text: string;
    if (Array.isArray(v)) text = v.map((it: any) => it?.name).filter(Boolean).join(', ') || `${v.length} item(s)`;
    else if (v && typeof v === 'object') text = 'configured';
    else text = String(v ?? lever.itemLabel ?? '—');
    body = el('div', 'knob-val ro', text);
  }
  return knob(lever.label, body, lever.description);
};

// ---- per-mode modeLevers read/write (single source for every per-mode editor) ---------------------
// The per-mode lever axes (radius/tempo/density selects, the typography family/weight/leading/tracking
// editors, the shadow softness/tint sliders) all read + write `brandState.modeLevers[mode].<path>` with
// the SAME prune-to-byte-identical invariant: a mode whose overrides are all cleared must revert to
// exactly the no-override state. These three helpers own that so no editor re-implements it (and can't
// drift from it). `path` is a dot path into the mode entry (e.g. 'radius', 'families.display',
// 'shadow.tint.hue').
const getModeLever = (mode: string, path: string): unknown => {
  let node: any = brandState.modeLevers?.[mode];
  for (const p of path.split('.')) { if (node == null) return undefined; node = node[p]; }
  return node;
};
/** Drop empty nested maps and the mode entry (and modeLevers itself) so an all-cleared mode is byte-
 *  identical to never having had an override. */
const pruneModeLevers = (mode: string): void => {
  const ml = brandState.modeLevers; if (!ml) return;
  const e = ml[mode];
  const dropEmpties = (o: any): void => {
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) { dropEmpties(v); if (!Object.keys(v).length) delete o[k]; }
    }
  };
  if (e) { dropEmpties(e); if (!Object.keys(e).length) delete ml[mode]; }
  if (!Object.keys(ml).length) brandState.modeLevers = undefined;
};
/** Set `modeLevers[mode].<path>` to `value` (creating the nested maps), or delete it when `value` is
 *  undefined / '' — then prune empties. Does NOT re-render (callers pick apply/applyFull). */
const setModeLever = (mode: string, path: string, value: unknown): void => {
  const ml = brandState.modeLevers ?? (brandState.modeLevers = {});
  const e: any = ml[mode] ?? (ml[mode] = {});
  const parts = path.split('.');
  const last = parts.pop()!;
  let node: any = e;
  for (const p of parts) node = node[p] ?? (node[p] = {});
  if (value !== undefined && value !== '') node[last] = value; else delete node[last];
  pruneModeLevers(mode);
};

/** A per-mode enum select with a natural "Auto" (follows the global lever). Shared by the radius / motion
 *  tempo / density controls — outside the base mode they edit `modeLevers[mode].<key>` instead of the
 *  global. A hand-authored value that matches no discrete option is surfaced as its own "(custom)" option
 *  rather than silently reading as Auto. `parse` maps the selected string to the stored value. */
const renderPerModeSelect = (lever: Lever, key: string, opts: [string, string][], globalOf: () => string, parse: (s: string) => unknown, autoNote: string): HTMLElement => {
  const cur = getModeLever(currentMode, key);
  const sel = selectEl('sm fill');
  sel.append(optionEl('', `Auto — follows global (${globalOf()})`, cur == null));
  let matched = false;
  for (const [v, label] of opts) { const on = String(cur) === v; matched ||= on; sel.append(optionEl(v, label, on)); }
  if (cur != null && !matched) sel.append(optionEl(String(cur), `${cur} (custom)`, true));
  sel.onchange = () => { setModeLever(currentMode, key, sel.value === '' ? undefined : parse(sel.value)); applyFull(); };
  const desc = `${lever.description} — per ${MODE_LABEL[currentMode] ?? currentMode}; “Auto” follows the global ${autoNote}.`;
  return knob(lever.label, sel, desc);
};
const RADIUS_SCALE_OPTS: [string, string][] = [['0', '0 · sharp'], ['0.5', '0.5'], ['1', '1 · default'], ['1.5', '1.5'], ['2', '2 · soft']];
const TEMPO_OPTS: [string, string][] = [['snappy', 'Snappy'], ['standard', 'Standard'], ['relaxed', 'Relaxed']];
const DENSITY_OPTS: [string, string][] = [['compact', 'Compact'], ['comfortable', 'Comfortable'], ['spacious', 'Spacious']];
const renderPerModeRadius = (lever: Lever): HTMLElement =>
  renderPerModeSelect(lever, 'radius', RADIUS_SCALE_OPTS, () => String(brandState.radiusScale ?? (lever.default as number) ?? 1), Number, 'corner softness');
const renderPerModeTempo = (lever: Lever): HTMLElement =>
  renderPerModeSelect(lever, 'tempo', TEMPO_OPTS, () => String(brandState.motionPersonality?.tempo ?? (lever.default as string) ?? 'standard'), (s) => s, 'tempo');
const renderPerModeDensity = (lever: Lever): HTMLElement =>
  renderPerModeSelect(lever, 'density', DENSITY_OPTS, () => String(brandState.density ?? (lever.default as string) ?? 'comfortable'), (s) => s, 'density');

/** The all-modes contrast table (Pair · a mode column each · dot + ratio). Shared by the Preview master
 *  table and the per-page section tables (docs/23 §3) — one authoritative renderer, re-sliced by the
 *  caller's contract list. `paths` shows the raw `fg on bg` token paths (the section tables, which sit
 *  next to their controls where the component context is already obvious) with the human label as a
 *  subtitle; the master table keeps the descriptive `component · variant — label`. */
const pairCellEl = (ct: typeof rp.contracts[number], paths: boolean): HTMLElement => {
  const td = el('td', 'pair');
  if (paths) {
    td.append(el('span', 'pair-path mono', `${ct.fg} on ${ct.bg}`));
    if (ct.label) td.append(el('span', 'pair-sub', ct.label));
  } else {
    td.textContent = `${ct.component} · ${ct.variant} — ${ct.label ?? `${ct.min}:1`}`;
  }
  return td;
};
const contractTableEl = (contracts: typeof rp.contracts, paths = false): HTMLElement => {
  const table = el('table', 'ctable');
  const thead = el('tr');
  thead.append(el('th', undefined, paths ? 'Foreground on background' : 'Pair'));
  for (const m of rp.modes) thead.append(el('th', 'mcol', MODE_LABEL[m] ?? m));
  table.append(thead);
  for (const ct of contracts) {
    const tr = el('tr');
    tr.append(pairCellEl(ct, paths));
    for (const m of rp.modes) {
      const cell = el('td', 'mcol');
      const r = ct.byMode[m];
      if (r) { cell.append(el('span', `dot ${r.pass ? 'ok' : 'no'}`), el('span', 'ratio', r.ratio.toFixed(2))); }
      else cell.textContent = '—';
      tr.append(cell);
    }
    table.append(tr);
  }
  return table;
};

// ---- Preview segments (docs/23 §7) ----------------------------------------
// The Preview destination has three views behind a segmented switcher: the style guide (roles composed
// in-context), the all-modes contract master table, and a category-grouped token list. All read the
// mode picked in the global header for their per-mode columns/rendering.

/** Contrast contracts — the full all-modes master table (verification of record). */
const renderPreviewContracts = (host: HTMLElement): void => {
  host.append(el('p', 'np-note', `Every declared a11y pair (${rp.contracts.length}), computed on the resolved colors across all modes. The per-control badges on each editing page verify the active mode at the point of edit; the per-page tables scope this to what that page governs.`));
  host.append(contractTableEl(rp.contracts));
};

// Token list — the resolved token set, grouped by category, value(s) per mode where they vary.
const tokenTableEl = (rows: Array<{ name: string; cells: Array<HTMLElement | string> }>, cols: string[]): HTMLElement => {
  // `toktable` left-aligns the value columns (a swatch+hex / px value reads best flush-left) — the
  // shared `.ctable .mcol` centring is right for the contrast table's dot+ratio, wrong here.
  const table = el('table', 'ctable toktable');
  const thead = el('tr'); thead.append(el('th', undefined, 'Token'));
  for (const c of cols) thead.append(el('th', 'mcol', c));
  table.append(thead);
  for (const r of rows) {
    const tr = el('tr'); tr.append(el('td', 'pair mono', r.name));
    for (const c of r.cells) { const td = el('td', 'mcol'); if (typeof c === 'string') td.textContent = c; else td.append(c); tr.append(td); }
    table.append(tr);
  }
  return table;
};
const swatchCell = (hex: string | undefined): HTMLElement => {
  const wrap = el('span', 'tok-val');
  if (hex) { const sw = el('span', 'tok-sw'); sw.style.background = hex; wrap.append(sw, el('span', 'mono', hex)); }
  else wrap.append(document.createTextNode('—'));
  return wrap;
};
// The token list walks the SAME DTCG tree `exportTokens` downloads (`buildTree(theme).tree`), so what you
// see IS what you'd export — and a full tree walk shows EVERY token, not the preview-bound subset (#263).
// Each top-level category under the brand root becomes a `.psec`; leaves render by `$type`.
type TokLeaf = { path: string; node: TreeNode };
/** Collect every leaf under `node` (a leaf has `$type`; groups are plain objects; `$`-keys are metadata),
 *  as dotted paths RELATIVE to the category root. Mirrors the generator's own walker (tree.ts). */
const collectLeaves = (node: TreeNode, prefix: string, out: TokLeaf[]): void => {
  if (!node || typeof node !== 'object') return;
  if (node.$type !== undefined) { out.push({ path: prefix, node }); return; }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) collectLeaves(v, prefix ? `${prefix}.${k}` : k, out);
};
/** A color leaf's hex for a mode: the base `$value` (base mode) or the `modes.<m>.$value` override,
 *  dereferenced to its palette primitive (whose `$extensions.prism3.hex` is colour-format-independent). */
const hexOfNode = (tree: TreeNode, node: TreeNode): string | undefined => {
  // A leaf's hex: its own `$extensions.prism3.hex` if present (primitives carry it, format-independent);
  // else if its `$value` is an `{alias}`, follow it to the primitive that does. `#…` / `rgb(…)` fall back.
  const own = node?.$extensions?.prism3?.hex;
  if (own) return own;
  const v = node?.$value;
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) return hexOfNode(tree, deref(tree, subNode(tree, v)));
  if (typeof v === 'string' && (v.startsWith('#') || v.startsWith('rgb'))) return v;
  return undefined;
};
const colorHexAt = (tree: TreeNode, node: TreeNode, mode: Mode, baseMode: Mode): string | undefined => {
  const ov = node.$extensions?.prism3?.modes?.[mode];
  // A primitive (raw hex, no per-mode overrides) reads the same across every column; a role uses its base
  // `$value` for the base mode and the `modes.<m>.$value` alias otherwise.
  if (mode === baseMode || !node.$extensions?.prism3?.modes) return hexOfNode(tree, node);
  return ov?.$value ? hexOfNode(tree, deref(tree, subNode(tree, ov.$value))) : hexOfNode(tree, node);
};
/** A typography composite → family · weight · size · line-height · tracking (primary face only). */
const typeComposite = (tree: TreeNode, node: TreeNode): string => {
  const v = node.$value ?? {};
  const parts: string[] = [];
  if (v.fontFamily) parts.push(familyOf(tree, subNode(tree, v.fontFamily)).split(',')[0].trim());
  if (v.fontWeight) parts.push(String(numOf(tree, subNode(tree, v.fontWeight))));
  if (v.fontSize) parts.push(`${Math.round(remPxOf(tree, subNode(tree, v.fontSize)))}px`);
  if (v.lineHeight) parts.push(`${numOf(tree, subNode(tree, v.lineHeight))} lh`);
  if (v.letterSpacing) { const ls = deref(tree, subNode(tree, v.letterSpacing)); const em = ls?.$extensions?.prism3?.em; if (em != null) parts.push(`${em}em`); }
  return parts.join(' · ');
};
/** A shadow layer array → a compact CSS box-shadow string (for a monospace cell). */
const shadowCss = (layers: unknown): string => Array.isArray(layers)
  ? layers.map((l: any) => `${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread ?? '0'} ${l.color}`).join(', ')
  : '';
const renderPreviewTokens = (host: HTMLElement): void => {
  const tree = buildTree(theme).tree;
  const root = (tree.$extensions?.prism3?.root as string) ?? Object.keys(tree).find((k) => !k.startsWith('$'))!;
  const brand = tree[root] as TreeNode;
  const modes = rp.modes;
  const baseMode = modes[0];   // the base `$value` is the first/canonical mode (light); the rest are overrides
  const modeLabels = modes.map((m) => MODE_LABEL[m] ?? m);

  type TokRow = { name: string; cells: Array<HTMLElement | string> };
  // A category `.psec`: sub-group leaves by their top-level segment (a `subHead` per group when >1), each
  // group's table in its own overflow-x scroller — same doc-26 presentation as before (#262).
  const tokenSection = (title: string, sub: string, rows: TokRow[], cols: string[]): void => {
    if (!rows.length) return;
    const sec = palSection(title, sub);
    // Sub-group by first path segment ONLY when the leaves actually nest (some name has a dot) — else a
    // flat category (opacity.0, shadow.md, …) would emit a `subHead` per single-segment leaf. One flat
    // table in that case; a `subHead`-per-group mini-table (doc-26, #262) when there's real nesting.
    const nested = rows.some((r) => r.name.includes('.'));
    if (!nested) {
      const scroll = el('div', 'pv-tscroll'); scroll.append(tokenTableEl(rows, cols)); sec.append(scroll);
      host.append(sec); return;
    }
    const groups = new Map<string, TokRow[]>();
    for (const r of rows) { const g = r.name.split('.')[0]; (groups.get(g) ?? groups.set(g, []).get(g)!).push(r); }
    for (const [g, grows] of groups) {
      sec.append(subHead(g));
      const scroll = el('div', 'pv-tscroll'); scroll.append(tokenTableEl(grows, cols)); sec.append(scroll);
    }
    host.append(sec);
  };

  // One category per top-level group under the brand root (insertion order — the generator's own order).
  for (const category of Object.keys(brand).filter((k) => !k.startsWith('$'))) {
    const leaves: TokLeaf[] = [];
    collectLeaves(brand[category], '', leaves);
    if (!leaves.length) continue;
    const kind = leaves[0].node.$type as string;   // a category is homogeneous by $type
    const catLabel = category.charAt(0).toUpperCase() + category.slice(1);

    if (kind === 'color') {
      tokenSection(catLabel, `${leaves.length} ${category} tokens — resolved hex per mode, from the exported tree (1:1 with a downloaded tokens.json).`,
        leaves.map((l) => ({ name: l.path, cells: modes.map((m) => swatchCell(colorHexAt(tree, l.node, m, baseMode))) })), modeLabels);
    } else if (kind === 'typography') {
      tokenSection(catLabel, `${leaves.length} composites — family, weight, size, line-height, tracking (primary face; mode-invariant).`,
        leaves.map((l) => ({ name: l.path, cells: [typeComposite(tree, l.node)] })), ['Resolved']);
    } else if (kind === 'shadow') {
      tokenSection(catLabel, `${leaves.length} elevation steps — CSS box-shadow per mode (dark = the reduced set).`,
        leaves.map((l) => ({ name: l.path, cells: modes.map((m) => {
          const arr = m === baseMode ? l.node.$value : (l.node.$extensions?.prism3?.modes?.[m] ?? l.node.$value);
          const css = shadowCss(arr); if (!css) return '—';
          const sp = el('span', 'tok-shadow mono', css); sp.title = css; return sp;
        }) })), modeLabels);
    } else {
      const hasModes = leaves.some((l) => l.node.$extensions?.prism3?.modes);
      const cols = hasModes ? modeLabels : ['Resolved'];
      const valAt = (l: TokLeaf, m: Mode): string => {
        const ov = l.node.$extensions?.prism3?.modes?.[m];
        const n = (m !== baseMode && ov) ? deref(tree, subNode(tree, ov.$value)) : deref(tree, l.node);
        const px = n?.$extensions?.prism3?.px;
        if (px != null) return `${px}px`;
        const val = n?.$value;
        return typeof val === 'number' ? String(val) : String(val ?? '—');
      };
      tokenSection(catLabel, `${leaves.length} ${category} tokens — resolved from the exported tree.`,
        leaves.map((l) => ({ name: l.path, cells: (hasModes ? modes : [baseMode]).map((m) => valAt(l, m)) })), cols);
    }
  }
};

/** Style guide (Preview → Style guide) — the resolved system composed in situ: every color role in
 *  context, on light and inverse surfaces, driven by the global mode picker. The semantic token path is
 *  the label (a `.tpill`); the resolved primitive + hex + contrast reveal on hover. Reuses the doc-26
 *  shell (`palSection`/`subHead`/`tokenPill`); only the specimen layout is new (`sg-*`). */
const SG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 15 9l7 .5-5.3 4.6L18.2 21 12 17l-6.2 4 1.5-6.9L2 9.5 9 9z"/></svg>';
const renderPreviewStyleGuide = (host: HTMLElement): void => {
  type SGRole = { path: string; hex: string; ratio: number; min: number; alpha?: number };
  const rolesByMode = new Map<string, Record<string, SGRole | undefined>>(
    resolveAllModes(theme).map((x) => [x.mode, x.roles as Record<string, SGRole | undefined>]));
  const cur: string = currentMode;
  const OPP: Record<string, string> = { light: 'dark', dark: 'light', 'hc-light': 'hc-dark', 'hc-dark': 'hc-light' };
  const opp: string = OPP[cur] && rolesByMode.has(OPP[cur]) ? OPP[cur] : (rp.modes.find((m) => m !== cur) ?? cur);
  const ns = theme.namespace + '.';
  const role = (m: string, k: string): SGRole | undefined => rolesByMode.get(m)?.[k];
  const rgba = (hx: string, a: number): string => { const n = parseInt(hx.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  const paint = (m: string, k: string): string => { const r = role(m, k); return r ? (r.alpha != null ? rgba(r.hex, r.alpha) : r.hex) : 'transparent'; };
  const stepOf = (r: SGRole): string => (r.path.startsWith(ns) ? r.path.slice(ns.length) : r.path);
  const fails = (m: string, k: string): boolean => { const r = role(m, k); return !!(r && r.min > 0 && r.ratio < r.min); };
  const tipOf = (m: string, k: string): string => { const r = role(m, k); if (!r) return `${k} — unset`; const c = r.min > 0 ? ` · ${r.ratio.toFixed(2)}:1 (min ${r.min})` : ''; return `${stepOf(r)} · ${r.hex}${c}`; };
  // token pill with hover-reveal of the resolved primitive (semantic lead, primitive on hover). The
  // visible label is the real, resolvable path — semantic roles emit under `color.*` (doc-26 contract),
  // so a bare role key is prefixed; a short contextual label (e.g. `fill.rest`) is shown verbatim.
  const sgPill = (k: string, label?: string, m: string = cur): HTMLElement => {
    const path = label ?? `color.${k}`;
    const p = tokenPill(path);
    // Two tooltips carrying two different things, deliberately: the custom `data-sgtip` bubble reveals
    // what the role RESOLVES to (primitive step · hex · ratio), while `title` — set by tokenPill and
    // preserved here — is the full PATH, which matters now that a long path can be elided (#289).
    // Previously `title` was overwritten with the resolution too, making it redundant.
    p.setAttribute('data-sgtip', tipOf(m, k));
    if (fails(m, k)) { p.classList.add('sg-failpill'); p.append(el('b', 'sg-fx', '!')); }
    return p;
  };
  const pills = (...nodes: HTMLElement[]): HTMLElement => { const w = el('div', 'sg-pills'); nodes.forEach((n) => w.append(n)); return w; };
  const grid = (cols: number, cards: HTMLElement[]): HTMLElement => { const g = el('div', `sg-grid sg-g${cols}`); cards.forEach((c) => g.append(c)); return g; };

  // color plane + optional in-card label(s) + token pill(s) underneath
  const surfaceCard = (k: string, label: string, inkRole: string, sub?: string, extra: HTMLElement[] = []): HTMLElement => {
    const cw = el('div', 'sg-cw');
    const card = el('div', 'sg-card'); card.style.background = paint(cur, k);
    if (fails(cur, k)) card.append(el('span', 'sg-failmk', '!'));
    const lab = el('div', 'sg-lab', label); lab.style.color = paint(cur, inkRole); card.append(lab);
    if (sub) { const sb = el('div', 'sg-sub', sub); sb.style.color = paint(cur, inkRole); card.append(sb); }
    cw.append(card, pills(sgPill(k), ...extra));
    return cw;
  };
  const borderCard = (k: string): HTMLElement => {
    const cw = el('div', 'sg-cw');
    const card = el('div', 'sg-card sg-bcard'); card.style.border = `2px solid ${paint(cur, k)}`;
    if (fails(cur, k)) card.append(el('span', 'sg-failmk', '!'));
    cw.append(card, pills(sgPill(k)));
    return cw;
  };
  const iconCard = (k: string, bgRole?: string): HTMLElement => {
    const cw = el('div', 'sg-cw');
    const card = el('div', 'sg-card sg-icard');
    if (bgRole) { card.style.background = paint(cur, bgRole); card.style.border = 'none'; }
    const ico = el('span', 'sg-ico'); ico.style.color = paint(cur, k); ico.innerHTML = SG_ICON; card.append(ico);
    cw.append(card, pills(sgPill(k)));
    return cw;
  };

  host.append(el('p', 'np-note', 'Hover any token pill for its resolved primitive, hex, and contrast. Modes switch from the picker above.'));

  const SEM: Array<[string, string]> = [['Brand', 'brand'], ['Danger', 'danger'], ['Success', 'success'], ['Warning', 'warning'], ['Info', 'info']];

  // Background
  const secBg = palSection('Background', 'The base page planes and their inverse counterparts.');
  secBg.append(subHead('Base'), grid(3, ([['Primary', 'background.primary'], ['Secondary', 'background.secondary'], ['Tertiary', 'background.tertiary']] as Array<[string, string]>).map(([n, k]) => surfaceCard(k, n, 'text.primary'))));
  secBg.append(subHead('Inverse'), grid(3, ([['Primary', 'background.inverse.primary'], ['Secondary', 'background.inverse.secondary'], ['Tertiary', 'background.inverse.tertiary']] as Array<[string, string]>).map(([n, k]) => surfaceCard(k, n, 'text.on-inverse'))));
  host.append(secBg);

  // Foreground
  const secFg = palSection('Foreground', 'Content surfaces — the neutral ladder, plus semantic fills in bold and subtle weights, each paired with its on-surface text.');
  secFg.append(subHead('Neutral'), grid(3, ([['Primary', 'foreground.primary'], ['Secondary', 'foreground.secondary'], ['Tertiary', 'foreground.tertiary']] as Array<[string, string]>).map(([n, k]) => surfaceCard(k, n, 'text.primary'))));
  secFg.append(subHead('Bold'), grid(5, SEM.map(([n, s]) => surfaceCard(`foreground.${s}`, n, `text.on-${s}`, 'On-color text', [sgPill(`text.on-${s}`)]))));
  secFg.append(subHead('Subtle'), grid(5, SEM.map(([n, s]) => surfaceCard(`foreground.${s}-subtle`, n, `text.${s}`, 'On-color text', [sgPill(`text.${s}`)]))));
  host.append(secFg);

  // Text color — Light | Inverse | Token
  const secText = palSection('Text color', 'Every text color at one size, shown on the current surface and its inverse counterpart. On-color text lives with the fills above.');
  const curLabel = MODE_LABEL[cur] ?? cur, oppLabel = MODE_LABEL[opp] ?? opp;
  const lbg = paint(cur, 'background.primary'), dbg = paint(opp, 'background.primary');
  const tcHead = (txt: string, cls: string, color: string): HTMLElement => { const d = el('div', `sg-tc ${cls} sg-tchd`, txt); d.style.color = color; return d; };
  const tcCell = (nm: string, k: string, m: string, cls: string, ul: boolean): HTMLElement => {
    const d = el('div', `sg-tc ${cls} sg-tcrow`); d.style.color = paint(m, k);
    const sp = el('span', 'sg-samp', nm); if (ul) sp.style.textDecoration = 'underline'; d.append(sp);
    if (fails(m, k)) d.append(el('b', 'sg-fx', '!'));
    return d;
  };
  const tcGroups: Array<[string, Array<[string, string]>, boolean]> = [
    ['Neutral', [['Primary', 'text.primary'], ['Secondary', 'text.secondary'], ['Tertiary', 'text.tertiary']], false],
    ['Semantic', SEM.map(([n, s]) => [n, `text.${s}`] as [string, string]), false],
    ['Semantic — subtle', SEM.map(([n, s]) => [n, `text.${s}-subtle`] as [string, string]), false],
    ['Links', [['Link', 'text.link.default'], ['Hover', 'text.link.hover'], ['Visited', 'text.link.visited']], true],
  ];
  for (const [glab, items, ul] of tcGroups) {
    secText.append(subHead(glab));
    const g = el('div', 'sg-tcg'); g.style.setProperty('--lbg', lbg); g.style.setProperty('--dbg', dbg);
    g.append(tcHead(`On ${curLabel} surface`, 'sg-l', paint(cur, 'text.tertiary')), tcHead(`On ${oppLabel} surface`, 'sg-r', paint(opp, 'text.tertiary')), tcHead('Token', 'sg-t', 'var(--faint)'));
    for (const [nm, k] of items) {
      g.append(tcCell(nm, k, cur, 'sg-l', ul), tcCell(nm, k, opp, 'sg-r', ul));
      const tc = el('div', 'sg-tc sg-t sg-tcrow'); tc.append(sgPill(k)); g.append(tc);
    }
    secText.append(g);
  }
  const callout = el('div', 'sg-callout');
  callout.append(document.createTextNode('Links draw only from the action ramp — the engine defines '));
  callout.append(el('span', 'mono', 'text.link.default / hover / visited'));
  callout.append(document.createTextNode(' and no neutral or accent link roles.'));
  secText.append(callout);
  host.append(secText);

  // Border
  const secBorder = palSection('Border', 'Neutral separators, the focus ring, and semantic borders — their own category, not a surface.');
  secBorder.append(subHead('Neutral'), grid(3, ['border.primary', 'border.secondary', 'border.inverse'].map((k) => borderCard(k))));
  secBorder.append(subHead('Focus & semantic'), grid(3, ['border.focus', 'border.brand', 'border.danger', 'border.success', 'border.warning', 'border.info'].map((k) => borderCard(k))));
  host.append(secBorder);

  // Icon
  const secIcon = palSection('Icon', 'Icon color at the neutral tiers, the semantic set, and the on-color icons that sit on bold fills.');
  secIcon.append(subHead('Neutral'), grid(3, ['icon.primary', 'icon.secondary', 'icon.tertiary'].map((k) => iconCard(k))));
  secIcon.append(subHead('Semantic'), grid(5, ['icon.brand', 'icon.danger', 'icon.success', 'icon.warning', 'icon.info'].map((k) => iconCard(k))));
  secIcon.append(subHead('On color'), grid(5, SEM.map(([, s]) => iconCard(`icon.on-${s}`, `foreground.${s}`))));
  host.append(secIcon);

  // Disabled
  const secDis = palSection('Disabled', 'One shared, stateless inert set — reused by every control. No per-palette or inverse variant.');
  const disCards: HTMLElement[] = [];
  { const cw = el('div', 'sg-cw'); const c = el('div', 'sg-card'); c.style.background = paint(cur, 'disabled.fill'); cw.append(c, pills(sgPill('disabled.fill'))); disCards.push(cw); }
  { const cw = el('div', 'sg-cw'); const c = el('div', 'sg-card sg-mid'); c.style.background = paint(cur, 'disabled.fill'); const l = el('div', 'sg-lab', 'Disabled'); l.style.color = paint(cur, 'disabled.on-fill'); c.append(l); cw.append(c, pills(sgPill('disabled.on-fill'))); disCards.push(cw); }
  { const cw = el('div', 'sg-cw'); const c = el('div', 'sg-card sg-mid'); c.style.background = 'var(--panel)'; const l = el('div', 'sg-lab', 'Disabled'); l.style.color = paint(cur, 'disabled.text'); c.append(l); cw.append(c, pills(sgPill('disabled.text'))); disCards.push(cw); }
  disCards.push(borderCard('disabled.border'), iconCard('disabled.icon'));
  secDis.append(grid(5, disCards));
  host.append(secDis);

  // Interactive — button sets in rows
  const secInt = palSection('Interactive', 'Each interactive palette in three treatments — filled, outline, inverse — with its rest / hover / pressed set laid out in a row. Each button is tagged with its exact fill token; the treatment label carries the supporting token. Disabled is one shared, stateless set. Accent palettes are opt-in and would add blocks.');
  const STATES = ['rest', 'hover', 'pressed'];
  const btn = (bg: string, fg: string, bd: string | null): HTMLElement => { const b = el('button', 'sg-btn', 'Button'); b.style.background = bg; b.style.color = fg; if (bd) b.style.borderColor = bd; return b; };
  const bcol = (bg: string, fg: string, bd: string | null, st: string, fullkey: string, subpath: string): HTMLElement => { const c = el('div', 'sg-bcol'); c.append(btn(bg, fg, bd), el('span', 'sg-st', st), sgPill(fullkey, subpath)); return c; };
  const footLine = (lbl: string, p: HTMLElement): HTMLElement => { const s = el('span', 'sg-foothint'); s.append(document.createTextNode(lbl + ' '), p); return s; };
  const trow = (label: string, foot: HTMLElement[], cols: HTMLElement[], inv: boolean): HTMLElement => {
    const row = el('div', 'sg-trow');
    const lab = el('div', 'sg-tlab', label);
    if (foot.length) { const f = el('div', 'sg-tlfoot'); foot.forEach((n) => f.append(n)); lab.append(f); }
    const bs = el('div', 'sg-btns' + (inv ? ' sg-inv' : '')); if (inv) bs.style.setProperty('--sg-invp', paint(cur, 'background.inverse.primary'));
    cols.forEach((c) => bs.append(c));
    row.append(lab, bs);
    return row;
  };
  const paletteBlock = (nm: string, c: string): HTMLElement => {
    const block = el('div', 'sg-pblock');
    const hd = el('div', 'sg-phd'); hd.append(el('span', 'sg-rn', nm), sgPill(`interactive.${c}.fill.rest`, `color.interactive.${c}`)); block.append(hd);
    const filled = STATES.map((s) => bcol(paint(cur, `interactive.${c}.fill.${s}`), paint(cur, `interactive.${c}.on-fill`), null, s, `interactive.${c}.fill.${s}`, `fill.${s}`));
    const bgFor: Record<string, string> = { rest: 'transparent', hover: paint(cur, `interactive.${c}.overlay.hover`), pressed: paint(cur, `interactive.${c}.overlay.pressed`) };
    const outline = STATES.map((s) => bcol(bgFor[s], paint(cur, `interactive.${c}.text.${s}`), paint(cur, `interactive.${c}.border`), s, `interactive.${c}.text.${s}`, `text.${s}`));
    const inv = STATES.map((s) => bcol(paint(cur, `interactive.${c}.on-inverse.fill.${s}`), paint(cur, `interactive.${c}.on-inverse.on-fill`), null, s, `interactive.${c}.on-inverse.fill.${s}`, `fill.${s}`));
    block.append(trow('Filled', [footLine('text', sgPill(`interactive.${c}.on-fill`, 'on-fill'))], filled, false));
    block.append(trow('Outline', [footLine('border', sgPill(`interactive.${c}.border`, 'border'))], outline, false));
    block.append(trow('Inverse', [footLine('text', sgPill(`interactive.${c}.on-inverse.on-fill`, 'on-fill'))], inv, true));
    return block;
  };
  secInt.append(paletteBlock('Primary', 'primary'), paletteBlock('Neutral', 'neutral'), paletteBlock('Destructive', 'destructive'));
  {
    const block = el('div', 'sg-pblock');
    const hd = el('div', 'sg-phd'); hd.append(el('span', 'sg-rn', 'Disabled'), sgPill('disabled.fill', 'color.disabled')); block.append(hd);
    block.append(trow('Filled', [footLine('text', sgPill('disabled.on-fill', 'on-fill'))], [bcol(paint(cur, 'disabled.fill'), paint(cur, 'disabled.on-fill'), null, 'disabled', 'disabled.fill', 'fill')], false));
    block.append(trow('Outline', [footLine('text', sgPill('disabled.text', 'text'))], [bcol('transparent', paint(cur, 'disabled.text'), paint(cur, 'disabled.border'), 'disabled', 'disabled.border', 'border')], false));
    block.append(trow('Inverse', [el('span', 'sg-foothint', 'shared — no inverse variant')], [bcol(paint(cur, 'disabled.fill'), paint(cur, 'disabled.on-fill'), null, 'disabled', 'disabled.fill', 'fill')], true));
    secInt.append(block);
  }
  host.append(secInt);
};

const PAGE_COPY: Record<PageKey, [string, string]> = {
  palettes: ['', ''],   // Palettes has its own hero in renderPrimitives
  surfaces: ['Surfaces & fills.', 'The page backgrounds every role sits on, the text colors derived to stay readable on them, and an optional brand gradient. Text is contrast-placed — override to a specific neutral step and the badge tells you whether it still clears. (Status hues are edited per-ramp on Palettes.)'],
  interactive: ['Interactive color & states.', 'Point actions at the palette that reads best, tune the interactive treatment (hover, inverse, neutral emphasis), and set the accessibility policy — icon contrast + the disabled strategy.'],
  typography: ['Set the type system.', 'Families, weights, and the type scale that shifts the semantic→primitive size mapping. The rem ladder is brand-invariant; the scale is the dial.'],
  elevation: ['Elevation.', 'The shadow ramp — blur/offset softness and an optional brand-hued tint on the shadow base. Dark modes get a reduced set automatically.'],
  sizeRadius: ['Size & radius.', 'Component sizing (control height + paired padding, driven by density) and corner radius. Both go per-mode outside Light.'],
  layout: ['Layout.', 'Breakpoints, grid columns, and container widths — the responsive frame the system lays out within.'],
  motion: ['Motion.', 'Tempo (the duration ramp) and the emphasized easing curve. Reduce-motion is derived.'],
  preview: ['Preview your system.', 'The style guide, the full contrast-contract table, and every resolved token — through the mode picked above. Switch modes to preview them; this is the one place the whole system renders together.'],
};

// Validation-color control (docs/21 + status.*). Lives INLINE on each status ramp (primitives
// stage), not as a standalone section: a designer edits the red/green/amber/blue right where the
// ramp is shown. Two mutually-exclusive engine mechanisms behind one dropdown —
//   • Custom hue → `status.<role>` seeds the ramp from a picked hue (the raw validation color)
//   • Use <ramp> → `roleColors.<role>` borrows a declared palette (a red brand's red for danger)
//   • Auto → clears both (engine default: a synthesised hue, or the danger-red carve)
// Contrast always re-gates on whatever it lands on; a hue mismatch is flagged in the theme notes.
// (A future "lock" gate to unlock editing is deferred.)
const STATUS_ROLES = ['success', 'warning', 'danger', 'info'] as const;
type StatusRole = typeof STATUS_ROLES[number];

/** Seed hex for the custom-hue picker: the current status ramp's mid step if present, else grey. */
const statusSeedHex = (role: string): string => {
  const cur = brandState.status?.[role as StatusRole];
  if (cur) return hex(oklchToRgb(cur));
  const pal = theme.palettes.find((p) => p.palette === role);
  return pal?.steps.find((s) => s.num === 500)?.hex ?? pal?.steps[Math.floor(pal.steps.length / 2)]?.hex ?? '#808080';
};

/** Write `status.<role>` from a hex (seeds hue + chroma), clearing any borrow (they're exclusive). */
const setStatusHue = (role: StatusRole, hexVal: string): void => {
  const rc = { ...(brandState.roleColors ?? {}) } as Record<string, string>; delete rc[role];
  const o = rgbToOklch(hexToRgb(hexVal));
  brandState.roleColors = (Object.keys(rc).length ? rc : undefined) as BrandInput['roleColors'];
  brandState.status = { ...(brandState.status ?? {}), [role]: { l: o.l, c: o.c, h: o.h, chroma: o.c } };
  apply();
};

/** One validation (status) row — Source select (Auto / Custom hue / borrow a brand palette) on the left,
 *  the anchor on the right. The left swatch is the hue picker only under Custom hue (authored); Auto and
 *  borrow render it as a read-out with no hex-by-name. Source changes are structural → applyFull. */
const statusRow = (role: StatusRole): { row: HTMLElement; refresh: () => void } => {
  const borrowed = brandState.roleColors?.[role];
  const custom = !borrowed && !!brandState.status?.[role];
  const row = el('div', 'prow' + (custom ? ' authored show-hex' : ''));
  const head = el('div', 'phead');
  const ident = el('div', 'pident');

  let swatch: HTMLElement;
  let hexLab: HTMLElement | null = null;
  if (custom) {
    const picker = el('input', 'pswatch') as HTMLInputElement;
    picker.type = 'color'; picker.value = statusSeedHex(role); picker.title = `Seed the ${role} ramp from a hue`;
    // `change`, not `oninput`: the volatile bands repaint on commit (dialog close), never mid-drag.
    picker.onchange = () => { setStatusHue(role, picker.value); if (hexLab) hexLab.textContent = picker.value; };
    swatch = picker;
  } else {
    swatch = el('div', 'pswatch ro');
  }
  const idcol = el('div', 'pidcol');
  idcol.append(el('span', 'pname', role));
  const sub = el('div', 'psub');
  if (custom) { hexLab = el('span', 'phex mono', (swatch as HTMLInputElement).value); sub.append(hexLab); }
  sub.append(tokenPill(`palette.${role}`));
  idcol.append(sub);
  ident.append(swatch, idcol);

  const origin = el('div', 'porigin');
  const sel = selectEl('sm');
  sel.append(optionEl('auto', 'Auto', !borrowed && !custom), optionEl('custom', 'Custom hue…', custom));
  for (const p of ['primary', ...(brandState.brandColors ?? []).map((b) => b.name)]) sel.append(optionEl('borrow:' + p, `Use ${p}`, borrowed === p));
  sel.onchange = () => {
    const rc = { ...(brandState.roleColors ?? {}) } as Record<string, string>; delete rc[role];
    const st = { ...(brandState.status ?? {}) } as Record<string, unknown>; delete st[role];
    if (sel.value === 'custom') { const o = rgbToOklch(hexToRgb(statusSeedHex(role))); st[role] = { l: o.l, c: o.c, h: o.h, chroma: o.c }; }
    else if (sel.value.startsWith('borrow:')) rc[role] = sel.value.slice('borrow:'.length);
    brandState.roleColors = (Object.keys(rc).length ? rc : undefined) as BrandInput['roleColors'];
    brandState.status = (Object.keys(st).length ? st : undefined) as BrandInput['status'];
    applyFull();
  };
  origin.append(pfield('Source', sel));

  const anchor = anchorField();
  head.append(ident, origin, anchor.field);
  const bands = el('div', 'pramp-wrap');
  row.append(head, bands);
  const refresh = (): void => {
    // Auto can RESOLVE to another palette: a red brand primary reuses `primary` for danger (no standalone
    // danger palette is minted), so read the engine's resolved mapping rather than the literal role name —
    // else the row finds no palette and collapses (white swatch, empty bands). Explicit borrow still wins.
    const resolved = (theme.roleToPalette as Record<string, string>)[role] ?? role;
    const srcName = borrowed ?? resolved;
    const pal = theme.palettes.find((p) => p.palette === srcName);
    const steps = pal?.steps ?? [];
    const aStep = anchorStepFor(srcName);
    // Note the reuse ("via primary") so a user sees why the ramp matches their brand red, not a surprise.
    const note = borrowed ? `borrowing ${borrowed}` : (resolved !== role ? `via ${resolved}` : undefined);
    anchor.set(aStep != null ? steps.find((s) => s.num === aStep)?.key : undefined, note);
    if (!custom) { const mid = steps.find((s) => s.num === 500)?.hex ?? steps[Math.floor(steps.length / 2)]?.hex; if (mid) swatch.style.background = mid; }
    bands.replaceChildren(rampBands(steps, aStep));
  };
  return { row, refresh };
};

// The Semantic tab groups its 8 controls into intent sub-sections (design review §1) rather
// than one flat panel. `disabledMin` nests under `disabledStrategy` — it only bites when the
// strategy is 'accessible'. A trailing catch-all renders any ungrouped semantic lever so a
// future addition can't be silently dropped.
// The Interactive page groups its controls into intent sub-sections. (Gradients — formerly a "Features"
// group here — now lives on the Surfaces page; page surfaces + text/ink are bespoke editors there.)
const subHead = (title: string): HTMLElement => { const s = el('div', 'sub-lab'); s.append(el('h3', 'sub-t', title)); return s; };

/** The last dot-segment of a token path — the palette step key (e.g. `…primary.650` → `650`). Shared by
 *  the interactive matrix + the Surfaces fill editors to label an "Auto · <palette> <step>" source. */
const stepKeyOf = (path: string | undefined): string => (path ? path.split('.').pop()! : '');

// ---- shared colour atoms (audit §8) ---------------------------------------
// contrastBadge + swatch are the shared atoms every colour editor composes from (the interactive matrix,
// the Surfaces fill/foreground editors, the preview gallery).

/** "ratio:1 ✓/✗", pass/fail coloured, with an optional leading label. Shared by the cards + the preview
 *  gallery (audit §8 candidate #1). */
const contrastBadge = (ratio: number, min: number, label?: string): HTMLElement => {
  const b = el('span', `cbadge ${ratio >= min ? 'ok' : 'no'}`);
  if (label) b.append(el('span', 'cb-lab', label));
  b.append(el('span', 'cb-ratio', `${ratio.toFixed(2)}:1`), el('span', 'cb-mark', ratio >= min ? '✓' : '✗'));
  return b;
};
/** A colour swatch element with an inline background (audit §8 candidate #2). */
const swatch = (hex: string, cls = 'sw'): HTMLElement => { const s = el('div', cls); s.style.background = hex; return s; };

// ============================================================================
// Interactive & action colors — the per-palette matrix (#69)
// ============================================================================
// Each action palette (Primary / Neutral / Destructive / promoted Accents) is a section of full-width
// SLOT rows: Fill · rest, Fill · inverse, Text · rest, Text · inverse, Overlay wash, On-fill, On-fill ·
// inverse. A row = a 56×56 swatch · a Source select + token pill + description · a locked-right example
// with its contrast receipt · (fill / text / overlay) a two-up Hover/Pressed states strip. Every slot
// binds to a REAL engine role — ENG-1/ENG-2 emit the full per-state, inverse, and overlay surface. The
// fill · rest Source is the column's fill ANCHOR (re-derives the whole family coherently); every other
// Source and every state is a surgical per-mode colour OVERRIDE (brandState.overrides[mode][role] =
// {palette, step}; "Auto" clears it, reverting to the derived value). Cross-cutting behaviours (outline
// hover, disabled, icon colours) sit at the TOP — they govern every palette. Overrides only live on the
// customizable modes, so renderScreen renders the generated-note on the derived modes and this editor
// never runs there.
// A structural narrowing of the engine's `ResolvedRole`. `against` names the role this one's `ratio`
// is measured against — needed to judge a candidate step before it is picked (`contrastMark`).
type RoleRes = { hex: string; path?: string; ratio?: number; min?: number; against?: string; alpha?: number };
type RoleMap = Record<string, RoleRes | undefined>;
const iRoles = (): RoleMap => (resolveAllModes(theme).find((x) => x.mode === currentMode)?.roles ?? {}) as RoleMap;
const stepsOf = (palette: string): string[] => (theme.palettes.find((p) => p.palette === palette)?.steps ?? []).map((s) => s.key);
const capWord = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** `#rrggbb`(+alpha) → an `rgba()` string, so a translucent overlay wash paints honestly (a faint swatch). */
const rgbaOf = (r: RoleRes): string => {
  const h = (r.hex ?? '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${r.alpha ?? 1})`;
};

/** A per-mode colour-override Source select for one role. "Auto" clears the override (the role reverts to
 *  its derived value); a step pins the role to that primitive (the engine re-derives its contrast and
 *  warns — never blocks — if a hand pick misses the floor). Reuses the generic override writer the
 *  Surfaces foreground editor uses (`setFillOverride`). */
const roleSourceSelect = (roleKey: string, palette: string, derivedStep: string): HTMLSelectElement => {
  const cur = brandState.overrides?.[currentMode]?.[roleKey]?.step;
  return stepPicker(palette, stepsOf(palette), derivedStep, typeof cur === 'string' ? cur : undefined,
    (step) => setFillOverride(roleKey, palette, step), contrastMark(roleKey, palette));
};

/** Marks the steps that SATISFY a contrast-gated role, in the picker, before the pick is made.
 *
 *  Overrides apply-but-warn by design (`modes.ts`) — deliberately, since a UI that refused the option
 *  would be false assurance: the same override is authorable through `design.md`/`BrandInput`, which
 *  the engine accepts, so blocking here would hide the capability from one surface without protecting
 *  the artifact. Only the engine can guarantee, and whether it should CLAMP instead of warn is a
 *  layer-wide question (#320), not a per-role one.
 *
 *  So this informs rather than blocks: the warning stays as the backstop, and the picker stops being
 *  the place you discover the problem only after choosing. Applies to every contrast-gated override
 *  picker, not just one row — the same reasoning holds everywhere the layer is used.
 *
 *  Marks the PASSING steps, not the failing ones. On a subtle tint only ~4 of 21 steps clear the label,
 *  so flagging failures put a warning on 80% of the list — technically accurate and useless, since a
 *  list that is nearly all warnings reads as noise rather than guidance. The short list is the useful
 *  signal, so it is the one that gets marked. (Interim: if #320 lands on clamping, the failing steps
 *  stop being reachable and this can go back to being a plain list.)
 *
 *  Contrast is symmetric, so one comparison covers both directions — a role that IS a surface
 *  (`subtle-fill`, measured against its state ink) and a role that sits ON one (text against a
 *  background) use the same formula.
 *
 *  Returns undefined — not a no-op marker — when the role states no contract, is absent in this mode,
 *  or is measured against `self`. That distinction matters under inversion: within a picker either
 *  NOTHING is marked (no contract to judge) or the passing steps are, so an unmarked option is never
 *  ambiguous between "fails" and "wasn't judged". */
const contrastMark = (roleKey: string, palette: string): ((step: string) => string) | undefined => {
  const roles = iRoles();
  const r = roles[roleKey];
  const min = r?.min ?? 0;
  if (!r || min <= 0 || !r.against || r.against === 'self') return undefined;
  const againstHex = roles[r.against]?.hex;
  if (!againstHex) return undefined;                       // nothing resolvable to compare against
  const againstRgb = hexToRgb(againstHex);
  const steps = theme.palettes.find((p) => p.palette === palette)?.steps ?? [];
  // States the number rather than a bare tick: the minimum is 4.5 for text and 3 for non-text, so
  // "✓" alone would hide WHICH bar a step clears.
  const label = ` · ✓ ${String(min).replace(/\.0$/, '')}:1`;
  return (step: string): string => {
    const s = steps.find((x) => x.key === step);
    if (!s) return '';
    return contrast(hexToRgb(s.hex), againstRgb) >= min ? label : '';
  };
};

// ---- examples (locked right) ----------------------------------------------
/** #291 — click-to-pin the pressed state on a live example. `:hover` already gives the transient hover
 *  feel; a bare `:active` vanishes the instant the mouse releases, too fleeting to actually evaluate a
 *  pressed color, so a click toggles a HELD `.is-pressed` state instead (click again to release). Only
 *  wired when a pressed color was actually resolved (`exBtn`/`exLink`/`exOutline` call this conditionally). */
const wirePress = (n: HTMLElement): void => {
  n.classList.add('pinnable');
  n.title = 'Click to hold the pressed state';
  n.onclick = (e) => { e.preventDefault(); n.classList.toggle('is-pressed'); };
};
const exBtn = (bg: string, fg: string, dark = false, label = 'Button', hover?: string, pressed?: string): HTMLElement => {
  const box = el('div', 'exbox' + (dark ? ' dark' : ''));
  const b = el('span', 'ibtn'); b.style.setProperty('--ibtn-bg', bg); b.style.color = fg;
  if (hover) b.style.setProperty('--ibtn-hbg', hover);
  if (pressed) { b.style.setProperty('--ibtn-pbg', pressed); wirePress(b); }
  b.append(document.createTextNode(label), iconEl('arrow', fg));
  box.append(b); return box;
};
const exLink = (color: string, dark = false, hover?: string, pressed?: string): HTMLElement => {
  const box = el('div', 'exbox' + (dark ? ' dark' : ''));
  const a = el('a', 'ilink', 'Text link'); a.style.setProperty('--ilink-fg', color);
  if (hover) a.style.setProperty('--ilink-hfg', hover);
  if (pressed) { a.style.setProperty('--ilink-pfg', pressed); wirePress(a); }
  box.append(a); return box;
};
const exOutline = (edge: string, wash: string, dark = false, hoverWash?: string, pressedWash?: string): HTMLElement => {
  const box = el('div', 'exbox' + (dark ? ' dark' : ''));
  const b = el('span', 'ibtn'); b.style.setProperty('--ibtn-bg', wash); b.style.color = edge; b.style.border = `1.5px solid ${edge}`;
  if (hoverWash) b.style.setProperty('--ibtn-hbg', hoverWash);
  if (pressedWash) { b.style.setProperty('--ibtn-pbg', pressedWash); wirePress(b); }
  b.append(document.createTextNode('Outline'), iconEl('arrow', edge));
  box.append(b); return box;
};
const exIconLabel = (iconColor: string, textColor: string): HTMLElement => {
  const box = el('div', 'exbox');
  const row = el('span', 'inote'); row.style.color = textColor;
  const ic = el('span', 'inote-ic'); ic.style.color = iconColor; ic.append(iconEl('bell', iconColor));
  row.append(ic, document.createTextNode('Notifications')); box.append(row); return box;
};
/** The example column: an example box + an optional contrast receipt below it. */
const iExample = (inner: HTMLElement, badge?: HTMLElement): HTMLElement => {
  const aex = el('div', 'aex'); aex.append(inner); if (badge) aex.append(badge); return aex;
};
/** Two labelled specimens side by side in the example column (rest→hover, enabled→disabled, match→distinct). */
const twoUp = (a: [string, HTMLElement], b: [string, HTMLElement]): HTMLElement => {
  const aex = el('div', 'aex aex-two');
  for (const [label, node] of [a, b]) { const s = el('div', 'aex-spec'); s.append(el('span', 'pfk', label), node); aex.append(s); }
  return aex;
};
const iBadge = (r: RoleRes | undefined): HTMLElement | undefined =>
  r && r.ratio != null && r.min != null && r.min > 0 ? contrastBadge(r.ratio, r.min) : undefined;

// ---- rows -----------------------------------------------------------------
/** The two-up Hover/Pressed states strip below a slot row — each state its own swatch + override select.
 *  States absent in this mode are dropped; an empty strip returns null. */
const iStates = (roles: RoleMap, palette: string, cells: Array<[string, string]>): HTMLElement | null => {
  const g = el('div', 'astates-g'); let any = false;
  for (const [name, roleKey] of cells) {
    const r = roles[roleKey]; if (!r) continue; any = true;
    const cell = el('div', 'astate');
    const head = el('div', 'astate-h'); head.append(swatch(r.hex, 'astate-sw'), el('span', 'astate-n', name));
    cell.append(head, roleSourceSelect(roleKey, palette, stepKeyOf(r.path)));
    g.append(cell);
  }
  if (!any) return null;
  const wrap = el('div', 'astates'); wrap.append(el('div', 'astates-h', 'Interactive states'), g); return wrap;
};

/** One matrix row: 56×56 swatch (omitted on `lead` control rows) · mid (label + Source select + token pill
 *  + description) · locked-right example · optional states strip. */
const iRow = (o: { lead?: boolean; swatchBg?: string; label?: string; srcLabel?: string; select: HTMLElement; pill?: string; desc?: string; warn?: string; example: HTMLElement; states?: HTMLElement | null }): HTMLElement => {
  const row = el('div', 'arow' + (o.lead ? ' arow-lead' : ''));
  const main = el('div', 'arow-main');
  if (!o.lead) main.append(swatch(o.swatchBg ?? '#000000', 'asw'));
  const mid = el('div', 'amid');
  if (o.label) mid.append(el('div', 'alabel', o.label));
  const ctl = el('div', 'sf-ctlblock'); ctl.append(el('span', 'pfk', o.srcLabel ?? 'Source'), o.select); mid.append(ctl);
  if (o.pill) mid.append(tokenPill(o.pill));
  if (o.desc) mid.append(el('p', 'adesc', o.desc));
  if (o.warn) mid.append(el('p', 'fz-warn', o.warn));
  main.append(mid, o.example);
  row.append(main);
  if (o.states) row.append(o.states);
  return row;
};

/** An override-backed slot row (every slot except fill · rest, which anchors). null when it doesn't resolve. */
const slotRow = (o: { name: string; slot: string; label: string; palette: string; desc: string; example: (roles: RoleMap) => HTMLElement; badgeRole?: string; states?: Array<[string, string]> }): HTMLElement | null => {
  const roles = iRoles();
  const roleKey = `interactive.${o.name}.${o.slot}`;
  const r = roles[roleKey]; if (!r) return null;
  return iRow({
    swatchBg: r.hex, label: o.label, select: roleSourceSelect(roleKey, o.palette, stepKeyOf(r.path)),
    pill: `color.${roleKey}`, desc: o.desc, example: iExample(o.example(roles), iBadge(roles[o.badgeRole ?? roleKey])),
    states: o.states ? iStates(roles, o.palette, o.states) : null,
  });
};

/** A single interactive column. `name` is the `interactive.<name>.*` role suffix (built-ins primary /
 *  neutral / destructive, accents `name ?? palette`). `setStep` present ⇒ the fill · rest Source is the
 *  column's fill anchor (re-derives the family); absent (neutral) ⇒ a plain fill · rest override. */
type ICol = { name: string; title: string; desc: string; palette: string; stepValue?: number; setStep?: (v: number | undefined) => void; onRemove?: () => void; lead?: HTMLElement | null };

/** The fill · rest row — its Source is the column's fill ANCHOR (re-derives the family) when the column
 *  has one (primary / destructive / accents); neutral has no anchor (its emphasis lead drives the fill),
 *  so it falls back to a plain override select. Hover / pressed are override sub-states. */
const fillRestRow = (col: ICol): HTMLElement | null => {
  const roles = iRoles();
  const r = roles[`interactive.${col.name}.fill.rest`]; if (!r) return null;
  const onFill = roles[`interactive.${col.name}.on-fill`];
  let select: HTMLElement;
  let warn: string | undefined;
  if (col.setStep) {
    const steps = stepsOf(col.palette);
    select = stepPicker(col.palette, steps, stepKeyOf(r.path), steps.find((k) => Number(k) === col.stepValue),
      (step) => col.setStep!(step === undefined ? undefined : Number(step)));
    // The anchor is contrast-gated (never blocked) — a pin that misses the floor gets bumped to the
    // nearest passing step. Silently: the Source select still shows the REQUESTED step, so without
    // this note two different pins that both clamp to the same effective step look like "nothing
    // happened" (hover/pressed derive from the effective step, not the request, so they don't move
    // either) — previously indistinguishable from a stale/unresponsive control.
    const effective = Number(stepKeyOf(r.path));
    if (col.stepValue !== undefined && effective !== col.stepValue)
      warn = `${col.stepValue} doesn't clear the contrast floor here — the engine used ${effective} instead (hover/pressed derive from the effective step).`;
  } else {
    select = roleSourceSelect(`interactive.${col.name}.fill.rest`, col.palette, stepKeyOf(r.path));
  }
  return iRow({
    swatchBg: r.hex, label: 'Fill · rest', select, pill: `color.interactive.${col.name}.fill.rest`,
    desc: 'The button / container fill. This anchors the family — hover, pressed, text and on-fill derive from it unless you override them below.',
    warn,
    example: iExample(exBtn(r.hex, onFill?.hex ?? '#ffffff', false, 'Button',
      roles[`interactive.${col.name}.fill.hover`]?.hex, roles[`interactive.${col.name}.fill.pressed`]?.hex), iBadge(onFill)),
    states: iStates(roles, col.palette, [['Hover', `interactive.${col.name}.fill.hover`], ['Pressed', `interactive.${col.name}.fill.pressed`]]),
  });
};

/** The overlay-wash row — the translucent hover/pressed tint for this palette's outline & text actions.
 *  The wash is a neutral alpha primitive; its swatch + example paint it honestly via rgba. */
const overlayRow = (col: ICol): HTMLElement | null => {
  const roles = iRoles();
  const r = roles[`interactive.${col.name}.overlay.hover`]; if (!r) return null;
  const nPal = theme.roleToPalette.neutral;
  const edge = roles[`interactive.${col.name}.text.rest`]?.hex ?? '#000000';
  return iRow({
    swatchBg: rgbaOf(r), label: 'Overlay wash',
    select: roleSourceSelect(`interactive.${col.name}.overlay.hover`, nPal, stepKeyOf(r.path)),
    pill: `color.interactive.${col.name}.overlay.hover`,
    desc: 'The translucent hover / pressed wash for this palette’s outline & text actions — it composites over any surface.',
    // The row's rest swatch already IS the hover wash (there's no "rest" overlay to show — the wash only
    // ever appears on hover/pressed), so only pressed needs wiring here; a :hover cue would be a no-op.
    example: iExample(exOutline(edge, rgbaOf(r), false, undefined,
      roles[`interactive.${col.name}.overlay.pressed`] ? rgbaOf(roles[`interactive.${col.name}.overlay.pressed`]!) : undefined)),
    states: iStates(roles, nPal, [['Hover', `interactive.${col.name}.overlay.hover`], ['Pressed', `interactive.${col.name}.overlay.pressed`]]),
  });
};

/** The subtle-tint row — the OPAQUE sibling of the overlay wash (#288), shown only when
 *  `outlineInteraction: solid-tint` is the method (the role is absent otherwise, so this returns null
 *  and the row self-hides, same as `overlayRow` does under the other methods).
 *
 *  The step picker is bound to the COLUMN'S OWN palette, not the neutral one the overlay row uses —
 *  choosing which tint of its own ramp a control hovers to is the whole point of the method.
 *
 *  The engine picks a default step that keeps the state's ink legible, but an override is applied and
 *  WARNED, never blocked (the established `overrides` behaviour). Since the role's `against` is the
 *  state ink, `ratio`/`min` already carry that verdict — so a pick that costs legibility says so here
 *  rather than only in an engine warning the designer never sees. */
const subtleFillRow = (col: ICol): HTMLElement | null => {
  const roles = iRoles();
  const r = roles[`interactive.${col.name}.subtle-fill.hover`]; if (!r) return null;
  const pressed = roles[`interactive.${col.name}.subtle-fill.pressed`];
  const edge = roles[`interactive.${col.name}.text.rest`]?.hex ?? '#000000';
  const short = (n: number) => n.toFixed(2).replace(/\.00$/, '');
  return iRow({
    swatchBg: r.hex, label: 'Subtle tint',
    select: roleSourceSelect(`interactive.${col.name}.subtle-fill.hover`, col.palette, stepKeyOf(r.path)),
    pill: `color.interactive.${col.name}.subtle-fill.hover`,
    desc: 'The opaque hover / pressed tint for this palette’s outline & text actions — a step of its own ramp, so the control keeps its color identity.',
    // `min`/`ratio` are optional on the resolved role, so a missing pair means "no contract stated" —
    // which must read as no warning, not as a failed one.
    warn: (r.min ?? 0) > 0 && (r.ratio ?? Infinity) < (r.min ?? 0)
      ? `This tint leaves the hover label at ${short(r.ratio ?? 0)}:1, under the ${short(r.min ?? 0)}:1 it needs — pick a step closer to the page, or the text stops being readable on hover.`
      : undefined,
    example: iExample(exOutline(edge, r.hex, false, undefined, pressed?.hex)),
    states: iStates(roles, col.palette, [
      ['Hover', `interactive.${col.name}.subtle-fill.hover`],
      ['Pressed', `interactive.${col.name}.subtle-fill.pressed`],
    ]),
  });
};

/** One action-palette section: header (+ optional remove) · optional lead control · the slot rows. */
const renderPaletteSection = (col: ICol): HTMLElement | null => {
  const roles = iRoles();
  if (!roles[`interactive.${col.name}.fill.rest`]) return null;
  const sec = el('div', 'psec');
  const head = el('div', 'psec-h'); head.append(el('p', 'psec-t', col.title));
  if (col.onRemove) head.append(removeButton(col.onRemove, 'Remove interactive color', 'rmv'));
  sec.append(head, el('p', 'psec-d', col.desc));
  if (col.lead) sec.append(col.lead);
  const P = col.palette, nm = col.name, inv = `${nm}.on-inverse`, nPal = theme.roleToPalette.neutral;
  const rows: Array<HTMLElement | null> = [
    fillRestRow(col),
    slotRow({ name: nm, slot: 'on-inverse.fill.rest', label: 'Fill · inverse', palette: P,
      desc: 'The button fill on a dark / inverse surface — a light fill. Derived, or pin a step.',
      example: (rs) => exBtn(rs[`interactive.${inv}.fill.rest`]?.hex ?? '#ffffff', rs[`interactive.${inv}.on-fill`]?.hex ?? '#000000', true, 'Button',
        rs[`interactive.${inv}.fill.hover`]?.hex, rs[`interactive.${inv}.fill.pressed`]?.hex),
      badgeRole: `interactive.${inv}.on-fill`,
      states: [['Hover', `interactive.${inv}.fill.hover`], ['Pressed', `interactive.${inv}.fill.pressed`]] }),
    slotRow({ name: nm, slot: 'text.rest', label: 'Text · rest', palette: P,
      desc: 'Text links & text buttons on light surfaces.',
      example: (rs) => exLink(rs[`interactive.${nm}.text.rest`]?.hex ?? '#000000', false,
        rs[`interactive.${nm}.text.hover`]?.hex, rs[`interactive.${nm}.text.pressed`]?.hex),
      states: [['Hover', `interactive.${nm}.text.hover`], ['Pressed', `interactive.${nm}.text.pressed`]] }),
    slotRow({ name: nm, slot: 'on-inverse.text.rest', label: 'Text · inverse', palette: P,
      desc: 'Text links & text buttons on dark / inverse surfaces.',
      example: (rs) => exLink(rs[`interactive.${inv}.text.rest`]?.hex ?? '#ffffff', true,
        rs[`interactive.${inv}.text.hover`]?.hex, rs[`interactive.${inv}.text.pressed`]?.hex),
      states: [['Hover', `interactive.${inv}.text.hover`], ['Pressed', `interactive.${inv}.text.pressed`]] }),
    overlayRow(col),
    subtleFillRow(col),   // #288 — the opaque sibling; only one of the two is ever non-null
    slotRow({ name: nm, slot: 'on-fill', label: 'On-fill text', palette: nPal,
      desc: 'The ink on the fill — auto-picked to clear contrast on the button surface.',
      example: (rs) => exBtn(rs[`interactive.${nm}.fill.rest`]?.hex ?? '#000000', rs[`interactive.${nm}.on-fill`]?.hex ?? '#ffffff') }),
    slotRow({ name: nm, slot: 'on-inverse.on-fill', label: 'On-fill text · inverse', palette: nPal,
      desc: 'The ink on the inverse (light) fill — button text on a dark surface.',
      example: (rs) => exBtn(rs[`interactive.${inv}.fill.rest`]?.hex ?? '#ffffff', rs[`interactive.${inv}.on-fill`]?.hex ?? '#000000', true) }),
  ];
  for (const rw of rows) if (rw) sec.append(rw);
  return sec;
};

// ---- lead controls + global behaviours ------------------------------------
/** An enum lever as a `.cap` select that writes the input + rebuilds (a lever change re-derives roles the
 *  matrix reads, so applyFull, not apply). */
const iEnumSelect = (key: string): HTMLSelectElement => {
  const lever = leverByKey(key)!;
  const sel = selectEl('cap');
  const cur = getPath(brandState, key) ?? lever.default;
  for (const o of lever.options ?? []) sel.append(optionEl(String(o.value), o.label, o.value === cur));
  sel.onchange = () => { setPath(brandState, key, sel.value); applyFull(); };
  return sel;
};

/** The Primary section's lead: the Action-palette choice (which palette drives primary actions). */
const actionPaletteLead = (): HTMLElement => {
  const sel = selectEl('cap');
  const palettes = ['primary', ...(brandState.brandColors ?? []).map((b) => b.name)];
  const cur = String(brandState.actionPalette ?? 'primary');
  for (const p of palettes) sel.append(optionEl(p, capWord(p), p === cur));
  sel.onchange = () => { setPath(brandState, 'actionPalette', sel.value); applyFull(); };
  const roles = iRoles();
  return iRow({ lead: true, label: 'Action palette', srcLabel: 'Source', select: sel,
    desc: 'Which palette drives your primary actions — a brand color, or point it at your neutral for a restrained, monochrome look. The contrast floor is accessible either way.',
    example: iExample(exBtn(roles['interactive.primary.fill.rest']?.hex ?? '#000000', roles['interactive.primary.on-fill']?.hex ?? '#ffffff')) });
};

/** The Neutral section's lead: the emphasis choice (subtle grey surface vs bold near-black/white fill). */
const neutralEmphasisLead = (): HTMLElement => {
  const sel = selectEl('cap');
  const cur = lastGoodInput.neutralEmphasis ?? 'subtle';
  for (const [ne, label] of NEUTRAL_EMPHASES) sel.append(optionEl(ne, capWord(label), ne === cur));
  sel.onchange = () => { setPath(brandState, 'neutralEmphasis', sel.value); applyFull(); };
  const roles = iRoles();
  return iRow({ lead: true, label: 'Button emphasis', srcLabel: 'Emphasis', select: sel,
    desc: 'A neutral / secondary button as a subtle light-gray surface, or a bold near-black/white fill. Shared across modes.',
    example: iExample(exBtn(roles['interactive.neutral.fill.rest']?.hex ?? '#eeeeee', roles['interactive.neutral.on-fill']?.hex ?? '#111111')) });
};

/** The cross-cutting behaviours grouped at the top — outline hover, disabled, icon colours — each governs
 *  every palette below, so it doesn't belong to any one of them. */
const renderGlobalBehavior = (host: HTMLElement): void => {
  const cap = el('div', 'gcap'); cap.append(el('p', 'gcap-t', 'Global action behavior'), el('p', 'gcap-d', 'These apply across every action palette below.'));
  host.append(cap);
  const roles = iRoles();

  const oh = el('div', 'psec');
  // The second sentence is method-specific: the Overlay wash row only tunes the translucent method.
  // Under solid-tint the fill comes from the control's own palette automatically, so pointing at a
  // control that does nothing there would be the same species of wrong answer as the empty swatch.
  const ohBlurb = theme.outlineInteraction === 'solid-tint'
    ? 'How every outline & text action reacts on hover. The tint is a step of each control’s own palette, so a destructive outline hovers red-tinted rather than gray.'
    : theme.outlineInteraction === 'none'
      ? 'How every outline & text action reacts on hover. No hover fill — the border and ink carry the state on their own.'
      : 'How every outline & text action reacts on hover. Each palette’s Overlay wash row tunes the tint it uses.';
  oh.append(el('p', 'psec-t', 'Outline button hover'), el('p', 'psec-d', ohBlurb));
  const ohEdge = roles['interactive.primary.text.rest']?.hex ?? '#000000';
  // Each method reads its OWN role, which is the whole point of #288: `overlay-neutral` emits a
  // translucent `interactive.<name>.overlay.hover`, `solid-tint` an opaque
  // `interactive.<name>.subtle-fill.hover`, and `none` no fill by design. This used to read the
  // overlay role unconditionally, which rendered solid-tint identically to none — and once that was
  // made conditional there was still nothing to read, because the engine emitted no solid-tint token
  // for any brand (#288). Both halves are fixed now, so the example tracks the method for real.
  const ohWash = theme.outlineInteraction === 'overlay-neutral' && roles['interactive.primary.overlay.hover']
    ? rgbaOf(roles['interactive.primary.overlay.hover'])
    : theme.outlineInteraction === 'solid-tint' && roles['interactive.primary.subtle-fill.hover']
      ? roles['interactive.primary.subtle-fill.hover'].hex     // opaque — a real palette step, no alpha
      : 'transparent';
  oh.append(iRow({ lead: true, srcLabel: 'Method', select: iEnumSelect('outlineInteraction'),
    example: twoUp(['Rest', exOutline(ohEdge, 'transparent')], ['Hover', exOutline(ohEdge, ohWash)]) }));
  host.append(oh);

  const ds = el('div', 'psec'); ds.append(el('p', 'psec-t', 'Disabled'), el('p', 'psec-d', 'How much contrast disabled controls keep. Never below 3:1 either way — this system doesn’t use the WCAG exemption for inactive controls.'));
  const eBg = roles['interactive.primary.fill.rest']?.hex ?? '#5e4bc3', eFg = roles['interactive.primary.on-fill']?.hex ?? '#ffffff';
  // Read the RESOLVED disabled roles (not the invariant tertiary surface) so the example tracks the
  // strategy + floor controls live — Full and Reduced land on different steps.
  const dBg = roles['disabled.fill']?.hex ?? '#e7e7ee', dFg = roles['disabled.on-fill']?.hex ?? '#9a9aa6';
  const dFull = normalizeDisabledStrategy(getPath(brandState, 'disabledStrategy') as string | undefined) === 'full';
  ds.append(iRow({ lead: true, srcLabel: 'Contrast', select: iEnumSelect('disabledStrategy'),
    desc: 'Full guarantees AA text (4.5:1); Reduced dims to a floor you set, no lower than 3:1.',
    // The affordance caveat, surfaced where the choice is made rather than left to be discovered:
    // at 4.5:1 the label is as legible as body copy, so "disabled" reads from fill/border/cursor.
    warn: dFull ? 'At 4.5:1 the label is as legible as body text — check a disabled control still reads as disabled (the cue now rests on fill, border, cursor and aria-disabled).' : undefined,
    example: twoUp(['Enabled', exBtn(eBg, eFg, false, 'Save')], ['Disabled', exBtn(dBg, dFg, false, 'Save')]) }));
  // The floor dial belongs to Reduced — Full is a fixed promise with nothing to tune. (Inverted from
  // the original, where the dial sat on the compliant branch and could be pulled below AA.)
  if (!dFull) {
    const min = leverByKey('disabledMin');
    if (min) {
      const c = renderControl(min);
      // The example above lives in this non-volatile section (not the .stage-vol region), so the
      // generic slider oninput's apply() (volatile-only) wouldn't refresh it. Commit on RELEASE with
      // applyFull (a select-like re-render) so the disabled specimen tracks the floor — using onchange,
      // not oninput, because applyFull rebuilds the workspace and would destroy the slider mid-drag.
      const slider = c.querySelector('input[type="range"]') as HTMLInputElement | null;
      const label = c.querySelector('.knob-val') as HTMLElement | null;
      if (slider) {
        slider.oninput = () => { if (label) label.textContent = `${slider.value}${min.unit ?? ''}`; };
        slider.onchange = () => { setPath(brandState, min.key, Number(slider.value)); applyFull(); };
      }
      ds.append(c);
    }
  }
  host.append(ds);

  const ic = el('div', 'psec'); ic.append(el('p', 'psec-t', 'Icon colors'), el('p', 'psec-d', 'Should icons match your text color, or take a distinct (lighter) color? The example shows both.'));
  const txt = roles['text.primary']?.hex ?? '#191920', lighter = roles['text.tertiary']?.hex ?? '#9a9aa6';
  ic.append(iRow({ lead: true, label: 'Icon color', srcLabel: 'Icon color', select: iEnumSelect('iconContrast'),
    desc: 'Match text keeps icons at full text legibility; Distinct lets them sit lighter (WCAG non-text 3:1).',
    example: twoUp(['Match text', exIconLabel(txt, txt)], ['Distinct', exIconLabel(lighter, txt)]) }));
  host.append(ic);
};

/** The add-accent promote row — a select of promotable palettes + an add button (structural, base-mode
 *  only). Pushes `{ palette }`; the engine defaults the column name to the palette. */
const renderAddAccentRow = (): HTMLElement => {
  const row = el('div', 'ic-add');
  const brandNames = (brandState.brandColors ?? []).map((b) => b.name);
  const already = new Set((brandState.interactivePalettes ?? []).map((e) => e.palette));
  const actionPal = theme.roleToPalette.action;
  const RESERVED_ICOL = new Set(['primary', 'neutral', 'destructive']);
  const promotable = ['primary', ...brandNames].filter((p) => !already.has(p) && p !== actionPal && !RESERVED_ICOL.has(p));
  if (!promotable.length) {
    row.append(el('span', 'ic-addhint', 'Add a brand color on Primitives to create another interactive color.'));
    return row;
  }
  const sel = selectEl('cap');
  for (const p of promotable) sel.append(optionEl(p, capWord(p)));
  const btn = addButton('+ Add action palette', () => {
    const arr = brandState.interactivePalettes ?? (brandState.interactivePalettes = []);
    arr.push({ palette: sel.value });
    applyFull();
  }, 'ic-addbtn');
  row.append(sel, btn);
  return row;
};

/** The whole interactive editor: global behaviours, then one section per action palette, then the add row.
 *  The fill anchor is per-mode outside Light (modeAnchors); structural edits (add/remove a column) stay
 *  base-only. */
const renderInteractiveMatrix = (host: HTMLElement): void => {
  renderGlobalBehavior(host);
  const perMode = currentMode !== 'light';
  if (perMode) host.append(el('p', 'ic-modenote', `Editing ${MODE_LABEL[currentMode] ?? currentMode}’s interactive colors — “Auto” follows the generated baseline; pick a step to override just this mode.`));
  const anchor = (name: string, get: () => number | undefined, set: (v: number | undefined) => void): Pick<ICol, 'stepValue' | 'setStep'> => {
    if (!perMode) return { stepValue: get(), setStep: (v) => { set(v); applyFull(); } };
    return {
      stepValue: brandState.modeAnchors?.[currentMode]?.[name],
      setStep: (v) => {
        const ma = brandState.modeAnchors ?? (brandState.modeAnchors = {});
        const forMode = ma[currentMode] ?? (ma[currentMode] = {});
        if (v === undefined) { delete forMode[name]; if (!Object.keys(forMode).length) delete ma[currentMode]; if (!Object.keys(ma).length) brandState.modeAnchors = undefined; }
        else forMode[name] = v;
        applyFull();
      },
    };
  };
  const add = (node: HTMLElement | null): void => { if (node) host.append(node); };

  add(renderPaletteSection({ name: 'primary', title: 'Primary actions', desc: 'The default interactive colors. State colors are calculated from your selections unless you override them.', palette: theme.roleToPalette.action, lead: actionPaletteLead(), ...anchor('primary', () => brandState.actionAnchorStep, (v) => setPath(brandState, 'actionAnchorStep', v)) }));
  add(renderPaletteSection({ name: 'neutral', title: 'Neutral actions', desc: 'The secondary / low-emphasis action set — for “Cancel”, toolbar buttons, and quiet controls.', palette: theme.roleToPalette.neutral, lead: neutralEmphasisLead() }));
  add(renderPaletteSection({ name: 'destructive', title: 'Destructive actions', desc: 'Delete / remove and other irreversible actions.', palette: theme.roleToPalette.danger, ...anchor('destructive', () => brandState.destructiveAnchorStep, (v) => setPath(brandState, 'destructiveAnchorStep', v)) }));
  (brandState.interactivePalettes ?? []).forEach((entry, i) => {
    const nm = entry.name ?? entry.palette;
    add(renderPaletteSection({
      name: nm, title: `${capWord(nm)} actions`, desc: 'Optional secondary interactive set.', palette: entry.palette,
      ...anchor(nm, () => entry.anchorStep, (v) => setPath(brandState, `interactivePalettes.${i}.anchorStep`, v)),
      ...(perMode ? {} : { onRemove: () => { brandState.interactivePalettes!.splice(i, 1); if (!brandState.interactivePalettes!.length) brandState.interactivePalettes = undefined; applyFull(); } }),
    }));
  });
  if (!perMode) host.append(renderAddAccentRow());
};

// === Mode context control (#171) ==========================================================
// A workspace-level single-select switcher that puts the WHOLE stage into ONE mode at a time —
// editing one mode at a time (docs/11 Pillar 2 authoring context; view-only until the override
// layer exists). Three tiers by how a mode's values are produced: light/dark are GENERATED (and,
// once Pillar 2 lands, editable); hc-light/hc-dark/wireframe are DERIVED-only (auto from the
// contrast contracts, read-only verification views); primitives are mode-independent so this
// control never renders on that stage. Replaces the mode chips that used to overflow the brand
// dropdown — the set-config (which modes exist) now lives in the "Edit modes" popover here.
let modeMenuOpen = false;
let outsideBoundMode = false;
let addModeOpen = false;         // C2 — the "+ Add mode" inline form is expanded
let addModeName = '';            // C2 — survives popover re-renders
const DERIVED_MODES = new Set<string>(['hc-light', 'hc-dark', 'wireframe']);
const RESERVED_MODE_NAMES = new Set<string>(['light', 'dark', 'hc-light', 'hc-dark', 'wireframe']);
const modeAllPass = (m: Mode): boolean => rp.contracts.every((ct) => !ct.byMode[m] || ct.byMode[m]!.pass);

/** The mode-SET config — which modes this brand generates/exports (relocated out of the brand
 *  dropdown). Light always; dark / HC / wireframe opt-in (docs/11 Pillar 1). `+ Add mode` (a custom
 *  mode seeded from a chosen base, then tuned) is gated until the override-layer engine work lands. */
const renderModeSetMenu = (): HTMLElement => {
  const menu = el('div', 'mctx-menu');
  const modes = brandState.modes ?? ALL_MODES;
  const darkOn = modes.includes('dark');
  const hcOn = modes.includes('hc-light') || modes.includes('hc-dark');
  const wireOn = modes.includes('wireframe');
  menu.append(el('div', 'mctx-mcap', 'Modes this brand generates'));

  // #57 — Light is the forced base mode; render the row as clearly LOCKED (muted, greyed check, no hover)
  // rather than a live checkbox that can't be unticked.
  const lightRow = el('div', 'mctx-opt on fixed');
  lightRow.title = 'Light is always generated — it’s the base mode, so it can’t be turned off.';
  lightRow.append(el('span', 'mctx-box', '✓'), el('span', undefined, 'Light'), el('span', 'mctx-always', 'always'));
  menu.append(lightRow);

  const opt = (label: string, on: boolean, title: string, toggle: () => void): void => {
    const row = el('button', 'mctx-opt' + (on ? ' on' : '')) as HTMLButtonElement;
    row.title = title;
    row.append(el('span', 'mctx-box', on ? '✓' : ''), el('span', undefined, label));
    row.onclick = toggle;
    menu.append(row);
  };
  opt('Dark', darkOn, 'A dark appearance — generated, editable', () => setModes(!darkOn, hcOn, wireOn));
  opt('High contrast', hcOn, 'AAA contrast floors — auto-derived, read-only', () => setModes(darkOn, !hcOn, wireOn));
  opt('Wireframe', wireOn, 'Grayscale, sharp corners — auto-derived, generate-only', () => setModes(darkOn, hcOn, !wireOn));

  // Custom modes (C2) — each seeds (live-inherits) a customizable base (light/dark), then tunes via
  // its own overrides/anchors. Listed with a remove; the add form validates the name client-side
  // (the engine re-validates on rebuild). Base options are the generated customizable modes.
  menu.append(el('div', 'mctx-div'));
  const customs = brandState.customModes ?? [];
  if (customs.length) {
    menu.append(el('div', 'mctx-mcap', 'Custom modes'));
    customs.forEach((cm, i) => {
      const row = el('div', 'mctx-custom');
      row.append(el('span', 'mctx-cname', cm.name), el('span', 'mctx-cbase', `↳ ${cm.base}`));
      const rm = el('button', 'mctx-crm', '×') as HTMLButtonElement;
      rm.title = 'Remove custom mode';
      rm.onclick = () => {
        brandState.customModes!.splice(i, 1);
        if (!brandState.customModes!.length) brandState.customModes = undefined;
        if (currentMode === cm.name) currentMode = 'light';   // don't strand the view on a gone mode
        applyFull();
      };
      row.append(rm);
      menu.append(row);
    });
  }

  if (!addModeOpen) {
    const add = el('button', 'mctx-opt') as HTMLButtonElement;
    add.append(el('span', 'mctx-box'), el('span', undefined, '+ Add mode…'));
    add.onclick = () => { addModeOpen = true; renderModeStrip(); };
    menu.append(add);
  } else {
    const form = el('div', 'mctx-addform');
    const nameIn = el('input', 'mctx-addname') as HTMLInputElement;
    nameIn.type = 'text'; nameIn.placeholder = 'e.g. marketing-dark'; nameIn.value = addModeName; nameIn.spellcheck = false;
    nameIn.oninput = () => { addModeName = nameIn.value; };
    const baseSel = selectEl('sm fill');
    for (const bm of ['light', ...(darkOn ? ['dark'] : [])]) baseSel.append(optionEl(bm, MODE_LABEL[bm] ?? bm));
    const err = el('p', 'mctx-adderr');
    const doAdd = () => {
      const nm = addModeName.trim();
      if (!/^[a-z0-9][a-z0-9-]*$/.test(nm)) { err.textContent = 'Lowercase letters, digits, hyphens; start with a letter or digit.'; return; }
      if (RESERVED_MODE_NAMES.has(nm) || (brandState.customModes ?? []).some((c) => c.name === nm)) { err.textContent = 'That name is taken (a built-in or existing custom mode).'; return; }
      (brandState.customModes ?? (brandState.customModes = [])).push({ name: nm, base: baseSel.value as 'light' | 'dark' });
      addModeOpen = false; addModeName = '';
      currentMode = nm as Mode;                               // jump into the new mode to tune it
      applyFull();
    };
    const addBtn = el('button', 'mctx-addbtn', 'Add mode') as HTMLButtonElement;
    addBtn.onclick = doAdd;
    const cancel = el('button', 'mctx-addcancel', 'Cancel') as HTMLButtonElement;
    cancel.onclick = () => { addModeOpen = false; addModeName = ''; renderModeStrip(); };
    const btns = el('div', 'mctx-addbtns'); btns.append(addBtn, cancel);
    // #56 — label the name field and the base select (the only label used to live inside the select).
    const nameField = el('div', 'mctx-addfield'); nameField.append(el('label', 'mctx-addlab', 'Mode name'), nameIn);
    const baseField = el('div', 'mctx-addfield'); baseField.append(el('label', 'mctx-addlab', 'Base mode'), baseSel);
    form.append(nameField, baseField, err, btns);
    menu.append(form);
  }
  menu.append(el('p', 'mctx-note', 'A custom mode seeds from its base every build, then deviates via the per-mode color controls (interactive, foreground).'));
  return menu;
};

const renderModeContext = (): HTMLElement => {
  const strip = el('div', 'modectx');
  const left = el('div', 'mctx-modes');
  left.append(el('span', 'mctx-cap', 'Mode'));
  for (const m of rp.modes) {
    const derived = DERIVED_MODES.has(m);
    const b = el('button', 'mctx-b' + (m === currentMode ? ' on' : '') + (derived ? ' derived' : '')) as HTMLButtonElement;
    b.append(el('span', 'mctx-name', MODE_LABEL[m] ?? m));
    if (derived) b.append(el('span', 'mctx-auto', 'auto'));
    const ok = modeAllPass(m);
    // #54 — a per-mode contrast pass/fail badge (NOT a remove control): ✓ pass · ! fail. Spell it out on
    // hover so the mark doesn't read as "close/remove".
    b.append(el('span', 'mctx-mark ' + (ok ? 'ok' : 'no'), ok ? '✓' : '!'));
    b.title = (derived ? 'Auto-derived from the contrast contracts — a read-only verification view. ' : '')
      + (ok ? 'Contrast: all pairs pass in this mode.' : 'Contrast: some pairs fail in this mode.');
    b.onclick = () => { modeMenuOpen = false; if (currentMode !== m) { currentMode = m; renderModeStrip(); renderWorkspace(); } else { renderModeStrip(); } };
    left.append(b);
  }
  strip.append(left);

  const editWrap = el('div', 'mctx-edit-wrap');
  const edit = el('button', 'mctx-edit' + (modeMenuOpen ? ' open' : ''), '⚙ Edit modes') as HTMLButtonElement;
  edit.onclick = (e) => { e.stopPropagation(); modeMenuOpen = !modeMenuOpen; if (!modeMenuOpen) { addModeOpen = false; addModeName = ''; } renderModeStrip(); };
  editWrap.append(edit);
  if (modeMenuOpen) editWrap.append(renderModeSetMenu());
  strip.append(editWrap);

  if (!outsideBoundMode) {
    document.addEventListener('click', (e) => {
      if (modeMenuOpen && !(e.target as HTMLElement).closest('.modectx')) { modeMenuOpen = false; addModeOpen = false; addModeName = ''; renderModeStrip(); }
    });
    outsideBoundMode = true;
  }
  return strip;
};

/** A2a — the read-only view shown when a GENERATED mode (HC / wireframe) is selected. These modes are
 *  auto-derived and never hand-tuned, so the editing controls are replaced by an explanation + a
 *  per-mode contract verdict; the verification preview below still renders the mode on real components. */
const renderGeneratedNote = (): HTMLElement => {
  const wf = currentMode === 'wireframe';
  const label = MODE_LABEL[currentMode] ?? currentMode;
  const box = el('div', 'genview');
  box.append(el('h3', 'genview-t', `${label} is auto-derived — read-only`));
  box.append(el('p', 'genview-d', wf
    ? 'Wireframe is a mechanical grayscale: every non-neutral role collapses to its neutral equivalent and corners go sharp. It’s generated from your theme, not hand-tuned — edit Light or Dark and it follows.'
    : 'High contrast pushes every role to meet the AAA contrast floors. It’s derived from your contrast contracts, not hand-tuned — edit Light or Dark and it follows. Verifying it here is the point: confirm it holds before you ship.'));
  const ok = modeAllPass(currentMode);
  const chip = el('div', 'genview-chip ' + (ok ? 'ok' : 'no'));
  chip.append(el('span', 'gv-mark', ok ? '✓' : '✗'),
    el('span', undefined, ok ? 'Every contrast contract passes in this mode' : 'Some contracts fail in this mode — see the preview below'));
  box.append(chip);
  box.append(el('p', 'genview-hint', 'Toggle which modes generate in the mode strip’s “Edit modes”. The preview below shows this mode applied to real components.'));
  return box;
};

/** Bespoke editors for the object/list levers renderControl can't edit (it only shows them read-only).
 *  Rendered alongside the manifest-advanced slider/enum controls in the (always-visible) extras panel. */

// ---- Type sizes — shape · range · the per-size table (#328 follow-through) ------------------------
/** Shape, range and the per-size table are one decision chain, so they live together on Styles rather
 *  than split across tabs. This moves `typeScale` / `displayCeiling` / `titleFloor` off Foundations,
 *  which leaves Foundations holding only the ladder — genuinely primitive, and consistent with #268's
 *  rule that a primitive surface shows no mode switcher.
 *
 *  Two tiers, and the layout is what makes them legible: RANGE decides which rows exist and is shared
 *  by every mode; CELLS set sizes and are per-mode. */
/** Label + description together, then the controls. `knob` puts the description AFTER the body,
 *  which reads fine under a single field and badly under a card grid — by the time you reach the
 *  explanation you have already made the choice. Local to this section rather than a change to
 *  `knob`, which every other page depends on. */
const fieldBlock = (label: string, desc: string, body: Node): HTMLElement => {
  const w = el('div', 'tsz-field');
  w.append(el('label', 'tsz-flabel', label), el('p', 'tsz-fdesc', desc), body);
  return w;
};
const TYPE_SHAPES: Array<[string, string, string]> = [
  ['compact', 'Compact', 'Tighter steps. Denser screens and information-heavy products.'],
  ['default', 'Default', 'The balanced ramp. A safe starting point for most brands.'],
  ['expressive', 'Expressive', 'Wider steps and a bigger jump into headings. Editorial and marketing.'],
];
const SHAPE_SHIFT: Record<string, number> = { compact: -1, default: 0, expressive: 1 };
let typeSizesOpen: boolean | null = null;   // null ⇒ follow "is anything pinned"

/** Step a px value along the ladder, clamped. Returns undefined when there is no such step. */
const ladderStep = (px: number, by: number): number | undefined => {
  const l = theme.typography.sizesPx, i = l.indexOf(px);
  if (i < 0) return undefined;
  const j = i + by;
  return j >= 0 && j < l.length ? l[j] : undefined;
};
/** Every heading rung this brand ships, largest first — the row order for the tables. */
const rowsOf = (t: Theme, group: PerModeSizeGroup): Array<{ variant: string; px: number }> =>
  t.typography.composites.filter((c) => c.group === group)
    .reduce((acc: Array<{ variant: string; px: number }>, c) => (acc.some((a) => a.variant === c.variant) ? acc : [...acc, { variant: c.variant, px: c.sizePx }]), [])
    .sort((a, b) => b.px - a.px);
const headingRows = (group: PerModeSizeGroup): Array<{ variant: string; px: number }> => rowsOf(theme, group);
/** Rows for the WIDEST range this brand could have, so trimmed rungs can be shown as "outside range"
 *  rather than vanishing. The live theme contains only rungs that survived `displayCeiling` /
 *  `titleFloor`, so reading it alone silently drops the excluded rows — which is exactly what
 *  happened on the deployed build: a `md` ceiling showed two display rows and no sign of the four
 *  it had removed.
 *
 *  Three attempts, because widening can legitimately fail: `titleFloor: 16` is incompatible with
 *  `typeScale: 'compact'`, and a pinned size can collide with a neighbor that only exists at the
 *  wider range. Falling back to the live set just restores the old behavior, never a broken one. */
let widestRows: Map<PerModeSizeGroup, Array<{ variant: string; px: number }>> | null = null;
const computeWidestRows = (): void => {
  widestRows = null;
  const tries: Array<Partial<TypographyInput>> = [
    { displayCeiling: '3xl', titleFloor: 16 },
    { displayCeiling: '3xl' },
    { displayCeiling: '3xl', titleFloor: 16, sizes: undefined },
  ];
  for (const over of tries) {
    try {
      const t = brandTheme({ ...brandState, typography: { ...brandState.typography, ...over } } as BrandInput);
      widestRows = new Map(PER_MODE_SIZE_GROUPS.map((g) => [g, rowsOf(t, g)]));
      return;
    } catch { /* try the next relaxation */ }
  }
};
const brandSizePin = (group: PerModeSizeGroup, variant: string): number | undefined =>
  brandState.typography?.sizes?.[group]?.[variant];
const modeSizePin = (mode: Mode, group: PerModeSizeGroup, variant: string): number | undefined =>
  brandState.modeLevers?.[mode]?.typeSizes?.[group]?.[variant];
/** Set or clear a BASELINE per-size override, pruning empties so an all-cleared brand stays byte-identical. */
const setBrandSize = (group: PerModeSizeGroup, variant: string, px: number | undefined): void => {
  const ty = (brandState.typography ??= {});
  if (px === undefined) {
    const g = ty.sizes?.[group];
    if (!g || !ty.sizes) return;
    delete g[variant];
    if (!Object.keys(g).length) delete ty.sizes[group];
    if (!Object.keys(ty.sizes).length) delete ty.sizes;
    return;
  }
  ((ty.sizes ??= {})[group] ??= {})[variant] = px;
};
/** How many sizes are pinned anywhere — drives the "customized" badge. */
const pinnedSizeCount = (): number => {
  let n = 0;
  const bs = brandState.typography?.sizes ?? {};
  for (const g of Object.keys(bs) as PerModeSizeGroup[]) n += Object.keys(bs[g] ?? {}).length;
  for (const m of Object.keys(brandState.modeLevers ?? {}) as Mode[]) {
    const ms = brandState.modeLevers?.[m]?.typeSizes ?? {};
    for (const g of Object.keys(ms) as PerModeSizeGroup[]) n += Object.keys(ms[g] ?? {}).length;
  }
  return n;
};

/** One editable size cell. The constraint lives IN the control: a disabled −/+ says this size has no
 *  room that way, where a filtered dropdown just omitted the option and never said why. */
const sizeCell = (group: PerModeSizeGroup, rows: Array<{ variant: string; px: number }>, i: number, mode: Mode | null, resolved: number[]): HTMLElement => {
  const variant = rows[i].variant;
  const px = resolved[i];
  const upper = i > 0 ? resolved[i - 1] : undefined;         // the larger neighbor
  const lower = i + 1 < resolved.length ? resolved[i + 1] : undefined;
  const floor = HEADING_SIZE_FLOOR[group];
  const step = (dir: -1 | 1) => ladderStep(px, dir);
  const dn = step(-1), up = step(1);
  return stepCell({
    px,
    // Sizes DO bound on their neighbors: the ramp must stay strictly increasing or the engine
    // refuses to build. That is the difference from weight roles, which may cross.
    canDown: dn !== undefined && dn >= floor && (lower === undefined || dn > lower),
    canUp: up !== undefined && (upper === undefined || up < upper),
    pinned: mode ? modeSizePin(mode, group, variant) !== undefined : brandSizePin(group, variant) !== undefined,
    label: `${group} ${variant}${mode ? ` in ${mode}` : ''}`,
    step,
    write: (v) => {
      if (mode) setModeLever(mode, `typeSizes.${group}.${variant}`, v);
      else setBrandSize(group, variant, v);
      applyFull();
    },
  });
};

/** One table per heading group — rows are sizes largest-first, columns are modes. */
const renderSizeTable = (group: PerModeSizeGroup): HTMLElement | null => {
  const live = headingRows(group);
  const all = widestRows?.get(group) ?? live;
  if (!all.length) return null;
  const inRange = new Set(live.map((r) => r.variant));
  const modes = rp.modes;
  const box = el('div', 'mtbl');
  box.append(el('p', 'mtbl-cap', group));
  const scroll = el('div', 'mtbl-scroll');
  const tbl = el('table', 'mtbl-tbl');
  const thead = el('thead'), htr = el('tr');
  htr.append(el('th', 'mtbl-stick', 'Size'));
  for (const m of modes) {
    const th = el('th', 'mtbl-mode');
    th.append(document.createTextNode(MODE_LABEL[m] ?? m));
    if (m === 'light') th.append(el('span', 'mtbl-ro', ' baseline'));
    htr.append(th);
  }
  htr.append(el('th', 'mtbl-fill'));
  thead.append(htr); tbl.append(thead);
  const tb = el('tbody');
  // Resolve each mode's ramp once, over the IN-RANGE rows only — a cell's legal span depends on its
  // neighbors in the same column, and an excluded rung is not a neighbor of anything.
  const resolvedByMode = new Map<string, number[]>();
  for (const m of modes) {
    resolvedByMode.set(m, live.map((r) => {
      const c = theme.typography.composites.find((x) => x.group === group && x.variant === r.variant)!;
      return (m === 'light' ? undefined : c.sizeByMode?.[m]) ?? c.sizePx;
    }));
  }
  for (const r of all) {
    const tr = el('tr', inRange.has(r.variant) ? '' : 'mtbl-off');
    const nameCell = el('td', 'mtbl-stick');
    nameCell.append(el('span', 'mtbl-name mono', r.variant));
    if (!inRange.has(r.variant)) nameCell.append(el('span', 'mtbl-ro', ' outside range'));
    tr.append(nameCell);
    if (inRange.has(r.variant)) {
      const i = live.findIndex((x) => x.variant === r.variant);
      for (const m of modes) {
        const td = el('td', 'mtbl-mode');
        td.append(sizeCell(group, live, i, m === 'light' ? null : m, resolvedByMode.get(m)!));
        tr.append(td);
      }
    } else {
      // What it WOULD be, so the row explains itself rather than just being greyed.
      for (const [mi, m] of modes.entries()) {
        const td = el('td', 'mtbl-mode');
        td.append(el('span', 'mtbl-offval mono', mi === 0 ? `${r.px}px` : '—'));
        tr.append(td);
      }
    }
    tr.append(el('td', 'mtbl-fill'));
    tb.append(tr);
  }
  tbl.append(tb); scroll.append(tbl); box.append(scroll);
  return box;
};

const renderTypeSizes = (): HTMLElement => {
  const ty = theme.typography;
  const sec = palSection('Heading sizes', 'The shape of the heading system, how far the ramp runs, and — if you need it — every size set individually.');

  // SHAPE — option cards. A select cannot carry a sentence per option, and this is a foundational
  // choice made once. Deviation from doc 26 (3+ options → select); see doc 24 for the rule.
  const cur = (getPath(brandState, 'typography.typeScale') ?? 'default') as string;
  const cards = el('div', 'shape-cards');
  let anyBlocked = false;
  for (const [key, name, blurb] of TYPE_SHAPES) {
    const b = el('button', 'shape-card' + (key === cur ? ' on' : '')) as HTMLButtonElement;
    b.setAttribute('aria-pressed', String(key === cur));
    // The px range previews what this card WOULD produce, by shifting the live title ramp along the
    // ladder — cheaper and more honest than a hardcoded string, which would drift from the engine.
    const titles = ty.composites.filter((c) => c.group === 'title').map((c) => c.sizePx);
    const d = SHAPE_SHIFT[key] - SHAPE_SHIFT[cur];
    const shifted = titles.map((p) => ladderStep(p, d) ?? p);
    b.append(el('b', undefined, name), el('span', 'shape-blurb', blurb),
      el('span', 'shape-nums mono', titles.length ? `title ${Math.min(...shifted)}px–${Math.max(...shifted)}px` : ''));
    // A pinned size is ABSOLUTE and does not travel with the shape, so changing shape CAN collide and
    // the engine then refuses to build (#353). Rather than a dialog after the click — the app uses no
    // native dialogs — trial-build this shape with the pins in place and disable the card only when it
    // would actually fail. Most pins do not collide, so blocking on "pins exist" would over-refuse.
    let blocked = false;
    if (key !== cur) {
      try { brandTheme({ ...brandState, typography: { ...(brandState.typography as any), typeScale: key === 'default' ? undefined : key } } as any); }
      catch { blocked = true; }
    }
    b.disabled = blocked;
    if (blocked) b.title = 'Some sizes set below would clash at this shape. Release them to switch.';
    b.onclick = () => {
      if (key === cur || blocked) return;
      setPath(brandState, 'typography.typeScale', key === 'default' ? undefined : key);
      applyFull();
    };
    cards.append(b);
    if (blocked) anyBlocked = true;
  }
  if (anyBlocked) {
    const warn = el('div', 'shape-blocked');
    warn.append(el('span', undefined, 'Some shapes are unavailable while sizes are set individually — they would clash.'));
    const rel = el('button', 'shape-release', 'Release pinned sizes') as HTMLButtonElement;
    rel.onclick = () => {
      if (brandState.typography) delete brandState.typography.sizes;
      for (const m of Object.keys(brandState.modeLevers ?? {})) setModeLever(m, 'typeSizes', undefined);
      applyFull();
    };
    warn.append(rel);
    cards.append(warn);
  }
  sec.append(fieldBlock('Shape', 'How the heading sizes step. Most brands never need more than this.', cards));

  // RANGE — the two set-membership levers together: different mechanisms, same action.
  const range = el('div', 'range-row');
  const ceil = leverByKey('typography.displayCeiling');
  if (ceil) {
    const f = el('div', 'range-f');
    f.append(el('span', 'pfk', 'Largest display size'));
    const sel = selectEl('sm');
    // The live display ramp is TRIMMED by the current ceiling, so it cannot price the options above
    // it. One candidate build at the largest ceiling gives every rung's px; the display base steps
    // are not uniform on the ladder (48→64 spans two), so extrapolating would be wrong.
    const opts = ceil.options ?? [];
    let pxByVariant = new Map<string, number>();
    try {
      const full = brandTheme({ ...brandState, typography: { ...brandState.typography, displayCeiling: opts[opts.length - 1]?.value as any } } as BrandInput);
      pxByVariant = new Map(full.typography.composites.filter((c) => c.group === 'display').map((c) => [c.variant, c.sizePx]));
    } catch { /* fall back to bare rung names */ }
    for (const o of opts) {
      const px = pxByVariant.get(String(o.value));
      sel.append(optionEl(String(o.value), px ? `${o.value} — ${px}px` : String(o.value)));
    }
    sel.value = String(getPath(brandState, ceil.key) ?? ceil.default);
    sel.onchange = () => { setPath(brandState, ceil.key, sel.value); applyFull(); };
    f.append(sel);
    range.append(f);
  }
  {
    const f = el('div', 'range-f');
    f.append(el('span', 'pfk', 'Smallest title size'));
    const on = (getPath(brandState, 'typography.titleFloor') ?? 18) === 16;
    const row = el('div', 'range-tg');
    // toggleField returns [switch, On/Off readout]; the size belongs between them so the row reads
    // "switch · what it is · whether it is on", not "switch · state · orphaned number".
    const tf = toggleField(on, (checked) => {
      setPath(brandState, 'typography.titleFloor', checked ? 16 : undefined);
      applyFull();
    });
    const readout = tf.querySelector('.knob-val');
    if (readout) tf.insertBefore(el('span', 'range-tglab mono', '16px'), readout);
    else tf.append(el('span', 'range-tglab mono', '16px'));
    row.append(tf);
    f.append(row);
    range.append(f);
  }
  sec.append(fieldBlock('Range', 'Where the ramp starts and stops. Sizes outside it are not generated.', range));

  // CUSTOMIZE — hidden by default, but never hides the FACT that sizes are pinned.
  const pins = pinnedSizeCount();
  const open = typeSizesOpen ?? pins > 0;
  if (open) computeWidestRows();
  const head = el('div', 'szt-head');
  const tf = toggleField(open, (checked) => { typeSizesOpen = checked; renderWorkspace(); });
  const readout = tf.querySelector('.knob-val');
  const headLab = el('span', 'szt-headlab', 'Edit individual sizes');
  if (readout) tf.insertBefore(headLab, readout); else tf.append(headLab);
  head.append(tf);
  if (pins) head.append(el('span', 'szt-badge', `${pins} customized`));
  sec.append(fieldBlock('Customize sizes', 'Set any size directly, and vary sizes per mode. The shape above still sets everything you don’t touch.', head));
  if (open) for (const g of PER_MODE_SIZE_GROUPS) { const t = renderSizeTable(g); if (t) sec.append(t); }
  return sec;
};

const renderResponsiveEditor = (): HTMLElement => {
  const ty = theme.typography;
  const wrap = palSection('Responsive sizing', 'Headings interpolate between a mobile floor and a desktop ceiling across the viewport range; body, label, caption and code stay fixed by design. Eyebrow shrinks only above 14px, so small kickers hold their size and hero kickers do not.');
  // #271 — there is no per-mode responsive lever, so these ALWAYS write global state. Say so
  // before the controls: every other section on this page is mode-scoped, and silently
  // changing all modes from inside a mode is the one thing this page used not to disclose.
  if (currentMode !== 'light')
    wrap.append(el('p', 'te-shared-note', 'Shared across all modes — unlike the faces and weights above, responsive sizing has no per-mode override, so editing here changes every mode.'));
  const cb = el('input') as HTMLInputElement;
  cb.type = 'checkbox'; cb.checked = brandState.typography?.responsive?.fluid ?? ty.fluid;
  cb.onchange = () => { setPath(brandState, 'typography.responsive.fluid', cb.checked); apply(); };
  const fl = el('label', 'adv-row'); fl.append(cb, el('span', 'adv-row-lab', 'Fluid heading sizing (clamp between viewports)'));
  wrap.append(fl);
  const mk = (key: 'minViewport' | 'maxViewport', label: string, fallback: number): void => {
    const inp = numberField({ className: 'adv-num', value: String(getPath(brandState, `typography.responsive.${key}`) ?? fallback) });
    inp.onchange = () => { const n = Number(inp.value); if (Number.isFinite(n)) { setPath(brandState, `typography.responsive.${key}`, n); apply(); } };
    const row = el('div', 'adv-row'); row.append(el('span', 'adv-row-lab', label), inp, el('span', 'adv-unit', 'px'));
    wrap.append(row);
  };
  mk('minViewport', 'Min viewport', ty.minViewport);
  mk('maxViewport', 'Max viewport', ty.maxViewport);

  // What fluid actually DOES — previously invisible: neither the mobile floor nor the
  // generated clamp() was shown anywhere, so the toggle and the viewport pair changed
  // nothing a designer could see.
  const seen = new Set<string>();
  const uniq = ty.composites.filter((c) => c.sizeMinPx !== c.sizePx)
    .filter((c) => { const k = `${c.group}.${c.variant}`; if (seen.has(k)) return false; seen.add(k); return true; });
  if (uniq.length) {
    wrap.append(subHead(`What fluid does — ${uniq.length} scaling styles`));
    const maxPx = Math.max(...uniq.map((c) => c.sizePx));
    const list = el('div', 'fz-list');
    for (const c of uniq) {
      const row = el('div', 'fz-row');
      row.append(el('span', 'fz-name mono', `${c.group}.${c.variant}`), el('span', 'fz-pair mono', `${c.sizeMinPx} → ${c.sizePx}px`));
      const right = el('div', 'fz-right');
      const bar = el('div', 'fz-bar');
      const fill = el('div', 'fz-fill');
      fill.style.left = `${(c.sizeMinPx / maxPx) * 100}%`;
      fill.style.width = `${((c.sizePx - c.sizeMinPx) / maxPx) * 100}%`;
      bar.append(fill);
      const slope = (c.sizePx - c.sizeMinPx) / (ty.maxViewport - ty.minViewport);
      const intercept = (c.sizeMinPx - slope * ty.minViewport) / 16;
      const clamp = `clamp(${+(c.sizeMinPx / 16).toFixed(4)}rem, ${+intercept.toFixed(4)}rem + ${+(slope * 100).toFixed(4)}vw, ${+(c.sizePx / 16).toFixed(4)}rem)`;
      const cl = el('div', 'fz-clamp mono', clamp); cl.title = clamp;
      right.append(bar, cl);
      row.append(right);
      list.append(row);
    }
    wrap.append(list);
    wrap.append(el('p', 'sl-note', 'The mobile floor is derived, not chosen: you set whether headings scale and the viewport range, but the floor comes from a fixed curve — titles drop about one rung, display converges hard so hero type stays usable on a phone.'));
    // The convergence is deliberate but invisible: several desktop sizes can share one floor.
    const byFloor = new Map<number, string[]>();
    for (const c of uniq) { const k = c.sizeMinPx; byFloor.set(k, [...(byFloor.get(k) ?? []), `${c.group}.${c.variant}`]); }
    const merged = [...byFloor.entries()].filter(([, v]) => v.length > 1);
    if (merged.length) {
      const w = el('p', 'fz-warn');
      w.append(el('b', undefined, 'Sizes that merge on mobile. '));
      w.append(document.createTextNode(`${merged.map(([px, v]) => `${v.join(' + ')} all land on ${px}px`).join('; ')} — distinct on desktop, identical on a phone. Fine if deliberate; a sign of more display steps than the mobile curve can express if not.`));
      wrap.append(w);
    }
  }
  return wrap;
};

/** The breakpoints controls (the editable px list + add/remove) — just the control node now, so the
 *  layout page can pair it with the ruler/table preview beside it (#264). `commit` redraws its own list
 *  locally (count/order may change) then `apply()` — which rebuilds the theme + repaints the layout
 *  previews via the page's refreshers — but never `applyFull`, which would lose focus/scroll mid-edit. */
const renderBreakpointsControls = (): HTMLElement => {
  const listEl = el('div', 'adv-bplist');
  const commit = (arr: number[]): void => {
    const clean = [...new Set(arr.filter((n) => Number.isFinite(n) && n >= 0))].sort((a, b) => a - b);
    setPath(brandState, 'layout.breakpoints', clean); draw(); apply();
  };
  const draw = (): void => {
    listEl.innerHTML = '';
    const bps = (brandState.layout?.breakpoints ?? theme.layout.breakpoints.map((b) => b.px)) as number[];
    bps.forEach((px, i) => {
      const cell = el('div', 'adv-bp');
      const inp = numberField({ className: 'adv-num', value: String(px) });
      inp.onchange = () => { const next = [...bps]; next[i] = Number(inp.value); commit(next); };
      const rm = el('button', 'adv-x', '×') as HTMLButtonElement;
      rm.onclick = () => commit(bps.filter((_, j) => j !== i));
      cell.append(inp, rm); listEl.append(cell);
    });
    const add = el('button', 'adv-add', '+ Add') as HTMLButtonElement;
    add.onclick = () => { const bps2 = (brandState.layout?.breakpoints ?? theme.layout.breakpoints.map((b) => b.px)) as number[]; commit([...bps2, (Math.max(0, ...bps2) + 256)]); };
    listEl.append(add);
  };
  draw();
  return listEl;
};

const renderEasingEditor = (): HTMLElement => {
  const wrap = palSection('Easing', 'The expressive cubic-bezier curve for the emphasized transition — see the Motion specimen’s emphasized bar.');
  const cur = (brandState.motionPersonality?.easingEmphasized ?? theme.motion.easing.emphasized) as number[];
  const row = el('div', 'adv-bez');
  const inputs: HTMLInputElement[] = [];
  const commit = (): void => { const vals = inputs.map((x) => Number(x.value)); if (vals.length === 4 && vals.every((v) => Number.isFinite(v))) { setPath(brandState, 'motionPersonality.easingEmphasized', vals); apply(); } };
  ['x1', 'y1', 'x2', 'y2'].forEach((lab, i) => {
    const inp = numberField({ className: 'adv-num', step: '0.01', value: String(cur[i] ?? [0.4, 0.14, 0.3, 1][i]) });
    inp.onchange = commit; inputs.push(inp);
    row.append(el('span', 'adv-bez-lab mono', lab), inp);
  });
  wrap.append(row);
  return wrap;
};

// ---- focused pages (docs/23 §7) -------------------------------------------
// Each editing page composes through one scaffold: hero → sections (or a read-only note on a derived
// mode) → the volatile contextual specimens for that axis. The heavy global preview lives on its own
// Preview tab (3a); these are the tight, single-axis specimens that stay with their editor.

/** The shared screen scaffold. `sections` builds the controls/editors; `specimens` returns the
 *  contextual specimen nodes, repainted on every edit. A derived mode (HC / wireframe) is auto-derived
 *  + read-only, so the controls are replaced by an explanatory note — the specimens still render it. */
const renderScreen = (
  host: HTMLElement, key: PageKey,
  sections: (h: HTMLElement) => void,
  specimens: () => Array<HTMLElement | null>,
): void => {
  const [title, lede] = PAGE_COPY[key];
  host.append(hero(title, lede));
  if (DERIVED_MODES.has(currentMode)) host.append(renderGeneratedNote());
  else sections(host);
  const vol = el('div', 'stage-vol');
  host.append(vol);
  paintVolatile = () => { vol.innerHTML = ''; for (const s of specimens()) if (s) vol.append(s); };
  paintVolatile();
};
// Per-page contrast table (docs/23 §3) — a re-slice of the same authoritative contracts the Preview
// master table shows, scoped to the components this page governs. "Local proof" without leaving the
// page; the full system table stays on Preview. Only the two colour pages govern contrast pairs, and
// the split is EXHAUSTIVE BY CONSTRUCTION: Surfaces owns the text-on-surface components; Interactive is
// the catch-all for everything else. So a component added to the preview spec later can never silently
// vanish from the local tables — it lands on Interactive automatically. (Review nit on #201.)
const SURFACE_CONTRACT_COMPONENTS = new Set(['typography', 'card']);
const renderSectionContrast = (key: PageKey): HTMLElement | null => {
  if (key !== 'surfaces' && key !== 'interactive') return null;
  const cts = rp.contracts.filter((ct) => SURFACE_CONTRACT_COMPONENTS.has(ct.component) === (key === 'surfaces'));
  if (!cts.length) return null;
  const det = el('details', 'contracts') as HTMLDetailsElement;
  const sum = el('summary', 'contracts-sum');
  sum.append(el('span', 'contracts-t', 'Contrast on this page'), el('span', 'contracts-hint', `${cts.length} pairs · all modes · the full system table lives in Preview`));
  det.append(sum);
  det.append(el('p', 'np-note', 'The a11y pairs this page governs, computed on the resolved colors across every mode — the per-control badges above verify the active mode at the point of edit.'));
  det.append(contractTableEl(cts, true));   // token paths — the component context is obvious next to the controls
  return det;
};

// Surfaces / fills — backgrounds, derived text/ink, an optional gradient.
const renderSurfacesPage = (host: HTMLElement): void => renderScreen(host, 'surfaces', (h) => {
  h.append(renderSurfacesEditor());     // self-heads "Backgrounds"
  h.append(renderForegroundsEditor());  // self-heads "Foreground fills" — the bold/surface fills (docs/23 §2)
  h.append(renderForegroundEditor());   // self-heads "Text"
  h.append(subHead('Gradients'));
  renderGradientsSection(h);
  // Per-section contrast tables now live inside each editor (doc 26 contrast-in-context); the gradient
  // read-only specimen was a duplicate of the live editor preview — both retired here.
}, () => []);

// Interactive & action colors — the per-palette matrix (#69). Global behaviours at the top, then one
// section per action palette (Primary / Neutral / Destructive / accents) of full-width slot rows binding
// every fill/text/inverse/overlay/on-fill role. The per-page contrast table stays volatile below.
const renderInteractivePage = (host: HTMLElement): void => renderScreen(host, 'interactive', (h) => {
  renderInteractiveMatrix(h);
}, () => [renderSectionContrast('interactive')]);

/** The typography PREVIEW tab — everything the system generates, at size, in every mode.
 *
 *  Read-only by design: the editors live on Styles, and giving the same value two homes is how they
 *  drift. It exists because the ramp was squeezed into the Styles aside, where a 160px display line
 *  and five mode columns have nowhere to go.
 *
 *  It also carries the specimens the tables cannot: a weight number is meaningless as digits, and the
 *  size tables show px rather than type. Those tables are the place to CHANGE a value; this is the
 *  place to SEE it. */
const renderTypePreview = (): HTMLElement => {
  const ty = theme.typography;
  const wrap = el('div');
  // Faces first — every specimen below inherits from them, so seeing what is actually resolving
  // explains anything that looks wrong before you go hunting in the ramp.
  const fam = palSection('Faces', `The family each role resolves to${rp.modes.length > 1 ? ', per mode' : ''}. Everything below is set in these.`);
  const ftbl = el('div', 'mtbl');
  const fscroll = el('div', 'mtbl-scroll');
  const ft = el('table', 'mtbl-tbl');
  const fhead = el('thead'), fhtr = el('tr');
  fhtr.append(el('th', 'mtbl-stick', 'Role'));
  for (const m of rp.modes) {
    const th = el('th', 'mtbl-mode');
    th.append(document.createTextNode(MODE_LABEL[m] ?? m));
    if (m === 'light') th.append(el('span', 'mtbl-ro', ' baseline'));
    fhtr.append(th);
  }
  fhtr.append(el('th', 'mtbl-fill mtbl-spec', 'Specimen'));
  fhead.append(fhtr); ft.append(fhead);
  const fb = el('tbody');
  for (const f of ty.families) {
    const tr = el('tr');
    const nc = el('td', 'mtbl-stick');
    nc.append(el('span', 'mtbl-name mono', f.role));
    tr.append(nc);
    let stack = f.stack.join(', ');
    for (const m of rp.modes) {
      const per = ty.familiesByMode?.[m]?.find((x) => x.role === f.role)?.stack.join(', ');
      const resolved = per ?? f.stack.join(', ');
      if (m === 'light') stack = resolved;
      const td = el('td', 'mtbl-mode');
      const nm = el('span', 'tp-fam', resolved.split(',')[0].replace(/["']/g, '').trim());
      nm.title = resolved;
      td.append(nm);
      tr.append(td);
    }
    const spec = el('td', 'mtbl-fill mtbl-spec');
    const samp = el('span', 'mtbl-spec-t', 'The quick brown fox jumps');
    samp.style.fontFamily = stack;
    spec.append(samp);
    tr.append(spec);
    fb.append(tr);
  }
  ft.append(fb); fscroll.append(ft); ftbl.append(fscroll); fam.append(ftbl);
  wrap.append(fam);

  // Weight roles — the specimen the numbers cannot carry.
  const wsec = palSection('Weight roles', 'Each role at the numeric it resolves to. Set them on Styles.');
  const wgrid = el('div', 'tp-wgrid');
  const textStack = ty.families.find((x) => x.role === 'text')?.stack.join(', ') ?? 'inherit';
  for (const w of ty.weightRoles) {
    const row = el('div', 'tp-wrow');
    row.append(el('span', 'tp-wkey mono', w.role), el('span', 'tp-wnum mono', `${w.value} ${WEIGHT_NAME[w.value] ?? ''}`.trim()));
    const samp = el('span', 'tp-wsamp', 'The quick brown fox jumps over the lazy dog');
    samp.style.fontWeight = String(w.value);
    samp.style.fontFamily = textStack;
    row.append(samp);
    wgrid.append(row);
  }
  wsec.append(wgrid);
  wrap.append(wsec);

  // And the ramp itself, full width rather than squeezed into the aside.
  wrap.append(renderTypeRamp());
  return wrap;
};

// Typography — type scale (shared, read-only outside Light) + the family/weight/leading editor.
/** Typography splits along the tier line (docs/26): FOUNDATIONS is the primitive raw material
 *  — the faces, the size ladder, the weight numerics, the leading/tracking rungs — and STYLES is
 *  the semantic layer built from it: which numeric each weight role means, what each category is
 *  made of, and the full generated ramp. Categories never appear on Foundations. */
type TypeTab = 'foundations' | 'styles' | 'preview';
let typeTab: TypeTab = 'foundations';
const TYPE_TABS: Array<[TypeTab, string]> = [['foundations', 'Foundations'], ['styles', 'Styles'], ['preview', 'Preview']];
const renderTypographyPage = (host: HTMLElement): void => renderScreen(host, 'typography', (h) => {
  const seg = el('div', 'pvseg');
  for (const [k, label] of TYPE_TABS) {
    const b = el('button', 'pvseg-b' + (typeTab === k ? ' on' : ''), label) as HTMLButtonElement;
    // Repaints the mode strip too: the Foundations/Styles line IS the primitive/semantic line the
    // switcher's visibility turns on (#268), so the tab switch changes header chrome, not just body.
    // Page nav gets this free via build(); this tab lives below it and would otherwise go stale.
    b.onclick = () => { if (typeTab !== k) { typeTab = k; renderWorkspace(); renderModeStrip(); } };
    seg.append(b);
  }
  h.append(seg);
  h.append(el('p', 'tabnote', typeTab === 'foundations'
    ? 'Primitives — the raw material every style is built from.'
    : typeTab === 'styles'
      ? 'Semantics — the named styles your product actually uses.'
      : 'Everything the system generates, at size, in every mode. Nothing here is editable.'));
  if (typeTab === 'foundations') h.append(renderTypefaces(), renderSizeLadder(), renderWeightScale(), renderLeadingTracking());
  else if (typeTab === 'styles') h.append(renderTypeSizes(), renderWeightRoles(), renderCategorySetup(), renderResponsiveEditor());
  else h.append(renderTypePreview());
  // The ramp stays in the Styles aside as well — doc 26 wants a section to carry its own specimen in
  // context, and the tabs are exclusive, so it is never rendered twice at once.
}, () => (typeTab === 'styles' ? [renderTypeRamp()] : []));

// Elevation — the shadow ramp (softness + tint live together in the bespoke editor).
const renderElevationPage = (host: HTMLElement): void => renderScreen(host, 'elevation', (h) => {
  h.append(renderShadowEditor(leverByKey('shadow.softness')));
}, () => [renderShadowSpecimen()]);

// Size & radius — component sizing (density) + corner radius; both go per-mode outside Light.
// Render one lever's control, honouring the per-mode ramp variants (radius / density / tempo go per-mode
// outside Light). Shared by the geometry/motion pages so each concept `.psec` composes the same way.
const leverControl = (key: string, perMode: boolean): HTMLElement | null => {
  const l = leverByKey(key); if (!l) return null;
  if (key === 'radiusScale' && perMode) return renderPerModeRadius(l);
  if (key === 'density' && perMode) return renderPerModeDensity(l);
  if (key === 'motionPersonality.tempo' && perMode) return renderPerModeTempo(l);
  return renderControl(l);
};
/** A `.psec` concept section built from a set of lever keys (doc 26). Returns null when none of its
 *  levers resolve, so an empty concept never renders an empty panel. */
const leverSection = (title: string, sub: string, keys: string[], perMode: boolean): HTMLElement | null => {
  const sec = palSection(title, sub); let any = false;
  for (const k of keys) { const c = leverControl(k, perMode); if (c) { sec.append(c); any = true; } }
  return any ? sec : null;
};

// Size & radius — grouped by concept (doc 26): corner radius, density/size, spacing grid. Each control
// block sits beside its live preview (#265, shared scaffold with Layout). radius + density stay per-mode
// outside Light — the controls reuse `leverControl(key, perMode)`, so that semantics is unchanged.
const csLeverStack = (keys: string[], perMode: boolean): HTMLElement => {
  const stack = el('div', 'cs-ctl-stack');
  for (const k of keys) { const c = leverControl(k, perMode); if (c) stack.append(c); }
  return stack;
};
const renderSizeRadiusPage = (host: HTMLElement): void => controlSplitPage(host, 'sizeRadius', () => {
  const perMode = currentMode !== 'light';
  return [
    { title: 'Corner radius', sub: 'The corner-radius ramp — its anchor (radius.md at scale 1) and the softness dial that scales the whole ramp.', controls: csLeverStack(['baseMd', 'radiusScale'], perMode), paint: paintRadiusPreview },
    { title: 'Density & size', sub: 'Component sizing — control height + paired padding per step. The density name stays stable; the metrics shift.', controls: csLeverStack(['density'], perMode), paint: paintSizePreview },
    { title: 'Spacing grid', sub: 'The spacing rhythm (space.100 = 1×) and the fine dimension-grid base backing radius & borders.', controls: csLeverStack(['spaceBase', 'baseUnit'], perMode), paint: paintSpacingPreview },
  ];
});

// ---- controls-beside-previews pages (docs #264 / #265) --------------------
// Layout and Size & radius put each control NEXT TO its own live preview, so a change is visible without
// scrolling to a specimen block far below. Built like the Palettes page: controls are stable and only the
// preview sub-nodes repaint (via `refreshers` → paintVolatile), so a slider/select is never rebuilt
// mid-interaction. `controlSplitPage` is the shared scaffold both pages compose from.
type SplitBlock = { title: string; sub: string; controls: HTMLElement; paint: (into: HTMLElement) => void };
/** The shared scaffold: hero → (derived-mode note, or) one `.cs-split` section per block (controls beside a
 *  preview node) → a page-local `paintVolatile` that repaints only the preview nodes on every `apply()`. */
const controlSplitPage = (host: HTMLElement, pageKey: PageKey, blocks: () => SplitBlock[]): void => {
  const [title, lede] = PAGE_COPY[pageKey];
  host.append(hero(title, lede));
  if (DERIVED_MODES.has(currentMode)) { host.append(renderGeneratedNote()); return; }
  const refreshers: Array<() => void> = [];
  for (const b of blocks()) {
    const sec = palSection(b.title, b.sub);
    const split = el('div', 'cs-split');
    const ctlCol = el('div', 'cs-ctl-col'); ctlCol.append(b.controls);
    const preview = el('div', 'cs-preview');
    split.append(ctlCol, preview);
    sec.append(split);
    host.append(sec);
    refreshers.push(() => b.paint(preview));
  }
  paintVolatile = () => { refreshers.forEach((r) => r()); };
  paintVolatile();
};
/** A compact labelled slider for the split pages — value read-out updates live on drag; the theme commits
 *  on release (`change` → apply()), which repaints the previews via the registered refreshers. Not the
 *  full-width `.knob` slider (overkill here, per #264/#265). */
const csSlider = (key: string, label: string, min: number, max: number, step: number, unit: string, get: () => number): HTMLElement => {
  const f = el('div', 'cs-ctl');
  const top = el('div', 'cs-ctl-top');
  const val = el('span', 'cs-ctl-val mono', `${get()}${unit}`);
  top.append(el('span', 'cs-ctl-lab', label), val);
  const input = rangeInput({ className: 'cs-range', min, max, step, value: get() });
  input.oninput = () => { val.textContent = `${input.value}${unit}`; };
  input.onchange = () => { setPath(brandState, key, Number(input.value)); apply(); };
  f.append(top, input);
  return f;
};
/** A compact labelled enum picker for the split pages (curated choices → a select). Commits on change. */
const csPicker = (key: string, label: string, choices: Array<[string, string]>, cur: string, onCommit?: () => void): HTMLElement => {
  const sel = selectEl('cap');
  for (const [value, text] of choices) sel.append(optionEl(value, text, value === cur));
  sel.onchange = () => { setPath(brandState, key, sel.value); if (onCommit) onCommit(); else apply(); };
  const f = el('div', 'cs-ctl'); f.append(el('span', 'cs-ctl-lab', label), sel);
  return f;
};

// Layout — breakpoints, grid columns, container caps (docs #264).
const LAYOUT_COLUMN_CHOICES = [4, 6, 8, 12, 16, 24];   // curated grid systems — no odd/awkward counts (#264)
const renderLayoutPage = (host: HTMLElement): void => controlSplitPage(host, 'layout', () => {
  // Grid columns — a curated step-picker (4/6/8/12/16/24, no awkward counts). Numeric key → coerce on commit.
  const colSel = selectEl('cap');
  const curCols = (brandState.layout?.columns ?? theme.layout.baseColumns) as number;
  for (const c of LAYOUT_COLUMN_CHOICES) colSel.append(optionEl(String(c), `${c} columns`, c === curCols));
  colSel.onchange = () => { setPath(brandState, 'layout.columns', Number(colSel.value)); apply(); };
  const colsCtl = el('div', 'cs-ctl'); colsCtl.append(el('span', 'cs-ctl-lab', 'Grid columns'), colSel);

  const caps = el('div', 'cs-ctl-stack');
  caps.append(
    csSlider('layout.containerMax', 'Container max', 960, 1920, 40, 'px', () => (brandState.layout?.containerMax ?? theme.layout.containerMax) as number),
    csSlider('layout.containerNarrow', 'Content container', 480, 960, 20, 'px', () => (brandState.layout?.containerNarrow ?? theme.layout.containerNarrow) as number),
  );
  return [
    { title: 'Breakpoints', sub: 'Min-width floors (px, ascending) — names auto-assign sm / md / lg / xl / 2xl.', controls: renderBreakpointsControls(), paint: paintBreakpointsPreview },
    { title: 'Grid columns', sub: 'Base column count for the design grid (16 / 24 for dense-data brands). Each breakpoint gets a 4/8/… ladder up to this base.', controls: colsCtl, paint: paintColumnsPreview },
    { title: 'Container caps', sub: 'Content-width caps — layout is fluid below the cap. The content container is the narrower reading-measure column (~65–75ch).', controls: caps, paint: paintContainersPreview },
  ];
});

// Motion — Tempo (per-mode outside Light) + the Easing curve, each its own concept section.
const renderMotionPage = (host: HTMLElement): void => renderScreen(host, 'motion', (h) => {
  const perMode = currentMode !== 'light';
  const tempo = leverSection('Tempo', 'The overall motion speed — scales the whole duration ramp (snappy → relaxed). Per-mode outside Light; reduce-motion is derived.', leversFor('motion').map((l) => l.key), perMode);
  if (tempo) h.append(tempo);
  h.append(renderEasingEditor());
}, () => [renderMotionSpecimen()]);

/** The Preview destination (docs/23 §7) — the resolved system for the mode picked in the global header,
 *  across three segmented views: the style guide (the roles composed in-context), the all-modes contrast
 *  contract table, and the category-grouped token list. (The former "UI preview" component gallery was
 *  dropped — button padding / badges / nav aren't defined at this stage, so those specimens were
 *  placeholder; the style guide now carries the real value.) */
type PreviewView = 'styleguide' | 'contrast' | 'tokens';
let previewView: PreviewView = 'styleguide';
const PREVIEW_VIEWS: Array<[PreviewView, string]> = [['styleguide', 'Style guide'], ['contrast', 'Contrast contracts'], ['tokens', 'Token list']];
const renderPreviewPage = (host: HTMLElement): void => {
  const [title, lede] = PAGE_COPY.preview;
  host.append(hero(title, lede));
  // Segmented view-switcher (docs/23 §7) — the three "look at the result" views in one destination.
  const seg = el('div', 'pvseg');
  for (const [k, label] of PREVIEW_VIEWS) {
    const b = el('button', 'pvseg-b' + (previewView === k ? ' on' : ''), label) as HTMLButtonElement;
    b.onclick = () => { if (previewView !== k) { previewView = k; renderWorkspace(); } };
    seg.append(b);
  }
  host.append(seg);
  const vol = el('div', 'stage-vol');
  host.append(vol);
  paintVolatile = () => {
    vol.innerHTML = '';
    const pv = el('div', 'pvhost');
    vol.append(pv);
    if (previewView === 'styleguide') renderPreviewStyleGuide(pv);
    else if (previewView === 'contrast') renderPreviewContracts(pv);
    else renderPreviewTokens(pv);
  };
  paintVolatile();
};

// #103 Phase B — advisory font-weight availability (#113 advisory model, not a hard gate). A curated,
// best-effort map of common families → the numeric weights they actually ship. Used only to WARN when a
// category ships a weight its family lacks (the font would fall back to the nearest); an unknown/custom
// family is never warned (we can't assert its weights). Mirrors the engine's per-family emit fallbacks
// (#112). Keys are matched case-insensitively against the family's primary name.
const KNOWN_WEIGHTS: Record<string, number[]> = {
  'Inter': [100, 200, 300, 400, 500, 600, 700, 800, 900],
  'Roboto': [100, 300, 400, 500, 700, 900], 'Roboto Mono': [100, 200, 300, 400, 500, 600, 700],
  'Clash Display': [200, 300, 400, 500, 600, 700], 'JetBrains Mono': [100, 200, 300, 400, 500, 600, 700, 800],
  'Helvetica': [400, 700], 'Helvetica Neue': [400, 700], 'Arial': [400, 700],
  'Georgia': [400, 700], 'Times New Roman': [400, 700],
  'Space Grotesk': [300, 400, 500, 600, 700], 'DM Sans': [400, 500, 700], 'DM Mono': [300, 400, 500],
  'IBM Plex Sans': [100, 200, 300, 400, 500, 600, 700], 'IBM Plex Mono': [100, 200, 300, 400, 500, 600, 700],
  'Work Sans': [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Manrope': [200, 300, 400, 500, 600, 700, 800],
  'Poppins': [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Montserrat': [100, 200, 300, 400, 500, 600, 700, 800, 900],
  'Lato': [100, 300, 400, 700, 900], 'Open Sans': [300, 400, 500, 600, 700, 800], 'Nunito': [200, 300, 400, 500, 600, 700, 800, 900],
  'Source Sans 3': [200, 300, 400, 500, 600, 700, 800, 900], 'Source Serif 4': [200, 300, 400, 500, 600, 700, 800, 900],
};
const KNOWN_WEIGHTS_LC: Record<string, number[]> = Object.fromEntries(Object.entries(KNOWN_WEIGHTS).map(([k, v]) => [k.toLowerCase(), v]));
/** The known weight list for a family primary name, or null when the family is unknown (→ no warning). */
const knownWeightsOf = (fontName: string | undefined): number[] | null => (fontName ? KNOWN_WEIGHTS_LC[fontName.trim().toLowerCase()] ?? null : null);

/** Offline font-availability detection. A family that fails to resolve falls through to the
 *  fallback stack, so its measured width matches the bare fallback's. Canvas metrics only —
 *  no network — so this works identically in the plugin iframe (`networkAccess: none`).
 *  Three baselines guard against a false negative when the face happens to match one of them. */
const _fontProbe = document.createElement('canvas').getContext('2d');
const fontAvailable = (name: string | undefined): boolean => {
  if (!name || !_fontProbe) return false;
  const probe = 'mmmmmmmmmmlliWWWWWWjgq';
  return ['monospace', 'sans-serif', 'serif'].some((base) => {
    _fontProbe.font = `72px ${base}`;
    const w0 = _fontProbe.measureText(probe).width;
    _fontProbe.font = `72px "${name}", ${base}`;
    return Math.abs(_fontProbe.measureText(probe).width - w0) > 0.5;
  });
};
const WEIGHT_NAME: Record<number, string> = {
  100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium',
  600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black',
};
const FAMILY_ROLES: Array<['display' | 'text' | 'mono', string, string]> = [
  ['display', 'Display', 'Headings & hero type.'],
  ['text', 'Text', 'Reading & UI copy.'],
  ['mono', 'Mono', 'Code & column-aligned figures.'],
];

// ---- FOUNDATIONS (primitives) ----------------------------------------------

/** Typefaces — the two tiers #269 split apart, made operable.
 *
 *  TIER 1, the library: `font.typeface.<slug>` — one primitive per distinct face, named after the
 *  face itself, carrying its fallback stack. Until now this tier was invisible in the dashboard even
 *  though the engine emits it. It is DERIVED, not authored: `deriveTypefaces` unions the faces the
 *  role bindings (and any per-mode overrides) actually name, so a face exists exactly as long as
 *  something binds it. That is also why removal needs no cascade — unbind it and it stops emitting.
 *
 *  TIER 2, the bindings: `font.family.<role>` — display / text / mono, the brand-invariant handles a
 *  shared codebase references. Each aliases one library face. The role set is fixed by design (#269
 *  rejected extensible roles): the typeface library is shared ACROSS brands and each brand binds its
 *  own members, so N faces exist system-wide while any one brand binds at most three.
 *
 *  Categories stay absent here — which category draws on which face is semantic, and lives on Styles. */
const renderTypefaces = (): HTMLElement => {
  const ty = theme.typography;
  const perMode = currentMode !== 'light';
  const modeLabel = MODE_LABEL[currentMode] ?? currentMode;
  const sec = palSection('Typefaces', 'Two tiers: the faces themselves, and which face does each job. A lone name auto-pads a system fallback stack; supply a full stack yourself and it is trusted verbatim.');

  // Effective face per role, honouring a per-mode override.
  const boundFace = (role: 'display' | 'text' | 'mono'): string => {
    const base = ty.families.find((f) => f.role === role)?.stack[0] ?? '';
    if (!perMode) return base;
    const ov = getModeLever(currentMode, `families.${role}`);
    const ovName = Array.isArray(ov) ? ov[0] : (ov as string | undefined);
    return ovName ?? base;
  };

  // ---- TIER 1 — the library (read-out; the bindings below are what author it) ----
  sec.append(subHead('The library — one primitive per face'));
  const lib = el('div', 'tf-lib');
  for (const tf of ty.typefaces) {
    const usedBy = FAMILY_ROLES.filter(([role]) => boundFace(role) === tf.name).map(([, label]) => label);
    const row = el('div', 'tf-libro');
    const idcol = el('div', 'tf-libid');
    idcol.append(el('div', 'tf-libname', tf.name), tokenPill(`font.typeface.${tf.slug}`));
    const ok = fontAvailable(tf.name);
    const meta = el('div', 'tf-libmeta');
    const stat = el('span', 'tf-stat ' + (ok ? 'ok' : 'no'), ok ? '✓ Installed here' : '⚠ Not installed — preview falls back');
    meta.append(stat);
    if (tf.variable) meta.append(el('span', 'tf-vf', 'Variable'));
    meta.append(el('span', 'tf-usedby', usedBy.length ? `Bound to ${usedBy.join(' + ')}` : 'Bound by a mode override only'));
    const fallback = el('div', 'tf-fall', tf.stack.length > 1 ? `Falls back to ${tf.stack.slice(1).join(', ')}` : 'No fallback stack');
    const prev = el('div', 'tf-prev', 'Ag 123');
    prev.style.fontFamily = `"${tf.name}", ${tf.slug.includes('mono') ? 'monospace' : 'sans-serif'}`;
    row.append(idcol, meta, fallback, prev);
    lib.append(row);
  }
  sec.append(lib);
  sec.append(el('p', 'tf-derivenote', 'This list is derived, not authored — a face exists here exactly as long as a role below binds it. Bind a new name and its primitive appears; re-point the last role that used it and it disappears. Slugs come from the face name, so there is no rename to cascade.'));

  // ---- TIER 2 — the bindings ----
  sec.append(subHead('The bindings — which face does each job'));
  const grid = el('div', 'tf-grid');
  for (const [role, label, desc] of FAMILY_ROLES) {
    const globalPrimary = ty.families.find((f) => f.role === role)?.stack[0] ?? '';
    const ov = perMode ? (Array.isArray(getModeLever(currentMode, `families.${role}`)) ? (getModeLever(currentMode, `families.${role}`) as string[])[0] : getModeLever(currentMode, `families.${role}`) as string | undefined) : undefined;
    const shown = perMode ? (ov ?? globalPrimary) : globalPrimary;
    // mono alone is nullable — `families.mono: null` opts out, and `code` is the only category that
    // binds mono, so the category goes with it (#269).
    const unbound = role === 'mono' && !perMode && getPath(brandState, 'typography.families.mono') === null;
    const card = el('div', 'tf-card');
    card.append(el('div', 'tf-role', label), el('div', 'tf-desc', desc));

    // Pick from the library, author a new face, or (mono) bind nothing at all.
    // Sentinels rather than plain words: the value is compared against real face names, so it
    // must be something no font family can be called.
    const CUSTOM = '__custom__';
    const NONE = '__none__';
    const opts: Array<[string, string]> = ty.typefaces.map((t) => [t.name, t.name] as [string, string]);
    if (!opts.some(([v]) => v === shown) && shown) opts.push([shown, shown]);
    opts.push([CUSTOM, 'Custom face…']);
    if (role === 'mono' && !perMode) opts.push([NONE, 'None — no mono face']);

    const input = el('input', 'tf-in') as HTMLInputElement;
    input.type = 'text'; input.spellcheck = false;
    input.value = perMode ? (ov ?? '') : (unbound ? '' : globalPrimary);
    input.placeholder = perMode ? `Auto — ${globalPrimary}` : 'Font family name';
    const stat = el('div', 'tf-stat');
    const prev = el('div', 'tf-prev', 'Ag 123');
    const paint = (face: string): void => {
      const ok = fontAvailable(face);
      stat.className = 'tf-stat ' + (ok ? 'ok' : 'no');
      stat.textContent = ok ? '✓ Rendering on this device' : (face ? '⚠ Not installed — preview falls back' : '⚠ Using the default face');
      prev.style.fontFamily = face ? `"${face}", ${role === 'mono' ? 'monospace' : 'sans-serif'}` : 'inherit';
    };

    const commit = (v: string | null | undefined): void => {
      if (perMode) { setModeLever(currentMode, `families.${role}`, v ?? undefined); applyFull(); }
      else { setPath(brandState, `typography.families.${role}`, v); applyFull(); }
    };

    const cur = unbound ? NONE : (shown || CUSTOM);
    const sel = selectEl('sm fill');
    for (const [v, label] of opts) sel.append(optionEl(v, label, v === cur));
    sel.onchange = () => {
      if (sel.value === CUSTOM) { input.hidden = false; syncStat(); input.value = ''; paint(''); input.focus(); return; }
      if (sel.value === NONE) { commit(null); return; }
      commit(sel.value);
    };
    // The free-text field is the authoring path for a face not yet in the library; picking an
    // existing one hides it, so there are never two live inputs for the same value (doc 26).
    input.hidden = !(unbound ? false : (!shown || !ty.typefaces.some((t) => t.name === shown)));
    if (unbound) input.hidden = true;
    input.oninput = () => paint(input.value.trim() || globalPrimary);
    input.onchange = () => commit(input.value.trim() || (perMode ? undefined : null));

    paint(unbound ? '' : shown);
    // Availability is a property of the FACE, and the library above already reports it per face.
    // Repeating it on every binding just triples the same warning — so it shows here only while the
    // custom field is live, which is the one moment you are naming a face and need the answer now.
    stat.hidden = input.hidden;
    const syncStat = (): void => { stat.hidden = input.hidden; };
    card.append(sel, input, stat);
    if (unbound) {
      card.append(el('div', 'tf-unbound', 'No mono face — the code category is not generated.'));
    } else {
      card.append(prev);
    }
    card.append(tokenPill(`font.family.${role}`));
    grid.append(card);
  }
  sec.append(grid);

  const spell = el('p', 'tf-note');
  spell.innerHTML = '<b>Exact spelling matters.</b> The name passes through to CSS and Figma untouched — there is no validation or auto-correct, so a near-miss silently falls back. Find the exact name in <b>macOS</b> Font Book, <b>Windows</b> Settings → Personalization → Fonts, or the foundry / Google Fonts specimen page.';
  const local = el('p', 'tf-note warn');
  local.innerHTML = '<b>Preview reflects only fonts installed on this device.</b> The dashboard loads no webfonts, so a correctly-spelled family you don’t have installed still previews as the fallback — the ⚠ above tells you when that is happening. Your emitted tokens are unaffected; they carry the name you typed.';
  sec.append(spell, local);
  if (perMode) sec.append(el('p', 'te-modenote', `Editing ${modeLabel}’s bindings — blank follows the global baseline. The library above shows every face any mode names.`));
  return sec;
};

/** The size ladder + the three levers that reshape it. The ladder itself was previously
 *  rendered nowhere, and displayCeiling / titleFloor were unreachable from the dashboard. */
const renderSizeLadder = (): HTMLElement => {
  const ty = theme.typography;
  const perMode = currentMode !== 'light';
  // The ladder ALONE. Shape / range moved to Styles (#328 follow-through) to sit with the per-size
  // table they govern — which also leaves this tab purely primitive, the condition #268's
  // no-switcher rule turns on.
  const sec = palSection('The size ladder', 'Fixed and brand-invariant — 22 rem steps, the raw material every heading size is chosen from. Which rungs the categories land on is set by Shape and Range, on Styles.');
  // No requested-vs-effective note any more: the ceiling names a RUNG, so what was asked for and
  // what ships cannot disagree (#328). The px ceiling could, because it was compared against sizes
  // typeScale had already shifted.

  sec.append(subHead('The ladder — largest first'));
  const headRungs = new Set(ty.composites.filter((c) => c.group === 'display' || c.group === 'title').map((c) => c.sizePx));
  const used = new Set(ty.composites.map((c) => c.sizePx));
  const minUsed = new Set(ty.composites.map((c) => c.sizeMinPx));
  const displayStack = ty.families.find((f) => f.role === 'display')?.stack.join(', ') ?? 'inherit';
  const ladder = el('div', 'sl-ladder');
  // Largest-first: every lever acts on the heading end, so the rungs that change must be
  // the ones in view. The scroll then opens on the first rung actually in use.
  for (const px of [...ty.sizesPx].reverse()) {
    const inUse = used.has(px);
    const row = el('div', 'sl-row' + (inUse ? '' : ' unused') + (headRungs.has(px) ? ' head' : ''));
    const meta = el('div', 'sl-meta');
    meta.append(el('span', 'sl-dot'), el('span', 'sl-px mono', `${px}px`), el('span', 'sl-rem mono', `${+(px / 16).toFixed(4)}rem`));
    const right = el('div', 'sl-right');
    const samp = el('div', 'sl-samp', 'Ag');
    samp.style.fontSize = `${px}px`; samp.style.fontFamily = displayStack;
    const who = [...new Set(ty.composites.filter((c) => c.sizePx === px).map((c) => c.group))];
    right.append(samp, el('div', 'sl-who mono', inUse ? who.join(' · ') : (minUsed.has(px) ? 'fluid floor only' : '—')));
    row.append(meta, right);
    ladder.append(row);
  }
  sec.append(ladder);
  requestAnimationFrame(() => {
    const first = ladder.querySelector('.sl-row:not(.unused)') as HTMLElement | null;
    if (first) ladder.scrollTop = Math.max(0, first.offsetTop - 4);
  });
  const key = el('div', 'sl-key');
  const kdot = (cls: string, text: string): HTMLElement => { const s = el('span', 'sl-keyi'); s.append(el('i', cls), document.createTextNode(text)); return s; };
  key.append(kdot('k-head', 'moves with these levers (display, title, eyebrow)'), kdot('k-fix', 'fixed — body, label, caption, code'), kdot('k-off', 'rung unused by any category'));
  sec.append(key);
  return sec;
};

/** The nine weight numerics, with per-face availability. This is the right home for the
 *  KNOWN_WEIGHTS advisory — it is a fact about the FONT, not about a category. */
const renderWeightScale = (): HTMLElement => {
  const ty = theme.typography;
  const sec = palSection('Weight scale', 'The nine CSS weight numerics. Whether a face actually ships a weight is advisory — an unknown or custom family is never flagged, and nothing here is ever blocked.');
  const table = el('table', 'ws-table');
  const head = el('tr');
  head.append(el('th', undefined, 'Weight'));
  for (const [role] of FAMILY_ROLES) head.append(el('th', 'ws-c', ty.families.find((f) => f.role === role)?.stack[0] ?? role));
  table.append(head);
  for (const n of [100, 200, 300, 400, 500, 600, 700, 800, 900]) {
    const tr = el('tr');
    const nameTd = el('td');
    nameTd.append(el('span', 'ws-num mono', String(n)), el('span', 'ws-name', WEIGHT_NAME[n]));
    tr.append(nameTd);
    for (const [role] of FAMILY_ROLES) {
      const known = knownWeightsOf(ty.families.find((f) => f.role === role)?.stack[0]);
      const td = el('td', 'ws-c');
      td.append(el('span', 'ws-mark ' + (!known ? 'unknown' : known.includes(n) ? 'yes' : 'no'), !known ? '?' : known.includes(n) ? '●' : '○'));
      td.title = !known ? 'Unknown family — availability cannot be asserted' : known.includes(n) ? 'Ships this weight' : 'May not ship this weight — falls back to the nearest';
      tr.append(td);
    }
    table.append(tr);
  }
  sec.append(table);
  sec.append(el('p', 'sl-note', '● ships it · ○ may not (falls back to the nearest) · ? unknown family, not flagged. Which numeric each named role maps to is a semantic decision — see Weight roles on the Styles tab.'));
  return sec;
};

/** Leading + tracking rungs. As of the brand-editable rung values these are real inputs in
 *  Light (they were read-only, with no global lever behind them at all). */
const renderLeadingTracking = (): HTMLElement => {
  const ty = theme.typography;
  const perMode = currentMode !== 'light';
  const modeLabel = MODE_LABEL[currentMode] ?? currentMode;
  const sec = palSection('Leading & tracking', 'Two fixed sets of named rungs, sitting alongside the size ladder. Re-anchor what a rung is worth here; which rung a category lands on is chosen for you from its size and role, and nudged per category on the Styles tab.');
  const ramp = (title: string, steps: { key: string; val: number }[], fmt: (v: number) => string,
    globalKey: string, modeField: string, min: number, max: number, step: number,
    preview: (host: HTMLElement, v: number) => void): void => {
    sec.append(subHead(title));
    const grid = el('div', 'lt-grid');
    for (const s of steps) {
      const cell = el('div', 'lt-cell');
      const top = el('div', 'lt-top');
      top.append(el('span', 'lt-key mono', s.key));
      // #296 — two DIFFERENT operations, so two different controls. In Light you edit the rung's VALUE
      // (a brand-wide re-anchor of a mode-invariant primitive). In any other mode you pick a TARGET
      // RUNG (a re-point for that mode) — never a number, because a mode may not redefine a primitive.
      if (perMode) {
        const ov = getModeLever(currentMode, `${modeField}.${s.key}`) as string | undefined;
        const sel = selectEl('sm fill');
        sel.append(optionEl('', `Auto — ${s.key} (${fmt(s.val)})`, !ov));
        for (const t of steps) {
          if (t.key === s.key) continue;                       // a self-map is a no-op; don't offer it
          sel.append(optionEl(t.key, `${t.key} (${fmt(t.val)})`, ov === t.key));
        }
        sel.onchange = () => { setModeLever(currentMode, `${modeField}.${s.key}`, sel.value || undefined); applyFull(); };
        top.append(sel);
      } else {
        const inp = numberField({ className: 'lt-in', min, max, step, value: s.val });
        inp.onchange = () => {
          const n = Number(inp.value);
          if (n >= min && n <= max) { setPath(brandState, `${globalKey}.${s.key}`, n); apply(); } else inp.value = String(s.val);
        };
        top.append(inp);
      }
      cell.append(top);
      const who = [...new Set(ty.composites.filter((c) => (modeField === 'lineHeights' ? c.lineHeight : c.tracking) === s.key).map((c) => c.group))];
      cell.append(el('div', 'lt-who', who.length ? who.join(', ') : 'not currently used'));
      const pv = el('div', 'lt-prev');
      preview(pv, s.val);
      cell.append(pv);
      grid.append(cell);
    }
    sec.append(grid);
  };
  ramp('Line height', ty.lineHeights.map((l) => ({ key: l.key, val: l.value })), (v) => `${v}×`,
    'typography.lineHeights', 'lineHeights', 0.8, 3, 0.05,
    (host, v) => { host.textContent = 'Typography is the craft of endowing human language with a durable visual form.'; host.style.lineHeight = String(v); });
  ramp('Letter spacing', ty.letterSpacings.map((l) => ({ key: l.key, val: l.em })), (v) => `${v}em`,
    'typography.letterSpacings', 'letterSpacings', -0.5, 0.5, 0.005,
    (host, v) => { host.textContent = 'Typography & tracking'; host.style.letterSpacing = `${v}em`; host.style.fontSize = '16px'; });
  if (perMode) sec.append(el('p', 'te-modenote', `Each rung shows what ${modeLabel} SUBSTITUTES for it — “Auto” keeps the rung itself. The rung values are mode-invariant primitives, shared across every mode; to change what a rung is worth, edit it in Light.`));
  return sec;
};

// ---- STYLES (semantics) ----------------------------------------------------

/** Weight roles → numeric. A named role aliasing a primitive: semantic, and global —
 *  `emphasis` is the same numeric in every category (#112). */
/** One stepper cell. `canDown`/`canUp` come from the caller because the constraint is axis-specific:
 *  a size ramp must stay strictly increasing and the engine REFUSES otherwise, while weight roles are
 *  only warned about — so faking a hard bound on weights would invent a rule the engine does not have. */
const stepCell = (o: {
  px: number; canDown: boolean; canUp: boolean; pinned: boolean;
  title?: (v: number) => string; label: string;
  step: (dir: -1 | 1) => number | undefined; write: (v: number | undefined) => void;
}): HTMLElement => {
  const wrap = el('div', 'mcell');
  const mk = (glyph: string, dir: -1 | 1, enabled: boolean) => {
    const b = el('button', 'mstep', glyph) as HTMLButtonElement;
    b.disabled = !enabled;
    const to = o.step(dir);
    b.title = enabled && to !== undefined ? `${o.px} → ${to}` : (dir < 0 ? 'Already at the lowest available' : 'Already at the highest available');
    b.setAttribute('aria-label', `${o.label} ${dir < 0 ? 'down' : 'up'}`);
    b.onclick = () => o.write(o.step(dir));
    return b;
  };
  const val = el('span', 'mval mono' + (o.pinned ? ' pin' : ''), String(o.px));
  val.title = o.title ? o.title(o.px) : (o.pinned ? 'Set here' : 'Following the baseline');
  wrap.append(mk('−', -1, o.canDown), val, mk('+', 1, o.canUp));
  if (o.pinned) {
    const r = el('button', 'mreset', '↺') as HTMLButtonElement;
    r.title = 'Follow the baseline again';
    r.setAttribute('aria-label', `Reset ${o.label}`);
    r.onclick = () => o.write(undefined);
    wrap.append(r);
  } else wrap.append(el('span', 'mreset-sp'));
  return wrap;
};

/** The weight-role table — same shape and geometry as the size tables so they stack on one grid.
 *  Rows are weight ROLES, not sizes: a role is one numeric shared by every category that uses it,
 *  which is why this cannot be extra rows in the size table. */
const WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const renderWeightTable = (): HTMLElement => {
  const ty = theme.typography;
  const modes = rp.modes;
  const textStack = ty.families.find((f) => f.role === 'text')?.stack.join(', ') ?? 'inherit';
  const box = el('div', 'mtbl');
  box.append(el('p', 'mtbl-cap', 'weight roles'));
  const scroll = el('div', 'mtbl-scroll');
  const tbl = el('table', 'mtbl-tbl');
  const thead = el('thead'), htr = el('tr');
  htr.append(el('th', 'mtbl-stick', 'Role'));
  for (const m of modes) {
    const th = el('th', 'mtbl-mode');
    th.append(document.createTextNode(MODE_LABEL[m] ?? m));
    if (m === 'light') th.append(el('span', 'mtbl-ro', ' baseline'));
    htr.append(th);
  }
  htr.append(el('th', 'mtbl-fill mtbl-spec', 'Specimen'));
  thead.append(htr); tbl.append(thead);
  const tb = el('tbody');
  for (const w of ty.weightRoles) {
    const tr = el('tr');
    const nameCell = el('td', 'mtbl-stick');
    nameCell.append(el('span', 'mtbl-name mono', w.role));
    tr.append(nameCell);
    for (const m of modes) {
      const isBase = m === 'light';
      const override = isBase
        ? (getPath(brandState, `typography.weightRoles.${w.role}`) as number | undefined)
        : (getModeLever(m, `weights.${w.role}`) as number | undefined);
      const value = override ?? (ty.weightRolesByMode?.[m]?.find((x) => x.role === w.role)?.value ?? w.value);
      const idx = WEIGHT_STEPS.indexOf(value);
      const step = (dir: -1 | 1) => (idx >= 0 ? WEIGHT_STEPS[idx + dir] : undefined);
      const td = el('td', 'mtbl-mode');
      td.append(stepCell({
        px: value,
        // Ends of the scale only. Roles may cross each other — the engine allows it and the warning
        // below says so — so a neighbor bound here would be a rule the system does not actually have.
        canDown: step(-1) !== undefined,
        canUp: step(1) !== undefined,
        pinned: override !== undefined,
        label: `${w.role} weight${isBase ? '' : ` in ${m}`}`,
        title: (v) => `${v} — ${WEIGHT_NAME[v] ?? ''}`.trim(),
        step,
        write: (v) => {
          if (isBase) setPath(brandState, `typography.weightRoles.${w.role}`, v);
          else setModeLever(m, `weights.${w.role}`, v);
          applyFull();
        },
      }));
      tr.append(td);
    }
    // A weight NUMBER is meaningless without seeing it — 400 against 500 is invisible as digits.
    const spec = el('td', 'mtbl-fill mtbl-spec');
    const samp = el('span', 'mtbl-spec-t', 'The quick brown fox');
    samp.style.fontWeight = String(w.value);
    samp.style.fontFamily = textStack;
    spec.append(samp);
    tr.append(spec);
    tb.append(tr);
  }
  tbl.append(tb); scroll.append(tbl); box.append(scroll);
  return box;
};

const renderWeightRoles = (): HTMLElement => {
  const ty = theme.typography;
  const sec = palSection('Weight roles', 'Each role maps to one CSS numeric, shared by every category — a relative-emphasis ladder from subtle to max. Per category you choose which roles ship, not what they weigh.');
  sec.append(renderWeightTable());
  const eff = ty.weightRoles.map((w) => w.value);
  if (eff.some((v, i) => i > 0 && v < eff[i - 1]))
    sec.append(el('p', 'te-order-warn', '⚠ A heavier role now resolves lighter than one below it — the names read as relative emphasis (subtle → strong), so keeping them in order stays honest. A warning, not a block.'));
  return sec;
};

/** Category setup — the composite skeleton. Each ticked weight multiplies out into real
 *  styles in the ramp; the leading/tracking nudges shift the engine's size-sensitive curve
 *  for that category rather than flattening it to one value. */
const renderCategorySetup = (): HTMLElement => {
  const ty = theme.typography;
  const perMode = currentMode !== 'light';
  const modeLabel = MODE_LABEL[currentMode] ?? currentMode;
  const roleOrder = ty.weightRoles.map((w) => w.role);
  const sec = palSection('What each category is made of', 'Give every category the face it draws from and the weight roles it ships, nudge its leading and tracking, and choose whether it gets italic and underlined-link variants. Each ticked weight multiplies out into a real style at every size in that category.');
  if (perMode) sec.append(el('p', 'te-shared-note', `Shared across all modes — the composite skeleton is authored in Light; ${modeLabel} only overrides the face and weight VALUES.`));
  const italicG = new Set(ty.composites.filter((c) => c.italic).map((c) => c.group));
  const linkG = new Set(ty.composites.filter((c) => c.link).map((c) => c.group));
  const wrap = el('div', 'cs-wrap');
  const table = el('table', 'cs-table');
  const head = el('tr');
  head.append(el('th', undefined, 'Category'), el('th', undefined, 'Face'));
  for (const r of roleOrder) head.append(el('th', 'cs-c', r));
  head.append(el('th', 'cs-c', 'leading'), el('th', 'cs-c', 'tracking'), el('th', 'cs-c', 'italic'), el('th', 'cs-c', 'link'));
  table.append(head);
  const cb = (checked: boolean, onChange: (v: boolean) => void): HTMLInputElement => {
    const c = el('input') as HTMLInputElement;
    c.type = 'checkbox'; c.checked = checked; c.disabled = perMode;
    c.onchange = () => onChange(c.checked);
    return c;
  };
  const nudge = (group: string, field: 'leadingShift' | 'trackingShift'): HTMLSelectElement => {
    const cur = (getPath(brandState, `typography.${field}.${group}`) as number | undefined) ?? 0;
    const sel = selectEl('sm cs-nudge');
    for (const [v, lab] of [[-1, field === 'leadingShift' ? 'tighter' : 'tighter'], [0, 'default'], [1, field === 'leadingShift' ? 'looser' : 'wider']] as Array<[number, string]>)
      sel.append(optionEl(String(v), lab, v === cur));
    sel.disabled = perMode;
    sel.onchange = () => { const n = Number(sel.value); setPath(brandState, `typography.${field}.${group}`, n === 0 ? undefined : n); apply(); };
    return sel;
  };
  for (const g of TYPE_GROUP_ORDER) {
    const comps = ty.composites.filter((c) => c.group === g);
    const tr = el('tr');
    const nameTd = el('td');
    nameTd.append(el('div', 'cs-name mono', g), el('div', 'cs-count', `${comps.length} ${comps.length === 1 ? 'style' : 'styles'}`));
    tr.append(nameTd);
    const fsel = selectEl('sm');
    const curFam = comps[0]?.family ?? 'text';
    for (const [role] of FAMILY_ROLES) fsel.append(optionEl(role, ty.families.find((f) => f.role === role)?.stack[0] ?? role, role === curFam));
    fsel.disabled = perMode;
    fsel.onchange = () => { setPath(brandState, `typography.familyMap.${g}`, fsel.value); apply(); };
    const ftd = el('td'); ftd.append(fsel); tr.append(ftd);
    const has = new Set(comps.map((c) => c.weightRole));
    for (const r of roleOrder) {
      const td = el('td', 'cs-c');
      td.append(cb(has.has(r), () => {
        const next = roleOrder.filter((x) => (x === r ? !has.has(r) : has.has(x)));
        setPath(brandState, `typography.weights.${g}`, next.length ? next : undefined); apply();
      }));
      tr.append(td);
    }
    const ltd = el('td', 'cs-c'); ltd.append(nudge(g, 'leadingShift')); tr.append(ltd);
    const ttd = el('td', 'cs-c'); ttd.append(nudge(g, 'trackingShift')); tr.append(ttd);
    const itd = el('td', 'cs-c');
    itd.append(cb(italicG.has(g), (v) => {
      const next = TYPE_GROUP_ORDER.filter((x) => (x === g ? v : italicG.has(x)));
      setPath(brandState, 'typography.italics', next); apply();
    }));
    tr.append(itd);
    const ktd = el('td', 'cs-c');
    ktd.append(cb(linkG.has(g), (v) => {
      const next = TYPE_GROUP_ORDER.filter((x) => (x === g ? v : linkG.has(x)));
      setPath(brandState, 'typography.links', next); apply();
    }));
    tr.append(ktd);
    table.append(tr);
  }
  wrap.append(table);
  sec.append(wrap);
  sec.append(el('p', 'sl-note', 'The leading and tracking nudges shift that category’s whole curve by one rung — bigger headings keep tightening, they just start from a different place.'));
  return sec;
};
// ---- object-value editors (#97) --------------------------------------------
// Two BrandInput levers are objects (`surfaces`, `shadow.tint`) that renderControl can only
// show read-only as "configured". These bespoke sub-forms make them editable — reading the
// current value from brandState (falling back to the engine default), writing the object
// fields via setPath, and re-resolving so the specimen repaints. (The third object lever,
// typography.families, is covered by the typography editor above.)

/** The neutral ramp steps a page surface / contrast floor can name (base can also be white/black). */
const NEUTRAL_STEPS = [25, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950];

// ---- Surfaces & fills: full-width ROW layout (Layout A, #68) ----------------
// One row per role: [56×56 swatch] [name + token pill (+desc)] [controls] [whitespace] [example, badge below].
// Controls left / static content right; the example is locked to the right edge at a single fixed size for
// every role (backgrounds/fills/text), with its contrast badge directly beneath. Replaces the old fill-grid
// cards. Rows live in the stable head (rebuilt on applyFull — every surfaces edit calls applyFull).
type SfRowOpts = { swatchHex: string; name: string; tokenPath: string; desc?: string; controls: HTMLElement; example: HTMLElement; badge?: HTMLElement; railNote?: string };
const sfRow = (o: SfRowOpts): HTMLElement => {
  const row = el('div', 'sf-row');
  const sw = el('div', 'sf-sw'); sw.style.background = o.swatchHex;
  const id = el('div', 'sf-id');
  id.append(el('div', 'sf-name', o.name), tokenPill(o.tokenPath));
  if (o.desc) id.append(el('p', 'sf-desc', o.desc));
  const right = el('div', 'sf-right');
  right.append(o.example);
  if (o.badge) right.append(o.badge);
  if (o.railNote) right.append(el('span', 'sf-railnote', o.railNote));
  row.append(sw, id, o.controls, el('div'), right);   // col 4 (empty div) is the whitespace spacer
  return row;
};
const sfCtl = (...blocks: HTMLElement[]): HTMLElement => { const c = el('div', 'sf-ctl'); c.append(...blocks); return c; };
const sfCtlBlock = (label: string, control: HTMLElement): HTMLElement => { const b = el('div', 'sf-ctlblock'); b.append(el('span', 'pfk', label), control); return b; };
const sfDot = (hex: string): HTMLElement => { const d = el('span', 'sf-ex-dot'); d.style.background = hex; return d; };
// The text color is the resolved role for THIS surface, not a hardcoded invert flag — a custom
// mode's Primary can be either light or dark, and a hardcoded dark ink went invisible on a dark
// custom-mode surface (near-black on near-black). `textHex` is `text.primary` (against
// background.primary) or `text.on-inverse` (against background.inverse.primary) — whichever the
// caller's surface actually is.
const sfExSurface = (bg: string, dotHex: string, label: string, textHex: string): HTMLElement => {
  const ex = el('div', 'sf-ex sf-ex-surface'); ex.style.background = bg; ex.style.color = textHex;
  ex.append(sfDot(dotHex), el('span', undefined, label)); return ex;
};
const sfExFill = (bg: string, label: string, fg?: string): HTMLElement => {
  const ex = el('div', 'sf-ex sf-ex-fill'); ex.style.background = bg; if (fg) ex.style.color = fg; ex.textContent = label; return ex;
};
const sfExText = (inkHex: string, sample: string, surfaceHex: string): HTMLElement => {
  const ex = el('div', 'sf-ex sf-ex-text'); ex.style.background = surfaceHex; ex.style.color = inkHex; ex.textContent = sample; return ex;
};

// A per-section contrast table (doc 26: contrast in context) built from the resolved roles across every
// mode — the same numbers the per-row badges show for the active mode, sliced to this section's roles.
// The consolidated cross-system table stays in Preview. Returns null when the section governs no pairs
// (e.g. Backgrounds, whose surfaces are grounds — judged by the text/fills that sit on them).
const sectionContrastRoles = (intro: string, roleLabels: Array<[string, string]>): HTMLElement | null => {
  const all = resolveAllModes(theme) as Array<{ mode: Mode; roles: Record<string, { hex: string; ratio?: number; min?: number } | undefined> }>;
  const graded = ([role]: [string, string]): boolean => all.some((m) => { const r = m.roles[role]; return !!r && r.min != null && r.min > 0 && r.ratio != null; });
  const rows = roleLabels.filter(graded);
  if (!rows.length) return null;
  const det = el('details', 'contracts') as HTMLDetailsElement;
  const sum = el('summary', 'contracts-sum');
  sum.append(el('span', 'contracts-t', 'Contrast in this section'), el('span', 'contracts-hint', `${rows.length} pairs · all modes · the full system table lives in Preview`));
  det.append(sum, el('p', 'np-note', intro));
  const table = el('table', 'ctable');
  const thead = el('tr'); thead.append(el('th', undefined, 'Role'));
  for (const m of rp.modes) thead.append(el('th', 'mcol', MODE_LABEL[m] ?? m));
  table.append(thead);
  for (const [role, label] of rows) {
    const tr = el('tr');
    const td = el('td', 'pair'); td.append(el('span', 'pair-path mono', `color.${role}`), el('span', 'pair-sub', label)); tr.append(td);
    for (const m of rp.modes) {
      const cell = el('td', 'mcol');
      const r = all.find((x) => x.mode === m)?.roles[role];
      if (r && r.min != null && r.min > 0 && r.ratio != null) { const pass = r.ratio >= r.min; cell.append(el('span', `dot ${pass ? 'ok' : 'no'}`), el('span', 'ratio', r.ratio.toFixed(2))); }
      else cell.textContent = '—';
      tr.append(cell);
    }
    table.append(tr);
  }
  det.append(table);
  return det;
};
/** #97 — page-surfaces editor. `surfaces.<mode>.{base,floorStep}` sets the primary surface the
 *  preview paints on (and the worst-case neutral the saturated foregrounds validate against).
 *  base = white / black / a tinted neutral step; floorStep is auto (engine-derived) unless pinned. */
// Backgrounds (docs/24 #61) — mode-SCOPED like the rest of the Surfaces page (Text below is too): the
// ACTIVE mode's primary surface (editable) + its inverse (derived, read-only), not both modes at once.
// Switch modes on the header strip to set each mode's surface. Only renders on customizable modes
// (renderScreen shows the generated note on a derived mode), so `currentMode` is light/dark/custom here.
const renderSurfacesEditor = (): HTMLElement => {
  const mode = currentMode;
  const label = MODE_LABEL[mode] ?? mode;
  const sec = palSection('Backgrounds', `The surface ${label} paints on (Primary) and its contrasting Inverse band — both set per mode. Switch modes above to set each mode’s surface.`);
  const opt = (sel: HTMLSelectElement, v: string, t: string, on: boolean): void => { sel.append(optionEl(v, t, on)); };
  const roles = (resolveAllModes(theme).find((x) => x.mode === mode)?.roles ?? {}) as Record<string, { hex: string } | undefined>;
  const primHex = roles['background.primary']?.hex ?? (mode === 'dark' ? '#000000' : '#ffffff');
  const brandDot = roles['foreground.brand']?.hex ?? '#5e4bc3';
  // The resolved ink for THIS surface — `text.primary` is measured against `background.primary`
  // exactly, so it's always legible here regardless of whether the mode's Primary is light or
  // dark. Previously a hardcoded near-black went invisible on a dark custom mode.
  const primText = roles['text.primary']?.hex ?? (mode === 'dark' ? '#f2f2f6' : '#191920');
  // Primary — the base surface is only configurable for light/dark (`SurfacesConfig`); custom modes seed
  // their surface from a base mode, so their Primary is shown read-only. (Inline check so TS narrows `mode`.)
  if (mode === 'light' || mode === 'dark') {
    const cur = brandState.surfaces?.[mode as 'light' | 'dark'];
    const dflt: 'white' | 'black' = mode === 'dark' ? 'black' : 'white';
    const baseVal = cur?.base ?? dflt;
    const base = selectEl('cap');
    opt(base, 'white', 'White', baseVal === 'white');
    opt(base, 'black', 'Black', baseVal === 'black');
    for (const s of NEUTRAL_STEPS) opt(base, String(s), `Neutral ${s}`, baseVal === s);
    base.onchange = () => { setPath(brandState, `surfaces.${mode}.base`, base.value === 'white' || base.value === 'black' ? base.value : Number(base.value)); applyFull(); };
    // Contrast floor — the worst-case neutral bold fills validate against (auto unless pinned).
    const floorHint = 'The worst-case neutral the engine validates bold fills against on this surface — the mode’s contrast baseline. Auto derives it from the base surface; pin a step to force a specific reference.';
    const floor = selectEl('cap'); floor.title = floorHint;
    opt(floor, '', 'Auto', cur?.floorStep == null);
    for (const s of NEUTRAL_STEPS) opt(floor, String(s), `Neutral ${s}`, cur?.floorStep === s);
    floor.onchange = () => { setPath(brandState, `surfaces.${mode}.floorStep`, floor.value === '' ? undefined : Number(floor.value)); applyFull(); };
    const floorBlock = sfCtlBlock('Contrast floor', floor); (floorBlock.firstChild as HTMLElement).title = floorHint;
    sec.append(sfRow({
      swatchHex: primHex, name: 'Primary', tokenPath: 'color.background.primary',
      desc: `The surface ${label} paints on — white, black, or a tinted neutral step.`,
      controls: sfCtl(sfCtlBlock('Base surface', base), floorBlock),
      example: sfExSurface(primHex, brandDot, 'Card on this surface', primText),
    }));
  } else {
    sec.append(sfRow({
      swatchHex: primHex, name: 'Primary', tokenPath: 'color.background.primary',
      desc: `The surface ${label} paints on — seeded from this custom mode’s base.`,
      controls: sfCtl(sfCtlBlock('Base surface', el('span', 'sf-derived', 'Seeds from its base mode'))),
      example: sfExSurface(primHex, brandDot, 'Card on this surface', primText),
    }));
  }

  // Inverse — the contrasting band (dark heroes / inverse sections). ADJUSTABLE per mode via the A1
  // override layer: "Auto" keeps the generated pairing; a neutral step repoints `background.inverse.primary`
  // (the engine re-derives its contrast and warns, never blocks). `background.inverse.primary` is generated
  // for every mode, so the row always renders — the `if` is a defensive guard.
  const invHex = roles['background.inverse.primary']?.hex;
  if (invHex) {
    const nPal = theme.roleToPalette.neutral;
    const nSteps = (theme.palettes.find((p) => p.palette === nPal)?.steps ?? []).map((s) => s.key);
    const cur = brandState.overrides?.[mode]?.['background.inverse.primary']?.step;
    const invSel = selectEl('cap');
    opt(invSel, '', 'Auto', cur == null);
    for (const s of nSteps) opt(invSel, s, `Neutral ${s}`, cur === s);
    invSel.onchange = () => {
      const v = invSel.value;
      const ov = brandState.overrides ?? (brandState.overrides = {});
      const forMode = ov[mode] ?? (ov[mode] = {});
      if (v === '') {
        delete forMode['background.inverse.primary'];
        if (!Object.keys(forMode).length) delete ov[mode];
        if (!Object.keys(ov).length) brandState.overrides = undefined;
      } else forMode['background.inverse.primary'] = { palette: nPal, step: v };
      applyFull();
    };
    const onInv = roles['foreground.inverse.primary']?.hex ?? '#9481ee';
    // `text.on-inverse` is measured against `background.inverse.primary` exactly — the correct ink
    // for this band regardless of which mode's inverse this is.
    const invText = roles['text.on-inverse']?.hex ?? '#f2f2f6';
    sec.append(sfRow({
      swatchHex: invHex, name: 'Inverse', tokenPath: 'color.background.inverse.primary',
      desc: 'The contrasting band for dark heroes / inverse sections — Auto follows the generated pairing; pick a neutral step to set it for this mode.',
      controls: sfCtl(sfCtlBlock('Base surface', invSel)),
      example: sfExSurface(invHex, onInv, 'Inverse band', invText),
    }));
  }
  return sec;
};

/** A2c — per-mode foreground/text override. The text-color ladder (text.primary/secondary/tertiary) is
 *  engine-derived and contrast-placed; this repoints a role to a specific NEUTRAL step for the current
 *  mode via the A1 override layer. Symmetric across customizable modes (light + dark both write their
 *  own override); "Auto" = the generated default; a pick below the text floor warns (never blocks). */
const FG_ROLES: [string, string][] = [['text.primary', 'Primary text'], ['text.secondary', 'Secondary text'], ['text.tertiary', 'Tertiary text']];
const TEXT_SAMPLE: Record<string, string> = { 'text.primary': 'The quick brown fox', 'text.secondary': 'Jumps over the lazy dog', 'text.tertiary': 'Least-emphasis caption' };
const renderForegroundEditor = (): HTMLElement => {
  const sec = palSection('Text', `The text colors for ${MODE_LABEL[currentMode] ?? currentMode} — “Auto” follows the generated, contrast-placed default; pick a neutral step to override just this mode (a pick below the text floor is warned, not blocked). Each row previews the ink on the mode’s surface.`);
  const nPal = theme.roleToPalette.neutral;
  const nSteps = (theme.palettes.find((p) => p.palette === nPal)?.steps ?? []).map((s) => s.key);
  const roles = (resolveAllModes(theme).find((x) => x.mode === currentMode)?.roles ?? {}) as Record<string, { hex: string; ratio?: number; min?: number } | undefined>;
  const surfaceHex = roles['background.primary']?.hex ?? (currentMode === 'dark' ? '#000000' : '#ffffff');
  for (const [role, label] of FG_ROLES) {
    const r = roles[role]; if (!r) continue;
    const sel = selectEl('cap');
    const cur = brandState.overrides?.[currentMode]?.[role]?.step;
    sel.append(optionEl('', 'Auto', cur == null));
    for (const s of nSteps) sel.append(optionEl(s, `Neutral ${s}`, cur === s));
    sel.onchange = () => {
      const v = sel.value;
      const ov = brandState.overrides ?? (brandState.overrides = {});
      const forMode = ov[currentMode] ?? (ov[currentMode] = {});
      if (v === '') {                                          // revert to the generated baseline
        delete forMode[role];
        if (!Object.keys(forMode).length) delete ov[currentMode];
        if (!Object.keys(ov).length) brandState.overrides = undefined;
      } else forMode[role] = { palette: nPal, step: v };
      applyFull();
    };
    sec.append(sfRow({
      swatchHex: r.hex, name: label, tokenPath: `color.${role}`,
      controls: sfCtl(sfCtlBlock('Step', sel)),
      example: sfExText(r.hex, TEXT_SAMPLE[role] ?? 'Sample text', surfaceHex),
      badge: r.min != null && r.min > 0 && r.ratio != null ? contrastBadge(r.ratio, r.min) : undefined,
    }));
  }
  const ct = sectionContrastRoles('The text-on-surface legibility pairs this section governs, computed on the resolved colors across every mode — the per-row badge verifies the active mode at the point of edit.', FG_ROLES);
  if (ct) sec.append(ct);
  return sec;
};

// ---- Foreground fills editor (docs/23 §2 "Foregrounds") -------------------
// The bold semantic fills + the neutral surface tiers as cards, each repointable per mode via the A1
// override layer (`theme.overrides`), same mechanism as Text & ink above but keyed to each role's own
// palette. Distinct from Text & ink (the neutral INK ladder). Customizable modes only — on a derived
// mode the whole page is the read-only note (renderScreen), so this never renders there.
/** A palette step select with an "Auto" (the generated baseline) option — audit §8 candidate #3. `''` is
 *  Auto; other values are step keys. */
const stepPicker = (paletteName: string, steps: string[], autoStep: string, current: string | undefined, onPick: (step: string | undefined) => void, mark?: (step: string) => string): HTMLSelectElement => {
  const sel = selectEl('cap');
  // Auto carries the mark too. It is the engine's contract-satisfying pick, so leaving it bare in a
  // marked list would make the one guaranteed-good option look like the failing ones.
  sel.append(optionEl('', `Auto · ${paletteName} ${autoStep}${mark?.(autoStep) ?? ''}`, current == null));
  for (const s of steps) sel.append(optionEl(s, `${paletteName} ${s}${mark?.(s) ?? ''}`, current === s));
  sel.onchange = () => onPick(sel.value === '' ? undefined : sel.value);
  return sel;
};
const FILL_ROLES: Array<{ role: string; label: string; paletteKey: string; desc: string }> = [
  { role: 'foreground.brand', label: 'Brand', paletteKey: 'brand', desc: 'The bold brand fill — filled badges, nav indicators, brand accents.' },
  { role: 'foreground.success', label: 'Success', paletteKey: 'success', desc: 'The bold success fill.' },
  { role: 'foreground.warning', label: 'Warning', paletteKey: 'warning', desc: 'The bold warning fill.' },
  { role: 'foreground.info', label: 'Info', paletteKey: 'info', desc: 'The bold info fill.' },
  { role: 'foreground.danger', label: 'Danger', paletteKey: 'danger', desc: 'The bold danger fill.' },
  { role: 'foreground.primary', label: 'Surface — card', paletteKey: 'neutral', desc: 'The default raised surface — a card.' },
  { role: 'foreground.secondary', label: 'Surface — panel', paletteKey: 'neutral', desc: 'The second surface tier — a panel.' },
  { role: 'foreground.tertiary', label: 'Surface — nested', paletteKey: 'neutral', desc: 'The third surface tier — a nested container.' },
];
const setFillOverride = (role: string, palette: string, step: string | undefined): void => {
  const ov = brandState.overrides ?? (brandState.overrides = {});
  const forMode = ov[currentMode] ?? (ov[currentMode] = {});
  if (step === undefined) {                                   // revert to the generated baseline
    delete forMode[role];
    if (!Object.keys(forMode).length) delete ov[currentMode];
    if (!Object.keys(ov).length) brandState.overrides = undefined;
  } else forMode[role] = { palette, step };
  applyFull();
};
const renderForegroundsEditor = (): HTMLElement => {
  const sec = palSection('Foreground fills', `Bold semantic fills + neutral surface tiers for ${MODE_LABEL[currentMode] ?? currentMode} — “Auto” follows the generated, contrast-gated default; pick a step to override just this mode (a pick below the fill's floor is warned, not blocked).`);
  const roles = (resolveAllModes(theme).find((x) => x.mode === currentMode)?.roles ?? {}) as Record<string, { hex: string; path?: string; ratio?: number; min?: number } | undefined>;
  for (const { role, label, paletteKey, desc } of FILL_ROLES) {
    const r = roles[role]; if (!r) continue;
    const palette = (theme.roleToPalette as Record<string, string>)[paletteKey] ?? paletteKey;
    const steps = (theme.palettes.find((p) => p.palette === palette)?.steps ?? []).map((s) => s.key);
    if (!steps.length) continue;
    const cur = brandState.overrides?.[currentMode]?.[role]?.step;
    const picker = stepPicker(palette, steps, stepKeyOf(r.path), typeof cur === 'string' ? cur : undefined, (step) => setFillOverride(role, palette, step));
    // Neutral surface tiers are pale fills — paint the example label in ink, not white; other fills keep white on-fill.
    const isSurface = paletteKey === 'neutral';
    const tier = label.split('—')[1]?.trim();                 // "Surface — card" → "card"
    const exLabel = isSurface ? (tier ? tier[0].toUpperCase() + tier.slice(1) : 'Surface') : `${label} fill`;
    sec.append(sfRow({
      swatchHex: r.hex, name: label, tokenPath: `color.${role}`, desc,
      controls: sfCtl(sfCtlBlock('Step', picker)),
      example: sfExFill(r.hex, exLabel, isSurface ? '#191920' : undefined),
      badge: r.min != null && r.min > 0 && r.ratio != null ? contrastBadge(r.ratio, r.min) : undefined,
      railNote: isSurface ? 'non-text · surface' : undefined,
    }));
  }
  const ct = sectionContrastRoles('The on-fill legibility pairs this section governs, computed on the resolved colors across every mode — the per-row badge verifies the active mode at the point of edit.', FILL_ROLES.map((f) => [f.role, f.label] as [string, string]));
  if (ct) sec.append(ct);
  return sec;
};

/** #97 + #114 tidy — the Shadow group. Gathers every shadow control under one heading: the
 *  `shadow.softness` blur dial (a generic slider lever, passed in so it leaves the geometry panel)
 *  and the `shadow.tint = {hue, amount}` object editor (hue-shifts the base off pure black; amount 0 =
 *  pure black, higher = a richer brand-hued near-black). Reads the resolved default (`theme.shadow.tint`)
 *  when the brand hasn't set one; the elevation specimen recolors live. */
const renderShadowEditor = (softness?: Lever): HTMLElement => {
  // D (shadow) — outside the base mode, softness + tint go per-mode (modeLevers[mode].shadow); the
  // slider shows the EFFECTIVE value (override ?? global) and moving it creates an override, with a
  // "↺ Auto" reset that clears it (blank-slider has no natural Auto state, so the reset is explicit).
  const perMode = currentMode !== 'light';
  const modeLabel = MODE_LABEL[currentMode] ?? currentMode;
  const wrap = palSection('Shadow', perMode
    ? `Blur softness + tint for ${modeLabel} — “Auto” follows the global shadow; a value overrides just this mode (crisper/softer, warmer/cooler). The light↔dark reduction still applies on top.`
    : 'Blur softness (crisp/product → soft/marketing) and a hue-shift of the shadow base off pure black. Tint amount 0 = pure black; higher = a richer, brand-hued near-black.');
  const gTint = theme.shadow.tint;         // resolved global tint (what a mode inherits under Auto)
  const gSoft = theme.shadow.softness;     // resolved global softness
  const panel = wrap;                       // knobs append straight into the .psec (no nested .panel)
  if (perMode) {
    // A per-mode slider: effective = override ?? global; moving it writes modeLevers[mode].shadow.<path>
    // via the shared setModeLever (prunes to byte-identical). Dragging back to EXACTLY the global value
    // clears the override (no redundant "== global" override lingers), and the ↺ Auto reset clears it too.
    const mkPer = (label: string, min: number, max: number, step: number, unit: string, path: string, global: number): void => {
      const ov = getModeLever(currentMode, path) as number | undefined;
      const eff = ov ?? global;
      const knob = el('div', 'knob');
      const head = el('div', 'sh-knob-head');
      head.append(el('label', 'knob-label', label));
      const auto = el('button', 'sh-auto') as HTMLButtonElement;
      const setAuto = (overriding: boolean): void => { auto.textContent = overriding ? '↺ Auto' : `Auto (${global}${unit})`; auto.className = overriding ? 'sh-auto on' : 'sh-auto'; auto.disabled = !overriding; };
      setAuto(ov !== undefined);
      auto.onclick = () => { setModeLever(currentMode, path, undefined); applyFull(); };
      head.append(auto);
      knob.append(head);
      const input = rangeInput({ min, max, step, value: eff });
      const val = el('span', 'knob-val', `${eff}${unit}${ov !== undefined ? '' : ' · auto'}`);
      input.oninput = () => {
        const nv = Number(input.value);
        const overriding = nv !== global;                    // landing back on the global prunes the override
        setModeLever(currentMode, path, overriding ? nv : undefined);
        val.textContent = `${input.value}${unit}${overriding ? '' : ' · auto'}`;
        // update the ↺ Auto reset in place (no full re-render, so dragging stays smooth).
        setAuto(overriding);
        apply();
        refreshTintReadout?.();   // #305 — stable-head control, so repaint it rather than re-render
      };
      const body = el('div', 'knob-body'); body.append(input, val);
      knob.append(body);
      panel.append(knob);
    };
    const sLever = softness;
    mkPer(sLever?.label ?? 'Shadow softness', (sLever?.min as number) ?? 0, (sLever?.max as number) ?? 2, (sLever?.step as number) ?? 0.1, '', 'shadow.softness', gSoft);
    mkPer('Tint hue', 0, 360, 1, '°', 'shadow.tint.hue', gTint.hue);
    mkPer('Tint amount', 0, 1, 0.05, '', 'shadow.tint.amount', gTint.amount);
  } else {
    const cur = brandState.shadow?.tint;
    if (softness) panel.append(renderControl(softness));             // the blur dial, pulled out of the geometry panel
    const mk = (key: 'hue' | 'amount', label: string, min: number, max: number, step: number, unit: string): void => {
      const knob = el('div', 'knob');
      knob.append(el('label', 'knob-label', label));
      const input = rangeInput({ min, max, step, value: cur?.[key] ?? gTint[key] });
      const val = el('span', 'knob-val', `${input.value}${unit}`);
      input.oninput = () => {
        setPath(brandState, `shadow.tint.${key}`, Number(input.value));
        val.textContent = `${input.value}${unit}`;
        apply();
        refreshTintReadout?.();   // #305 — stable-head control, so repaint it rather than re-render
      };
      const body = el('div', 'knob-body'); body.append(input, val);
      knob.append(body);
      panel.append(knob);
    };
    mk('hue', 'Tint hue', 0, 360, 1, '°');
    mk('amount', 'Tint amount', 0, 1, 0.05, '');
  }
  panel.append(tintReadout());
  return wrap;
};

/** #305 — the tint sliders' honest feedback.
 *
 *  The shadow ramp runs at 10–14% alpha, so even a fully saturated tint moves the COMPOSITED shadow
 *  only ~3 ΔE00 — visible, but nowhere near what the slider's travel implies. Without this read-out the
 *  control looked broken: the reported symptom was "I cannot see the tint sliders changing the
 *  examples", and the honest answer is that the base colour changes a lot while the shadow changes a
 *  little. So show the base colour at FULL opacity (where the hue is unmistakable) beside the shadow as
 *  actually painted, and say why they differ.
 *
 *  Refreshed IMPERATIVELY via `refreshTintReadout`, not by re-render. The shadow editor lives in the
 *  stable head (doc-26: controls are built once and survive `apply()`; only the volatile bands
 *  re-render), so a read-out that computed its colour at construction time would freeze at the value
 *  it was born with. That is exactly the inert-control bug this issue is about — the first cut of this
 *  fix shipped frozen and a browser check caught it, so the slider handlers call the refresh. */
let refreshTintReadout: (() => void) | null = null;

const tintReadout = (): HTMLElement => {
  const row = el('div', 'sh-tintout');

  // The colour goes on an INNER fill so the chip's checkerboard stays behind it — setting
  // `style.background` on the chip itself would clobber the background-image shorthand and the 12%
  // swatch would read as an opaque grey instead of a translucent near-black.
  const swatch = (caption: string): { cell: HTMLElement; fill: HTMLElement } => {
    const chip = el('div', 'sh-tintchip');
    const fill = el('div', 'sh-tintfill');
    chip.append(fill);
    const cell = el('div', 'sh-tintcell');
    cell.append(chip, el('div', 'sh-tintcap', caption));
    return { cell, fill };
  };
  const solid = swatch('Tint color · 100%');
  // The same colour at a mid-ramp alpha — what the eye actually gets on the ramp.
  const painted = swatch('In a shadow · 12%');
  row.append(solid.cell, painted.cell);

  const note = el('div', 'sh-tintnote');
  const hexLabel = el('b', undefined, '');
  const noteText = document.createTextNode('');
  note.append(hexLabel, noteText);

  const refresh = (): void => {
    // A mode with its own tint override re-derives its own base colour; otherwise it inherits the global.
    const base = theme.shadow.shadowByMode?.[currentMode]?.colorRgb ?? theme.shadow.colorRgb;
    const baseHex = hex(base);
    const amount = theme.shadow.shadowByMode?.[currentMode]?.tint.amount ?? theme.shadow.tint.amount;
    solid.fill.style.backgroundColor = baseHex;
    painted.fill.style.backgroundColor = `${baseHex}1f`;   // 12% — mid-ramp
    hexLabel.textContent = baseHex.toUpperCase() + ' ';
    noteText.nodeValue = amount === 0
      ? '— pure black. Raise Tint amount to shift the shadow base off black.'
      : 'is the shadow base. Shadows paint it at 10–14% opacity, so the hue reads far subtler on the ramp than on the swatch above — that is the shadow doing its job, not the slider failing.';
  };
  refresh();
  refreshTintReadout = refresh;

  const wrap = el('div', 'sh-tintblock');
  wrap.append(row, note);
  return wrap;
};

// `as const` keeps the literal union so these stay assignable to the engine's TypeGroup
// (the italic/link sets are keyed by it).
const TYPE_GROUP_ORDER = ['display', 'title', 'body', 'label', 'caption', 'eyebrow', 'code'] as const;
const TYPE_GROUP_BLURB: Record<string, string> = {
  display: 'Hero and marketing-scale statements.', title: 'Section and page headings.',
  body: 'Running copy and UI text.', label: 'Form labels, buttons, dense UI.',
  caption: 'Secondary and supporting text.', eyebrow: 'Small uppercase kickers above headings.',
  code: 'Inline code and tabular figures.',
};
// Long strings stop fitting once the size climbs, so the sample shortens rather than
// the size being capped — the ramp's whole job is showing true scale.
const rampSample = (group: string, px: number): string =>
  group === 'code' ? 'const token = 16;' : px >= 80 ? 'Type' : px >= 40 ? 'Typography' : 'The quick brown fox';

/** The full semantic ramp — every generated style at true size, grouped by category.
 *  Resolves through the active mode's family / weight / leading / tracking. */
/** The full ramp, EVERY MODE SIDE BY SIDE (owner decision, #268 follow-up).
 *
 *  It used to render one mode — whichever `currentMode` was — so a per-mode deviation was only
 *  visible if you already suspected it and went looking. That is the wrong default for a dimension
 *  the engine can vary five different ways (`families`, `weights`, `lineHeights`, `letterSpacings`,
 *  `typeSizes`), and it is what made per-mode SIZES (#328/#347) effectively invisible in the UI.
 *  Showing all modes at once makes the mode axis a property of the table rather than of the session.
 *
 *  Every row shows every mode — including modes where nothing differs. Confirming "identical
 *  everywhere" is usually the thing you actually want, and a table whose shape shifts as you edit is
 *  harder to read than a wider one that doesn't.
 *
 *  This does NOT retire the mode switcher on Styles: the editors above still resolve against
 *  `currentMode` and WRITE per-mode overrides. Seeing every mode removes the need to switch for
 *  READING, never for EDITING (#268). */
const renderTypeRamp = (): HTMLElement => {
  const ty = theme.typography;
  const modes = rp.modes;
  // Resolve the whole composite FOR ONE MODE. Each axis falls back to the brand-level value, which is
  // what makes an untouched mode render identically rather than blank.
  // #296 — the rungs are mode-invariant, so read them straight. What varies is WHICH rung a composite
  // uses; resolving the key first and the value second keeps the preview honest about the two tiers.
  const lhOf = (k: string): number => ty.lineHeights.find((l) => l.key === k)?.value ?? 1.5;
  const lsOf = (k: string): number => ty.letterSpacings.find((l) => l.key === k)?.em ?? 0;
  const inMode = (c: TypeComposite, m: string) => {
    const fams = ty.familiesByMode?.[m] ?? ty.families;
    const wrs = ty.weightRolesByMode?.[m] ?? ty.weightRoles;
    const lhKey = c.lineHeightByMode?.[m] ?? c.lineHeight;
    const lsKey = c.trackingByMode?.[m] ?? c.tracking;
    // #347 — a re-sized rung carries its OWN mobile endpoint, so read the pair together. Taking
    // sizeMinPx from the brand while sizePx came from the mode would print an incoherent fluid range.
    const sizePx = c.sizeByMode?.[m] ?? c.sizePx;
    const sizeMinPx = c.sizeMinByMode?.[m] ?? (c.sizeByMode?.[m] !== undefined ? sizePx : c.sizeMinPx);
    return {
      sizePx, sizeMinPx, lhKey, lsKey,
      stack: fams.find((f) => f.role === c.family)?.stack.join(', ') ?? 'inherit',
      weight: wrs.find((w) => w.role === c.weightRole)?.value ?? 400,
    };
  };

  const sec = palSection('The full type ramp', `Every style the system generates — ${ty.composites.length} in total, grouped by category — resolved in all ${modes.length} ${modes.length === 1 ? 'mode' : 'modes'} side by side. This is what ships as tokens.`);
  for (const g of TYPE_GROUP_ORDER) {
    const comps = ty.composites.filter((c) => c.group === g);
    if (!comps.length) continue;
    const block = el('div', 'tr-block');
    const band = el('div', 'tr-band');
    band.append(el('span', 'tr-band-n', g), el('span', 'tr-band-c mono', `${comps.length} ${comps.length === 1 ? 'style' : 'styles'}`),
      el('span', 'tr-band-d', TYPE_GROUP_BLURB[g] ?? ''));
    block.append(band);
    for (const c of comps) {
      const row = el('div', 'tr-row');
      const meta = el('div', 'tr-meta');
      meta.append(tokenPill(`type.${c.path}`));
      meta.append(el('span', 'tr-attr mono', `${c.weightRole} · ${c.family}`));
      row.append(meta);
      // One column per mode. Scrolls horizontally rather than wrapping: a wrapped column would read as
      // a new row, which is precisely the confusion a side-by-side table exists to remove.
      const cols = el('div', 'tr-modes');
      cols.style.gridTemplateColumns = `repeat(${modes.length}, minmax(220px, 1fr))`;
      for (const m of modes) {
        const v = inMode(c, m);
        const col = el('div', 'tr-mode');
        col.append(el('span', 'tr-mode-n', m));
        const fluidTag = v.sizeMinPx !== v.sizePx ? ` · fluid ${v.sizeMinPx}→${v.sizePx}` : '';
        col.append(el('span', 'tr-attr mono', `${v.sizePx}px · ${v.weight} · ${v.lhKey} ${lhOf(v.lhKey)}× · ${v.lsKey} ${lsOf(v.lsKey)}em${fluidTag}`));
        const samp = el('div', 'tr-samp', rampSample(c.group, v.sizePx));
        samp.style.fontFamily = v.stack;
        samp.style.fontSize = `${v.sizePx}px`;
        samp.style.fontWeight = String(v.weight);
        samp.style.lineHeight = String(lhOf(v.lhKey));
        samp.style.letterSpacing = `${lsOf(v.lsKey)}em`;
        if (c.link) samp.style.textDecoration = 'underline';
        if (c.italic) samp.style.fontStyle = 'italic';
        if (c.textCase === 'uppercase') samp.style.textTransform = 'uppercase';
        col.append(samp);
        cols.append(col);
      }
      row.append(cols);
      block.append(row);
    }
    sec.append(block);
  }
  return sec;
};

/** The radius preview: the whole corner-radius ramp, HOLISTICALLY — a swatch per step (the actual corner)
 *  labelled with its px and the component(s) that consume it (button→md, input→sm, card→lg, badge→round).
 *  Fills a caller-owned node so `apply()` repaints it beside the radius controls (#265). Reads `rp.dims`
 *  (live per lever); `none` = 0. */
const RADIUS_STEPS = ['none', 'sm', 'md', 'lg', 'round'];
const paintRadiusPreview = (into: HTMLElement): void => {
  into.innerHTML = '';
  const consumers: Record<string, Set<string>> = {};
  for (const c of previewSpec.components) for (const v of c.variants) {
    const rref = v.bindings.radius;
    if (rref?.startsWith('radius.')) (consumers[rref.slice(7)] ??= new Set<string>()).add(c.id);
  }
  // D — reflect the current mode's per-mode radius ramp (modeLevers.radius) when it deviates, so the
  // change is visible here rather than off in the export (the #158 lesson). Falls back to the global.
  const byMode = theme.dims.radiusByMode?.[currentMode];
  const list = el('div', 'rad-list');
  for (const step of RADIUS_STEPS) {
    const overridePx = byMode?.find((s) => s.name === step)?.px;
    const px = step === 'none' ? 0 : (overridePx ?? rp.dims[`radius.${step}`] ?? 0);
    const cell = el('div', 'rad-cell');
    const sw = el('div', 'rad-sw');
    sw.style.borderRadius = `${Math.min(px, 26)}px`;   // cap so `round` reads as a pill without overflowing the swatch
    const cons = [...(consumers[step] ?? [])];
    cell.append(sw, el('div', 'rad-lab mono', `${step} · ${px}px`), tokenPill(`radius.${step}`), el('div', 'rad-cons', cons.length ? cons.join(', ') : '—'));
    list.append(cell);
  }
  into.append(list);
};

/** The elevation ramp specimen: one card per shadow step (xs→2xl) on a light surface, so
 *  the shadow ramp — and the shadow-softness lever that reshapes every step — is visible
 *  (the single card in the component preview only shows one step). Reads `rp.shadows`. */
const SHADOW_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const renderShadowSpecimen = (): HTMLElement => {
  const wrap = palSection('Elevation ramp', 'The shadow ramp xs→2xl — the softness + tint levers reshape every step, resolved for the mode in view (see the preview below for the mode-reduced dark shadow).');
  const m: Mode = currentMode;   // #171 — every specimen reflects the mode-context selection
  const list = el('div', 'sh-list');
  for (const step of SHADOW_STEPS) {
    const css = rp.shadows[`shadow.${step}`]?.[m];
    if (!css) continue;
    const cell = el('div', 'sh-cell');
    const card = el('div', 'sh-card');
    card.style.boxShadow = css;                                   // resolved value inline (specimen reads the model directly)
    cell.append(card, el('div', 'sh-lab mono', step), tokenPill(`shadow.${step}`));
    list.append(cell);
  }
  wrap.append(list);
  return wrap;
};

/** The control-size preview: the component-size tier (sm→xl) as mini control boxes at their resolved
 *  height + horizontal padding, so the DENSITY lever has a visible payoff (the preview components bind
 *  the space scale directly, not `size.*`, so nothing else shows the size tier). Mode-aware (D): reflects
 *  the current mode's per-mode density (`theme.dims.sizesByMode`) when it deviates, else the global tier.
 *  Fills a caller-owned node so it repaints beside the density control (#265). */
const paintSizePreview = (into: HTMLElement): void => {
  into.innerHTML = '';
  const byMode = theme.dims.sizesByMode?.[currentMode];
  const sizes = byMode ?? theme.dims.sizes;
  const list = el('div', 'sz-list');
  for (const z of sizes) {
    const cell = el('div', 'sz-cell');
    const box = el('div', 'sz-box', z.name);
    box.style.height = `${z.height}px`;
    box.style.padding = `0 ${z.padX}px`;
    cell.append(box, el('div', 'sz-lab mono', `${z.name} · ${z.height}px · pad ${z.padX}/${z.padY}`), tokenPill(`size.${z.name}.height`));
    list.append(cell);
  }
  into.append(list);
};

/** The spacing preview (#265): the resolved space.* ramp as proportional bars — the spacing rhythm has no
 *  other visible payoff (preview components bind space refs but don't show the ladder). Read-only from
 *  `rp.dims` (no engine change). Derives its steps from the ACTUAL resolved keys (sorted by scale), not a
 *  hardcoded list — the resolved model only carries the steps the preview binds, so a fixed list would
 *  show phantom 0px rows. `space.100` (= 1×) is the rhythm anchor. */
const paintSpacingPreview = (into: HTMLElement): void => {
  into.innerHTML = '';
  const steps = Object.keys(rp.dims)
    .filter((k) => k.startsWith('space.'))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
  const maxPx = Math.max(...steps.map((k) => rp.dims[k] ?? 0), 1);
  const list = el('div', 'sp-list');
  for (const k of steps) {
    const px = rp.dims[k] ?? 0;
    const cell = el('div', 'sp-cell');
    const bar = el('div', 'sp-bar'); bar.style.width = `${Math.max(2, (px / maxPx) * 100)}%`;
    cell.append(el('div', 'sp-lab mono', `${k} · ${px}px`), bar);
    list.append(cell);
  }
  into.append(list);
};

/** The layout specimen: the responsive-grid axis — breakpoints (min-widths) with their column/gutter/
 *  margin grid, a base-column preview strip, and the container caps as proportional bars. The layout
 *  levers (breakpoints / columns / containers, all in the Advanced panel) have no other visible payoff.
 *  Reads `theme.layout` (not per-mode — layout composes with colour modes as a separate Figma axis). */
// Layout previews, split so each can sit beside its own control (docs #264): the breakpoints ruler+table,
// the base-column strip, and the container-cap bars. Each fills a caller-owned node so `apply()` repaints
// it in place (the control next to it stays put — never rebuilt mid-drag).
const paintBreakpointsPreview = (into: HTMLElement): void => {
  const ly = theme.layout;
  into.innerHTML = '';
  // A proportional min-width ruler — the breakpoints on a shared axis, so the steps read spatially.
  const ruler = el('div', 'ly-ruler');
  const rulerMax = Math.max(...ly.breakpoints.map((b) => b.px), 1) * 1.06;
  for (const b of ly.breakpoints) {
    const tick = el('div', 'ly-tick'); tick.style.left = `${(b.px / rulerMax) * 100}%`;
    tick.append(el('span', 'ly-tick-name', b.name), el('span', 'ly-tick-px mono', `${b.px}px`));
    ruler.append(tick);
  }
  into.append(ruler);
  const table = el('table', 'ly-table');
  const head = el('tr');
  head.append(el('th', undefined, 'Breakpoint'), el('th', undefined, 'Token'), el('th', undefined, 'Min-width'), el('th', undefined, 'Columns'), el('th', undefined, 'Gutter'), el('th', undefined, 'Margin'));
  table.append(head);
  for (const g of ly.grid) {
    const bp = ly.breakpoints.find((b) => b.name === g.bp);
    const tr = el('tr');
    const pillCell = el('td'); pillCell.append(tokenPill(`breakpoint.${g.bp}`));
    tr.append(el('td', 'mono', g.bp), pillCell, el('td', 'mono', `${bp?.px ?? 0}px`), el('td', 'mono', String(g.columns)), el('td', 'mono', `${g.gutterPx}px`), el('td', 'mono', `${g.marginPx}px`));
    table.append(tr);
  }
  into.append(table);
};
const paintColumnsPreview = (into: HTMLElement): void => {
  const ly = theme.layout;
  into.innerHTML = '';
  into.append(el('div', 'ly-cap', `${ly.baseColumns}-column base grid`));
  const cols = el('div', 'ly-cols');
  for (let i = 0; i < ly.baseColumns; i++) cols.append(el('div', 'ly-col'));
  into.append(cols);
};
const paintContainersPreview = (into: HTMLElement): void => {
  const ly = theme.layout;
  into.innerHTML = '';
  const cont = el('div', 'ly-cont');
  const maxW = Math.max(ly.containerMax, ly.containerNarrow, 1);
  const bar = (path: string, px: number): HTMLElement => {
    const row = el('div', 'ly-cont-row');
    const b = el('div', 'ly-cont-bar');
    b.style.width = `${Math.max(6, (px / maxW) * 100)}%`;
    const lab = el('div', 'ly-cont-lab'); lab.append(tokenPill(path), el('span', 'mono', `${px}px`));
    row.append(lab, b);
    return row;
  };
  cont.append(bar('container.max', ly.containerMax), bar('container.narrow', ly.containerNarrow));
  into.append(cont);
};

/** The motion specimen (#114, redesigned #292 "trace the curve"): one large stage per semantic
 *  transition (default/enter/exit/emphasized) — the ghost line is the easing curve's shape, the dot
 *  traces it over the resolved duration. Motion can't show in the static component preview, so the
 *  tempo lever had no payoff; here it does — the traces re-run on every re-render (i.e. the moment
 *  you change the tempo), plus a Replay. A Playback control uniformly divides all four durations for
 *  legibility only: it never changes the `${ms}ms` label (always the real resolved token value) or the
 *  curve shape, and it preserves the ratio between transitions (exit stays 2× faster than default,
 *  etc.) at any speed. `prefers-reduced-motion` is honoured (dot shown at its resting position, no
 *  animation), nodding to the engine's derived reduced ramp. Kind-B specimen: reads `theme.motion`. */
/** The easing curve for one stage, plotted 0→1 in a 100-unit viewBox (SVG). Y is flipped (SVG y grows
 *  down). Percent-based, not px, so the stage scales for free. */
const motionStageSvg = (bez: number[]): SVGElement => {
  const W = 100, H = 100, P = 11.364;
  const x = (t: number): number => P + t * (W - 2 * P);
  const y = (v: number): number => H - P - v * (H - 2 * P);
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'mo-stage-svg');
  const axis = document.createElementNS(SVGNS, 'path');
  axis.setAttribute('d', `M${x(0)},${y(1)} L${x(0)},${y(0)} L${x(1)},${y(0)}`);
  axis.setAttribute('class', 'mo-stage-axis'); axis.setAttribute('fill', 'none');
  const [x1, y1, x2, y2] = bez.length === 4 ? bez : [0.4, 0, 0.2, 1];
  const line = document.createElementNS(SVGNS, 'path');
  line.setAttribute('d', `M${x(0)},${y(0)} C${x(x1)},${y(y1)} ${x(x2)},${y(y2)} ${x(1)},${y(1)}`);
  line.setAttribute('class', 'mo-stage-line'); line.setAttribute('fill', 'none');
  svg.append(axis, line);
  return svg;
};
const MOTION_SLOWMO_OPTIONS = [1, 2, 4, 8];
let motionSlowmo = 4;   // uniform playback divisor for the trace (#292) — never touches the ms label, the curve, or the ratio between transitions
const renderMotionSpecimen = (): HTMLElement => {
  const mo = theme.motion;
  // D — reflect the current mode's per-mode tempo (modeLevers.tempo) when it deviates, so the ramp
  // re-runs at the mode's speed here rather than only in the export (the #158 lesson). Duration is the
  // mode-varying part; easing/transitions are tempo-invariant. Falls back to the global ramp.
  const moByMode = mo.motionByMode?.[currentMode];
  const durOf = (role: string): number => (moByMode?.duration ?? mo.duration)[role] ?? 0;
  const tempoLabel = moByMode?.tempo ?? mo.tempo;
  const wrap = palSection('Motion', `The semantic transitions at tempo '${tempoLabel}' — each stage traces the resolved duration + easing curve. Playback below is a legibility aid only (the ms label is always the real token value); reduce-motion is honoured (the engine also derives a reduced ramp).`);

  const toolbar = el('div', 'mo-toolbar');
  const slowmoLabel = el('label', 'mo-slowmo');
  slowmoLabel.append(document.createTextNode('Playback '));
  const select = el('select', 'mo-slowmo-sel') as HTMLSelectElement;
  for (const v of MOTION_SLOWMO_OPTIONS) {
    const opt = el('option', undefined, v === 1 ? 'real speed' : `1/${v}×`) as HTMLOptionElement;
    opt.value = String(v);
    if (v === motionSlowmo) opt.selected = true;
    select.append(opt);
  }
  select.onchange = () => { motionSlowmo = Number(select.value) || 1; paintVolatile(); };
  slowmoLabel.append(select);
  toolbar.append(slowmoLabel);
  wrap.append(toolbar);

  const grid = el('div', 'mo-grid');
  const dots: { el: HTMLElement; anim: string }[] = [];
  for (const t of mo.transitions) {
    const ms = durOf(t.duration);
    const playMs = ms * motionSlowmo;
    const curveBez = mo.easing[t.easing] ?? mo.easing.standard;
    const bez = `cubic-bezier(${curveBez.join(', ')})`;
    const anim = `mo-trace-x ${playMs}ms linear both, mo-trace-y ${playMs}ms ${bez} both`;

    const col = el('div', 'mo-col');
    const stage = el('div', 'mo-stage');
    stage.append(motionStageSvg(curveBez));
    const dot = el('div', 'mo-dot');
    dot.style.animation = anim;
    stage.append(dot);
    dots.push({ el: dot, anim });
    col.append(stage);

    const meta = el('div', 'mo-colmeta');
    meta.append(el('div', 'mo-colname', t.name));
    const metaRow = el('div', 'spec-metarow');
    metaRow.append(el('span', 'mo-meta mono', `${ms}ms · ${t.easing}`), tokenPill(`motion.duration.${t.duration}`), tokenPill(`motion.easing.${t.easing}`));
    meta.append(metaRow);
    if (motionSlowmo > 1) meta.append(el('div', 'mo-playnote mono', `playing at ${playMs}ms (1/${motionSlowmo}×)`));
    meta.append(el('div', 'mo-coldesc', t.desc));
    col.append(meta);
    grid.append(col);
  }
  wrap.append(grid);

  const replay = el('button', 'mo-replay', 'Replay') as HTMLButtonElement;
  // Re-trigger by clearing the animation, forcing a reflow between so the browser restarts the keyframes.
  replay.onclick = () => { for (const d of dots) { d.el.style.animation = 'none'; void d.el.offsetWidth; d.el.style.animation = d.anim; } };
  wrap.append(replay);
  return wrap;
};

// The inverse-surface + icon specimens were retired here (#69): the on-inverse family is now a first-class
// row in every interactive matrix section (Fill · inverse / Text · inverse / On-fill · inverse), and the
// icon-contrast payoff is the "Icon colors" global section's match-vs-distinct example — no separate
// preview needed.

/** The neutral-emphasis option labels — subtle (a light-grey surface) vs strong (a bold near-black/white
 *  fill). Drives the Neutral section's "Button emphasis" lead in the interactive matrix. */
const NEUTRAL_EMPHASES: Array<['subtle' | 'strong', string]> = [['subtle', 'subtle · light gray'], ['strong', 'strong · bold fill']];

// ---- Gradient editor (docs/23 §2 "Gradients") -----------------------------
// The gradient axis was on/off only; this edits the DEFINITION — kind (linear/radial), angle or
// centre+shape, interpolation, and the ramp-aliased stops — writing an explicit `GradientInput[]`
// to `brandState.gradients` (the engine's opt-in axis, `boolean | GradientInput[]`). `true` (the
// toggle default) materialises to the engine's default single brand gradient for display; the first
// edit writes it out explicitly. Stops alias the ramp (palette + step), never raw hex.
const DEFAULT_GRADIENT = (): GradientInput => ({
  name: 'brand', kind: 'linear', angle: 135, interpolation: 'oklch',
  stops: [{ palette: 'primary', step: 600, position: 0 }, { palette: 'primary', step: 350, position: 1 }],
});
/** The editable gradient array — materialising the `true` default and treating `false`/absent as empty. */
const readGradients = (): GradientInput[] => {
  const g = brandState.gradients;
  if (Array.isArray(g)) return g;
  if (g === true) return [DEFAULT_GRADIENT()];
  return [];
};
/** Write the array back; an empty array collapses to `false` (off) so the toggle + specimen agree. */
const writeGradients = (arr: GradientInput[]): void => { brandState.gradients = arr.length ? arr : false; applyFull(); };
/** Resolve a stop's `{palette, step}` alias to its ramp hex (for the live preview). */
const gradStopHex = (palette: string, step: number): string =>
  theme.palettes.find((p) => p.palette === palette)?.steps.find((s) => s.num === step)?.hex ?? '#888888';
/** Build the CSS gradient from an INPUT gradient (stops resolved through the ramp) — reads palette/step
 *  aliases rather than pre-resolved hexes; interpolates `in oklch` (the engine's intent, Chromium-native). */
const inputGradientCss = (g: GradientInput): string => {
  const stops = g.stops.slice().sort((a, b) => a.position - b.position)
    .map((s) => `${gradStopHex(s.palette, s.step)} ${Math.round(s.position * 100)}%`).join(', ');
  return (g.kind ?? 'linear') === 'radial'
    ? `radial-gradient(${g.shape ?? 'ellipse'} at ${Math.round((g.center?.[0] ?? 0.5) * 100)}% ${Math.round((g.center?.[1] ?? 0.5) * 100)}% in oklch, ${stops})`
    : `linear-gradient(${g.angle ?? 135}deg in oklch, ${stops})`;
};

/** The Gradients section — a bespoke on/off toggle (own `applyFull` so the editor mounts/unmounts) plus,
 *  when on, one editor card per gradient. */
const renderGradientsSection = (host: HTMLElement): void => {
  const on = !!brandState.gradients;
  // On/off toggle — the shared toggleField, but its callback rebuilds the workspace (applyFull) so the
  // editor mounts/unmounts (it lives in the sections layer, not the volatile specimens).
  const desc = leverByKey('gradients')?.description ?? 'Ship one or more decorative brand gradients (opt-in). Stop colors alias the ramp and interpolate in OKLCH.';
  host.append(knob('Gradients', toggleField(on, (checked) => { brandState.gradients = checked; applyFull(); }), desc));
  if (!on) return;

  const grads = readGradients();
  const palNames = theme.palettes.map((p) => p.palette);
  const grid = el('div', 'gr-ed-list');
  grads.forEach((g, gi) => grid.append(renderGradientCard(g, gi, grads, palNames)));
  host.append(grid);
  // Add gradient — a fresh linear gradient with a unique slug name (name is a token path segment).
  const add = addButton('+ Add gradient', () => {
    const arr = readGradients();
    const used = new Set(arr.map((x) => x.name));
    let n = arr.length + 1, name = `gradient-${n}`;
    while (used.has(name)) name = `gradient-${++n}`;
    arr.push({ ...DEFAULT_GRADIENT(), name });
    writeGradients(arr);
  }, 'gr-ed-add');
  host.append(add);
};

/** One gradient's editor card — preview · kind/geometry/interpolation · ramp-aliased stops. */
const renderGradientCard = (g: GradientInput, gi: number, all: GradientInput[], palNames: string[]): HTMLElement => {
  const kind = g.kind ?? 'linear';
  const card = el('div', 'gr-ed-card');
  // Header — the gradient's editable name (a token-path segment, so it's slugified on commit and kept
  // unique against the other gradients) + its live token pill + remove.
  const head = el('div', 'gr-ed-head');
  const nameInput = el('input', 'gr-ed-nameinput') as HTMLInputElement;
  nameInput.value = g.name; nameInput.setAttribute('aria-label', 'Gradient name');
  nameInput.onchange = () => {
    let v = nameInput.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!v) { nameInput.value = g.name; return; }              // empty → revert, name is a required path segment
    const used = new Set(all.filter((_, i) => i !== gi).map((x) => x.name));
    while (used.has(v)) v = `${v}-2`;
    const arr = readGradients(); arr[gi] = { ...arr[gi], name: v }; writeGradients(arr);   // applyFull re-renders with the new pill
  };
  head.append(nameInput, tokenPill(`gradient.${g.name}`));
  head.append(removeButton(() => { const arr = readGradients(); arr.splice(gi, 1); writeGradients(arr); }, 'Remove gradient'));
  card.append(head);
  // Live preview.
  const sw = el('div', 'gr-ed-sw'); sw.style.background = inputGradientCss(g);
  card.append(sw);

  // Geometry controls — kind, then angle (linear) or shape + centre (radial), then interpolation.
  const ctrls = el('div', 'gr-ed-ctrls');
  const mut = (fn: (gg: GradientInput) => void): void => { const arr = readGradients(); fn(arr[gi]); writeGradients(arr); };
  const labeledSelect = (label: string, opts: [string, string][], cur: string, onPick: (v: string) => void): HTMLElement => {
    const wrap = el('div', 'gr-ed-field');
    wrap.append(el('label', 'gr-ed-lab', label));
    const sel = selectEl('cap');
    for (const [v, t] of opts) sel.append(optionEl(v, t, v === cur));
    sel.onchange = () => onPick(sel.value);
    wrap.append(sel);
    return wrap;
  };
  ctrls.append(labeledSelect('Kind', [['linear', 'Linear'], ['radial', 'Radial']], kind, (v) => mut((gg) => { gg.kind = v as 'linear' | 'radial'; })));
  if (kind === 'linear') {
    const f = el('div', 'gr-ed-field');
    f.append(el('label', 'gr-ed-lab', `Angle · ${g.angle ?? 135}°`));
    const range = rangeInput({ className: 'gr-ed-range', min: 0, max: 360, step: 5, value: g.angle ?? 135 });
    range.oninput = () => { (f.firstChild as HTMLElement).textContent = `Angle · ${range.value}°`; sw.style.background = inputGradientCss({ ...g, angle: Number(range.value) }); };
    range.onchange = () => mut((gg) => { gg.angle = Number(range.value); });
    f.append(range);
    ctrls.append(f);
  } else {
    ctrls.append(labeledSelect('Shape', [['ellipse', 'Ellipse'], ['circle', 'Circle']], g.shape ?? 'ellipse', (v) => mut((gg) => { gg.shape = v as 'circle' | 'ellipse'; })));
    const center = g.center ?? [0.5, 0.5];
    const centerField = (label: string, idx: 0 | 1): HTMLElement => {
      const f = el('div', 'gr-ed-field');
      f.append(el('label', 'gr-ed-lab', label));
      const num = numberField({ className: 'gr-ed-num', min: 0, max: 100, step: 5, value: Math.round(center[idx] * 100) });
      num.onchange = () => mut((gg) => { const c: [number, number] = [...(gg.center ?? [0.5, 0.5])] as [number, number]; c[idx] = clampUnit(Number(num.value) / 100); gg.center = c; });
      f.append(num);
      return f;
    };
    ctrls.append(centerField('Center X %', 0), centerField('Center Y %', 1));
  }
  ctrls.append(labeledSelect('Interpolation', [['oklch', 'OKLCH'], ['srgb', 'sRGB']], g.interpolation ?? 'oklch', (v) => mut((gg) => { gg.interpolation = v as 'oklch' | 'srgb'; })));
  card.append(ctrls);

  // Stops — each aliases the ramp (palette + step) with a position; add/remove.
  card.append(el('h5', 'gr-ed-stopsh', 'Stops'));
  const stopsWrap = el('div', 'gr-ed-stops');
  g.stops.forEach((st, si) => stopsWrap.append(renderGradientStop(g, gi, st, si, palNames, mut)));
  card.append(stopsWrap);
  const addStop = addButton('+ Add stop', () => mut((gg) => {
    const last = gg.stops[gg.stops.length - 1];
    gg.stops = [...gg.stops, { palette: last?.palette ?? palNames[0], step: last?.step ?? 500, position: 1 }];
  }), 'gr-ed-addstop');
  card.append(addStop);
  return card;
};

/** A single gradient stop row — swatch · palette · step · position % · remove (kept ≥2 stops). */
const renderGradientStop = (g: GradientInput, gi: number, st: { palette: string; step: number; position: number }, si: number, palNames: string[], mut: (fn: (gg: GradientInput) => void) => void): HTMLElement => {
  const row = el('div', 'gr-ed-stop');
  row.append(swatch(gradStopHex(st.palette, st.step), 'gr-ed-stopsw'));
  const palSel = selectEl('fill');
  for (const p of palNames) palSel.append(optionEl(p, p, p === st.palette));
  // Changing palette re-homes the step to the nearest valid step in the new palette.
  palSel.onchange = () => mut((gg) => {
    const steps = theme.palettes.find((p) => p.palette === palSel.value)?.steps ?? [];
    const keep = steps.find((s) => s.num === gg.stops[si].step)?.num ?? steps.find((s) => s.num === 500)?.num ?? steps[Math.floor(steps.length / 2)]?.num ?? gg.stops[si].step;
    gg.stops[si] = { ...gg.stops[si], palette: palSel.value, step: keep };
  });
  const stepSel = selectEl('fill');
  const steps = theme.palettes.find((p) => p.palette === st.palette)?.steps ?? [];
  for (const s of steps) stepSel.append(optionEl(String(s.num), s.key, s.num === st.step));
  stepSel.onchange = () => mut((gg) => { gg.stops[si] = { ...gg.stops[si], step: Number(stepSel.value) }; });
  const pos = numberField({ className: 'gr-ed-num', min: 0, max: 100, step: 5, value: Math.round(st.position * 100), title: 'Position %' });
  pos.onchange = () => mut((gg) => { gg.stops[si] = { ...gg.stops[si], position: clampUnit(Number(pos.value) / 100) }; });
  row.append(palSel, stepSel, pos);
  if (g.stops.length > 2) {
    row.append(removeButton(() => mut((gg) => { gg.stops = gg.stops.filter((_, i) => i !== si); }), 'Remove stop', 'gr-ed-stoprm'));
  }
  return row;
};
const clampUnit = (n: number): number => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/** Inline-SVG icon glyphs (stroke, `currentColor` via the `stroke` attr) — dependency-free line icons,
 *  authored here so the specimen stays buildless. 24×24 viewBox, rounded caps/joins. */
const SVGNS = 'http://www.w3.org/2000/svg';
const ICON_PATH: Record<string, string> = {
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  arrow: '<path d="M5 12h13M12 6l6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="20.5" y1="20.5" x2="16" y2="16"/>',
  dot: '<circle cx="12" cy="12" r="8"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.9 6.6 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5-5.5"/>',
  triangle: '<path d="M12 4l9 16H3z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/>',
  x: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8.01"/>',
};
const iconEl = (name: string, stroke: string): SVGElement => {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '22'); svg.setAttribute('height', '22');
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', stroke); svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = ICON_PATH[name] ?? ICON_PATH.dot;
  return svg;
};

// ---- shared bits -----------------------------------------------------------
const hero = (title: string, lede: string): HTMLElement => {
  const h = el('div', 'hero');
  if (title) h.append(el('h1', undefined, title));
  if (lede) h.append(el('p', 'lede', lede));
  return h;
};
// ---- shell -----------------------------------------------------------------
const app = document.getElementById('app')!;
let workspace: HTMLElement;
let modeStripHost: HTMLElement;   // tier 2 of the global header — the persistent mode selector (docs/23 §7)

/** #268 — the switcher appears only where a mode-varying control actually exists.
 *
 *  The governing rule is the one #268 proposed and #176's decision 2 implies: modes live in the
 *  SEMANTIC layer, so a purely primitive surface has nothing to switch. This is deliberately a
 *  predicate rather than a per-page flag — placement is DERIVED from what a page contains, so a new
 *  page inherits the right answer instead of needing a decision.
 *
 *  The two surfaces that fail it today, from the audit #268 was waiting on:
 *   • `layout` — nothing layout-related exists in `ModeLevers` or carries a `*ByMode` field. It is
 *     mode-invariant outright, not merely primitive.
 *   • `typography → Foundations` — the size ladder, faces, weight numerics and leading/tracking rungs
 *     are all primitives. The Foundations/Styles split (#272) already draws exactly this line, which
 *     is why the rule needs no new taxonomy.
 *
 *  Typography → STYLES keeps it, and that is not an inconsistency: the weight-role, category and
 *  responsive editors all resolve against `currentMode` and WRITE per-mode overrides. Showing every
 *  mode at once (the side-by-side ramp) makes the switcher redundant for READING, never for editing —
 *  an editor still needs one mode to write into. */
const pageHasModeVaryingControl = (): boolean => {
  if (page === 'layout') return false;
  // Preview is read-only and shows every mode side by side, so there is nothing for a switcher to
  //  do — the same reasoning that hides it on Foundations, reached from the other direction.
  if (page === 'typography' && typeTab !== 'styles') return false;
  return true;
};

/** Repaint the persistent mode-selector strip in the global header. Called on mode change, on menu
 *  toggles, and by apply/applyFull (the per-mode contrast marks track the theme). No-op before the
 *  first build (the start screen has no header). */
function renderModeStrip(): void {
  if (!modeStripHost) return;
  modeStripHost.innerHTML = '';
  // Hidden, never disabled: a greyed-out switcher still claims the page has modes and just won't let
  // you use them. `currentMode` is untouched, so leaving and returning restores the mode you were in.
  if (!firstRun && pageHasModeVaryingControl()) modeStripHost.append(renderModeContext());
  // Keep the sticky rail's offset tied to the ACTUAL header height — the mode chips can wrap to a
  // second row when a brand has many modes, and a fixed offset would tuck the rail under the header.
  const chrome = modeStripHost.parentElement;
  if (chrome) document.documentElement.style.setProperty('--chrome-h', `${chrome.offsetHeight}px`);
}

const PAGE_RENDERERS: Record<PageKey, (host: HTMLElement) => void> = {
  palettes: renderPrimitives,
  surfaces: renderSurfacesPage,
  interactive: renderInteractivePage,
  typography: renderTypographyPage,
  elevation: renderElevationPage,
  sizeRadius: renderSizeRadiusPage,
  layout: renderLayoutPage,
  motion: renderMotionPage,
  preview: renderPreviewPage,
};
function renderWorkspace(): void {
  workspace.innerHTML = '';
  PAGE_RENDERERS[page](workspace);
}

// ---- brand setup — selector menu: name + namespace, switch / new / import --------
let barHost: HTMLElement;
let brandMenuOpen = false;
let exportMenuOpen = false;
let navMenuOpen = false;
let importOpen = false;
let importErr: string | null = null;
let importText = '';            // M-17: survives re-renders so a failed paste isn't wiped
let importPending: BrandInput | null = null;   // #160: validated import awaiting confirm-overwrite
let outsideBound = false;

/** Replace the working brand wholesale (switch / new / import) and re-render. */
const loadBrand = (input: BrandInput): void => {
  brandState = structuredClone(input);
  brandMenuOpen = false; importOpen = false; importErr = null; importText = ''; importPending = null;
  page = 'palettes';
  rebuild();
  currentMode = rp.modes[0];
  build();
};

/** Set the generated modes from the toggles. Light is always present; HC adds hc-light, plus
 *  hc-dark only when dark is also on; wireframe (greyscale, generate-only) appends last — the
 *  engine's canonical mode order (docs/11 Pillar 1). */
const setModes = (dark: boolean, hc: boolean, wire: boolean): void => {
  const m: Mode[] = ['light'];
  if (dark) m.push('dark');
  if (hc) { m.push('hc-light'); if (dark) m.push('hc-dark'); }
  if (wire) m.push('wireframe');
  brandState.modes = m;
  rebuild();
  if (!rp.modes.includes(currentMode)) currentMode = rp.modes[0];   // dropped the selected mode
  build();                                                          // bar toggles + preview mode selector both change
};

/** Trigger a client-side file download (Blob → object URL → anchor click). */
const download = (filename: string, text: string, mime: string): void => {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

// L-11: a design.md pasted with a bare numeric `id:` (e.g. `id: 2026`) parses `id` as a
// number; `.trim()` on a number throws and crashes BOTH exports. Coerce to string first.
const slug = (): string => String(lastGoodInput.id || 'brand').trim().replace(/\s+/g, '-') || 'brand';

// Both exports run off the LAST-GOOD state, never the live one (M-15). Previously tokens.json
// re-ran `brandTheme(brandState)` uncaught — a failing edit threw in the click handler (no
// download, no feedback) — and design.md serialized the failing state into a brief its own
// importer rejects. The last-good input/theme is always valid and is exactly what the ramps +
// preview already show (the errbar tells the user the current edit is what's unresolved).
/** Export the last-good brand as design.md — round-trips straight back into Import. */
const exportDesignMd = (): void => download(`${slug()}.design.md`, toDesignMd(lastGoodInput), 'text/markdown');

/** Export the resolved DTCG token tree (buildTree) of the last-good theme, namespaced under `root`. */
const exportTokens = (): void => {
  const tree = buildTree(theme).tree;   // `theme` is the last-good — always valid, never throws
  download(`${slug()}.tokens.json`, JSON.stringify(tree, null, 2), 'application/json');
};

// design.md import (#160) — one validation path shared by the start-screen upload card and the
// post-setup import, so both reject the same off-spec input with the same friendly errors.
const MD_FILE_RE = /\.(md|markdown|txt)$/i;
const IMPORT_ACCEPT = '.md,.markdown,.txt,text/markdown,text/plain';

/** Engine acceptance IS the validation: parse the design.md, then confirm the engine builds it.
 *  Returns the BrandInput or a friendly error — the working brand is never touched here. (The full
 *  schema validator is node-bound, so it can't run here; brandTheme's guards cover the rest.) */
const validateDesignMd = (text: string): { input: BrandInput } | { error: string } => {
  if (!text.trim()) return { error: 'Nothing to import — the file is empty.' };
  let input: BrandInput;
  try { input = parseDesignMd(text).input; }
  catch (e) { return { error: `That doesn't read as a design.md: ${(e as Error).message}` }; }
  try { brandTheme(input); }
  catch (e) { return { error: `Parsed, but the engine rejected it: ${(e as Error).message}` }; }
  return { input };
};

/** Read an uploaded File as design.md text, rejecting non-markdown/text file types up front (#160). */
const readDesignMdFile = (file: File): Promise<{ text: string } | { error: string }> => {
  const okType = MD_FILE_RE.test(file.name) || /^text\//.test(file.type || '');
  if (!okType) return Promise.resolve({ error: `That's not a design.md — upload a .md file (got "${file.name}").` });
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve({ text: String(r.result ?? '') });
    r.onerror = () => resolve({ error: `Couldn't read "${file.name}".` });
    r.readAsText(file);
  });
};

/** Post-setup import: validate, then STAGE for confirm-overwrite — loadBrand replaces the working
 *  brand, so we never overwrite current edits without an explicit Replace (#160). */
const stageImport = (text: string): void => {
  importText = text;              // M-17: keep the paste so an error re-render doesn't wipe it
  const res = validateDesignMd(text);
  if ('error' in res) { importErr = res.error; importPending = null; renderBar(); return; }
  importErr = null; importPending = res.input; renderBar();
};

const renderBrandMenu = (): HTMLElement => {
  const menu = el('div', 'brandmenu');

  menu.append(el('div', 'bm-cap', 'Current brand'));
  const field = (label: string, value: string, mono: boolean, oninput: (v: string, input: HTMLInputElement) => void): HTMLElement => {
    const f = el('label', 'bm-field');
    f.append(el('span', 'bm-lab', label));
    const inp = el('input', 'bm-in' + (mono ? ' mono' : '')) as HTMLInputElement;
    inp.value = value; inp.spellcheck = false;
    inp.oninput = () => oninput(inp.value, inp);
    f.append(inp);
    return f;
  };
  menu.append(field('Name', brandState.id, false, (v) => {
    brandState.id = v.trim() || 'untitled';
    (barHost.querySelector('.bs-name') as HTMLElement).textContent = brandState.id;
  }));
  const nsHint = el('p', 'bm-hint');
  const setHint = () => { nsHint.textContent = `Tokens emit under ${brandState.root ?? 'prism'}.*`; };
  menu.append(field('Namespace', brandState.root ?? 'prism', true, (v, inp) => {
    const t = v.trim();
    if (ROOT_RE.test(t)) { brandState.root = t; inp.classList.remove('bad'); setHint(); }
    else inp.classList.add('bad');
  }));
  setHint();
  menu.append(nsHint);

  // Modes moved OUT of this dropdown (#171) — the mode set now lives in the workspace
  // mode-context strip's "Edit modes" popover, next to the mode you're viewing.

  menu.append(el('div', 'bm-div'));
  menu.append(el('div', 'bm-cap', 'Examples'));
  for (const name of Object.keys(BRANDS)) {
    const b = el('button', 'bm-item' + (name === brandState.id ? ' cur' : '')) as HTMLButtonElement;
    const d = el('span', 'bm-dot'); d.style.background = hex(oklchToRgb(BRANDS[name].primary));
    b.append(d, el('span', undefined, name));
    b.onclick = () => loadBrand(BRANDS[name]);
    menu.append(b);
  }

  menu.append(el('div', 'bm-div'));
  const nb = el('button', 'bm-item', '+ New brand') as HTMLButtonElement;
  // Web: return to the start moment (the same three paths) rather than silently loading the default.
  // Plugin: keep the direct neutral-default load — this handler is SHARED UI (not host-DCE'd), and the
  // plugin start moment is a deferred cross-lane follow-up, so it must not surface the web start screen.
  nb.onclick = () => {
    brandMenuOpen = false;
    if (PRISM3_HOST !== 'figma') { firstRun = true; build(); } else loadBrand(NEW_BRAND());
  };
  menu.append(nb);
  const imp = el('button', 'bm-item', '↑ Import design.md…') as HTMLButtonElement;
  imp.onclick = () => { importOpen = !importOpen; importErr = null; importPending = null; renderBar(); };
  menu.append(imp);

  if (importOpen) {
    const box = el('div', 'bm-import');
    if (importPending) {
      // Validated already — confirm before overwriting the working brand (#160).
      box.append(el('p', 'bm-confirm', `Replace the current brand with “${importPending.id}”? This overwrites your current edits.`));
      const row = el('div', 'bm-confirm-row');
      const rep = el('button', 'bm-load', 'Replace brand') as HTMLButtonElement;
      rep.onclick = () => { const inp = importPending!; importPending = null; loadBrand(inp); };
      const can = el('button', 'bm-cancel', 'Cancel') as HTMLButtonElement;
      can.onclick = () => { importPending = null; renderBar(); };
      row.append(rep, can);
      box.append(row);
    } else {
      const ta = el('textarea', 'bm-ta') as HTMLTextAreaElement;
      ta.placeholder = 'Paste a design.md — --- YAML frontmatter --- then prose…';
      ta.spellcheck = false;
      ta.value = importText;                                   // M-17: restore across re-renders
      ta.oninput = () => { importText = ta.value; };           // a mode-toggle mid-paste won't lose it
      box.append(ta);
      if (importErr) box.append(el('p', 'bm-err', importErr));
      const row = el('div', 'bm-import-row');
      const up = el('label', 'bm-upload');
      const fi = el('input', 'bm-file') as HTMLInputElement;
      fi.type = 'file'; fi.accept = IMPORT_ACCEPT;
      fi.onchange = async () => {
        const f = fi.files?.[0]; if (!f) return;
        const read = await readDesignMdFile(f);
        if ('error' in read) { importErr = read.error; importPending = null; renderBar(); return; }
        stageImport(read.text);
      };
      up.append(el('span', undefined, '↑ Upload .md'), fi);
      const load = el('button', 'bm-load', 'Load') as HTMLButtonElement;
      load.onclick = () => stageImport(ta.value);
      row.append(up, load);
      box.append(row);
    }
    menu.append(box);
  }

  // Export + Apply-to-Figma moved OUT of this dropdown (#159) — they're their own bar affordances
  // now (Export is an artifact output, not a brand source; Apply is the plugin's primary CTA).
  return menu;
};

/** Export dropdown (#159) — the two download artifacts. design.md round-trips back into Import;
 *  tokens.json is the resolved DTCG tree. A pure output menu, split from the brand switcher. */
const renderExportMenu = (): HTMLElement => {
  const menu = el('div', 'brandmenu exportmenu');
  menu.append(el('div', 'bm-cap', 'Export'));
  const closeThen = (fn: () => void) => () => { exportMenuOpen = false; renderBar(); fn(); };
  const expMd = el('button', 'bm-item', '↓ design.md') as HTMLButtonElement;
  expMd.onclick = closeThen(exportDesignMd);
  const expTok = el('button', 'bm-item', '↓ tokens.json — DTCG') as HTMLButtonElement;
  expTok.onclick = closeThen(exportTokens);
  menu.append(expMd, expTok);
  menu.append(el('p', 'bm-hint', 'design.md re-imports here; tokens.json is the resolved tree.'));
  return menu;
};

/** The brand bar (#159) — a horizontal row of brand-level utilities, replacing the single
 *  overloaded dropdown. Left: brandmark. Right: brand switcher (identity + examples + new +
 *  import — a brand *source*), Export (artifact *output*), and, in the plugin only, the primary
 *  Apply-to-Figma CTA (the terminal action of the plugin flow). Modes live in the workspace
 *  mode-context strip (#171), not here. The bar is sticky (see `.bar`). */
function renderBar(): void {
  barHost.innerHTML = '';
  const mark = el('div', 'brandmark');
  mark.append(el('span', 'logo'), el('span', 'wordmark', 'Prism3'), el('span', 'studio', 'Theme studio'));
  barHost.append(mark);

  const actions = el('div', 'bar-actions');

  // Brand switcher — identity, examples, new, import.
  const bWrap = el('div', 'barmenu-wrap');
  const sel = el('button', 'brandsel' + (brandMenuOpen ? ' open' : '')) as HTMLButtonElement;
  const dot = el('span', 'dot'); dot.style.background = hex(oklchToRgb(brandState.primary));
  sel.append(dot, el('span', 'bs-name', brandState.id), el('span', 'caret', '▾'));
  sel.onclick = (e) => { e.stopPropagation(); brandMenuOpen = !brandMenuOpen; exportMenuOpen = false; if (!brandMenuOpen) importOpen = false; renderBar(); };
  bWrap.append(sel);
  if (brandMenuOpen) bWrap.append(renderBrandMenu());
  actions.append(bWrap);

  // Export — the download artifacts.
  const eWrap = el('div', 'barmenu-wrap');
  const exp = el('button', 'barbtn' + (exportMenuOpen ? ' open' : '')) as HTMLButtonElement;
  // The word is its own span so the narrow bar can drop to icon-only (the arrow alone) without
  // touching the arrow or the caret. Nested inside one span with the space INSIDE the label, so
  // wide layout renders "↓ Export" exactly as before — no extra flex gap appears between them.
  const expText = el('span');
  expText.append(document.createTextNode('↓'), el('span', 'barbtn-lab', ' Export'));
  exp.append(expText, el('span', 'caret', '▾'));
  exp.setAttribute('aria-label', 'Export');   // stable accessible name once the word is hidden
  exp.onclick = (e) => { e.stopPropagation(); exportMenuOpen = !exportMenuOpen; brandMenuOpen = false; importOpen = false; renderBar(); };
  eWrap.append(exp);
  if (exportMenuOpen) eWrap.append(renderExportMenu());
  actions.append(eWrap);

  // Pages — the rail as a menu. Below 900 the rail stops being a sidebar (see the stylesheet); left
  // as a static stack it is ~690px of destinations sitting above every page's content, so on a phone
  // you scroll past the whole nav before reaching anything. Same dropdown pattern as the two controls
  // beside it rather than a drawer — one overlay behaviour in this bar, not two. Hidden above 900,
  // where the real sidebar is back.
  const nWrap = el('div', 'barmenu-wrap');
  const nav = el('button', 'barbtn navbtn' + (navMenuOpen ? ' open' : '')) as HTMLButtonElement;
  const curPage = NAV.find((s) => s.key === page);
  // Same nested-span shape as Export: the space lives INSIDE the label span, so hiding the label
  // leaves a bare glyph with no orphaned whitespace and no extra flex gap.
  const navText = el('span');
  navText.append(document.createTextNode('☰'), el('span', 'navbtn-lab', ' ' + (curPage?.label ?? 'Pages')));
  nav.append(navText, el('span', 'caret', '▾'));
  nav.setAttribute('aria-label', 'Pages');
  nav.onclick = (e) => {
    e.stopPropagation();
    navMenuOpen = !navMenuOpen; brandMenuOpen = false; exportMenuOpen = false; importOpen = false;
    renderBar();
  };
  nWrap.append(nav);
  if (navMenuOpen) nWrap.append(renderNavMenu());
  actions.append(nWrap);

  // Apply to Figma — plugin-only, the primary CTA (the plugin's terminal action). Absent + DCE'd
  // on web (`commit.isFigma` false). The #109 read-back seed status rides alongside as a pill.
  if (commit.isFigma) {
    if (seedInfo) actions.append(el('span', 'bar-seed' + (seedInfo.ok ? '' : ' bad'), seedInfo.summary));
    const applyBtn = el('button', 'barbtn primary', '↳ Apply to Figma') as HTMLButtonElement;
    applyBtn.onclick = () => commit.postTheme(lastGoodInput);
    actions.append(applyBtn);
  }

  barHost.append(actions);

  if (!outsideBound) {
    document.addEventListener('mousedown', (e) => {
      if ((brandMenuOpen || exportMenuOpen || navMenuOpen) && !(e.target as HTMLElement).closest('.barmenu-wrap')) {
        brandMenuOpen = false; exportMenuOpen = false; navMenuOpen = false; importOpen = false; renderBar();
      }
    });
    outsideBound = true;
  }
}

/** The rail's destinations as a dropdown, for the widths where the rail is not a sidebar. Renders
 *  from the same `NAV` data and reuses the rail's own `.stage-t` title+subtitle block, so the
 *  subtitles survive the move — they are doing real work ("Surfaces & fills / Backgrounds, text,
 *  gradients" teaches what the page is) and a bare label list would drop them. The divider before
 *  the `view` destination and the ordering note both come across too, so nothing the sidebar shows
 *  is silently lost on the way into the menu. */
const renderNavMenu = (): HTMLElement => {
  const menu = el('div', 'brandmenu navmenu');
  menu.append(el('div', 'bm-cap', 'Pages'));
  NAV.forEach((s) => {
    if ('view' in s && s.view) menu.append(el('div', 'bm-div'));
    const it = el('button', 'nav-item' + (s.key === page ? ' cur' : '')) as HTMLButtonElement;
    const t = el('span', 'stage-t');
    t.append(el('b', undefined, s.label), el('small', undefined, s.sub));
    it.append(t);
    it.onclick = () => {
      navMenuOpen = false;
      if (page !== s.key) { page = s.key; build(); } else renderBar();
    };
    menu.append(it);
  });
  menu.append(el('p', 'rail-note', 'Ordered the way a theme composes — palettes first, then how they’re applied to surfaces and interaction, then type and form. Preview renders the whole system.'));
  return menu;
};

/** Seed a fresh brand from a single hex color: the engine grows a full system from one primary, so
 *  the color's OKLCH becomes the primary anchor and the neutral leans to its hue (a subtle brand tint). */
const seedFromColor = (hexVal: string): BrandInput => {
  const o = rgbToOklch(hexToRgb(hexVal));
  return { ...NEW_BRAND(), primary: o, neutral: { hue: o.h, chroma: 0.006 } };
};

/** The first-run START SCREEN (#149 follow-up). Web boots here when nothing is persisted, instead of
 *  silently loading the demo. One brand color bootstraps a full theme, so the paths are: start from
 *  your color, start from a neutral default, or open an example. Each lands in the editor (loadBrand →
 *  rebuild persists it), so a reload restores the working brand and the start screen doesn't reappear. */
const renderStartScreen = (): HTMLElement => {
  const view = el('div', 'startview');
  const col = el('div', 'start-col');
  const mark = el('div', 'start-mark');
  mark.append(el('span', 'logo'), el('span', 'wordmark', 'Prism3'), el('span', 'studio', 'Theme studio'));
  col.append(mark);
  col.append(el('h1', 'start-h', 'Start a new brand.'));
  col.append(el('p', 'start-lede', 'One brand color is enough — the engine grows a full, contrast-checked system you can steer. Pick a starting point.'));

  const enter = (input: BrandInput): void => { firstRun = false; loadBrand(input); };

  // Path 1 — from your color (the hero path: a single primary bootstraps everything).
  const c1 = el('div', 'start-card start-hero');
  c1.append(el('h2', 'start-ct', 'Start from your color'));
  c1.append(el('p', 'start-cd', 'Your primary brand color; everything else takes smart defaults you can tune.'));
  const row = el('div', 'start-color-row');
  const swatch = el('input', 'start-swatch') as HTMLInputElement; swatch.type = 'color'; swatch.value = '#5e4bc3';
  const hexIn = el('input', 'start-hex') as HTMLInputElement; hexIn.type = 'text'; hexIn.value = '#5e4bc3'; hexIn.setAttribute('aria-label', 'Brand color hex');
  const HEX = /^#[0-9a-f]{6}$/i;
  swatch.oninput = () => { hexIn.value = swatch.value; };
  hexIn.oninput = () => { if (HEX.test(hexIn.value)) swatch.value = hexIn.value; };
  const go = el('button', 'start-go', 'Create theme →') as HTMLButtonElement;
  go.onclick = () => enter(seedFromColor(HEX.test(hexIn.value) ? hexIn.value : swatch.value));
  row.append(swatch, hexIn, go);
  c1.append(row);
  col.append(c1);

  // Path 2 — a neutral, unopinionated default (set color later).
  const c2 = el('div', 'start-card start-row2');
  const t2 = el('div', 'start-c2t');
  t2.append(el('h2', 'start-ct', 'Start with a neutral default'), el('p', 'start-cd', 'An unopinionated starting theme — jump in and set your color later.'));
  const b2 = el('button', 'start-alt', 'Start blank') as HTMLButtonElement;
  b2.onclick = () => enter(NEW_BRAND());
  c2.append(t2, b2);
  col.append(c2);

  // Path 3 — open a fully-built example (aurora / harbor), explicitly framed as examples.
  const c3 = el('div', 'start-card');
  c3.append(el('h2', 'start-ct', 'Explore an example'));
  c3.append(el('p', 'start-cd', 'Open a fully-built example to see what the engine produces from a brand.'));
  const chips = el('div', 'start-chips');
  for (const name of Object.keys(BRANDS)) {
    const chip = el('button', 'start-chip') as HTMLButtonElement;
    const d = el('span', 'dot'); d.style.background = hex(oklchToRgb(BRANDS[name].primary));
    chip.append(d, el('span', undefined, name));
    chip.onclick = () => enter(BRANDS[name]);
    chips.append(chip);
  }
  c3.append(chips);
  col.append(c3);

  // Path 4 — import an existing design.md by upload (#160). No overwrite confirm: it's the first-run
  // screen, there's no brand to replace. File type + engine-acceptance are both validated first.
  const c4 = el('div', 'start-card start-row2');
  const t4 = el('div', 'start-c2t');
  t4.append(el('h2', 'start-ct', 'Import a design.md'), el('p', 'start-cd', 'Already have a design.md? Upload it to load the full brand.'));
  const err4 = el('p', 'start-imp-err');
  t4.append(err4);
  const up4 = el('label', 'start-alt start-upload');
  const fi4 = el('input', 'start-file') as HTMLInputElement;
  fi4.type = 'file'; fi4.accept = IMPORT_ACCEPT;
  fi4.onchange = async () => {
    err4.textContent = '';
    const f = fi4.files?.[0]; if (!f) return;
    const read = await readDesignMdFile(f);
    if ('error' in read) { err4.textContent = read.error; return; }
    const res = validateDesignMd(read.text);
    if ('error' in res) { err4.textContent = res.error; return; }
    enter(res.input);
  };
  up4.append(el('span', undefined, '↑ Upload…'), fi4);
  c4.append(t4, up4);
  col.append(c4);

  view.append(col);
  return view;
};

const build = (): void => {
  app.innerHTML = '';
  if (firstRun) { app.append(renderStartScreen()); return; }   // first run: the start moment stands in for the app
  // Two-tier global header (docs/23 §7): tier 1 = brand identity + Export (the "brand bar"); tier 2 =
  // the persistent mode selector. Both sticky together so the mode context never scrolls away.
  const chrome = el('header', 'chrome');
  barHost = el('div', 'bar');
  chrome.append(barHost);
  modeStripHost = el('div', 'modebar');
  chrome.append(modeStripHost);
  app.append(chrome);
  renderBar();
  renderModeStrip();

  const shell = el('div', 'shell');
  const rail = el('nav', 'rail');
  // Rail-as-data (docs/23 §7): a flat list of focused destinations, no ordinals — top-to-bottom order
  // carries the compose sequence. A `view` destination (Preview) sits after a divider.
  NAV.forEach((s) => {
    if ('view' in s && s.view) rail.append(el('div', 'rail-div'));
    const it = el('button', 'stage' + (s.key === page ? ' active' : '')) as HTMLButtonElement;
    const t = el('span', 'stage-t');
    t.append(el('b', undefined, s.label), el('small', undefined, s.sub));
    it.append(t);
    it.onclick = () => { if (page !== s.key) { page = s.key; build(); } };
    rail.append(it);
  });
  rail.append(el('p', 'rail-note', 'Ordered the way a theme composes — palettes first, then how they’re applied to surfaces and interaction, then type and form. Preview renders the whole system.'));
  shell.append(rail);

  workspace = el('section', 'ws');
  shell.append(workspace);
  app.append(shell);
  renderWorkspace();
};

// ---- inlined stylesheet (self-contained bundle) ----------------------------
const STYLE = `
:root{
  --ink:#18181b; --ink2:#3d3d44; --muted:#71717a; --faint:#a1a1aa;
  --paper:#f2f3f6; --panel:#ffffff; --line:#e7e8ec; --line2:#dcdde2;
  --r:10px; --r-sm:7px; --r-xs:6px;
  /* Per-mode table geometry — shared so tables stack down the page on the same grid. The SIZE table
     sets these because it is the widest case: its stepper cell needs ~132px where a weight select
     needs ~90px and a leading select ~130px, and its row labels are the shortest. Future tables
     (weights, leading, tracking) consume these rather than choosing their own, so the columns cannot
     drift apart. Change here, not per table. */
  --tbl-col-name:112px; --tbl-col-mode:148px;
  --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,Roboto,sans-serif;
  --mono:ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--paper);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;font-size:14px;line-height:1.55}
.mono{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-0.01em}
.faint{color:var(--faint)}
#app{max-width:1200px;margin:0 auto;padding:0 40px 120px}

/* First-run start screen */
.startview{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:48px 24px;background:var(--paper)}
.start-col{width:100%;max-width:560px;display:flex;flex-direction:column;gap:14px}
.start-mark{display:flex;align-items:center;gap:9px;margin-bottom:6px}
.start-h{margin:0;font-size:34px;font-weight:680;letter-spacing:-0.025em;color:var(--ink)}
.start-lede{margin:0 0 6px;font-size:15px;line-height:1.55;color:var(--muted);max-width:48ch}
.start-card{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:20px}
.start-hero{border-color:var(--line2);box-shadow:0 1px 2px rgba(24,24,27,.05)}
.start-ct{margin:0 0 4px;font-size:15px;font-weight:620;color:var(--ink)}
.start-cd{margin:0;font-size:13px;line-height:1.5;color:var(--faint)}
.start-color-row{display:flex;align-items:center;gap:10px;margin-top:15px}
.start-swatch{width:44px;height:38px;padding:0;border:1px solid var(--line2);border-radius:var(--r-xs);background:none;cursor:pointer}
.start-hex{width:108px;padding:8px 10px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;font-variant-numeric:tabular-nums;background:var(--paper);color:var(--ink)}
.start-go{margin-left:auto;padding:9px 16px;border:none;border-radius:var(--r-sm);background:var(--ink);color:#fff;font:inherit;font-size:13px;font-weight:560;cursor:pointer}
.start-go:hover{background:#000}
.start-row2{display:flex;align-items:center;justify-content:space-between;gap:16px}
.start-c2t{min-width:0}
.start-alt{flex:none;padding:9px 15px;border:1px solid var(--line2);border-radius:var(--r-sm);background:var(--panel);color:var(--ink);font:inherit;font-size:13px;font-weight:540;cursor:pointer}
.start-alt:hover{border-color:var(--ink)}
.start-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}
.start-chip{display:flex;align-items:center;gap:8px;padding:7px 13px 7px 9px;border:1px solid var(--line2);border-radius:999px;background:var(--panel);font:inherit;font-size:13px;color:var(--ink);cursor:pointer}
.start-chip:hover{border-color:var(--ink)}
.start-chip .dot{width:12px;height:12px;border-radius:50%;flex:none}

.chrome{position:sticky;top:0;z-index:20;background:var(--paper)}
.bar{display:flex;align-items:center;justify-content:space-between;padding:26px 2px 12px}
.modebar{padding:0 2px 14px}
.brandmark{display:flex;align-items:center;gap:11px}
.logo{width:18px;height:18px;border-radius:var(--r-xs);background:conic-gradient(from 210deg,#5e4bc3,#0088be,#2f6833,#a13731,#5e4bc3)}
.wordmark{font-weight:640;letter-spacing:-0.02em;font-size:16px}
.studio{color:var(--muted);font-size:13px;border-left:1px solid var(--line2);padding-left:11px}
.bar-actions{display:flex;align-items:center;gap:10px}
.barmenu-wrap{position:relative}
.brandsel,.barbtn{display:flex;align-items:center;gap:9px;font:inherit;font-weight:560;border:1px solid var(--line2);background:var(--panel);padding:8px 13px;border-radius:var(--r-sm);font-size:13.5px;cursor:pointer;color:var(--ink);white-space:nowrap}
.brandsel.open,.barbtn.open,.barbtn:hover,.brandsel:hover{border-color:var(--ink2)}
.brandsel .dot{width:12px;height:12px;border-radius:4px}
.brandsel .caret,.barbtn .caret{color:var(--faint);margin-left:2px}
.barbtn.primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.barbtn.primary:hover{background:var(--ink2);border-color:var(--ink2)}
/* Off by default; the max-width:900 rule below turns it on where the rail turns off. This base
   declaration must come BEFORE that rule — a media query adds no specificity, so a later
   .navbtn{display:none} would simply win at every width and the control would never appear. */
.navbtn{display:none}
.bar-seed{font-size:11.5px;color:var(--muted);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-seed.bad{color:#a12}
.brandmenu{position:absolute;top:calc(100% + 8px);right:0;width:288px;background:var(--panel);border:1px solid var(--line2);border-radius:var(--r);padding:12px;z-index:20;display:flex;flex-direction:column;gap:2px;box-shadow:0 12px 32px -8px rgba(24,24,27,.20),0 4px 12px -4px rgba(24,24,27,.12)}
.exportmenu{width:232px}
.bm-cap{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint);font-weight:600;margin:4px 2px 6px}
.bm-field{display:flex;align-items:center;gap:10px;padding:4px 2px}
.bm-lab{font-size:12.5px;color:var(--ink2);width:78px;flex:none}
.bm-in{flex:1;min-width:0;padding:6px 9px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;font-size:13px;background:var(--paper)}
.bm-in.bad{border-color:#d23;background:#fdecec}
.bm-hint{margin:2px 2px 4px;font-size:11px;color:var(--faint);font-family:var(--mono)}
.bm-div{height:1px;background:var(--line);margin:8px 0}
.bm-item{display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:0;background:none;font:inherit;font-size:13px;color:var(--ink2);padding:8px 8px;border-radius:var(--r-xs);cursor:pointer}
.bm-item:hover{background:var(--paper)}
.bm-item.cur{color:var(--ink);font-weight:600}
.bm-dot{width:11px;height:11px;border-radius:3px;flex:none}
.bm-import{margin-top:6px;display:flex;flex-direction:column;gap:8px}
.bm-ta{width:100%;height:120px;resize:vertical;padding:9px;border:1px solid var(--line2);border-radius:var(--r-xs);font-family:var(--mono);font-size:12px;background:var(--paper);line-height:1.5}
.bm-err{margin:0;font-size:11.5px;color:#a12;line-height:1.5}
.bm-load{align-self:flex-start;border:1px solid var(--ink);background:var(--ink);color:#fff;border-radius:var(--r-xs);padding:7px 16px;font:inherit;font-size:13px;font-weight:560;cursor:pointer}
.bm-file,.start-file{display:none}
.bm-import-row,.bm-confirm-row{display:flex;align-items:center;gap:8px}
.bm-upload{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line2);background:var(--paper);border-radius:var(--r-xs);padding:7px 12px;font-size:12.5px;color:var(--muted);cursor:pointer;white-space:nowrap}
.bm-upload:hover{border-color:var(--ink);color:var(--ink)}
.bm-cancel{border:1px solid var(--line2);background:var(--panel);border-radius:var(--r-xs);padding:7px 14px;font:inherit;font-size:13px;color:var(--ink2);cursor:pointer}
.bm-cancel:hover{border-color:var(--ink)}
.bm-confirm{margin:2px 2px 8px;font-size:12.5px;line-height:1.55;color:var(--ink2)}
.start-upload{display:inline-flex;align-items:center;gap:6px}
.start-imp-err{margin:9px 0 0;font-size:12px;color:#a12;line-height:1.5}

.shell{display:grid;grid-template-columns:210px minmax(0,1fr);gap:60px;align-items:start;margin-top:20px}
.rail{position:sticky;top:calc(var(--chrome-h, 120px) + 10px);display:flex;flex-direction:column;gap:4px}
.rail-div{height:1px;background:var(--line);margin:10px 10px}
.stage{display:flex;align-items:center;gap:13px;text-align:left;border:1px solid transparent;background:none;font:inherit;padding:11px 12px;border-radius:var(--r-sm);cursor:pointer;color:var(--ink2)}
.stage:hover{background:var(--panel)}
.stage.active{background:var(--panel);border-color:var(--line2)}
.stage-t{display:flex;flex-direction:column;line-height:1.3;gap:2px}
.stage-t b{font-weight:600;font-size:13.5px}
.stage.active .stage-t b{color:var(--ink)}
.stage-t small{color:var(--faint);font-size:11.5px}
.rail-note{color:var(--muted);font-size:12px;line-height:1.6;margin:22px 8px 0;padding-top:20px;border-top:1px solid var(--line)}

.hero{padding:6px 0 4px}
.hero h1{margin:0;font-size:40px;font-weight:660;letter-spacing:-0.03em;line-height:1.08}
.lede{color:var(--muted);max-width:60ch;margin:18px 0 0;font-size:16px;line-height:1.65}

/* Each primitive section pairs its control card (left) with the ramps it drives (right),
   so a change to the card is always visible in the palette beside it (#158). */
/* ---- Palettes page (#59): per-role section containers + full-width palette rows ---- */
.psec{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:20px 24px 22px;margin-top:22px}
.psec:first-of-type{margin-top:8px}
.psec-t{margin:0;font-size:13px;font-weight:680;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)}
.psec-d{margin:4px 0 0;color:var(--faint);font-size:13px;line-height:1.5}
.psec .errbar{margin-top:16px}
.prow{padding:20px 0 6px}
.prow+.prow{border-top:1px solid var(--line);margin-top:4px}
.phead{display:flex;align-items:center;gap:22px;margin-bottom:16px;flex-wrap:wrap}
.pident{display:flex;align-items:center;gap:14px;min-width:0}
.pswrap{position:relative;flex:none;line-height:0}
.pswatch{width:56px;height:56px;flex:none;border-radius:var(--r-sm);border:1px solid var(--line2);padding:0;background:none;overflow:hidden;cursor:default}
.prow.authored .pswatch{cursor:pointer}
.prow.authored .pswatch:hover{box-shadow:0 0 0 3px var(--line)}
.plock{position:absolute;right:-5px;top:-5px;width:20px;height:20px;border-radius:6px;background:var(--ink);border:1px solid var(--ink);display:flex;align-items:center;justify-content:center}
.plock svg{width:11px;height:11px;stroke:var(--panel);fill:none;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.pidcol{min-width:0;display:flex;flex-direction:column;gap:5px}
.pname{font-size:16px;font-weight:620;letter-spacing:-0.01em;text-transform:capitalize}
.pname-input{width:130px;max-width:130px;padding:5px 8px;border:1px solid var(--line2);border-radius:var(--r-xs);font-size:14px;background:var(--paper);color:var(--ink)}
.psub{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-height:20px}
.phex{color:var(--muted);font-size:12.5px}
.prow:not(.show-hex) .phex{display:none}
.prole{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--ink2);background:var(--paper);border:1px solid var(--line2);border-radius:999px;padding:2px 10px}
.prole-dot{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}
.prm{margin-left:2px}
.porigin{display:flex;align-items:flex-end;gap:22px;flex-wrap:wrap}
.pfield{display:flex;flex-direction:column;gap:7px}
.pfield.r{margin-left:auto;align-items:flex-end}
.pfk{font-size:9.5px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--faint)}
.panchor{display:inline-flex;align-items:center;height:31px;padding:0 11px;border:1px solid var(--line2);border-radius:var(--r-xs);background:var(--paper);font-size:13px;color:var(--ink)}
.panchor.dia::before{content:"◆";color:var(--ink2);font-size:9px;margin-right:6px}
.panchor.none,.panchor.note{color:var(--muted)}
/* Neutral row: the Hue/Chroma slider fields match the Source/Anchor box height so every origin field is
   equal height and bottom-aligns cleanly (no ragged labels / thin sliders floating low) — #67. */
.pfield.slider .psl-top{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;height:15px}
.psl-val{color:var(--muted);font-size:12px;line-height:1}
.psl-range{width:150px;accent-color:var(--ink);height:32px;margin-top:0}
.pfield.slider.ro{opacity:.5}
.pramp{display:flex;flex-direction:column}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:20px 22px}
.panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
.panel-head h2{margin:0;font-size:15px;font-weight:620;letter-spacing:-0.01em}
.seg{display:flex;border:1px solid var(--line2);border-radius:var(--r-sm);padding:2px;gap:2px}
.seg-b{border:0;background:none;font:inherit;font-size:12px;color:var(--muted);padding:4px 12px;border-radius:5px;cursor:pointer}
.seg-b.on{background:var(--ink);color:#fff}

/* Native color inputs: strip the browser's swatch inset so the color fills the whole control (no white gutter). */
input[type=color]::-webkit-color-swatch-wrapper{padding:0}
input[type=color]::-webkit-color-swatch{border:none;border-radius:inherit}
input[type=color]::-moz-color-swatch{border:none;border-radius:inherit}
.rx{width:28px;height:28px;flex:none;border:1px solid var(--line2);background:var(--panel);border-radius:var(--r-xs);color:var(--faint);cursor:pointer;font-size:15px;line-height:1}
.rx:hover{background:#fdecec;color:#a12;border-color:#f2c6c6}
.addbtn{margin-top:14px;border:1px dashed var(--line2);background:none;border-radius:var(--r-sm);padding:9px 15px;font:inherit;font-size:13px;color:var(--muted);cursor:pointer;width:100%}
.addbtn:hover{border-color:var(--ink);color:var(--ink)}

.slider{margin-top:16px}
.slider-top{display:flex;align-items:baseline;justify-content:space-between;font-size:13px;color:var(--ink2)}
.slider-top .val{color:var(--muted);font-size:12.5px}
.range{width:100%;margin-top:10px;accent-color:var(--ink)}
.np-note{color:var(--faint);font-size:12px;line-height:1.55;margin:16px 0 0}


.band{margin-bottom:16px}
.band:last-child{margin-bottom:0}
.strip{display:flex;border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--line2)}
.sw{flex:1;height:72px;position:relative}
.sw.is-anchor::after{content:"";position:absolute;inset:0;border:2.5px solid var(--ink);border-radius:2px;pointer-events:none}
.labs{display:flex;margin-top:9px}
.lab{flex:1;display:flex;flex-direction:column;gap:2px;padding:0 6px}
.lab-step{font-size:12px;font-weight:600;color:var(--ink2)}
.lab-step.on{color:var(--ink);font-weight:700}
.lab-step.on::before{content:"◆ ";font-size:8px;color:var(--ink2);vertical-align:1px}
.lab-hex{font-size:11px;color:var(--faint)}
/* The dashboard <select> component (doc 24 C1) — one base class owns every dropdown's cosmetics + the
   consistent chevron; sm / fill / cap are additive size/context modifiers. */
.select{appearance:none;-webkit-appearance:none;font:inherit;font-size:13.5px;padding:9px 11px;padding-right:28px;border:1px solid var(--line2);border-radius:var(--r-xs);background:var(--paper);color:var(--ink);cursor:pointer;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%2371717a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 9px center;background-size:11px}
.select:disabled{opacity:.6}
.select.sm{font-size:12.5px;padding:6px 9px;padding-right:26px}
.select.fill{flex:1;min-width:0}
.select.cap{max-width:260px}

.sub-lab{margin:34px 0 12px}
.sub-lab:first-child{margin-top:8px}
.sub-t{font-size:12.5px;font-weight:680;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin:0}
.knob{padding:14px 0;border-bottom:1px solid var(--line)}
.knob:last-child{border-bottom:0}
.knob-label{display:block;font-weight:600;font-size:13.5px}
.knob-body{display:flex;align-items:center;gap:10px}
.knob > .knob-body{margin-top:8px}
.knob input[type=range]{flex:1;accent-color:var(--ink)}
/* Toggle rendered as a switch (pill track + sliding thumb), not a native checkbox. */
input.toggle{appearance:none;-webkit-appearance:none;flex:none;width:38px;height:22px;margin:0;border-radius:999px;background:var(--line2);position:relative;cursor:pointer;transition:background .15s ease}
input.toggle::after{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s ease}
input.toggle:checked{background:var(--ink)}
input.toggle:checked::after{transform:translateX(16px)}
input.toggle:disabled{opacity:.5;cursor:default}
.knob input:disabled{opacity:.5}
.knob .select{margin-top:8px}
.knob-val{font-variant-numeric:tabular-nums;color:var(--muted);font-size:12.5px}
.knob-val.ro{margin-top:6px}
.knob-desc{margin:7px 0 0;font-size:12px;color:var(--faint);line-height:1.5}
.type-editor{margin-bottom:8px}
.te-font{width:100%;margin-top:8px;padding:7px 9px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;background:var(--paper)}
.te-wrow{display:flex;align-items:center;justify-content:space-between;gap:12px}
/* The number-input component (doc 24 C2) — .num owns the shared field cosmetics; the context classes
   below carry only width / size / alignment deltas. */
.num{padding:6px 8px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;background:var(--paper)}
.te-weight{width:88px;font-variant-numeric:tabular-nums;text-align:right}
.te-cat-wrap{overflow-x:auto;margin-top:12px}
.te-cat{border-collapse:collapse;width:100%;font-size:12.5px}
.te-cat th,.te-cat td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:center;white-space:nowrap}
.te-cat th{font-size:11px;font-weight:600;color:var(--muted);text-transform:lowercase;letter-spacing:0.02em}
.te-cat tr:last-child td{border-bottom:none}
.te-cat th:first-child,.te-cat td:first-child,.te-cat th:nth-child(2),.te-cat td:nth-child(2){text-align:left}
.te-cat-name{color:var(--ink);font-size:12px}
.te-c{width:1%}
.te-cat input[type=checkbox]{width:15px;height:15px;accent-color:var(--ink);cursor:pointer}
.te-cbwrap{position:relative;display:inline-flex;align-items:center;justify-content:center}
.te-warn{position:absolute;top:-7px;right:-9px;font-size:10px;line-height:1;pointer-events:none}
.te-cat td.unavail input[type=checkbox]{opacity:.32}
.te-cat td.unavail{background:repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(120,120,130,.06) 4px,rgba(120,120,130,.06) 5px)}
.te-cat-note{margin:10px 2px 0;font-size:11.5px;line-height:1.5;color:var(--faint)}
/* D (typography) — per-mode notes + shared read-only markers. */
.te-modenote{margin:0 0 16px;font-size:12.5px;color:var(--muted);line-height:1.55;padding:10px 13px;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm)}
.te-order-warn{margin:10px 2px 0;font-size:12px;color:#a12;line-height:1.5}
.te-shared-note{margin:4px 2px 10px;font-size:12px;color:var(--faint);line-height:1.5}
.te-shared-ro{margin:6px 0 0;font-size:13.5px;font-weight:560;color:var(--ink2)}
.te-cat select:disabled,.te-cat input:disabled{opacity:.55;cursor:not-allowed}
/* D (typography) — the per-mode leading/tracking ramps (read-only chips in Light, inputs in a mode). */
.te-shared-ro-note{margin:4px 2px 10px;font-size:12px;color:var(--faint);line-height:1.5}
.te-ramp{display:flex;flex-wrap:wrap;gap:8px}
.te-ramp-cell{display:flex;flex-direction:column;gap:4px;min-width:74px}
.te-ramp-key{font-size:11px;color:var(--muted)}
.te-ramp-in{width:74px;padding:5px 7px;font-size:12px}
.te-ramp-ro{font-size:13px;color:var(--ink2);padding:5px 0}
/* D (shadow) — per-mode softness/tint: the knob header carries an Auto/reset affordance. */
.sh-knob-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.sh-auto{font:inherit;font-size:11px;color:var(--muted);background:none;border:none;padding:0;cursor:default}
.sh-auto.on{color:var(--ink2);cursor:pointer;text-decoration:underline}
/* #305 tint read-out — the tint color at full opacity beside the same color at a mid-ramp 12%.
   The checkerboard under the 12% chip is what makes a translucent near-black legible as translucent;
   on a flat panel it would just read as a slightly different flat grey. */
.sh-tintblock{margin-top:14px;padding-top:14px;border-top:1px dashed var(--line2)}
.sh-tintout{display:flex;gap:14px}
.sh-tintcell{display:flex;flex-direction:column;gap:6px;min-width:0}
.sh-tintchip{width:76px;height:44px;border-radius:var(--r-xs);border:1px solid var(--line2);overflow:hidden;
  background-color:#fff;
  background-image:linear-gradient(45deg,#e6e6e8 25%,transparent 25%,transparent 75%,#e6e6e8 75%),linear-gradient(45deg,#e6e6e8 25%,transparent 25%,transparent 75%,#e6e6e8 75%);
  background-size:10px 10px;background-position:0 0,5px 5px}
.sh-tintfill{width:100%;height:100%}
.sh-tintcap{font-family:var(--mono);font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.sh-tintnote{margin-top:10px;font-size:11.5px;line-height:1.5;color:var(--faint)}
.sh-tintnote b{font-family:var(--mono);font-size:11px;color:var(--ink2)}
/* Specimen meta row — a mono label + its token pill(s) inline (type / motion specimens). */
.spec-metarow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.obj-row{display:flex;gap:8px;margin-top:8px}

.stage-vol{display:flex;flex-direction:column}
.pvhost{display:flex;flex-direction:column;gap:16px}
.pv-tscroll{overflow-x:auto;margin-top:8px}
.type-spec{margin-bottom:8px}
.ts-list{display:flex;flex-direction:column;gap:22px;padding:14px 0 2px}
.ts-row{display:flex;flex-direction:column;gap:8px;min-width:0}
.ts-meta{font-size:11.5px;color:var(--faint)}
.ts-sample{color:var(--ink);letter-spacing:-0.02em;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Type-specimen variants strip — the weights each group ships + italic/link/size-range (the type sub-levers). */
.ts-variants{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;margin-top:2px}
.ts-var{font-size:14px;color:var(--ink2);line-height:1.2}
.ts-var-range{font-size:11px;color:var(--faint);align-self:center}
.shadow-spec{margin-bottom:8px}
.sh-list{display:flex;flex-wrap:wrap;gap:28px;border-radius:var(--r-sm);padding:24px 20px;background:var(--paper);margin-top:14px}
.sh-cell .tpill{margin-top:2px}
.sh-cell{display:flex;flex-direction:column;align-items:center;gap:10px}
.sh-card{width:64px;height:64px;border-radius:10px;background:#fff}
.sh-lab{font-size:11.5px;color:#5b6472}
.motion-spec{margin-bottom:8px}
.mo-toolbar{display:flex;justify-content:flex-end;margin:-4px 0 4px}
.mo-slowmo{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--faint)}
.mo-slowmo-sel{font:inherit;font-size:12px;color:var(--ink2);background:var(--panel);border:1px solid var(--line2);border-radius:var(--r-xs);padding:4px 8px;cursor:pointer}
.mo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:14px 0 2px}
@media(max-width:760px){.mo-grid{grid-template-columns:repeat(2,1fr)}}
.mo-col{display:flex;flex-direction:column;gap:12px;min-width:0}
.mo-stage{position:relative;aspect-ratio:1;background:var(--paper);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.mo-stage-svg{position:absolute;inset:0;width:100%;height:100%}
.mo-stage-axis{stroke:var(--line2);stroke-width:1.5}
.mo-stage-line{stroke:var(--line2);stroke-width:2.5;stroke-linecap:round}
.mo-dot{position:absolute;width:10px;height:10px;border-radius:50%;background:var(--ink);left:11.364%;top:88.636%;transform:translate(-50%,-50%);animation-iteration-count:1;animation-fill-mode:both}
@keyframes mo-trace-x{from{left:11.364%}to{left:88.636%}}
@keyframes mo-trace-y{from{top:88.636%}to{top:11.364%}}
.mo-colmeta{display:flex;flex-direction:column;gap:4px}
.mo-colname{font-size:13px;font-weight:700}
.mo-meta{font-size:11.5px;color:var(--faint)}
.mo-playnote{font-size:10.5px;color:var(--faint);opacity:.75}
.mo-coldesc{font-size:11.5px;color:var(--muted)}
.mo-replay{margin-top:14px;border:1px solid var(--line2);background:var(--panel);border-radius:var(--r-sm);padding:7px 14px;font:inherit;font-size:12.5px;color:var(--ink2);cursor:pointer}
.mo-replay:hover{border-color:var(--ink);color:var(--ink)}
@media (prefers-reduced-motion:reduce){.mo-dot{animation:none!important;left:88.636%!important;top:11.364%!important}}
.radius-spec{margin-bottom:8px}
.rad-list{display:flex;flex-wrap:wrap;gap:24px;border-radius:var(--r-sm);padding:24px 20px;background:var(--paper);margin-top:14px}
.rad-cell{display:flex;flex-direction:column;align-items:center;gap:9px;min-width:72px}
.rad-sw{width:72px;height:52px;background:var(--ink);opacity:.85}
.rad-lab{font-size:11.5px;color:var(--muted)}
.rad-cons{font-size:11px;color:var(--faint);text-align:center;max-width:88px;line-height:1.35}
/* D (density) — the control-size specimen: mini controls at their resolved height + padding. */
.sz-list{display:flex;flex-wrap:wrap;align-items:flex-end;gap:20px;border-radius:var(--r-sm);padding:24px 20px;background:var(--paper);margin-top:14px}
.sz-cell{display:flex;flex-direction:column;align-items:center;gap:9px}
.sz-box{display:flex;align-items:center;justify-content:center;min-width:44px;background:var(--ink);color:var(--panel);border-radius:6px;font-size:12px;font-weight:560}
.sz-lab{font-size:11px;color:var(--muted);white-space:nowrap}
/* Spacing ramp preview (#265) — the space.* steps as proportional bars (spacing has no other payoff). */
.sp-list{display:flex;flex-direction:column;gap:10px;border-radius:var(--r-sm);padding:22px 20px;background:var(--paper);margin-top:14px}
.sp-cell{display:flex;flex-direction:column;gap:5px}
.sp-lab{font-size:11px;color:var(--muted)}
.sp-bar{height:12px;background:var(--ink);opacity:.55;border-radius:3px;min-width:2px}
/* Manifest-advanced scalar/enum levers — exposed as a normal panel (no disclosure). */
.adv-panel{margin-top:12px}
/* Advanced object/list bespoke editors (responsive type, breakpoints, emphasized easing). */
.adv-row{display:flex;align-items:center;gap:10px;margin-top:8px;font-size:12.5px;color:var(--ink2)}
.adv-row-lab{min-width:150px}
.adv-num{width:88px;padding:5px 7px;font-size:12px}
.adv-unit{font-size:11px;color:var(--faint)}
.adv-bplist{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.adv-bp{display:flex;align-items:center;gap:2px}
.adv-x{border:none;background:none;color:var(--faint);cursor:pointer;font-size:15px;line-height:1;padding:0 2px}
.adv-x:hover{color:#a12}
.adv-add{border:1px dashed var(--line2);background:none;color:var(--muted);cursor:pointer;font:inherit;font-size:12px;border-radius:var(--r-xs);padding:5px 10px}
.adv-bez{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
.adv-bez-lab{font-size:11px;color:var(--faint)}
/* Layout specimen — breakpoint/grid table + column preview + container bars. */
.layout-spec{margin-bottom:8px}
.ly-table{border-collapse:collapse;width:100%;font-size:12px;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-bottom:16px}
.ly-table th,.ly-table td{padding:7px 12px;border-bottom:1px solid var(--line);text-align:right}
.ly-table th:first-child,.ly-table td:first-child{text-align:left}
.ly-table th{font-size:11px;font-weight:600;color:var(--muted);text-transform:lowercase;letter-spacing:.02em;background:var(--panel)}
.ly-table tr:last-child td{border-bottom:none}
.ly-cap{font-size:11.5px;color:var(--muted);margin:0 2px 8px}
.ly-ruler{position:relative;height:44px;margin:2px 2px 22px;border-bottom:2px solid var(--line2)}
.ly-tick{position:absolute;bottom:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding-left:5px}
.ly-tick::before{content:'';position:absolute;left:0;bottom:0;width:2px;height:11px;background:var(--ink2)}
.ly-tick-name{font-size:10.5px;font-weight:640;color:var(--ink2);line-height:1}
.ly-tick-px{font-size:9.5px;color:var(--faint);line-height:1}
.ly-cols{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;height:44px;margin-bottom:18px}
.ly-col{background:var(--ink);opacity:.14;border-radius:3px}
.ly-cont{display:flex;flex-direction:column;gap:8px}
.ly-cont-row{display:flex;align-items:center;gap:12px}
.ly-cont-lab{font-size:11.5px;color:var(--muted);min-width:150px}
.ly-cont-bar{height:16px;background:var(--ink);opacity:.55;border-radius:3px}
/* Controls-beside-previews pages (#264 Layout, #265 Size & radius): each control sits next to its live
   preview, so a change is visible without scrolling. The control column is fixed-narrow (no full-width
   sliders); the preview takes the rest and wraps under the controls on a narrow viewport. */
.cs-split{display:grid;grid-template-columns:minmax(220px,280px) 1fr;gap:28px;align-items:start}
@media(max-width:820px){.cs-split{grid-template-columns:1fr;gap:18px}}
.cs-ctl-col{display:flex;flex-direction:column;gap:16px;min-width:0}
.cs-preview{min-width:0}
.cs-ctl-stack{display:flex;flex-direction:column;gap:18px}
.cs-ctl{display:flex;flex-direction:column;gap:8px}
.cs-ctl-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.cs-ctl-lab{font-weight:600;font-size:13px;color:var(--ink)}
.cs-ctl-val{font-variant-numeric:tabular-nums;color:var(--muted);font-size:12.5px}
.cs-range{width:100%;accent-color:var(--ink)}
.gradient-spec{margin-bottom:8px}
.gr-list{display:flex;flex-wrap:wrap;gap:22px;border:1px solid var(--line);border-radius:var(--r);padding:24px;background:var(--panel)}
.gr-cell{display:flex;flex-direction:column;gap:10px}
.gr-sw{width:200px;height:96px;border-radius:var(--r-xs);border:1px solid var(--line)}
.gr-lab{font-size:11.5px;color:var(--muted)}
/* Gradient editor (docs/23 §2) — one card per gradient. */
.gr-ed-list{display:flex;flex-direction:column;gap:14px;margin-top:12px}
.gr-ed-card{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:22px}
.gr-ed-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.gr-ed-name{margin:0;font-size:15px;font-weight:620;color:var(--ink)}
.gr-ed-head .rx{margin-left:auto}
.gr-ed-sw{width:100%;height:120px;border-radius:var(--r-sm);border:1px solid var(--line);margin-bottom:16px}
.gr-ed-ctrls{display:flex;flex-wrap:wrap;gap:16px 20px;align-items:flex-end}
.gr-ed-field{display:flex;flex-direction:column;gap:6px}
.gr-ed-lab{font-size:12px;font-weight:560;color:var(--muted)}
.gr-ed-range{width:180px;accent-color:var(--ink)}
.gr-ed-num{width:96px;padding:9px 11px;font-size:13.5px}
.gr-ed-stopsh{margin:20px 0 10px;font-size:12.5px;font-weight:600;color:var(--muted);letter-spacing:.02em}
.gr-ed-stops{display:flex;flex-direction:column;gap:10px}
.gr-ed-stop{display:flex;align-items:center;gap:10px}
.gr-ed-stopsw{width:34px;height:34px;flex:none;border-radius:var(--r-xs);border:1px solid var(--line2)}
.gr-ed-stop .gr-ed-num{flex:none}
.gr-ed-stoprm{flex:none}
.gr-ed-addstop{margin-top:12px;width:auto;padding:7px 13px;font-size:12px}
.gr-ed-add{margin-top:14px}
.gr-ed-nameinput{font:inherit;font-size:15px;font-weight:620;color:var(--ink);background:var(--paper);border:1px solid var(--line2);border-radius:var(--r-xs);padding:6px 10px;width:150px}
/* Mode-context strip (#171) — one mode at a time; sticky so the context stays reachable while
   scrolling the stage. The whole stage below reflects the selected mode. */
.modectx{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0;padding:9px 12px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r)}
.mctx-modes{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.mctx-cap{font-size:11px;font-weight:640;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-right:6px}
.mctx-b{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line2);background:var(--paper);border-radius:var(--r-sm);padding:5px 11px;font:inherit;font-size:13px;color:var(--ink2);cursor:pointer}
.mctx-b:hover{border-color:var(--ink)}
.mctx-b.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.mctx-auto{font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--faint);border:1px solid var(--line2);border-radius:4px;padding:0 4px;line-height:1.5}
.mctx-b.on .mctx-auto{color:rgba(255,255,255,.85);border-color:rgba(255,255,255,.4)}
.mctx-mark{font-size:12px;font-weight:700}
.mctx-mark.ok{color:#1f9d63}
.mctx-mark.no{color:#c9342f}
.mctx-b.on .mctx-mark.ok{color:#7fe0ac}
.mctx-b.on .mctx-mark.no{color:#ff9d97}
.mctx-edit-wrap{position:relative;flex:none}
.mctx-edit{border:1px solid var(--line2);background:var(--paper);border-radius:var(--r-sm);padding:6px 12px;font:inherit;font-size:13px;color:var(--muted);cursor:pointer;white-space:nowrap}
.mctx-edit:hover,.mctx-edit.open{border-color:var(--ink);color:var(--ink)}
.mctx-menu{position:absolute;right:0;top:calc(100% + 7px);width:264px;background:var(--panel);border:1px solid var(--line2);border-radius:var(--r);box-shadow:0 10px 30px rgba(20,22,30,.14);padding:10px;z-index:20}
.mctx-mcap{font-size:11px;font-weight:640;text-transform:uppercase;letter-spacing:.045em;color:var(--faint);padding:4px 6px 8px}
.mctx-opt{display:flex;align-items:center;gap:9px;width:100%;border:0;background:none;font:inherit;font-size:13.5px;color:var(--ink2);padding:7px 6px;border-radius:var(--r-xs);cursor:pointer;text-align:left}
.mctx-opt:hover{background:var(--paper)}
.mctx-box{width:16px;height:16px;flex:none;border:1px solid var(--line2);border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:#fff}
.mctx-opt.on .mctx-box{background:var(--ink);border-color:var(--ink)}
/* #57 — Light row is locked (base mode): muted, greyed check, no hover — reads as non-interactive. */
.mctx-opt.fixed{cursor:default;opacity:.72}
.mctx-opt.fixed:hover{background:none}
.mctx-opt.fixed .mctx-box{background:var(--muted);border-color:var(--muted)}
.mctx-always{margin-left:auto;font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:var(--faint)}
.mctx-opt.disabled{color:var(--faint);cursor:not-allowed}
.mctx-opt.disabled:hover{background:none}
.mctx-div{height:1px;background:var(--line);margin:8px 4px}
.mctx-note{font-size:11.5px;line-height:1.5;color:var(--faint);margin:6px 6px 2px}
/* C2 — custom-mode rows + add form in the Edit-modes popover. */
.mctx-custom{display:flex;align-items:center;gap:8px;padding:6px 6px;font-size:13px;color:var(--ink2)}
.mctx-cname{font-weight:560}
.mctx-cbase{font-size:11px;color:var(--faint)}
.mctx-crm{margin-left:auto;width:22px;height:22px;flex:none;border:1px solid var(--line2);background:var(--panel);border-radius:var(--r-xs);color:var(--faint);cursor:pointer;font-size:14px;line-height:1}
.mctx-crm:hover{background:#fdecec;color:#a12;border-color:#f2c6c6}
.mctx-addform{display:flex;flex-direction:column;gap:10px;padding:8px 6px}
/* #56 — labeled add-mode fields (name + base). */
.mctx-addfield{display:flex;flex-direction:column;gap:4px}
.mctx-addlab{font-size:11px;font-weight:560;color:var(--muted);letter-spacing:.01em}
.mctx-addname{padding:7px 9px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;font-size:13px;background:var(--paper)}
.mctx-adderr{margin:0;font-size:11.5px;color:#a12;line-height:1.4}
.mctx-adderr:empty{display:none}
.mctx-addbtns{display:flex;gap:8px}
.mctx-addbtn{border:1px solid var(--ink);background:var(--ink);color:#fff;border-radius:var(--r-xs);padding:6px 14px;font:inherit;font-size:13px;font-weight:560;cursor:pointer}
.mctx-addcancel{border:1px solid var(--line2);background:var(--panel);border-radius:var(--r-xs);padding:6px 12px;font:inherit;font-size:13px;color:var(--ink2);cursor:pointer}
/* A2a — generated-mode (HC/wireframe) read-only view: an explanation + a per-mode contract verdict. */
.genview{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:22px 24px;margin:8px 0 0}
.genview-t{margin:0;font-size:16px;font-weight:640;letter-spacing:-0.01em}
.genview-d{margin:10px 0 0;color:var(--muted);font-size:14px;line-height:1.6;max-width:64ch}
.genview-chip{display:inline-flex;align-items:center;gap:8px;margin-top:16px;padding:7px 12px;border-radius:var(--r-sm);font-size:13px;font-weight:540}
.genview-chip.ok{background:#eaf7f0;color:#1f7a4d;border:1px solid #bfe6d0}
.genview-chip.no{background:#fdecec;color:#a12;border:1px solid #f2c6c6}
.gv-mark{font-weight:700}
.genview-hint{margin:14px 0 0;color:var(--faint);font-size:12.5px;line-height:1.55}
.cbadge{display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;font-size:11px;border:1px solid var(--line2)}
.cbadge.ok{background:rgba(26,156,82,.09);border-color:rgba(26,156,82,.35)}
.cbadge.no{background:rgba(221,51,51,.09);border-color:rgba(221,51,51,.4)}
.cb-lab{color:var(--muted)}
.cb-ratio{font-variant-numeric:tabular-nums;font-weight:600}
.cbadge.ok .cb-mark{color:#1a9c52}.cbadge.no .cb-mark{color:#d23}
.tpill{font-size:10.5px;padding:2px 7px;border-radius:5px;background:var(--panel);border:1px solid var(--line);color:var(--faint)}
/* #289 — long paths elide rather than wrapping. Applied to .tpill itself, not to the two
   containers that happened to be reported: the pill is used in 17 places and any narrow one has the
   same problem, so per-context rules would just wait for the next narrow column. max-width:100% plus
   a min-width:0 parent is what lets it shrink; where the pill has room, nothing changes. */
.tpill{display:inline-block;position:relative;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:top;direction:rtl;text-align:left}
/* direction:rtl moves the ellipsis to the START, so the ELIDED end is the shared namespace prefix and
   the visible end is the tail that distinguishes siblings — color.foreground.brand vs
   color.foreground.brand-subtle stay tellable apart, where a right-side ellipsis renders both as the
   same stub. The path is pure-ASCII with no trailing punctuation, so bidi reordering is a no-op on it
   (asserted in the audit: every pill's text node still equals its title). */
.sg-failpill{padding-right:19px}
.sg-failpill .sg-fx{position:absolute;right:6px;top:2px;margin:0}
/* Interactive & action colors — per-mode note + add-accent row (#69). */
.ic-modenote{margin:0 0 14px;font-size:12.5px;color:var(--muted);line-height:1.55;padding:10px 13px;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm)}
/* A2c — per-mode foreground/text override rows. */
.fg-row{display:flex;align-items:center;gap:12px;margin-top:10px}
.fg-sw{width:34px;height:34px;flex:none;border-radius:var(--r-xs);border:1px solid var(--line2)}
.fg-badge{margin-left:auto;font-size:12.5px;font-weight:560;padding:5px 10px;border-radius:var(--r-sm)}
.fg-badge.ok{background:#eaf7f0;color:#1f7a4d}
.fg-badge.no{background:#fdecec;color:#a12}
.ic-add{display:flex;align-items:center;gap:12px;margin-top:14px}
.ic-addbtn{width:auto;margin-top:0;flex:none}
.ic-addhint{font-size:13px;color:var(--muted)}
/* Backgrounds card — the contrast-floor sub-control appended below the card body. */
/* Backgrounds Inverse card — the derived, read-only surface (docs/24 #61). */
.bg-derived{font-size:12.5px;color:var(--faint);font-style:italic}
.bg-floor{display:flex;align-items:center;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.bg-floor-lab{font-size:12.5px;font-weight:560;color:var(--muted)}
.bg-floor .select{margin-left:auto}
/* Interactive matrix (#69) — global-behavior caption, per-palette section header, slot rows, states. */
.gcap{margin:8px 0 2px;padding:0 2px}
.gcap-t{margin:0;font-size:12.5px;font-weight:680;text-transform:uppercase;letter-spacing:.06em;color:var(--faint)}
.gcap-d{margin:4px 0 0;color:var(--faint);font-size:12.5px;line-height:1.5;max-width:660px}
.psec-h{display:flex;align-items:center;justify-content:space-between;gap:12px}
.arow{padding:26px 2px}
.arow+.arow{border-top:1px solid var(--line)}
.arow-main{display:grid;grid-template-columns:56px minmax(0,1fr) 300px;gap:20px;align-items:start}
.arow-lead .arow-main{grid-template-columns:minmax(0,1fr) 300px}
.asw{width:56px;height:56px;flex:none;border-radius:var(--r-sm);border:1px solid var(--line2)}
.amid{min-width:0;display:flex;flex-direction:column;gap:9px;align-items:flex-start}
.alabel{font-size:14px;font-weight:640;line-height:1.2;color:var(--ink)}
.amid .sf-ctlblock{width:100%}
.amid .select{max-width:300px}
.amid .tpill{line-height:1.4}
.adesc{font-size:11.5px;color:var(--faint);line-height:1.45;max-width:340px}
.aex{width:300px;justify-self:end;display:flex;flex-direction:column;align-items:stretch;gap:8px}
.aex .cbadge{align-self:flex-end}
.aex-two{flex-direction:row;gap:14px}
.aex-spec{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;align-items:center}
.exbox{width:100%;min-height:72px;border-radius:var(--r-sm);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;padding:14px 16px;overflow:hidden}
.exbox.dark{background:#0d0d10;border-color:transparent}
.ibtn{display:inline-flex;align-items:center;gap:7px;border-radius:8px;padding:9px 16px;font-size:13.5px;font-weight:600;white-space:nowrap;background:var(--ibtn-bg)}
.ibtn:hover{background:var(--ibtn-hbg,var(--ibtn-bg))}
.ibtn.is-pressed,.ibtn.is-pressed:hover{background:var(--ibtn-pbg,var(--ibtn-hbg,var(--ibtn-bg)))}
.ibtn svg{width:16px;height:16px}
.ilink{font-size:15px;font-weight:600;text-decoration:underline;text-underline-offset:3px;color:var(--ilink-fg)}
.ilink:hover{color:var(--ilink-hfg,var(--ilink-fg))}
.ilink.is-pressed,.ilink.is-pressed:hover{color:var(--ilink-pfg,var(--ilink-hfg,var(--ilink-fg)))}
/* #291 — live hover/pressed on interactive examples: :hover is CSS-native; pressed is click-to-pin
   (see wirePress) since a bare :active vanishes on mouse-up, too fleeting to evaluate a color. */
.pinnable{cursor:pointer}
.pinnable.is-pressed{outline:2px solid var(--ink2);outline-offset:2px}
.inote{display:inline-flex;align-items:center;gap:7px;font-size:14px}
.inote-ic{display:inline-flex}
.inote-ic svg{width:17px;height:17px}
.astates{margin-top:16px;padding-top:14px;border-top:1px dashed var(--line2);margin-left:76px}
.astates-h{font-family:var(--mono);font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--faint);margin-bottom:10px}
.astates-g{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.astate{border:1px solid var(--line);border-radius:var(--r-xs);background:var(--paper);padding:11px 12px;display:flex;flex-direction:column;gap:9px}
.astate-h{display:flex;align-items:center;gap:10px}
.astate-sw{width:30px;height:30px;border-radius:6px;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.astate-n{font-size:12.5px;font-weight:600;color:var(--ink)}
.astate .select{width:100%;font-size:12px;padding:6px 9px;padding-right:26px}
@media(max-width:900px){.arow-main{grid-template-columns:56px 1fr}.arow-lead .arow-main{grid-template-columns:1fr}.aex{width:100%;grid-column:1/-1}.aex-two{grid-column:1/-1}.astates-g{grid-template-columns:1fr}.astates{margin-left:0}}
/* Surfaces & fills — full-width rows (Layout A, #68): controls LEFT · whitespace · example RIGHT, contrast below */
.sf-row{display:grid;grid-template-columns:56px 168px 172px 1fr 228px;gap:20px;align-items:start;padding:24px 0}
.sf-row+.sf-row{border-top:1px solid var(--line)}
.sf-sw{width:56px;height:56px;flex:none;border-radius:var(--r-sm);border:1px solid var(--line2)}
.sf-id{min-width:0;padding-top:2px}
.sf-name{font-size:14.5px;font-weight:620;letter-spacing:-.01em;line-height:1.25;color:var(--ink)}
.sf-id .tpill{margin-top:7px;line-height:1.4}
.sf-desc{font-size:12px;color:var(--faint);margin-top:7px;line-height:1.45}
.sf-ctl{display:flex;flex-direction:column;gap:12px;min-width:0}
.sf-ctlblock{display:flex;flex-direction:column;gap:6px}
.sf-ctlblock .select{width:100%}
.sf-derived{font-size:12px;color:var(--faint);font-style:italic;height:36px;display:flex;align-items:center}
.sf-right{grid-column:5;display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.sf-ex{width:228px;height:52px;border-radius:var(--r-sm);border:1px solid var(--line);display:flex;align-items:center;padding:0 16px;overflow:hidden}
.sf-ex-surface{gap:11px;font-size:13px}
.sf-ex-dot{width:14px;height:14px;border-radius:5px;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}
.sf-ex-fill{color:#fff;font-weight:600;font-size:13.5px}
.sf-ex-text{font-size:14.5px}
.sf-railnote{font-size:10.5px;color:var(--faint)}
@media(max-width:900px){.sf-row{grid-template-columns:56px 1fr;gap:14px}.sf-row .sf-ctl,.sf-right{grid-column:1/-1;align-items:flex-start}.sf-ex{width:100%}}
.contracts{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:18px 20px}
.contracts-sum{list-style:none;cursor:pointer;display:flex;align-items:baseline;gap:10px}
.contracts-sum::-webkit-details-marker{display:none}
.contracts-sum::before{content:'▸';color:var(--faint);font-size:11px;align-self:center;transition:transform .12s ease}
.contracts[open] .contracts-sum::before{transform:rotate(90deg)}
.contracts-t{font-size:15px;font-weight:620;color:var(--ink)}
.contracts-hint{font-size:11.5px;font-weight:500;color:var(--faint)}
.contracts:not([open]) .np-note{display:none}
.ctable{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
.ctable th,.ctable td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line)}
.ctable .mcol{text-align:center}
/* Token list: value columns read best flush-left (swatch+hex / px), overriding the shared centring. */
.toktable .mcol{text-align:left}
.pair{color:var(--ink2)}
.pair-path{display:block;color:var(--ink2)}
.pair-sub{display:block;font-size:11px;color:var(--faint);margin-top:1px}
.pvseg{display:inline-flex;gap:2px;padding:3px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r-sm);margin:2px 0 22px}
.pvseg-b{font:inherit;font-size:13px;padding:7px 15px;border:none;background:none;color:var(--ink2);border-radius:var(--r-xs);cursor:pointer}
.pvseg-b:hover{color:var(--ink)}
.pvseg-b.on{background:var(--paper);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.tok-val{display:inline-flex;align-items:center;gap:7px}
.tok-sw{display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid var(--line2);flex:none}
.tok-shadow{display:inline-block;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;color:var(--muted)}
.dot{display:inline-block;width:8px;height:8px;border-radius:999px;margin-right:5px;vertical-align:middle}
.dot.ok{background:#1a9c52}.dot.no{background:#d23}
.ratio{font-variant-numeric:tabular-nums;color:var(--muted)}
.errbar{border:1px solid #f2c6c6;background:#fdecec;color:#a12;border-radius:var(--r-sm);padding:10px 14px;font-size:13px;margin-bottom:16px}

/* Style guide (Preview → Style guide) — specimen layout; shell/pill come from .psec/.sub-lab/.tpill */
.sg-grid{display:grid;gap:14px;margin-top:2px}
.sg-g3{grid-template-columns:repeat(3,1fr)}.sg-g5{grid-template-columns:repeat(5,1fr)}
.sg-cw{display:flex;flex-direction:column;gap:8px;min-width:0}
.sg-pills{display:flex;gap:6px;flex-wrap:wrap}
.sg-card{position:relative;min-height:118px;border-radius:var(--r);border:1px solid var(--line);padding:14px;display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.sg-bcard{background:transparent!important}
.sg-mid{justify-content:center}
.sg-icard{min-height:104px;align-items:center;justify-content:center;background:var(--paper)}
.sg-ico svg{width:26px;height:26px;display:block}
.sg-lab{font-weight:640;font-size:14px;line-height:1.2}
.sg-sub{font-size:12px;opacity:.9}
.sg-failmk{position:absolute;top:8px;right:8px;width:15px;height:15px;border-radius:50%;background:#d21b1b;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center}
.sg-failpill{border-color:#e6a2a2!important;color:#b42318!important}
.sg-fx{color:#d23;font-weight:800;margin-left:3px}
.sg-tcg{display:grid;grid-template-columns:1fr 1fr minmax(150px,190px);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-top:2px}
.sg-tc{padding:10px 15px;display:flex;align-items:center;min-height:44px}
.sg-tc.sg-l{background:var(--lbg)}.sg-tc.sg-r{background:var(--dbg)}.sg-tc.sg-t{background:var(--panel);border-left:1px solid var(--line)}
.sg-tchd{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;min-height:0;padding-top:8px;padding-bottom:8px}
.sg-samp{font-size:15px;font-weight:600}
.sg-tcrow{box-shadow:inset 0 1px 0 rgba(128,128,128,.14)}
.sg-pblock{margin-top:30px}.sg-pblock:first-of-type{margin-top:6px}
.sg-phd{display:flex;align-items:center;gap:9px;margin-bottom:6px}
.sg-rn{font-weight:660;font-size:14.5px}
.sg-trow{display:grid;grid-template-columns:120px 1fr;gap:22px;align-items:start;padding:20px 0;border-top:1px solid var(--line)}
.sg-tlab{font-size:12.5px;font-weight:640}
.sg-tlfoot{margin-top:8px;display:flex;flex-direction:column;gap:5px;align-items:flex-start;font-size:10.5px;color:var(--muted)}
.sg-foothint{display:inline-flex;align-items:center;gap:6px}
.sg-btns{display:flex;gap:24px;flex-wrap:wrap}
.sg-btns.sg-inv{background:var(--sg-invp);border-radius:9px;padding:16px 18px;margin:-9px 0}
.sg-bcol{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.sg-st{font-size:10.5px;color:var(--muted);text-transform:capitalize;font-weight:600}
.sg-btns.sg-inv .sg-st{color:#c9ccce}
.sg-btn{font:inherit;font-size:13px;font-weight:600;border-radius:8px;padding:8px 14px;border:1.5px solid transparent;min-width:96px;text-align:center;cursor:default;white-space:nowrap}
.sg-callout{font-size:12.5px;color:var(--muted);background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 13px;margin-top:16px;line-height:1.5}
.tpill[data-sgtip]{position:relative}
.tpill[data-sgtip]:hover::after{content:attr(data-sgtip);position:absolute;z-index:40;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);background:#111417;color:#f2f4f5;font-family:var(--mono);font-size:11px;font-weight:500;white-space:nowrap;padding:6px 9px;border-radius:7px;box-shadow:0 6px 20px rgba(0,0,0,.28);pointer-events:none}
.tpill[data-sgtip]:hover::before{content:"";position:absolute;z-index:40;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%);border:5px solid transparent;border-top-color:#111417;pointer-events:none}
@media(max-width:760px){.sg-g3,.sg-g5{grid-template-columns:repeat(2,1fr)}}
/* Heading sizes — shape cards, range, and the per-size table (#328 follow-through) */
/* Label + description, then controls. The gap under the description is what was missing: the cards
   sat hard against the heading with the explanation stranded below them. */
.tsz-field{margin-top:22px}
.tsz-field:first-of-type{margin-top:6px}
.tsz-flabel{display:block;font-weight:600;font-size:13.5px;color:var(--ink)}
.tsz-fdesc{margin:3px 0 12px;font-size:12.5px;color:var(--muted);line-height:1.5;max-width:72ch}

/* Option cards: a select cannot carry a sentence per option, and the shape is a foundational choice
   made once. Deviation from doc 26 (3+ options → select) — the rule that earns it is in doc 24. */
.shape-cards{display:grid;gap:9px;grid-template-columns:repeat(auto-fit,minmax(184px,1fr));width:100%}
.shape-card{text-align:left;font:inherit;cursor:pointer;background:var(--paper);border:1px solid var(--line2);border-radius:var(--r-sm);padding:12px 13px 13px;display:flex;flex-direction:column;gap:3px}
.shape-card:hover:not(:disabled){border-color:var(--muted)}
.shape-card:focus-visible{outline:2px solid var(--ink2);outline-offset:1px}
.shape-card.on{border-color:var(--ink);background:var(--panel);box-shadow:0 0 0 1px var(--ink)}
.shape-card:disabled{opacity:.5;cursor:not-allowed}
.shape-card b{font-size:13px;color:var(--ink)}
.shape-card.on b::after{content:' ✓';font-size:11px}
.shape-blurb{font-size:11.5px;color:var(--muted);line-height:1.4}
.shape-nums{font-size:10.5px;color:var(--faint);margin-top:2px}
.shape-blocked{grid-column:1/-1;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--ink2);background:var(--paper);border:1px solid var(--line2);border-radius:var(--r-sm);padding:9px 11px}
.shape-release{font:inherit;font-size:12px;padding:4px 10px;border:1px solid var(--line2);border-radius:var(--r-xs);background:var(--panel);color:var(--ink);cursor:pointer}
.shape-release:hover{border-color:var(--muted)}
.shape-release:focus-visible{outline:2px solid var(--ink2);outline-offset:1px}

/* Range — the two fields align on their CONTROLS, not their labels, so the select and the toggle
   sit on one line however tall the labels wrap. */
.range-row{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start;width:100%}
.range-f{display:flex;flex-direction:column;gap:6px}
.range-f > .pfk{line-height:1.2}
.range-f .select{min-width:158px}
.range-tg{display:flex;align-items:center;min-height:31px}
.range-tglab{font-size:12.5px;color:var(--ink);white-space:nowrap}

.szt-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.szt-headlab{font-size:13px;font-weight:620;color:var(--ink)}
.szt-badge{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:100px;background:var(--paper);border:1px solid var(--line2);color:var(--ink2)}
.mtbl{margin-top:18px}
.mtbl-cap{margin:0 0 7px;font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
/* Wide tables scroll in their own container so the page body never does (doc 26). The size column is
   pinned so the names survive that scroll. A trailing FILLER column absorbs any slack, which is what
   keeps the size column and every mode column at a fixed width whether the brand has one mode or six
   — without it width:100% hands all the spare width to the single-mode case. */
.mtbl-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r-sm)}
.mtbl-tbl{border-collapse:separate;border-spacing:0;width:100%;font-size:12.5px}
.mtbl-tbl th,.mtbl-tbl td{padding:6px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
.mtbl-tbl thead th{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:var(--paper)}
.mtbl-tbl tbody tr:last-child td{border-bottom:0}
.mtbl-stick{position:sticky;left:0;background:var(--panel);z-index:2;border-right:1px solid var(--line);width:var(--tbl-col-name);min-width:var(--tbl-col-name)}
.mtbl-tbl thead .mtbl-stick{z-index:3;background:var(--paper)}
/* Mode columns are equal and fixed: past roughly five modes the total exceeds the pane and the
   container scrolls, rather than the columns compressing until the steppers stop fitting. */
.mtbl-mode{width:var(--tbl-col-mode);min-width:var(--tbl-col-mode)}
.mtbl-fill{width:auto;padding:0 !important;border-bottom-color:var(--line)}
.mtbl-fill.mtbl-spec{padding:6px 12px !important;min-width:150px}
.mtbl-spec-t{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink2);font-size:14px}
.mtbl-name{font-size:12.5px;font-weight:600;color:var(--ink)}
/* Out-of-range rows stay VISIBLE rather than disappearing — a size the ramp could have is a fact
   worth showing, and its absence from the table was reading as "this brand has no lg display". */
.mtbl-off td{background:repeating-linear-gradient(135deg,transparent,transparent 5px,rgba(24,24,27,.028) 5px,rgba(24,24,27,.028) 10px)}
.mtbl-off .mtbl-stick{background:var(--panel)}
.mtbl-off .mtbl-name{color:var(--faint);text-decoration:line-through;text-decoration-thickness:1px}
.mtbl-offval{font-size:12.5px;color:var(--faint)}
.mtbl-ro{font-size:10px;color:var(--faint);font-weight:400;text-transform:none;letter-spacing:0}
/* The stepper states the constraint: a disabled −/+ means this size has no room that way, where a
   filtered dropdown just omitted the option and never said why. */
.mcell{display:inline-flex;align-items:center;gap:4px}
.mstep{font:inherit;font-size:13px;line-height:1;width:22px;height:24px;border:1px solid var(--line2);border-radius:var(--r-xs);background:var(--paper);color:var(--ink);cursor:pointer;flex:none}
.mstep:hover:not(:disabled){border-color:var(--muted)}
.mstep:disabled{opacity:.32;cursor:not-allowed}
.mstep:focus-visible{outline:2px solid var(--ink2);outline-offset:1px}
.mval{font-size:12.5px;min-width:32px;text-align:center;color:var(--muted)}
.mval.pin{color:var(--ink);font-weight:650}
.mreset{font:inherit;font-size:12px;line-height:1;width:20px;height:24px;border:1px solid transparent;border-radius:var(--r-xs);background:none;color:var(--faint);cursor:pointer;flex:none}
.mreset:hover{color:var(--ink2)}
.mreset:focus-visible{outline:2px solid var(--ink2);outline-offset:1px}
.mreset-sp{display:inline-block;width:20px;flex:none}

/* Typography Preview tab — read-only specimens at size, in every mode. */
.tp-fam{font-size:12.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.tp-wgrid{display:flex;flex-direction:column;gap:2px;margin-top:6px}
.tp-wrow{display:flex;align-items:baseline;gap:14px;padding:9px 0;border-bottom:1px solid var(--line)}
.tp-wrow:last-child{border-bottom:0}
/* Same 112px / 148px as the tables, from the shared tokens, so the page reads on one grid even
   where the content is a specimen rather than a control. */
.tp-wkey{flex:none;width:var(--tbl-col-name);font-size:12.5px;font-weight:600;color:var(--ink)}
.tp-wnum{flex:none;width:var(--tbl-col-mode);font-size:12px;color:var(--muted)}
.tp-wsamp{flex:1;min-width:0;font-size:17px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* Typography — Foundations / Styles tabs (#272) */
.tabnote{font-size:12.5px;color:var(--faint);margin:10px 0 0}
.tf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.tf-card{border:1px solid var(--line);border-radius:var(--r);padding:14px;display:flex;flex-direction:column;gap:9px;min-width:0}
.tf-role{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink2)}
.tf-desc{font-size:11.5px;color:var(--faint);line-height:1.45;min-height:32px}
.tf-in{width:100%;padding:7px 9px;border:1px solid var(--line2);border-radius:var(--r-xs);font:inherit;font-size:13px;background:var(--paper);color:var(--ink);min-width:0}
.tf-stat{font-size:11px;font-weight:600}
.tf-stat.ok{color:#1a7f4b}.tf-stat.no{color:#b06a12}
/* line-height must exceed the font's em box (~1.2) or descenders clip */
.tf-prev{border-top:1px solid var(--line);padding-top:10px;font-size:26px;line-height:1.4;overflow:hidden;white-space:nowrap}
.tf-note{font-size:12.5px;color:var(--muted);background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm);padding:11px 13px;line-height:1.55;margin:14px 0 0}
.tf-note b{color:var(--ink2)}
.tf-note.warn{background:#fff8ed;border-color:#f0d9b5;color:#7a5320}
.tf-note.warn b{color:#5c3d16}
/* Typeface library (#269) — the primitive tier as full-width rows: identity left, the
   derived facts in the middle, specimen right. Full-width rather than cards because the
   list grows with the brand and the fallback stack needs the horizontal room. */
.tf-lib{display:flex;flex-direction:column;gap:10px}
.tf-libro{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr) 190px;gap:16px;align-items:center;border:1px solid var(--line);border-radius:var(--r);padding:12px 14px}
.tf-libid{display:flex;flex-direction:column;gap:6px;align-items:flex-start;min-width:0}
.tf-libname{font-size:14.5px;font-weight:650;color:var(--ink)}
.tf-libmeta{display:flex;flex-direction:column;gap:4px;min-width:0}
.tf-vf{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.tf-usedby{font-size:11.5px;color:var(--faint)}
.tf-fall{font-size:11.5px;color:var(--faint);line-height:1.45;min-width:0;overflow-wrap:anywhere}
.tf-libro .tf-prev{border-top:0;padding-top:0;font-size:24px;text-align:right}
.tf-derivenote{font-size:12px;color:var(--faint);line-height:1.55;margin:11px 0 0}
.tf-unbound{font-size:11.5px;color:var(--muted);border-top:1px solid var(--line);padding-top:10px;line-height:1.45}
@media(max-width:900px){.tf-libro{grid-template-columns:1fr 1fr}.tf-libro .tf-prev{text-align:left}}
.sl-note{font-size:12.5px;color:var(--muted);background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 13px;line-height:1.5;margin:12px 0 0}
/* position:relative makes the ladder the offsetParent, so a row's offsetTop is relative to
   it — without it the open-on-first-in-use-rung scroll overshoots to the bottom. */
.sl-ladder{position:relative;max-height:460px;overflow-y:auto;border:1px solid var(--line);border-radius:var(--r);margin-top:4px}
.sl-row{display:grid;grid-template-columns:118px 1fr;gap:14px;align-items:center;padding:7px 13px;border-top:1px solid var(--line)}
.sl-row:first-child{border-top:0}
.sl-row.unused{opacity:.42}
.sl-meta{display:flex;align-items:center;gap:7px}
.sl-dot{width:5px;height:5px;border-radius:50%;background:var(--ink);flex:none}
.sl-row.head .sl-dot{background:#3f6ae0}
.sl-row.unused .sl-dot{background:var(--line2)}
.sl-px{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
.sl-rem{font-size:11px;color:var(--faint)}
.sl-samp{line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sl-who{font-size:10.5px;color:var(--faint);margin-top:3px}
.sl-key{display:flex;gap:18px;flex-wrap:wrap;font-size:11px;color:var(--faint);margin-top:10px}
.sl-keyi{display:inline-flex;align-items:center;gap:5px}
.sl-keyi i{width:6px;height:6px;border-radius:50%;display:inline-block}
.sl-keyi i.k-head{background:#3f6ae0}.sl-keyi i.k-fix{background:var(--ink)}.sl-keyi i.k-off{background:var(--line2)}
.ws-table{border-collapse:separate;border-spacing:0;width:100%;font-size:12.5px}
.ws-table th{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);text-align:left;padding:0 9px 10px;white-space:nowrap}
.ws-table td{padding:8px 9px;border-top:1px solid var(--line)}
.ws-table th.ws-c,.ws-table td.ws-c{text-align:center}
.ws-num{font-size:12px;font-weight:640;margin-right:8px}
.ws-name{color:var(--muted)}
.ws-mark{font-size:12px}
.ws-mark.yes{color:var(--ink)}.ws-mark.no{color:var(--faint)}.ws-mark.unknown{color:var(--line2)}
.lt-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.lt-cell{border:1px solid var(--line);border-radius:var(--r-sm);padding:11px 12px;min-width:0}
.lt-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.lt-key{font-size:12px;font-weight:640;color:var(--ink2)}
.lt-in{width:88px;text-align:right}
.lt-who{font-size:10.5px;color:var(--faint);margin-top:4px}
.lt-prev{margin-top:9px;font-size:13px;color:var(--ink2);max-width:52ch}
.wr-row{display:grid;grid-template-columns:96px 168px 1fr auto;gap:14px;align-items:center;padding:11px 0;border-top:1px solid var(--line)}
.wr-row:first-of-type{border-top:0}
.wr-name{font-size:13px;font-weight:640}
.wr-samp{font-size:20px;line-height:1.4;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.cs-wrap{overflow-x:auto}
.cs-table{border-collapse:separate;border-spacing:0;width:100%;font-size:12.5px}
.cs-table th{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);text-align:left;padding:0 9px 10px;white-space:nowrap}
.cs-table th.cs-c,.cs-table td.cs-c{text-align:center}
.cs-table td{padding:9px;border-top:1px solid var(--line);vertical-align:middle}
.cs-name{font-size:12px;font-weight:640}
.cs-count{font-size:10.5px;color:var(--faint)}
.cs-table input[type=checkbox]{width:15px;height:15px;accent-color:var(--ink);cursor:pointer;margin:0}
/* 11 columns in an 850px content column — keep the selects tight so the table fits without
   relying on the horizontal scroll, which hides the italic/link toggles at the right edge. */
.cs-table td{padding:9px 6px}
.cs-table th{padding:0 6px 10px}
.cs-table .select{max-width:100px}
.cs-table .select.cs-nudge{max-width:84px}
.fz-list{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-top:4px}
.fz-row{display:grid;grid-template-columns:150px 96px 1fr;gap:12px;padding:9px 13px;border-top:1px solid var(--line);align-items:center;font-size:12px}
.fz-row:first-child{border-top:0}
.fz-name{font-size:11px}
.fz-pair{font-size:11px;color:var(--muted)}
.fz-bar{position:relative;height:7px;background:var(--paper);border-radius:4px;border:1px solid var(--line)}
.fz-fill{position:absolute;top:0;bottom:0;background:var(--ink2);border-radius:4px;opacity:.75}
.fz-clamp{font-size:10px;color:var(--faint);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fz-warn{font-size:12.5px;background:#fff8ed;border:1px solid #f0d9b5;color:#7a5320;border-radius:var(--r-sm);padding:10px 13px;line-height:1.5;margin:10px 0 0}
.tr-block{margin-top:34px}.tr-block:first-of-type{margin-top:4px}
.tr-band{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-sm);padding:9px 13px;margin-bottom:6px}
.tr-band-n{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--ink2)}
.tr-band-c{font-size:10.5px;color:var(--muted)}
.tr-band-d{font-size:11.5px;color:var(--faint)}
.tr-row{display:grid;gap:6px;padding:14px 0;border-top:1px solid var(--line)}
.tr-row:first-of-type{border-top:0}
.tr-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.tr-attr{font-size:10.5px;color:var(--faint)}
/* true size; padding keeps descenders inside the clip box even at tight leading */
.tr-samp{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-bottom:.24em;margin-top:2px}
/* Per-mode ramp columns — one per mode, side by side. Scrolls horizontally rather than wrapping: a
   wrapped column reads as a new row, which is the confusion the side-by-side table exists to remove.
   min-width:0 on the column is what actually lets the sample's ellipsis work inside a grid track. */
.tr-modes{display:grid;gap:14px;overflow-x:auto;padding-bottom:2px}
.tr-mode{min-width:0;border-left:1px solid var(--line);padding-left:11px}
.tr-mode:first-child{border-left:0;padding-left:0}
.tr-mode-n{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--ink2);margin-bottom:2px}
@media(max-width:760px){.tf-grid{grid-template-columns:1fr}.lt-grid{grid-template-columns:1fr}}
/* minmax(0,1fr), not a bare 1fr — a grid item's automatic minimum is min-content, so a bare
   1fr track never clamps and the widest child drags the whole column past the viewport.
   The desktop rule above already uses the idiom; the collapse override had lost it (#144). */
/* Below 900 the rail is not a sidebar. It used to become a static stack, which measured ~690px tall
   and pushed every page's content below the fold; it is now hidden and its destinations move into
   the Pages menu in the bar, which costs 0px of vertical space. The two must switch together —
   whichever way this breakpoint moves, exactly one of rail/navbtn is visible at any width. */
@media(max-width:900px){.shell{grid-template-columns:minmax(0,1fr);gap:40px}.rail{display:none}.navbtn{display:flex}.phead{gap:16px}.pfield.r{margin-left:0}}
/* Narrow viewports (#144). The plugin iframe runs this same UI, so its window lands here:
   gutters, hero and chrome all shrink, and nothing is allowed to overflow horizontally. */
/* The bar's dropdowns are anchored right:0 to their wrapper, which is only safe while the wrapper
   sits at the viewport's right edge. When the bar wraps, the actions land at the LEFT and a 288px
   panel hangs ~152px off-screen — invisible to an overflow sweep, because a closed menu isn't in
   the DOM at all. margin-left:auto keeps the actions right-aligned on their own wrapped row, which
   fixes the cause; the max-width is the belt-and-braces cap for viewports under ~312px. */
/* Right-aligning the row is necessary but not sufficient: each menu anchors to its OWN wrapper,
   and the brand button is not the rightmost item, so its panel still started ~122px short of the
   edge and hung 9px off at 360px. Dropping the wrappers to static makes the actions row itself the
   containing block, so both panels align to the row's right edge — the one edge that is always
   flush with the viewport gutter, whatever the buttons ahead of them are doing. */
@media(max-width:640px){#app{padding:0 16px 72px}.bar{flex-wrap:wrap;gap:10px;padding:16px 2px 10px}.bar-actions{flex-wrap:wrap;margin-left:auto;position:relative}.barmenu-wrap{position:static}.brandmenu{max-width:calc(100vw - 24px)}.hero h1{font-size:28px;letter-spacing:-0.02em}.lede{font-size:15px;margin-top:14px}.shell{gap:28px}.lab{padding:0 3px}}
/* Compact bar. Full labels need ~455px and the row has 456 at 480px — i.e. it only "fits" by a
   pixel, so the treatment starts before the numbers get tight. Dropping the "Theme studio"
   descriptor and the Export word (the ↓ and caret stay, and aria-label keeps the accessible name)
   takes the row to ~278px, which is a single line down to ~312px of viewport. */
@media(max-width:560px){.studio{display:none}.barbtn-lab{display:none}}
/* The Pages control. Hidden by default — the 900 rule above turns it on exactly where the rail
   turns off. It keeps the current page name while there is room for it (159–173px of bar slack at
   480–900), which is the orientation a bare glyph cannot give; below 480 it degrades to the glyph.
   Below 380 the wordmark goes too: a third control needs ~54px and the bar has only 53px of slack
   at 360 and 13px at 320, so without this the row wraps back to two lines on small phones. */
@media(max-width:480px){.navbtn-lab{display:none}}
@media(max-width:380px){.wordmark{display:none}}
.navmenu{width:300px;max-height:calc(100vh - 130px);overflow-y:auto}
.nav-item{display:flex;width:100%;text-align:left;border:0;background:none;font:inherit;padding:9px 8px;border-radius:var(--r-xs);cursor:pointer;color:var(--ink2)}
.nav-item:hover{background:var(--paper)}
.nav-item.cur{background:var(--paper)}
.nav-item.cur .stage-t b{color:var(--ink)}
.navmenu .rail-note{margin:14px 8px 2px;padding-top:12px}
/* Below ~480 the 10 hex read-outs under a ramp cannot fit (each needs ~45px, the row has ~406):
   drop the hex and keep the step number, so labels stay 1:1 under their swatches. Wrapping or
   scrolling the row would break that alignment, which is the whole point of a ramp. */
/* The contrast + breakpoint tables have more columns than 456px can hold, and neither shrinks:
   ly-table pushed the page 57px, ctable was silently clipped by an ancestor (worse — the cells
   were unreadable rather than reachable). display:block turns each into its own scroll box, so
   the table scrolls and the page does not. Applied only here; both fit unaided at 640+. */
@media(max-width:480px){#app{padding:0 12px 64px}.hero h1{font-size:24px}.lab-hex{display:none}.ctable,.ly-table{display:block;overflow-x:auto}}
/* Plugin resize grip (#144) — plugin-only; a Figma iframe has no window chrome of its own.
   touch-action:none so the pointer capture owns the gesture instead of the page scrolling. */
.resize-grip{position:fixed;right:0;bottom:0;width:16px;height:16px;z-index:60;cursor:nwse-resize;touch-action:none;color:var(--faint)}
.resize-grip::after{content:"";position:absolute;right:3px;bottom:3px;width:9px;height:9px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;border-bottom-right-radius:2px;opacity:.45}
.resize-grip:hover::after{opacity:.9}
`;
const styleEl = document.createElement('style');
styleEl.textContent = STYLE;
document.head.append(styleEl);

/** Distance from the pointer to the window's edge while the grip is held. The grip sits flush in
 *  the corner, so the dragged size is the pointer position plus this — the same small offset
 *  Figma's own resize sample uses. */
const GRIP_INSET = 5;

/** Mount the plugin window's resize grip (#144). Attached to `body`, not `#app`, because `#app` is
 *  re-rendered wholesale on every state change and the grip must outlive that. Pointer capture is
 *  what makes the drag survive the pointer leaving the 16px target — without it the gesture dies
 *  the moment you move faster than the window resizes. Gated on the `PRISM3_HOST` define rather
 *  than `commit.isFigma` so the branch is statically false on web and esbuild really does drop
 *  this function (a runtime check would keep it). The three CSS rules still ride along in the
 *  shared stylesheet, which is a string constant — not worth splitting for ~150 bytes. */
const mountResizeGrip = (): void => {
  const grip = el('div', 'resize-grip');
  grip.title = 'Drag to resize the plugin window';
  let dragging = false;
  const sizeFrom = (e: PointerEvent): [number, number] => [e.clientX + GRIP_INSET, e.clientY + GRIP_INSET];
  grip.addEventListener('pointerdown', (e) => {
    dragging = true;
    grip.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  grip.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const [w, h] = sizeFrom(e);
    commit.requestResize(w, h, false);
  });
  // Pointer-up AND pointer-cancel both end the drag: cancel fires if the browser takes the
  // gesture back, and without it `dragging` would stay true and the next hover would resize.
  const end = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    if (grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId);
    const [w, h] = sizeFrom(e);
    commit.requestResize(w, h, true);   // commit → the host persists this size
  };
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
  document.body.append(grip);
};
if (PRISM3_HOST === 'figma') mountResizeGrip();

build();
