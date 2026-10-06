/**
 * Studio headless smoke suite (#767, deciding #333).
 *
 *   npm run -w @prism3/studio build && npm run -w @prism3/studio test:smoke
 *
 * WHY THIS EXISTS, AND WHY IT COULD NOT BE A UNIT TEST. `src/main.ts` touches `document` at import
 * time, so it cannot be loaded into a Node harness at all. That is not a stylistic gap: it means the
 * ~9,000 lines of interaction logic in that file have NO available unit granularity, which is exactly
 * why both existing suites (`test-provenance.ts` #722, `test-export-settings.ts` #723) cover modules
 * EXTRACTED from it rather than the file itself. Until that seam moves (#768), a browser is the only
 * harness that can see this code run.
 *
 * And the defects the file actually produces are rendering and interaction defects, not shape bugs:
 * a label that disagrees with what selecting it does (#330), a specimen frozen at the wrong value
 * (#422), a select that jumps the page while scrolled (#485), text invisible against its own ground
 * (#555). A jsdom test verifies shapes. #333 asked which shape to build; #767 answered "smoke".
 *
 * WHAT IT REPLACES. Every behavioral verification this repo has done on the studio — including all
 * ten fixes merged 2026-08-07 — was a throwaway Playwright script, deleted after the PR. Real
 * verification, never captured. This is the same driving, committed.
 *
 * COMPOSES WITH, DOES NOT REPLACE. `npm run -w @prism3/studio test` still runs #722/#723's ~150
 * assertions unchanged; this is a separate `test:smoke` script and a separate CI step, so a browser
 * flake can never take the pure suites down with it.
 *
 * ── determinism ────────────────────────────────────────────────────────────────────────────────
 *
 * Every wait in this file is a wait on a REAL CONDITION — a selector, `document.fonts.ready`, or a
 * `waitForFunction` on the state the click was supposed to produce. There is not one arbitrary sleep,
 * deliberately: a flaky browser suite that blocks every PR is the fastest way to erode trust in gates
 * generally, and this repo's gate discipline is worth more than this suite is. (`mode-audit.mjs`, deleted
 * in UI redesign S8.3, used `waitForTimeout` throughout: an ad-hoc audit a human read, a different tradeoff
 * from something CI runs on every push.)
 *
 * PORT. This serves on an EPHEMERAL port (`listen(0)`) rather than a fixed one, as `mode-audit.mjs` did
 * too until S8.3 deleted it (#1898): two harnesses on one port collide as `EADDRINUSE`, which reads exactly like a test
 * failure and would be debugged as one. Picking another fixed number only moves the collision.
 *
 * FRESH CONTEXT PER BRAND. The studio persists its working brand to `localStorage`, so a shared
 * context would carry brand 1's state — and any override this suite writes — into brand 2. A new
 * context per brand also puts the app back on its first-run start screen, which is how a brand gets
 * chosen without going through the overwrite-confirm path.
 */
import { createServer } from 'node:http';
import { appendFile, readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { hookGuard } from './test-hooks.mjs';
import { assertBundleFresh, STUDIO_SOURCE_ROOTS } from './test-bundle-freshness.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
// Every element this suite LOCATES is found by its `data-p3` hook (F1), minted by `hook()` in
// `src/main.ts` — not by a class name, and not by a section title. A restyle or a rename therefore does
// not move what the suite reads. Visible copy is still asserted where the copy is the thing under test.
// Two things still read classes on purpose: the shared STATE tokens (`.on`, `.active`, `.cur`), which
// carry state rather than identity, and the probe's `cls` labels, which only name a node in a failure
// message. The guard (`test-hooks.mjs`) fails any hook this file names that never rendered, by name.
const hooks = hookGuard(import.meta.url);

// ---- the assertion harness -------------------------------------------------------------------
// Same `ok(...)` shape as `test-provenance.ts` / `test-export-settings.ts`, so the three suites read
// alike and a failure line means the same thing in all of them.
let failed = 0;
let executed = 0;
const failures = [];
const ok = (cond, label) => {
  executed++;
  if (cond) return;
  failed++;
  failures.push(label);
  console.error(`  ✗ ${label}`);
};

// The bundle this suite drives must be at least as new as its sources (#2067): a stale `dist/main.js` is
// the old UI, measured and reported as this one. The check and its roots: `test-bundle-freshness.mjs`.
assertBundleFresh({ repo: join(ROOT, '../..'), bundle: 'apps/studio/dist/main.js', roots: STUDIO_SOURCE_ROOTS, label: 'main.js freshness',
  effect: 'this suite would test the old UI', build: 'npm run -w @prism3/studio build' });

// ---- the static server -----------------------------------------------------------------------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.map': 'application/json' };
// Read BEFORE writing the header — the trap the deleted `mode-audit.mjs` recorded at #565: a missing file threw
// with the 200 already sent, so the catch's `writeHead(404)` raised ERR_HTTP_HEADERS_SENT outside the
// try, unhandled, and killed the harness. A harness that exits instead of reporting looks like a
// clean run.
const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

// ---- the rendered-legibility probe -----------------------------------------------------------
/**
 * Every text node's ink against the ground it is ACTUALLY drawn on — the opacity chain applied and
 * every translucent layer composited down to the first opaque ancestor — AND, separately, every
 * form control's ink against its own field ground.
 *
 * This is the class of defect `lint:contrast` structurally cannot see. That gate holds the chrome's
 * TOKEN VALUES to 4.5:1 and is right to; #555 then found `.mo-playnote` rendering at 3.12:1 because
 * a legal `--faint` was faded through `opacity: .75`, and four families of fixed-ground specimen
 * inked with a mode-resolved color (1.00–1.61:1 — invisible). The token was legal in every case. The
 * pairing was not, and only a render can tell you that.
 *
 * WHY THE SECOND COLLECTION EXISTS (#1031). The text walk requires an element to own a text node,
 * and A FIELD'S VALUE IS NOT A TEXT NODE — `<input value="my-brand">` has no child nodes at all. So
 * every editable control in the studio was outside this probe's reach, not merely unvisited: had the
 * sweep opened the brand menu, the walk would still have measured its captions and skipped its two
 * inputs. #1031 was near-white ink in exactly those two inputs. A field is also the one place the UA
 * supplies the ink when the author sets only a background, which is the mechanism that produced it.
 * The caret is measured with the ink for the same reason at one keystroke's remove.
 *
 * `rootSel` scopes the walk. Called with nothing it measures the document, which is what the sweep
 * wants; called with a selector it measures inside that node, which is how the overlay section can
 * assert that the brand menu's OWN nodes were seen rather than that the page as a whole was clean —
 * a total over the document would stay green with the popover contributing nothing (docs/34 shape 9,
 * which is how #1031 shipped past a suite whose stated purpose was invisible text).
 *
 * Runs in the page rather than over a screenshot: a pixel diff would answer "did this change", and
 * the question here is "can this be read".
 */
const LEGIBILITY_PROBE = (rootSel) => {
  /** Every computed color this probe could not read, by node and property (review of #1777). A node whose
   *  ink or ground could not be parsed used to be dropped by `if (!col) continue` — uncounted, the same
   *  silence as #1069's carve-out by another route — so it is RECORDED here and the suite fails on it by name.
   *
   *  Chrome serializes hex, named and `rgb()` colors as `rgb[a](…)`, but a `color-mix()` in sRGB as
   *  `color(srgb …)`, and `oklch()` / `lab()` / mixes in other spaces in their own notation. Anything not
   *  already sRGB is converted BY THE BROWSER — relative color syntax, `color(from <c> srgb r g b / alpha)`,
   *  on a scratch node — so this reads what Chrome paints rather than re-implementing color spaces. Channels
   *  outside the sRGB gamut are clipped, which is what the display does with them. */
  const unparsed = [];
  let scratch = null;
  const toSrgb = (s) => {
    if (!scratch) { scratch = document.createElement('i'); scratch.style.display = 'none'; document.body.append(scratch); }
    scratch.style.color = '';
    scratch.style.color = `color(from ${s} srgb r g b / alpha)`;
    return scratch.style.color ? getComputedStyle(scratch).color : '';
  };
  const parseSrgb = (s) => {
    let m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (m) { const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    m = /^color\(srgb\s+([^)]+)\)$/.exec(s);
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number);
      const ch = (v) => Math.min(255, Math.max(0, v * 255));
      return { r: ch(p[0]), g: ch(p[1]), b: ch(p[2]), a: p.length > 3 ? Math.min(1, Math.max(0, p[3])) : 1 };
    }
    return null;
  };
  const parse = (s, el, prop) => {
    const v = (s ?? '').trim();
    const c = parseSrgb(v) ?? (v ? parseSrgb(toSrgb(v)) : null);
    if (!c || [c.r, c.g, c.b, c.a].some((n) => !Number.isFinite(n))) {
      if (el) unparsed.push({ cls: name(el), prop, value: v.slice(0, 60) });
      return null;
    }
    return c;
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /** Walk up compositing every translucent background until an opaque one is reached; the canvas
   *  under everything is white, which is what the page paints when nothing else claims a pixel. */
  const groundOf = (el) => {
    let acc = null;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const c = parse(cs.backgroundColor, n, 'background-color');
      if (c && c.a > 0) {
        const layer = { ...c, a: c.a * Number(cs.opacity) };
        acc = acc ? over(acc, layer) : layer;
        if (acc.a >= 0.999) return { ...acc, a: 1 };
      }
    }
    const white = { r: 255, g: 255, b: 255, a: 1 };
    return acc ? over(acc, white) : white;
  };
  const root = rootSel ? document.querySelector(rootSel) : document;
  if (!root) return { text: [], fields: [], unparsed, rootFound: false };
  const round = (n) => Math.round(n * 100) / 100;
  const name = (el) => `${el.tagName.toLowerCase()}.${(typeof el.className === 'string' ? el.className : '').trim().replace(/\s+/g, '.') || '-'}`;
  /** Laid out at all? Shared by both walks so they agree on what "rendered" means. Returns the
   *  effective opacity of a node that takes up space, or `null` for one that is not drawn.
   *
   *  NO OPACITY CARVE-OUT (#1069). This used to return 0 — "not drawn" — for any node whose opacity
   *  chain multiplied out under 0.02, on the theory that such a node was "a collapsed panel
   *  mid-transition". The theory had no referent: the stylesheet transitions no opacity at all, and a
   *  census over the whole sweep, taken when this landed, found no text node under 0.5 before or after
   *  animations settle.
   *  What the carve-out did do was excuse the extreme of the defect this probe exists for — every nav
   *  label at `opacity: .011`, invisible on screen, measured by nothing, while the summary printed
   *  "lowest rendered contrast anywhere: 3.04:1". A node at near-zero opacity composites to ~1:1 and
   *  fails every bar below, which is the verdict it deserves.
   *
   *  "Mid-transition" is handled where it belongs, by WAITING for it: `settle()` in the harness lets
   *  every finite running animation finish before the probe runs. A node that is still near-invisible
   *  after that is not in motion; it is shipped invisible. */
  const drawn = (el, cs) => {
    if (cs.visibility === 'hidden' || cs.display === 'none') return null;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    let op = 1;
    for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
    return op;
  };

  const text = [];
  for (const el of root.querySelectorAll('*')) {
    // OWN text only. Measuring an ancestor's `textContent` would attribute a child's ink to the
    // parent's color and report pairings that are drawn nowhere.
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    const op = drawn(el, cs);
    if (op === null) continue;
    const col = parse(cs.color, el, 'color');
    if (!col) continue;   // recorded in `unparsed`, which fails the suite by name
    const ground = groundOf(el);
    // A specimen that names the engine role pair it previews (#1652) also reports what it RENDERED for
    // each half, the column label it sits under, and its row, so the suite can check the claim against the
    // emission rather than trust it. The fill is the pair host's OWN background, not `ground`: the claim is
    // about the button, and a composited ground would hide a mispainted fill behind whatever sits under it.
    const pairHost = el.closest('[data-specimen-pair]');
    const pairRow = pairHost?.closest('[data-p3="style-guide-buttons"]');
    text.push({
      ratio: round(ratio(over({ ...col, a: col.a * op }, ground), ground)),
      cls: name(el),
      text: [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').slice(0, 44),
      // The node's hook, when it has one — how a section asserts that a SPECIFIC node was measured.
      hook: el.getAttribute('data-p3'),
      // The opacity chain, reported so a failure can say WHY the ratio is low (#1069): a faded node
      // and a mis-inked one fail the same bar and want different fixes.
      op: round(op),
      // What classifies the node (#779): its size and weight decide WCAG's normal/large bar, and the render
      // site's own `data-specimen` decides whether it is chrome at all. `inlineInk` is NOT a classifier —
      // it is the audit of the marker, compared against it below.
      px: parseFloat(cs.fontSize),
      weight: Number(cs.fontWeight),
      specimen: el.closest('[data-specimen]') !== null,
      inlineInk: (() => { for (let n = el; n; n = n.parentElement) if (n.style?.color) return true; return false; })(),
      pair: pairHost ? {
        claim: pairHost.getAttribute('data-specimen-pair'),
        ink: col,
        fill: parse(getComputedStyle(pairHost).backgroundColor, pairHost, 'background-color'),
        state: pairHost.closest('[data-p3="style-guide-state"]')?.querySelector('[data-p3="style-guide-state-name"]')?.textContent.trim() ?? '',
        row: pairRow ? [...document.querySelectorAll('[data-p3="style-guide-buttons"]')].indexOf(pairRow) : -1,
      } : null,
    });
  }

  // FORM-CONTROL INK. `groundOf` starts at the control itself, so the ground is the FIELD's own
  // background where it has one — the pairing a typist actually reads, not the panel behind it.
  const fields = [];
  // Controls with no author-inked text of their own: their rendering is entirely the UA's, and a
  // `color` on them measures nothing that is drawn. Included would be noise, not coverage.
  const CHROMELESS = new Set(['checkbox', 'radio', 'range', 'color', 'file', 'image', 'hidden', 'submit', 'reset', 'button']);
  for (const el of root.querySelectorAll('input, textarea, select')) {
    if (el.tagName === 'INPUT' && CHROMELESS.has(el.type)) continue;
    const cs = getComputedStyle(el);
    const op = drawn(el, cs);
    if (op === null) continue;
    const col = parse(cs.color, el, 'color');
    if (!col) continue;   // recorded in `unparsed`, which fails the suite by name
    const ground = groundOf(el);
    // `caretColor: auto` computes to a concrete rgb, so this reads the used value rather than the
    // keyword. Only for text entry — a `<select>` has no caret to lose.
    const caret = el.tagName === 'SELECT' ? null : parse(cs.caretColor, el, 'caret-color');
    // A TRANSPARENT caret on a field a person can type into is an invisible caret, not "no caret" (review
    // of #1777): it is measured as the ground against itself, 1:1, and fails the caret bar. Only a field
    // that takes no typing — read-only or disabled — has no caret to lose.
    const editable = el.tagName !== 'SELECT' && !el.readOnly && !el.disabled;
    // OFF (F1 A): the field is really disabled, `:disabled` or `aria-disabled="true"`, never by class or hook. What Node
    // needs to hold an exempted one to the exemption's conditions rides along: its colors, and whether focus takes.
    const off = el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true';
    let focusable = null;
    if (off) {
      const prev = document.activeElement;
      el.focus();
      focusable = document.activeElement === el;
      if (focusable) { el.blur(); prev?.focus?.(); }
    }
    fields.push({
      off, focusable, canary: el.hasAttribute('data-ccanary'), disabledProp: el.disabled === true, ariaDisabled: el.getAttribute('aria-disabled') === 'true',
      fill: cs.backgroundColor, ink: cs.color,
      edges: ['Top', 'Right', 'Bottom', 'Left'].map((x) => [cs[`border${x}Color`], cs[`border${x}Style`]]),
      ratio: round(ratio(over({ ...col, a: col.a * op }, ground), ground)),
      caretRatio: !editable || !caret ? null : round(ratio(over({ ...caret, a: caret.a * op }, ground), ground)),
      cls: name(el),
      text: `[${el.tagName === 'INPUT' ? el.type : el.tagName.toLowerCase()}] "${String(el.value ?? '').slice(0, 20)}"`,
      hook: el.getAttribute('data-p3'),
      op: round(op),
      // The same classifiers the text walk records (#779): a field's value is text, so it takes the
      // text bar by size and weight, and a field inside a specimen stays on the specimen floor.
      px: parseFloat(cs.fontSize),
      weight: Number(cs.fontWeight),
      specimen: el.closest('[data-specimen]') !== null,
    });
  }
  scratch?.remove();
  return { text, fields, unparsed, rootFound: true, scheme: getComputedStyle(document.documentElement).colorScheme };
};

/**
 * THE FLOOR IS "INVISIBLE", NOT "AA" — and the two bands that set it are named here so the next person
 * can see how much budget there is rather than re-deriving it. Both are engine facts, not corpus
 * measurements: neither moves when the studio grows a control, so neither is restated as a frozen count
 * (#1232 — a measured literal sitting next to a passing assertion reads as measured-now and goes stale).
 *
 * The LEGITIMATE floor is ~3:1 and derived, not observed: the lowest rendered ratios in the studio are
 * specimens meeting their OWN engine contract — the disabled set at `disabledMin` (3), the `-subtle`
 * semantics at `secondaryMin`. Those are the brand's contracted values being previewed correctly, and
 * asserting AA over them would fail the suite on the engine working.
 *
 * The defects this floor exists for sat at **1.00–1.61:1** (#555's four families — a fixed historical
 * measurement of past defects, not a corpus size). So 2.0 sits in the gap with ~1.5× margin above the
 * real defects and ~1.5× below the legitimate floor. Every run PRINTS the observed minimum (below), so
 * erosion toward 2.0 is visible before it is a failure — the thing #355's hand-fix could not leave
 * behind and #516 added for the token values, and a live figure that never goes stale the way a
 * written-in one would.
 */
const CONTRAST_FLOOR = 2.0;

/**
 * CHROME IS HELD TO WCAG; SPECIMENS STAY ON THE FLOOR ABOVE (#779, defect 2).
 *
 * 2.0 was set from #555's four fixed-ground families at 1.00–1.61:1, and #555's FIFTH passes it: a legal
 * `--faint` faded through `opacity: .75` on `.mo-playnote`, rendering at 3.12:1. The floor was reasoned and
 * one case short, and the reason it could go no higher was the specimens — a disabled label previewed at
 * `disabledMin` is the engine working, and AA over it would fail the suite on that. So the two are split
 * by the render site's own `data-specimen` marker (`specimen()` in `main.ts`), not by a classifier here:
 *
 *  - CHROME — the studio's own text — is held to WCAG 1.4.3: 4.5:1, or 3:1 for large text (≥ 24px, or
 *    ≥ 18.66px at weight ≥ 700; 18pt / 14pt bold). `.mo-playnote`'s 3.12 fails it.
 *  - SPECIMENS stay on `CONTRAST_FLOOR`, the "invisible" band. Holding each to the contract it previews
 *    needs a map from specimen to contract, which is a decision this file does not make on its own —
 *    held for the owner as #1774 (paired specimens, below, are the mechanical half of it).
 *
 * AND THE MARKER IS AUDITED, because a specimen someone forgot to mark would be held to AA and fail
 * loudly — fine — but chrome someone MIS-marked would silently drop to 2.0. So every text node whose ink
 * comes from an inline style must sit under `[data-specimen]`: inline ink is what every specimen in the
 * studio paints with and no chrome does, measured over the whole sweep when this landed. The marker is
 * the classification; inline ink is the second, independent reading that checks it.
 *
 * If this bar fails on a page `lint:contrast` passes, that is a FINDING — rendered output diverging from
 * declared tokens — and it is filed, never tuned back to green.
 */
const CHROME_TEXT_MIN = 4.5;
const CHROME_LARGE_TEXT_MIN = 3;
const isLargeText = (r) => r.px >= 24 || (r.px >= 18.66 && r.weight >= 700);
const barOf = (r) => (r.specimen ? CONTRAST_FLOOR : isLargeText(r) ? CHROME_LARGE_TEXT_MIN : CHROME_TEXT_MIN);

/**
 * FORM CONTROLS TAKE THE SAME SPLIT (#779, the walk the split above did not reach).
 *
 * The chrome/specimen split landed on the TEXT walk only; the form-control walk #1031 added kept the 2.0
 * "invisible" floor for everything it measured. #1031's own defect sat at 1.11:1, so 2.0 caught the case
 * it was written for — but the studio's Name field inked at 3:1 would have passed, and that is chrome
 * text a designer types into, held to less than the caption beside it. A field's VALUE is text, so it
 * takes `barOf` by its own size and weight. The CARET is not text: it is the visual indicator of a
 * component's state, WCAG 1.4.11's 3:1. A field inside a specimen stays on the specimen floor for both.
 */
const CHROME_CARET_MIN = 3;

const caretBarOf = (f) => (f.specimen ? CONTRAST_FLOOR : CHROME_CARET_MIN);
const fieldFails = (f) => f.ratio < barOf(f) || (f.caretRatio !== null && f.caretRatio !== undefined && f.caretRatio < caretBarOf(f));
/**
 * THE CONTRAST EXEMPTION FOR INACTIVE FIELDS (owner decision F1 A, 2026-10-05). WCAG 2.2 exempts a user interface
 * component that is not available for user interaction from SC 1.4.3 and SC 1.4.11, and the owner decided that a
 * disabled text field in the chrome draws Prism3's own disabled text field skin exactly, which sits under the text
 * bar on purpose (about 3.05:1). `test:chrome` carries the full exemption (its header, and `checkExempt`); this is
 * the same rule on this suite's form-control walk. A chrome field (never a specimen) is exempt from its bar only
 * when it is REALLY DISABLED (`:disabled` or `aria-disabled="true"`, never a class or hook) and under its bar; and
 * each exempted field is still asserted, by name, to carry the disabled property or `aria-disabled`, to take no
 * focus, and to draw `color.disabled.fill`, a solid `color.disabled.border` edge and `color.disabled.on-fill` ink
 * for the chrome theme, read from the committed default theme emission (`PRISM3_DISABLED`), never from the CSS.
 */
const PRISM3_DISABLED = await (async () => {
  const out = join(ROOT, '..', '..', 'packages', 'engine', 'out');   // OUT_DIR, which is declared below this
  const base = JSON.parse(await readFile(join(out, 'prism3.tokens.json'), 'utf8'));
  const root = Object.keys(base).find((k) => !k.startsWith('$'));
  const leafAt = (tree, path) => path.split('.').reduce((n, k) => n?.[k], tree);
  const dark = structuredClone(base);
  const put = (src, dst) => { for (const [k, v] of Object.entries(src)) { if (k.startsWith('$')) continue; if (v && typeof v === 'object' && '$value' in v) dst[k] = v; else put(v, dst[k] ??= {}); } };
  put(JSON.parse(await readFile(join(out, 'prism3.dark.overlay.tokens.json'), 'utf8')), dark);
  const hex = (tree, path, seen = 0) => {
    const v = leafAt(tree, path)?.$value;
    if (typeof v !== 'string' || seen > 20) return null;
    const m = /^\{(.+)\}$/.exec(v);
    return m ? hex(tree, m[1], seen + 1) : v.toLowerCase();
  };
  const skin = (tree) => ({ fill: hex(tree, `${root}.color.disabled.fill`), edge: hex(tree, `${root}.color.disabled.border`), ink: hex(tree, `${root}.color.disabled.on-fill`) });
  return { light: skin(base), dark: skin(dark) };
})();
const hexOfRgb = (s) => {
  const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim());
  if (!m) return null;
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (p.length > 3 && p[3] !== 1) return null;
  return `#${p.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
};
/** Every field exemption granted this run: [where, hook]. Printed after the sweep, and floored per brand there. */
const FIELD_EXEMPTIONS = [];
/** The fields under their bars that the exemption does not cover; each one it does cover is asserted here. */
const isExemptField = (f) => f.off && !f.specimen && fieldFails(f);
const fieldsUnderBar = (probe, where) => {
  const under = probe.fields.filter(fieldFails);
  const exempt = under.filter(isExemptField);
  const want = PRISM3_DISABLED[probe.scheme];
  for (const f of exempt) {
    FIELD_EXEMPTIONS.push([where, f.hook ?? f.cls]);
    ok((f.disabledProp || f.ariaDisabled) && f.focusable === false,
      `${where}: the exempted field ${f.cls} ${f.text} is disabled and takes no focus (disabled ${f.disabledProp}, aria-disabled ${f.ariaDisabled}, took focus ${f.focusable})`);
    const got = { fill: hexOfRgb(f.fill), edge: [...new Set(f.edges.map(([c]) => hexOfRgb(c)))].join(' '), style: [...new Set(f.edges.map(([, st]) => st))].join(' '), ink: hexOfRgb(f.ink) };
    ok(!!want && got.fill === want.fill && got.edge === want.edge && got.style === 'solid' && got.ink === want.ink,
      `${where}: the exempted field ${f.cls} ${f.text} draws Prism3's disabled roles for the ${probe.scheme} chrome: fill color.disabled.fill ${want?.fill}, a solid edge color.disabled.border ${want?.edge}, ink color.disabled.on-fill ${want?.ink} (drew ${JSON.stringify(got)})`);
  }
  return under.filter((f) => !exempt.includes(f));
};
const describeField = (u) => `${u.cls} ${u.text} at ${u.ratio}:1, caret ${u.caretRatio}:1 (${u.px}px/${u.weight}, op ${u.op}; needs ${barOf(u)}:1, caret ${caretBarOf(u)}:1)`;

/**
 * PAIRED SPECIMENS ARE HELD TO THE CONTRACT OF THE PAIR THEY PREVIEW (#1652).
 *
 * #1652 measured Preview's pressed button specimens at 2.54–2.62:1, under the ~3:1 the header above calls
 * the lowest legitimate band, and asked whether the studio pairs the wrong roles or previews a real,
 * exempt state. Measured from the committed emission, it is the second in every row: each rendered hex is
 * the engine's own `on-fill` over its own `fill.pressed`, and the engine emits that pair on purpose. The
 * `on-fill` role is contracted against `fill.rest` ONLY, and pressed is exempt by two owner decisions —
 * #1281 (the page family: pressed and selected are never floored for ink-on-fill, declared as `min: 0` in
 * `preview-spec.json`) and #1456 (the inverse family: the stepped fills' labels drop to ~2.5:1 by design,
 * said out loud in each `fill.pressed` description). Harbor Dark's 2.62 is not an inverse case, and #1281
 * names it: "harbor/primary 2.62" is one of the three cells that decision was taken on.
 *
 * So an exempt node is not a finding — but it must not be EXCUSED WHOLESALE either, by a specimen floor
 * that happens to sit under it. The render site names the pair (`specimenPair` in `src/preview/sections/kit.ts`), and this
 * reads the pair's contract from the ENGINE, never from the studio:
 *
 *  - the two hexes come from `packages/engine/out/<brand>.tokens.json`, the committed emission, not the
 *    studio's `paint()` — so the check is independent of the painting it checks;
 *  - CONTRACTED — the fill is the ink's own `against` — holds the node to that role's emitted `min`;
 *  - EXEMPT — the fill is a pressed / selected state of the ink's own fill family — holds it to what the
 *    exemption leaves owed: the pressed contract `preview-spec.json` declares (0 today, so the smoke floor
 *    governs), and distinction from rest, the one invariant #1281 keeps gated. If the owner ever floors
 *    pressed, that number is read here and the node is held to it; nothing in this file has to move;
 *  - hover is held to its declared hover min (#1281 keeps hover a UI contract; #1694 net); anything else stays
 *    on `CONTRAST_FLOOR`, #779's open decision (#1774).
 *
 * A node is only classified once its claim is PROVEN: the ink is the fill family's own `on-fill`, the fill
 * is the state its column is labeled, and both rendered colors equal the emitted ones. A specimen that
 * paints the rest ink on a pressed fill, or the page ink on an inverse fill, fails here by name rather than
 * borrowing an exemption for a pair the engine never emitted.
 */
const OUT_DIR = join(ROOT, '..', '..', 'packages', 'engine', 'out');
const PREVIEW_SPEC = JSON.parse(await readFile(join(ROOT, '..', '..', 'packages', 'engine', 'schema', 'preview-spec.json'), 'utf8'));
/** The pressed ink-on-fill contract the engine declares, read from the spec — not restated. */
const PRESSED_MIN = (() => {
  const v = PREVIEW_SPEC.components.find((c) => c.id === 'button')?.variants.find((x) => x.name === 'pressed');
  const ct = v?.contracts?.find((k) => /\.fill\.pressed$/.test(k.bg) && /\.on-fill$/.test(k.fg));
  return ct ? ct.min : null;
})();
/** The hover ink-on-fill contract, read the same way (#1694 net): #1281 keeps hover a UI contract ("Hover keeps
 *  UI"), so a hover specimen is held to its declared min rather than to the 2.0 smoke floor. */
const HOVER_MIN = (() => {
  const v = PREVIEW_SPEC.components.find((c) => c.id === 'button')?.variants.find((x) => x.name === 'hover');
  const ct = v?.contracts?.find((k) => /\.fill\.hover$/.test(k.bg) && /\.on-fill$/.test(k.fg));
  return ct ? ct.min : null;
})();
const EXEMPT_STATES = new Set(['pressed', 'selected']);   // #1281: categorical, a predicate on the STATE

/** Resolve one brand's emission into `role key × mode id → { hex, against, min }`. */
const loadEmission = async (brand) => {
  let tree;
  try { tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8')); } catch { return null; }
  const rootKey = Object.keys(tree)[0];
  const at = (path) => path.split('.').reduce((n, s) => n?.[s], tree[rootKey]);
  const inMode = (leaf, mode, base) => (mode !== base && leaf.$extensions?.prism3?.modes?.[mode]) || { ...leaf.$extensions?.prism3, $value: leaf.$value };
  const probeLeaf = at('color.interactive.primary.on-fill');
  const modes = probeLeaf?.$extensions?.prism3?.figma?.modes ?? [];
  const base = modes[0];
  const role = (key, mode) => {
    const leaf = at(`color.${key}`);
    if (!leaf || !modes.includes(mode)) return null;
    const m = inMode(leaf, mode, base);
    let v = m.$value;
    for (let hops = 0; typeof v === 'string' && v.startsWith('{') && hops < 8; hops++) {
      const target = at(v.slice(1, -1).replace(`${rootKey}.`, ''));
      if (!target) return null;
      v = inMode(target, mode, base).$value;
    }
    return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? { hex: v.toLowerCase(), against: m.against, min: m.min } : null;
  };
  return { modes, role };
};
const hexOf = (c) => (c ? `#${[c.r, c.g, c.b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}` : 'none');
/** Node-side color math for the #812 check, where the colors come back from the page as strings. */
const parseRgb = (s) => {
  const m = /rgba?\(([^)]+)\)/.exec(s ?? '');
  if (!m) return null;
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
};
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const wcag = (a, b) => {
  const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Prove a paired specimen's claim, then classify it. Returns `{ problem }` or `{ cls, bar, contract }`. */
const classifyPair = (p, emission, mode) => {
  const m = /^(\S+) on (\S+)$/.exec(p.claim ?? '');
  if (!m) return { problem: `unreadable pair claim "${p.claim}"` };
  const [, inkKey, fillKey] = m;
  // The ink must be the fill family's OWN on-fill: `<fam>.on-fill` over `<fam>.fill[.<state>]`.
  const fam = inkKey.replace(/\.on-fill$/, '');
  if (fam === inkKey || !(fillKey === `${fam}.fill` || fillKey.startsWith(`${fam}.fill.`)))
    return { problem: `claims ${inkKey} on ${fillKey} — that ink is not the fill family's own on-fill` };
  // The fill must be the state its column is LABELED — the reader's reading of the specimen.
  const fillState = fillKey === `${fam}.fill` ? p.state : fillKey.slice(`${fam}.fill.`.length);
  if (fillState !== p.state) return { problem: `under the "${p.state}" label but claims the ${fillState} fill (${fillKey})` };
  const ink = emission.role(inkKey, mode), fill = emission.role(fillKey, mode);
  if (!ink || !fill) return { problem: `${!ink ? inkKey : fillKey} does not resolve in the ${mode} emission` };
  if (hexOf(p.ink) !== ink.hex || hexOf(p.fill) !== fill.hex)
    return { problem: `renders ${hexOf(p.ink)} on ${hexOf(p.fill)}, but the engine emits ${inkKey} ${ink.hex} on ${fillKey} ${fill.hex}` };
  if (fillKey === ink.against) {
    // A missing `min` would make the bar NaN, and `ratio < NaN` is never true — refuse it by name instead.
    if (typeof ink.min !== 'number') return { problem: `${inkKey} declares no numeric min against ${ink.against} in the ${mode} emission` };
    return { cls: 'contracted', bar: Math.max(CONTRAST_FLOOR, ink.min), contract: `${inkKey} min ${ink.min} on ${ink.against}` };
  }
  const restOf = ink.against?.replace(/\.rest$/, '');
  if (restOf && fillKey.startsWith(`${restOf}.`) && fillState === 'hover' && HOVER_MIN !== null)
    return { cls: 'contracted', bar: Math.max(CONTRAST_FLOOR, HOVER_MIN), contract: `hover keeps UI (#1281), declared min ${HOVER_MIN}` };
  if (restOf && fillKey.startsWith(`${restOf}.`) && EXEMPT_STATES.has(fillState) && PRESSED_MIN !== null)
    return { cls: 'exempt', bar: Math.max(CONTRAST_FLOOR, PRESSED_MIN), contract: `${fillState} exempt (#1281/#1456), declared min ${PRESSED_MIN}` };
  return { cls: 'unmapped', bar: CONTRAST_FLOOR, contract: 'unmapped (#779)' };
};

/**
 * NON-EMPTY FLOORS — DID THE SWEEP LOOK? (#779, defect 1.)
 *
 * The contrast assertion below compares ratios, and a comparison over an empty list is true: at
 * `rows.length === 0` it passed while printing "every one of 0 text nodes clears 2:1" — a true
 * statement about nothing. A probe selector that stopped matching, or a page that stopped rendering
 * text, reported GREEN, and the summary read "thousands of text nodes" one run and "0 text nodes" the
 * next with no assertion between the two. That matters most while this suite is the studio cleanup's
 * stated safety net (#768–#772 restructure the very file it measures).
 *
 * Same shape, same fix as `packages/engine/typecheck-components.ts`, whose `defs.length < 3` floor
 * is there because #658's review found a gate printing "0 engine files in the bundle … ✓ clean".
 * The floors assert the COUNT; the assertion beside them keeps asserting the ratios.
 *
 * THE FLOORS ARE DERIVED, NOT A FROZEN MEASUREMENT (#1232). The sweep's live totals — its state count
 * and its text-node count — are PRINTED every run and asserted against the floors below; none of them
 * is restated here as a literal, because a corpus size written into a comment reads as measured-now and
 * goes stale silently the next time the studio grows a control. What each floor is, and why:
 *
 *  - `STATE_NODE_FLOOR` (12) — below the sparsest LEGITIMATE state (Typography and Layout in a derived
 *    mode, where the editors are replaced by the read-only note), so that note can lose lines without
 *    tripping it, and a state the probe comes back empty from fails BY NAME rather than passing
 *    quietly. It was 20 while the rail stood beside every page; UI redesign S1.2 replaced the rail's
 *    labels, subtitles, note and build stamp with the tab row and the Pages menu (closed while a state
 *    is measured), and the sparsest state dropped below 20 for that reason alone. It deliberately sits below even a page's chrome-only node count, so it never pretends to
 *    detect a blanked workspace: that case is covered, and covered better, by the
 *    `controls > 0 || readOnlyNote > 0` assertion in the loop, which names the condition instead of
 *    proxying it through a count.
 *  - `SWEEP_NODE_FLOOR` (10000 since S8.3 moved the sweep onto the tabs) — well below a healthy full sweep's total
 *    (printed every run) and well above what a sweep of nothing-but-chrome states totals, so it catches every state
 *    rendering only its chrome — which the per-state floor clears once per state and structurally cannot catch in
 *    aggregate.
 *  - `SWEEP_STATE_FLOOR` (36) — the product of the three per-axis minimums already asserted below
 *    (≥ 2 brands × ≥ 2 modes × the tab row's 9 places, each of which must be walked by name), so it raises no new bar.
 *    What it adds is a NAMED failure for a sweep that visits nothing: at zero states the loop body never runs, so
 *    contrast, console errors and mode agreement are all ABSENT rather than failing, and absence is what this file
 *    keeps having to convert into a failure.
 */
const STATE_NODE_FLOOR = 12;
const SWEEP_NODE_FLOOR = 10000;   // S8.3: the sweep on the tabs measures every place's whole document; a run of chrome-only states (the frame head, ~13 nodes) totals under 1,500 across the corpus, a healthy one far more (printed every run). 4000 while only the moved pages' own sections counted
const SWEEP_STATE_FLOOR = 36;   // 2 brands × 2 modes × 9 places (the per-axis minimums; S8.3 moved the sweep onto the tab row's 9 places)
/** The same "did it look?" floor for the form-control walk added by #1031, and the reason it is a
 *  SWEEP total and not a per-state one is recorded at the assertion: zero fields is legitimate in a
 *  derived mode, where the read-only note replaces every editor, so the per-state range starts at 0 and
 *  the total is the only place this can be asserted. The floor sits well below what a full editor sweep
 *  renders (the live count is printed every run) and above zero, so a walk that comes back empty fails
 *  by name. No measured corpus size is written in here: that literal drifts as the studio grows or
 *  retires controls — this is the site #1232 fixed, the count belongs in the live output, not frozen in
 *  a comment beside a passing assertion. */
const SWEEP_FIELD_FLOOR = 100;   // S8.3: the sweep on the tabs reads every place's fields (Surfaces & fills, Type, Layout and Interactive carry most); 6 while the web's sweep had nothing to walk
/** THE FLOORS ARE LITERALS, AND THIS SAYS SO BY NAME (S8.3, docs/34 shape 1). A floor computed from what it floors cannot
 *  fail: `SWEEP_STATE_FLOOR = statesVisited` would read "visited 0 states (floor 0)" as a pass. So the suite reads its own
 *  source and refuses, before it measures anything, any floor not declared once as an integer literal. */
{
  const own = await readFile(fileURLToPath(import.meta.url), 'utf8');
  for (const name of ['STATE_NODE_FLOOR', 'SWEEP_NODE_FLOOR', 'SWEEP_STATE_FLOOR', 'SWEEP_FIELD_FLOOR']) {
    const decls = [...own.matchAll(new RegExp(`^\\s*(?:(?:const|let|var)\\s+)?${name}\\s*=(?!=)\\s*([^;\\n]*)`, 'gm'))].map((m) => m[1].trim());
    ok(decls.length === 1 && /^\d+$/.test(decls[0]),
      `${name} is declared once, as an integer literal, never derived from what it floors (docs/34) — declared ${decls.length} time(s): ${decls.map((d) => JSON.stringify(d)).join(', ')}`);
  }
}
/** The brand menu's own minimum, asserted per open (#1031). The popover carried Name and Namespace until UI
 *  redesign S3 moved them to Brand › Identity (chrome, measured by `test:chrome` in both themes, and by the
 *  Brand section below); what it still carries is `.bm-ta` once the import box is open, so one control is
 *  what the surface promises, and this is the count that turns "the sweep was clean" into "the sweep looked
 *  here". Text rows are floored separately at a deliberately loose 6: the menu renders a caption, the example
 *  rows, its two actions and the import box's own, and a floor near the real number would fail on wording. */
const BRANDMENU_FIELD_FLOOR = 1;
const BRANDMENU_TEXT_FLOOR = 6;
/** The one by IDENTITY — the import textarea. Named because the floor above can only say "one of
 *  something", and #1031 was a defect in a specific field, not in a quantity of fields. */
const BRANDMENU_CONTROLS = ['[data-p3="import-text"]'].map(hooks.role);

// ---- browser plumbing ------------------------------------------------------------------------
const browser = await chromium.launch();

/** Console errors, uncaught exceptions, and failed requests, collected per page and drained per
 *  state — so a failure names the page × mode it happened on rather than a run-wide total. */
const watchErrors = (page) => {
  const seen = [];
  page.on('console', (m) => { if (m.type() === 'error') seen.push(`console.error: ${m.text()}`); });
  page.on('pageerror', (e) => seen.push(`uncaught: ${e.message}`));
  page.on('requestfailed', (r) => seen.push(`request failed: ${r.url()} (${r.failure()?.errorText})`));
  return () => seen.splice(0, seen.length);
};

// The Pages menu helpers (`openPages`, `railLabels`, `gotoPage`, `gotoRail`, `legacyShows`) went with the web's Pages
// menu in UI redesign S8.2 (owner decision G19 A): the web has no legacy page left to reach. Every page is reached
// through the tab row now.

/** Open Type through the tab row (UI redesign S6.2: it left the Pages menu for the two panes), open Scale's and
 *  the page's Show advanced (S6.3: Individual sizes, Scale limits, Weights and styles, Line height and letter
 *  spacing), and wait for its levers to draw. */
const gotoType = async (page) => {
  await hooks.click(page.locator('[data-p3="tab-type"]'));
  await hooks.need(page, '[data-p3="type-levers"]');
  for (const hk of ['scale-advanced', 'type-sections-advanced']) {
    const sel = `[data-p3="${hk}"]`;
    await hooks.need(page, sel);
    if ((await page.locator(sel).getAttribute('aria-expanded')) !== 'true') await hooks.click(page.locator(sel));
  }
  await hooks.need(page, '[data-p3="weights-matrix"]');
  await page.evaluate(() => document.fonts.ready);
};

/** Open Layout through the tab row (UI redesign S10: it left the Pages menu for the two panes) and wait for its levers
 *  and its preview to draw. */
const gotoLayout = async (page) => {
  await hooks.click(page.locator('[data-p3="tab-layout"]'));
  await hooks.need(page, '[data-p3="layout-levers"]');
  await hooks.need(page, '[data-p3="layout-style-guide"] .psec');
  await page.evaluate(() => document.fonts.ready);
};

/** Let every FINITE running animation finish before anything is measured (#1069) — the wait the old
 *  `op < 0.02` carve-out stood in for by presuming. A real condition, not a duration: it resolves the
 *  moment the last transition or keyframe run ends, and at once when nothing is moving. Infinite and
 *  paused animations are left out, since neither ever finishes; a node faded by one of those is
 *  measured as it is drawn, which is what a reader would see. */
/** Every color the probe met was READ — a color it could not parse is a failure naming the node and the
 *  value, never a silent skip (review of #1777; see `unparsed` in `LEGIBILITY_PROBE`). Counted per run. */
let unparsedTotal = 0;
const assertParsed = (where, list) => {
  const uniq = [...new Map(list.map((u) => [`${u.cls}|${u.prop}|${u.value}`, u])).values()];
  unparsedTotal += uniq.length;
  ok(uniq.length === 0, `${where}: every computed color the probe met was parsed${
    uniq.length ? ` — ${uniq.length} not: ${uniq.slice(0, 3).map((u) => `${u.cls} ${u.prop} "${u.value}"`).join(' | ')}` : ''}`);
};

/** CAPPED, and a cap that trips is a FAILURE naming what was still moving (review of #1777): a
 *  1000-second transition made the uncapped wait hang with no message, and CI sets no timeout. The cap
 *  sits far above anything the studio animates (its longest run is the Motion page's 1.2s trace). */
const SETTLE_CAP_MS = 5000;
const settle = async (page, where) => {
  const stuck = await page.evaluate((cap) => {
    const live = document.getAnimations()
      .filter((a) => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming?.().endTime));
    const label = (a) => {
      const t = a.effect?.target;
      return `${a.animationName ?? a.transitionProperty ?? 'animation'} on ${t ? `${t.tagName.toLowerCase()}.${String(t.className ?? '').trim().replace(/\s+/g, '.') || '-'}` : '?'}`;
    };
    const done = Promise.all(live.map((a) => a.finished.catch(() => null))).then(() => []);
    const capped = new Promise((r) => setTimeout(() => r(live.filter((a) => a.playState === 'running').map(label)), cap));
    return Promise.race([done, capped]);
  }, SETTLE_CAP_MS);
  ok(stuck.length === 0, `${where}: every finite animation settles within ${SETTLE_CAP_MS}ms before measuring${
    stuck.length ? ` — still running: ${stuck.slice(0, 3).join(' | ')}` : ''}`);
};

// `selectMode`, the legacy mode strip's driver, went with the legacy sweep in UI redesign S8.2: no page on the web draws
// a legacy mode strip. The moved pages choose a mode through the preview header's mode control (`chooseMode`).

/** Open the app on `brand`, from the first-run start screen, in its own storage context.
 *
 *  `scheme` emulates the OS light/dark preference (#1031). Defaults to Playwright's own default so
 *  every existing caller is unchanged; only section 4 passes it, and what it is there to measure is
 *  that the answer does NOT depend on it. */
const openBrand = async (brand, scheme, { interInstalled = false } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true, ...(scheme ? { colorScheme: scheme } : {}) });
  if (interInstalled) await ctx.addInitScript(INTER_INSTALLED);
  const page = await ctx.newPage();
  await hooks.watch(page);
  const drain = watchErrors(page);
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
  await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: brand }));
  await hooks.need(page, '[data-p3="frame"]');   // the app view (Color › Palettes draws the two panes from S2)
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, drain };
};

// The corpus the studio actually offers — read from the page, never restated here. A restated list
// would keep passing the day a brand is added to `schema/example-brands.json` and never loaded.
const BRANDS = await (async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await hooks.watch(page);
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
  await hooks.need(page, '[data-p3="start-example"]');
  const names = await page.locator('[data-p3="start-example"]').allTextContents();
  await ctx.close();
  return names.map((n) => n.trim());
})();
ok(BRANDS.length >= 2, `the start screen offers at least the two corpus brands (found ${BRANDS.length}: ${BRANDS.join(', ')})`);

// =============================================================================================
// 1. The sweep — every page, in every mode, on every corpus brand
// =============================================================================================
console.log(`\nSweep — every page × mode × brand\n${'='.repeat(78)}`);

let worstRatio = Infinity;
let worstWhere = '';
let nodesMeasured = 0;
let specimensMeasured = 0;
let worstChrome = Infinity;
let worstChromeWhere = '';
let fieldsMeasured = 0;
let worstField = Infinity;
let worstFieldWhere = '';
let statesVisited = 0;
// Per-mode density (owner, 2026-09-29, docs/28 §5.4.3): wherever the studio sets a per-mode density, the knob
// says in one literal sentence that spacing follows the brand's density. Counted, so a sweep that never met the
// per-mode knob cannot pass silently. UI redesign S7 moved the knob to Shape's Density lever, outside this sweep's
// legacy pages, so section 1g counts it there.
const PER_MODE_DENSITY_SENTENCE = 'Spacing follows the brand’s density, not the mode’s: a mode’s density changes control heights only.';
let perModeDensityKnobs = 0;
const perModeDensityMissing = [];
/** Paired specimens by class (#1652), and the brand × mode cells that previewed an exempt one. */
const pairedByClass = { contracted: 0, exempt: 0, unmapped: 0 };
const exemptCells = new Set();
const modeCells = new Set();
let worstExempt = Infinity;
let worstExemptWhere = '';

// THE SWEEP ON THE TABS (UI redesign S8.3, plan §9.2). Until S8.2 this loop walked every LEGACY page through the Pages
// menu; S8.2 moved the web's last one (Size & radius, the Button options) to the Components tab and the web's Pages menu
// went with it (owner decision G19 A). So it walks the tab row now: every place a designer can reach (each tab, and
// each of Color's sub-pages), in every mode the preview header offers, on every corpus brand, held per state to what
// the legacy sweep held each page to: zero console errors; the DOM (the frame shows the place, the preview names it, the
// levers pane carries controls, every declared chrome surface is mounted, the error bar is hidden, no horizontal
// overflow, no legacy page drawn); the rendered contrast of every text node and form control in the document, both
// panes and the chrome; the paired specimens against the engine's contracts (#1652); and MODE AGREEMENT, the one check
// `mode-audit.mjs` made that still has a subject (S8.3 deletes the audit): the mode chosen once, in the preview header,
// is the one mode every place's header marks, in its radios and in its narrow-width select alike.
//
// THE PLACES ARE A LITERAL, AND THE TAB ROW IS THE OTHER SIDE. `SWEEP_PLACES` is typed here from the IA, never read from
// `pages.ts`; what the rendered tab row and Color's sub-row offer is read from the DOM, per brand, and the two must agree
// both ways. A place dropped from the list fails as "not walked", and a tab the studio grows fails the same way until
// the sweep walks it (docs/34: represented, not counted).
//
// MODE IS THE OUTER AXIS, as it was: the mode is module state that survives navigation, so it is chosen once on the
// first place and every place is then walked carrying it, which is the sequence a designer performs.
/** Each place and how it is reached: its tab's hook, then its sub-page's when it has one. Literal (the IA). */
const SWEEP_PLACES = {
  brand: ['[data-p3="tab-brand"]'],
  'color-palettes': ['[data-p3="tab-color"]', '[data-p3="color-sub-palettes"]'],
  'color-fills': ['[data-p3="tab-color"]', '[data-p3="color-sub-fills"]'],
  'color-interactive': ['[data-p3="tab-color"]', '[data-p3="color-sub-interactive"]'],
  type: ['[data-p3="tab-type"]'],
  shape: ['[data-p3="tab-shape"]'],
  depth: ['[data-p3="tab-depth"]'],
  layout: ['[data-p3="tab-layout"]'],
  components: ['[data-p3="tab-components"]'],
};
/** Go to a place by its clicks, and wait for the frame to say it shows that place: a real condition, never a duration. */
const goPlace = async (page, place) => {
  for (const sel of SWEEP_PLACES[place]) await hooks.click(page.locator(sel));
  await page.waitForFunction((p) => document.querySelector('[data-p3="frame"]')?.dataset.place === p, place);
  await page.evaluate(() => document.fonts.ready);
};
/** The places the rendered tab row offers, by the same spelling (`tab-<id>`, then `<id>-sub-<sub>` for a tab with a
 *  sub-row), read from the DOM. Each tab is clicked to learn whether it draws a sub-row. */
const offeredPlaces = async (page) => {
  const tabs = await page.locator('[data-p3="tab-row"] [role="tab"]').evaluateAll((ns) => ns.map((n) => n.getAttribute('data-p3')));
  const out = [];
  for (const t of tabs) {
    await hooks.click(page.locator(`[data-p3="${t}"]`));
    const id = t.slice('tab-'.length);
    await page.waitForFunction((x) => (document.querySelector('[data-p3="frame"]')?.dataset.place ?? '').split('-')[0] === x, id);
    const subs = await page.locator('[data-p3="sub-nav"] [role="tab"]').evaluateAll((ns) => ns.map((n) => n.getAttribute('data-p3')));
    if (subs.length) for (const s of subs) out.push(`${id}-${s.slice(`${id}-sub-`.length)}`);
    else out.push(id);
  }
  return out;
};
/**
 * KNOWN CONTRAST GAPS — chrome text this sweep measures CORRECTLY below its bar, where the fix is a design choice held
 * for the owner (#1887's KNOWN_BADGE_GAPS shape, carried over from `mode-audit.mjs` when S8.3 deleted it). Each row is a
 * literal written from the measurement and names the issue that owns the fix. A row EXCUSES only an exact match: the
 * same place, the same node class and text, at or above its stated floor; anything else counts. A row FAILS WHEN STALE:
 * if its node is drawn and every instance clears the chrome bar, the run fails naming the row, so the fixing PR deletes
 * it. Its node only draws where the brand's faces are missing from the device (CI, a bare container), so a run that
 * never draws it says so by name rather than calling the row stale.
 */
// EMPTY since #2091 closed its one row (the Type preview's font status, inked with the ground's text color). The
// mechanism stays: a planted row `{ place, cls, text, atLeast, issue }` still excuses its exact node and still fails
// as STALE once that node clears its bar (both re-proven by planting the #2091 row against the fix and against its
// mutation, in that PR).
const KNOWN_CONTRAST_GAPS = [];
const knownGapOf = (place, r) => KNOWN_CONTRAST_GAPS.find((k) => k.place === place && k.cls === r.cls && k.text === r.text && r.ratio >= k.atLeast);
const gapSeen = new Map(KNOWN_CONTRAST_GAPS.map((k) => [k, { drawn: 0, under: 0 }]));
/**
 * THE TYPE PAGE'S FONT STATUS, BOTH LABELS, IN THE BRAND'S OWN STATUS TEXT ROLES, IN EVERY BRAND × MODE (#2091, #2103).
 * The labels are studio text on the BRAND's page color, so their ratio moves with the brand and the mode: "⚠ Not
 * installed" was `--warn` at 3.84–4.16:1 on the dark pages (#2091), and "✓ Installed" the chrome's `--ok` at 3.87:1
 * (#2103). Since #2103 each is painted inline in the brand's role for the mode on screen, `text.success` for ✓ and
 * `text.warning` for ⚠, so each is held here to 4.5:1 on the page AND to the emission's hex for its role (EXPECTED is
 * the committed emission, never the studio's resolver). Classes, texts and roles are literals, not read from
 * `ui/fonts.ts` or `faces.ts`.
 *
 * BOTH ARMS ARE EXERCISED, NOT ASSUMED (docs/34: represented, not counted). ⚠ is drawn wherever a brand face does not
 * resolve on the device; ✓ only where one does, which in CI and a bare container is nowhere. So this sweep runs with
 * `INTER_INSTALLED`: an init script, in this test only, that answers the studio's canvas font probe as though Inter
 * were installed. Every corpus brand uses Inter and also a face that stays absent (JetBrains Mono), so each state
 * draws both labels, and a state that drew either one zero times fails as NOT EXERCISED. The stub changes no shipped
 * code: it widens `measureText` for the probe's exact font string (`72px "Inter", <base>`), which is all
 * `fontAvailable` reads.
 */
const FONT_STATUS = { place: 'type', labels: [
  { cls: 'span.tf-stat.ok', text: '✓ Installed', role: 'text.success' },
  { cls: 'span.tf-stat.no', text: '⚠ Not installed', role: 'text.warning' },
] };
const INTER_INSTALLED = () => {
  const measure = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function (t) {
    const m = measure.call(this, t);
    return /^72px "?Inter"?, (monospace|sans-serif|serif)$/.test(this.font) ? { width: m.width + 10 } : m;
  };
};
const fontStatusSeen = new Map();   // `${brand} / ${mode} / ${text}` -> { drawn, worst }
/** The chrome surfaces whose home is the legacy WORKSPACE (`CHROME_SURFACES` in `src/main.ts`, `home: 'workspace'`),
 *  typed here. The roster is published per VIEW, and the app view still promises the legacy mode strip because the
 *  plugin's Style guide draws it; on the web the workspace is drawn by no place (each state below asserts that no legacy
 *  page is drawn), so these are left out of the "declared and mounted" check exactly while that holds. */
const WORKSPACE_SURFACES = ['mode-strip'];
const sweptPlaces = new Set();
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand, undefined, { interInstalled: true });
  const boot = drain();
  ok(boot.length === 0, `${brand}: boots clean — 0 console errors${boot.length ? ` (${boot[0]})` : ''}`);
  const emission = await loadEmission(brand);
  ok(emission !== null && emission.modes.length >= 2,
    `${brand}: its committed emission (packages/engine/out/${brand.toLowerCase()}.tokens.json) loads with its modes — the oracle paired specimens are checked against (#1652)`);
  // The web draws no Pages menu (G19 A): read by its accessible name, the button a designer would look for.
  const bar = await page.evaluate(() => ({ bar: !!document.querySelector('[data-p3="top-bar"]'), pages: [...document.querySelectorAll('button')].filter((b) => b.getAttribute('aria-label') === 'Pages').length }));
  hooks.absent(ok, { seen: bar.bar, state: 'the top bar' }, bar.pages === 0,
    `${brand}: the web offers no Pages menu, so every page is reached by the tab row the sweep walks (G19 A) — found ${bar.pages}`);
  const offered = await offeredPlaces(page);
  const notWalked = offered.filter((p) => !(p in SWEEP_PLACES));
  const notOffered = Object.keys(SWEEP_PLACES).filter((p) => !offered.includes(p));
  ok(offered.length > 0 && notWalked.length === 0 && notOffered.length === 0,
    `${brand}: the sweep walks every place the tab row offers, and only those (${offered.length} offered)${notWalked.length ? ` — not walked: ${notWalked.join(', ')}` : ''}${notOffered.length ? ` — not offered: ${notOffered.join(', ')}` : ''}`);

  const places = Object.keys(SWEEP_PLACES);
  await goPlace(page, places[0]);
  const modes = await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode));
  ok(modes.length >= 2, `${brand}: the mode control offers ${modes.length} modes (${modes.join(', ')})`);

  for (const mode of modes) {
    await goPlace(page, places[0]);
    await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`));
    await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true', mode);
    for (const place of places) {
      await goPlace(page, place);
      const where = `${brand} / ${place} / ${mode}`;
      statesVisited++;
      sweptPlaces.add(place);

      // --- zero console errors -----------------------------------------------------------------
      const errs = drain();
      ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);

      // --- key DOM assertions ------------------------------------------------------------------
      const dom = await page.evaluate(() => {
        const err = document.querySelector('[data-p3="error-bar"]');
        const lf = document.querySelector('[data-p3="legacy-frame"]');
        // The page-chrome floor (#772), read from what the app DECLARES rather than from a list restated here.
        const roster = (document.documentElement.dataset.chromeRoster ?? '').split(' ').filter(Boolean);
        return {
          place: document.querySelector('[data-p3="frame"]')?.dataset.place ?? null,
          title: document.querySelector('[data-p3="preview-title"]')?.textContent?.trim() ?? '',
          controls: document.querySelectorAll('[data-p3="levers-pane"] input, [data-p3="levers-pane"] select, [data-p3="levers-pane"] button').length,
          roster,
          chromeMissing: roster.filter((k) => !document.querySelector(`[data-chrome="${k}"]`)),
          errorBarShown: !!err && getComputedStyle(err).display !== 'none',
          errorBarMounted: !!err,
          errorBarText: err?.textContent?.trim() ?? '',
          legacyMounted: !!lf,
          legacyPage: lf?.dataset.legacyPage ?? null,
          // MODE AGREEMENT: the radios that are checked, and the select that stands in for them when the header is
          // slim, both read here, so a place that resets the mode or a control that drifts from the other fails.
          modeOn: [...document.querySelectorAll('[data-p3="mode-control"] [data-p3="mode-option"]')].filter((n) => n.getAttribute('aria-checked') === 'true').map((n) => n.dataset.mode),
          modeSelect: document.querySelector('[data-p3="mode-select"]')?.value ?? null,
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      ok(dom.place === place, `${where}: the frame shows ${place} (shows ${dom.place})`);
      ok(dom.title.length > 0, `${where}: the preview header names the view ("${dom.title}")`);
      // "Not blank": the levers pane carries controls. A derived mode holds them disabled (Q59), never removes them.
      ok(dom.controls > 0, `${where}: the levers pane renders ${dom.controls} control(s)`);
      ok(dom.roster.length >= 3, `${where}: the view publishes its chrome roster (${dom.roster.join(', ') || 'EMPTY'})`);
      ok(dom.roster.includes('error'), `${where}: the roster names the engine-error surface — #388's defect was one page rendering it and the rest not`);
      const mustMount = dom.legacyPage === null ? dom.chromeMissing.filter((k) => !WORKSPACE_SURFACES.includes(k)) : dom.chromeMissing;
      ok(dom.roster.some((k) => !WORKSPACE_SURFACES.includes(k)) && mustMount.length === 0,
        `${where}: every declared chrome surface outside the legacy workspace is mounted${mustMount.length ? ` — missing ${mustMount.join(', ')}` : ''}`);
      hooks.absent(ok, { seen: dom.errorBarMounted, state: 'the global error bar mounted, found by its hook' },
        !dom.errorBarShown, `${where}: the global error bar is hidden${dom.errorBarShown ? ` — "${dom.errorBarText}"` : ''}`);
      ok(dom.overflowX <= 1, `${where}: no horizontal overflow (${dom.overflowX}px past the viewport)`);
      // No legacy page anywhere a designer can go on the web (and so no legacy mode strip, which only a legacy page drew):
      // what smoke §2b's #485 drive, chrome §4's web arm and chrome §9's strip sync held in place until this sweep.
      hooks.absent(ok, { seen: dom.legacyMounted, state: 'the legacy frame mounted, found by its hook' },
        dom.legacyPage === null, `${where}: no legacy page is drawn (the legacy frame names ${JSON.stringify(dom.legacyPage)})`);
      ok(dom.modeOn.length === 1 && dom.modeOn[0] === mode && dom.modeSelect === mode,
        `${where}: mode agreement — the preview header marks exactly ${mode}, in its radios and its select (radios ${JSON.stringify(dom.modeOn)}, select ${JSON.stringify(dom.modeSelect)})`);

      // --- rendered contrast -------------------------------------------------------------------
      await settle(page, where);
      const probe = await page.evaluate(LEGIBILITY_PROBE);
      const rows = probe.text;
      assertParsed(where, probe.unparsed);
      nodesMeasured += rows.length;
      fieldsMeasured += probe.fields.length;
      ok(rows.length >= STATE_NODE_FLOOR,
        `${where}: the contrast probe measured ${rows.length} text nodes (floor ${STATE_NODE_FLOOR})${
          rows.length < STATE_NODE_FLOOR ? ' — this state rendered almost no text, or the probe stopped matching; the ratio assertion below is vacuous here' : ''}`);
      const under = rows.filter((r) => r.ratio < CONTRAST_FLOOR);
      for (const r of rows) if (r.ratio < worstRatio) { worstRatio = r.ratio; worstWhere = `${where} — ${r.cls} "${r.text}"`; }
      ok(under.length === 0, `${where}: every one of ${rows.length} text nodes clears ${CONTRAST_FLOOR}:1${
        under.length ? ` — ${under.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1 (op ${u.op})`).join(' | ')}` : ''}`);
      const chrome = rows.filter((r) => !r.specimen);
      specimensMeasured += rows.length - chrome.length;
      for (const r of chrome) if (r.ratio < worstChrome) { worstChrome = r.ratio; worstChromeWhere = `${where} — ${r.cls} "${r.text}"`; }
      for (const k of KNOWN_CONTRAST_GAPS) {
        if (k.place !== place) continue;
        const mine = chrome.filter((r) => r.cls === k.cls && r.text === k.text);
        gapSeen.get(k).drawn += mine.length;
        gapSeen.get(k).under += mine.filter((r) => r.ratio < barOf(r)).length;
      }
      if (place === FONT_STATUS.place) {
        // Specimen-marked since #2103 (painted inline in a brand role), so read from every row, not the chrome rows.
        const drawn = await page.evaluate(() => [...document.querySelectorAll('[data-p3="preview-body"] span.tf-stat')]
          .map((n) => ({ text: n.textContent, role: n.dataset.sgRole ?? null, color: getComputedStyle(n).color })));
        for (const lab of FONT_STATUS.labels) {
          const st = rows.filter((r) => r.cls === lab.cls && r.text === lab.text);
          fontStatusSeen.set(`${brand} / ${mode} / ${lab.text}`, { drawn: st.length, worst: st.length ? Math.min(...st.map((r) => r.ratio)) : null });
          const stUnder = st.filter((r) => r.ratio < CHROME_TEXT_MIN);
          ok(stUnder.length === 0, `${where}: the font status ${lab.cls} "${lab.text}" clears ${CHROME_TEXT_MIN}:1 on the brand's page color in all ${st.length} place(s) drawn (#2091, #2103)${
            stUnder.length ? ` — ${stUnder.slice(0, 3).map((u) => `${u.ratio}:1 (op ${u.op})`).join(' | ')}` : ''}`);
          const want = emission?.role(lab.role, mode)?.hex ?? null;
          const wantRgb = want ? `rgb(${parseInt(want.slice(1, 3), 16)}, ${parseInt(want.slice(3, 5), 16)}, ${parseInt(want.slice(5, 7), 16)})` : null;
          const mine = drawn.filter((d) => d.text === lab.text);
          const off = mine.filter((d) => d.color !== wantRgb);
          ok(want !== null && off.length === 0, `${where}: the font status "${lab.text}" is drawn in the brand's ${lab.role} ${want} in all ${mine.length} place(s) (#2103)${
            off.length ? ` — drawn ${[...new Set(off.map((d) => `${d.color} (role ${d.role})`))].join(', ')}` : ''}`);
        }
      }
      const chromeUnder = chrome.filter((r) => r.ratio < barOf(r) && !knownGapOf(place, r));
      ok(chromeUnder.length === 0, `${where}: every one of ${chrome.length} chrome text nodes meets WCAG 1.4.3 (${CHROME_TEXT_MIN}:1, ${CHROME_LARGE_TEXT_MIN}:1 large), known gaps aside${
        chromeUnder.length ? ` — ${chromeUnder.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1 (${u.px}px/${u.weight}, op ${u.op}, needs ${barOf(u)}:1)`).join(' | ')}` : ''}`);
      const unmarked = rows.filter((r) => r.inlineInk && !r.specimen);
      ok(unmarked.length === 0, `${where}: every node inked by an inline style is marked data-specimen at its render site${
        unmarked.length ? ` — ${unmarked.slice(0, 3).map((u) => `${u.cls} "${u.text}"`).join(' | ')}: wrap it in specimen() where it is painted, or it is held to the chrome bar as if the studio chose that color` : ''}`);

      // --- paired specimens, held to the contract of the pair they preview (#1652) --------------
      const paired = rows.filter((r) => r.pair);
      if (paired.length && emission) {
        modeCells.add(`${brand}/${mode}`);
        ok(emission.modes.includes(mode), `${where}: the mode "${mode}" is one the emission carries (${emission.modes.join(', ')})`);
        const judged = paired.map((r) => ({ r, c: classifyPair(r.pair, emission, mode) }));
        const bad = judged.filter(({ c }) => c.problem);
        ok(bad.length === 0, `${where}: every one of ${paired.length} paired specimens renders exactly the engine role pair it claims${
          bad.length ? ` — ${bad.slice(0, 3).map(({ r, c }) => `"${r.pair.state}" ${c.problem}`).join(' | ')}` : ''}`);
        const held = judged.filter(({ c }) => !c.problem);
        for (const { c } of held) pairedByClass[c.cls]++;
        const pairUnder = held.filter(({ r, c }) => r.ratio < c.bar);
        ok(pairUnder.length === 0, `${where}: every paired specimen meets the contract of the pair it previews${
          pairUnder.length ? ` — ${pairUnder.slice(0, 3).map(({ r, c }) => `${r.pair.claim} at ${r.ratio}:1 (${c.contract}, needs ${c.bar}:1)`).join(' | ')}` : ''}`);
        for (const { r, c } of held.filter(({ c }) => c.cls === 'exempt')) {
          exemptCells.add(`${brand}/${mode}`);
          if (r.ratio < worstExempt) { worstExempt = r.ratio; worstExemptWhere = `${where} — ${r.pair.claim}`; }
          const rest = held.find(({ r: q }) => q.pair.row === r.pair.row && q.pair.state === 'rest');
          ok(rest && hexOf(rest.r.pair.fill) !== hexOf(r.pair.fill),
            `${where}: exempt ${r.pair.claim} is distinct from its row's rest fill — the one thing #1281 keeps gated (${
              rest ? `${hexOf(r.pair.fill)} vs rest ${hexOf(rest.r.pair.fill)}` : 'NO rest specimen in its row'})`);
        }
      }

      // --- rendered contrast, form controls (#1031) ---------------------------------------------
      // No per-state floor (a place may draw no field); "did it look?" is the sweep total below.
      const fieldsUnder = fieldsUnderBar(probe, where);
      for (const f of probe.fields) if (f.ratio < worstRatio) { worstRatio = f.ratio; worstWhere = `${where} — ${f.cls} ${f.text}`; }
      for (const f of probe.fields) if (!f.specimen && f.ratio < worstField) { worstField = f.ratio; worstFieldWhere = `${where} — ${f.cls} ${f.text}`; }
      ok(fieldsUnder.length === 0, `${where}: every one of ${probe.fields.length} form control(s) inks its value at its text bar (${CHROME_TEXT_MIN}:1, ${CHROME_LARGE_TEXT_MIN}:1 large) and its caret at ${CHROME_CARET_MIN}:1${
        fieldsUnder.length ? ` — ${fieldsUnder.slice(0, 3).map(describeField).join(' | ')}` : ''}`);
      if (place === 'layout' && mode === 'light') {
        // F1 A's canary: beside the disabled field, a copy that is NOT disabled but keeps its class, hook and, inline,
        // its colors. It must be measured and must fail its bar unexempted, so an exemption widened to a class or a
        // hook fails here by name.
        const planted = await page.evaluate(() => {
    const src = document.querySelector('[data-p3="bp-row"] input:disabled');
    if (!src) return false;
    const cs = getComputedStyle(src);
    const c = src.cloneNode(true);
    c.disabled = false;
    c.removeAttribute('id');
    c.setAttribute('data-ccanary', '');
    for (const p of ['background-color', 'color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color']) c.style.setProperty(p, cs.getPropertyValue(p));
    src.after(c);
    return true;
  });
        const cp = planted ? await page.evaluate(LEGIBILITY_PROBE) : null;
        await page.evaluate(() => { for (const n of document.querySelectorAll('[data-ccanary]')) n.remove(); });
        const cf = cp?.fields.find((f) => f.canary);
        ok(planted && !!cf && fieldFails(cf) && !isExemptField(cf),
          `${where}: the exemption canary, a field with the disabled field's class, hook and colors that is not disabled, is not exempted and fails its bar — ${JSON.stringify({ planted, measured: !!cf, ratio: cf?.ratio ?? null, exempted: cf ? isExemptField(cf) : null })}`);
      }
    }
  }
  console.log(`  ${brand}: ${places.length} places × ${modes.length} modes swept (${places.join(', ')})`);
  await ctx.close();
}

for (const lab of FONT_STATUS.labels) {
  const cells = [...fontStatusSeen.keys()].filter((k) => k.endsWith(` / ${lab.text}`));
  const unseen = cells.filter((c) => fontStatusSeen.get(c).drawn === 0).map((c) => c.slice(0, -(lab.text.length + 3)));
  const worst = Math.min(...cells.map((c) => fontStatusSeen.get(c)).filter((v) => v.drawn).map((v) => v.worst));
  ok(cells.length >= BRANDS.length * 2 && unseen.length === 0,
    `the font status "${lab.text}" was drawn, and so measured, on the Type page in every brand × mode swept (${cells.length - unseen.length} of ${cells.length}, lowest ${Number.isFinite(worst) ? `${worst}:1` : 'none'})${
      unseen.length ? ` — NOT EXERCISED in ${unseen.slice(0, 4).join(', ')}${unseen.length > 4 ? ', …' : ''}: the label was never drawn there, so its check measured nothing` : ''}`);
  console.log(`  font status "${lab.text}" (#2091, #2103): drawn in ${cells.length - unseen.length} of ${cells.length} brand × mode states, lowest ${Number.isFinite(worst) ? `${worst}:1` : 'none'}`);
}
for (const [k, seen] of gapSeen) {
  if (seen.drawn === 0) console.log(`  known gap #${k.issue} (${k.place} / ${k.cls} "${k.text}"): not drawn on this machine, so not exercised`);
  else ok(seen.under > 0, `known contrast gap #${k.issue} (${k.place} / ${k.cls} "${k.text}") still occurs — STALE if not: drawn ${seen.drawn} time(s), ${seen.under} below the chrome bar. Delete the row from KNOWN_CONTRAST_GAPS with the fix`);
}

// =============================================================================================
// 1a. Brand — moved to the two panes (UI redesign S3), on its own hooks
// =============================================================================================
// The Preview page left the Pages menu in S3: its Style guide is Brand's preview now (the legacy renderer,
// lent into `preview/brand.ts`), and its other two views are Inspect's (S1.3). So the Style guide's sweep is
// here, per corpus brand and per mode, held to everything the sweep above held it to: the rendered contrast of
// every text node and form control, the paired specimens against the contracts of the pairs they preview
// (#1652, counted into the same totals the sweep asserts below), and each ground on the brand's own
// `background.primary` from its COMMITTED EMISSION. Then Identity's namespace warning (T2).
//
// Mutation (S3, plan): let the namespace field accept `pds3` without the warning (its entry dropped from
// `RESERVED_NAMESPACES` in `src/state/brand-input.ts`) → `prism3: a reserved namespace warns before export —
// "pds3" must say "pds3 is the default theme’s placeholder. …", says null`, and the same for each brand's draft.
console.log(`\nBrand — the moved page, the Style guide per mode, the namespace warning\n${'='.repeat(78)}`);
/** T2 (v4 review) in concept v6's words: the namespaces that warn before export, and what each says. Literal. */
const RESERVED_NS = { pds3: 'pds3 is the default theme’s placeholder. Set your brand’s namespace before you export.',
  prism: 'prism is reserved for the shipped catalog. Set your brand’s namespace before you export.' };
/** The sections the Style guide draws on a ground (its specimen roots), by title, in order. Literal. The type
 *  sample opens it (#1942, owner decision Q67, S6.2), and the radius sample follows (owner decision D18 B, S7). */
const STYLE_GUIDE_ROOTS = ['Type sample', 'Radius and shadow sample', 'Background', 'Foreground', 'Text color', 'Border', 'Icon', 'Disabled', 'Interactive'];
let brandStates = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await hooks.click(page.locator('[data-p3="tab-brand"]'));
  await hooks.need(page, '[data-p3="brand-levers"]');
  await hooks.need(page, '[data-p3="brand-style-guide"] [data-p3="specimen"]');
  const emission = await loadEmission(brand);
  const modes = await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode));
  ok(modes.length >= 2, `${brand} / Brand: the mode control offers ${modes.length} modes (${modes.join(', ')})`);
  for (const mode of modes) {
    await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`));
    await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true', mode);
    await page.evaluate(() => document.fonts.ready);
    const where = `${brand} / Brand / ${mode}`;
    brandStates++;
    const errs = drain();
    ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
    await settle(page, where);
    const probe = await page.evaluate(LEGIBILITY_PROBE, '[data-p3="brand-style-guide"]');
    assertParsed(where, probe.unparsed);
    ok(probe.rootFound, `${where}: the Style guide is mounted in Brand's preview and was measured`);
    const rows = probe.text;
    nodesMeasured += rows.length;
    fieldsMeasured += probe.fields.length;
    ok(rows.length >= STATE_NODE_FLOOR, `${where}: the contrast probe measured ${rows.length} text nodes in the Style guide (floor ${STATE_NODE_FLOOR})`);
    for (const r of rows) if (r.ratio < worstRatio) { worstRatio = r.ratio; worstWhere = `${where} — ${r.cls} "${r.text}"`; }
    const under = rows.filter((r) => r.ratio < CONTRAST_FLOOR);
    ok(under.length === 0, `${where}: every one of ${rows.length} text nodes clears ${CONTRAST_FLOOR}:1${under.length ? ` — ${under.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1`).join(' | ')}` : ''}`);
    const chrome = rows.filter((r) => !r.specimen);
    specimensMeasured += rows.length - chrome.length;
    for (const r of chrome) if (r.ratio < worstChrome) { worstChrome = r.ratio; worstChromeWhere = `${where} — ${r.cls} "${r.text}"`; }
    const chromeUnder = chrome.filter((r) => r.ratio < barOf(r));
    ok(chromeUnder.length === 0, `${where}: every one of ${chrome.length} chrome text nodes meets WCAG 1.4.3 (${CHROME_TEXT_MIN}:1, ${CHROME_LARGE_TEXT_MIN}:1 large)${chromeUnder.length ? ` — ${chromeUnder.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1 (needs ${barOf(u)}:1)`).join(' | ')}` : ''}`);
    const unmarked = rows.filter((r) => r.inlineInk && !r.specimen);
    ok(unmarked.length === 0, `${where}: every node inked by an inline style is marked data-specimen at its render site${unmarked.length ? ` — ${unmarked.slice(0, 3).map((u) => `${u.cls} "${u.text}"`).join(' | ')}` : ''}`);
    const paired = rows.filter((r) => r.pair);
    ok(paired.length > 0, `${where}: the Style guide previews paired specimens (${paired.length})`);
    if (paired.length && emission) {
      modeCells.add(`${brand}/${mode}`);
      ok(emission.modes.includes(mode), `${where}: the mode "${mode}" is one the emission carries (${emission.modes.join(', ')})`);
      const judged = paired.map((r) => ({ r, c: classifyPair(r.pair, emission, mode) }));
      const bad = judged.filter(({ c }) => c.problem);
      ok(bad.length === 0, `${where}: every one of ${paired.length} paired specimens renders exactly the engine role pair it claims${bad.length ? ` — ${bad.slice(0, 3).map(({ r, c }) => `"${r.pair.state}" ${c.problem}`).join(' | ')}` : ''}`);
      const held = judged.filter(({ c }) => !c.problem);
      for (const { c } of held) pairedByClass[c.cls]++;
      const pairUnder = held.filter(({ r, c }) => r.ratio < c.bar);
      ok(pairUnder.length === 0, `${where}: every paired specimen meets the contract of the pair it previews${pairUnder.length ? ` — ${pairUnder.slice(0, 3).map(({ r, c }) => `${r.pair.claim} at ${r.ratio}:1 (${c.contract}, needs ${c.bar}:1)`).join(' | ')}` : ''}`);
      for (const { r, c } of held.filter(({ c }) => c.cls === 'exempt')) {
        exemptCells.add(`${brand}/${mode}`);
        if (r.ratio < worstExempt) { worstExempt = r.ratio; worstExemptWhere = `${where} — ${r.pair.claim}`; }
        const rest = held.find(({ r: q }) => q.pair.row === r.pair.row && q.pair.state === 'rest');
        ok(rest && hexOf(rest.r.pair.fill) !== hexOf(r.pair.fill),
          `${where}: exempt ${r.pair.claim} is distinct from its row's rest fill — the one thing #1281 keeps gated (${rest ? `${hexOf(r.pair.fill)} vs rest ${hexOf(rest.r.pair.fill)}` : 'NO rest specimen in its row'})`);
      }
    }
    const fieldsUnder = fieldsUnderBar(probe, where);
    ok(fieldsUnder.length === 0, `${where}: every one of ${probe.fields.length} form control(s) inks its value at its text bar and its caret at ${CHROME_CARET_MIN}:1${fieldsUnder.length ? ` — ${fieldsUnder.slice(0, 3).map(describeField).join(' | ')}` : ''}`);
    // Each Style guide ground on the page: the brand's own background.primary for this mode, from its emission.
    // Each Style guide section, named by its title: its specimen root (the ground it draws on) and that ground,
    // held per name against the emission (represented, not counted; S2's `EXPECT_STRIPS` shape).
    const sections = await page.evaluate(() => {
      const hex = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); return m ? `#${m[1].split(/[,\s/]+/).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}` : s; };
      return [...document.querySelectorAll('[data-p3="preview-body"] [data-p3="brand-style-guide"] .psec')].map((sec) => {
        const g = sec.querySelector(':scope > .sg-ground');
        return { name: sec.querySelector('[data-p3="section-title"]')?.textContent ?? '?', root: !!g && g.getAttribute('data-p3') === 'specimen', ground: g ? hex(getComputedStyle(g).backgroundColor) : null };
      });
    });
    const page0 = emission?.role('background.primary', mode)?.hex;
    ok(!!page0, `${where}: the emission names this mode's background.primary (${page0})`);
    for (const name of STYLE_GUIDE_ROOTS) {
      const st = sections.find((x) => x.name === name);
      ok(!!st && st.root && st.ground === page0, `${where}: Style guide section ${name} is a specimen root on the emission's background.primary ${page0}${!st ? ' — not drawn' : !st.root ? ' — not a specimen root' : st.ground !== page0 ? ` — on ${st.ground}` : ''}`);
    }
    const unlisted = sections.filter((x) => !STYLE_GUIDE_ROOTS.includes(x.name)).map((x) => x.name);
    ok(unlisted.length === 0, `${where}: every Style guide section drawn is a listed specimen${unlisted.length ? ` — unlisted section ${unlisted.join(', ')}` : ''}`);
    const dom = await page.evaluate(() => { const e = document.querySelector('[data-p3="error-bar"]'); return { mounted: !!e, shown: !!e && getComputedStyle(e).display !== 'none', overflowX: document.documentElement.scrollWidth - window.innerWidth }; });
    hooks.absent(ok, { seen: dom.mounted, state: 'the global error bar mounted, found by its hook' }, !dom.shown, `${where}: the global error bar is hidden`);
    ok(dom.overflowX <= 1, `${where}: no horizontal overflow (${dom.overflowX}px past the viewport)`);
  }
  // T2: a reserved or placeholder namespace warns before export, in v6's words; any other says the paths it makes.
  const root = (await page.inputValue('[data-p3="brand-namespace"]')).trim();
  const nsWarn = () => page.evaluate(() => document.querySelector('[data-p3="namespace-warning"]')?.textContent ?? null);
  const shown = await nsWarn();
  ok(shown === (RESERVED_NS[root] ?? null), `${brand}: a reserved namespace warns before export — "${root}" ${RESERVED_NS[root] ? `must say "${RESERVED_NS[root]}"` : 'must not warn'}, says ${JSON.stringify(shown)}`);
  for (const ns of Object.keys(RESERVED_NS)) {
    await page.fill('[data-p3="brand-namespace"]', ns);
    const said = await nsWarn();
    ok(said === RESERVED_NS[ns], `${brand}: a reserved namespace warns before export — a draft of "${ns}" must say "${RESERVED_NS[ns]}", says ${JSON.stringify(said)}`);
  }
  await page.fill('[data-p3="brand-namespace"]', root);
  await ctx.close();
}
ok(brandStates >= BRANDS.length * 2, `the Brand sweep visited ${brandStates} brand × mode states (floor ${BRANDS.length * 2})`);
console.log(`  ${brandStates} brand × mode states on Brand: the Style guide's text, fields, paired specimens and grounds, and the namespace warning per brand.`);

// The sweep totals, asserted rather than only printed (#779). Both were reported in the summary and
// compared to nothing; the state count is what makes "the loop never ran" a failure instead of a
// silence, and the node total is what catches every state rendering nothing but chrome — which the
// per-state floor passes 72 times over.
ok(statesVisited >= SWEEP_STATE_FLOOR,
  `the sweep visited ${statesVisited} place × mode × brand states (floor ${SWEEP_STATE_FLOOR})`);
// Every place REPRESENTED, not counted: a state total can stay above its floor with one place never walked.
ok(Object.keys(SWEEP_PLACES).every((p) => sweptPlaces.has(p)),
  `the sweep measured every place it lists (${Object.keys(SWEEP_PLACES).filter((p) => !sweptPlaces.has(p)).join(', ') || 'all walked'})`);
ok(nodesMeasured >= SWEEP_NODE_FLOOR,
  `the sweep measured ${nodesMeasured} text nodes in total (floor ${SWEEP_NODE_FLOOR})`);
// Both classes REPRESENTED, or the split is vacuous: zero specimens means the marker stopped reaching the
// DOM and every specimen is being judged as chrome (loud) — or the probe stopped reading it; zero chrome
// means every node was marked and the WCAG bar judged nothing.
ok(specimensMeasured > 0 && nodesMeasured - specimensMeasured > 0,
  `the sweep measured both classes — ${specimensMeasured} specimen and ${nodesMeasured - specimensMeasured} chrome text nodes (#779)`);
// The pair classification REPRESENTED (#1652), per class and per brand × mode: the exemption arm is an
// implication over exempt nodes and passes vacuously over none, so a marker that stopped reaching the DOM,
// or a spec that stopped declaring the pressed contract, must fail here rather than read as clean.
ok(PRESSED_MIN !== null, `preview-spec.json declares the button's pressed ink-on-fill contract — the exemption's source (#1281); read ${PRESSED_MIN}`);
ok(pairedByClass.contracted > 0 && pairedByClass.exempt > 0,
  `the sweep held paired specimens in both mapped classes — ${pairedByClass.contracted} contracted, ${pairedByClass.exempt} exempt, ${pairedByClass.unmapped} unmapped (#1652)`);
ok(HOVER_MIN !== null, `preview-spec.json declares the button's hover ink-on-fill contract (#1281, hover keeps UI); read ${HOVER_MIN}`);
// PER BRAND, not only in total (#1694 net): a brand whose Preview stopped emitting markers would otherwise drop
// out of \`modeCells\` silently while the other brand kept the sweep-wide counts green.
ok(BRANDS.every((b) => [...modeCells].some((k) => k.startsWith(`${b}/`))),
  `every brand previewed paired specimens (${BRANDS.filter((b) => ![...modeCells].some((k) => k.startsWith(`${b}/`))).join(', ') || 'all present'})`);
ok(modeCells.size > 0 && [...modeCells].every((k) => exemptCells.has(k)),
  `every brand × mode that previewed paired specimens previewed an exempt pressed one (${exemptCells.size} of ${modeCells.size})${
    [...modeCells].filter((k) => !exemptCells.has(k)).length ? ` — none in ${[...modeCells].filter((k) => !exemptCells.has(k)).join(', ')}` : ''}`);
ok(fieldsMeasured >= SWEEP_FIELD_FLOOR,
  `the sweep measured ${fieldsMeasured} form controls in total (floor ${SWEEP_FIELD_FLOOR})`);
// F1 A, counted: Layout's first breakpoint field is disabled by design (D13), so every brand's sweep must exempt it.
ok(BRANDS.every((b) => FIELD_EXEMPTIONS.some(([w, hk]) => w.startsWith(`${b} / layout /`) && hk === 'bp-input')),
  `every brand's sweep exempted Layout's disabled first breakpoint field from the field bar (F1 A) — exempted ${FIELD_EXEMPTIONS.length}; none for ${BRANDS.filter((b) => !FIELD_EXEMPTIONS.some(([w, hk]) => w.startsWith(`${b} / layout /`) && hk === 'bp-input')).join(', ') || 'no brand'}`);
console.log(`\n  Contrast exemption (inactive fields, WCAG 2.2 SC 1.4.3; F1 A): ${FIELD_EXEMPTIONS.length} field(s) exempted in ${new Set(FIELD_EXEMPTIONS.map(([w]) => w)).size} state(s).`);

console.log(`\n  ${statesVisited} page × mode states, ${nodesMeasured} text nodes, ${fieldsMeasured} form controls measured.`);
console.log(`  Lowest rendered contrast anywhere: ${worstRatio}:1 (specimen floor ${CONTRAST_FLOOR.toFixed(1)}:1)`);
console.log(`    ${worstWhere}`);
console.log(`  Lowest chrome text: ${worstChrome}:1 (bar ${CHROME_TEXT_MIN}:1, ${CHROME_LARGE_TEXT_MIN}:1 large) — ${specimensMeasured} of ${nodesMeasured} nodes are specimens`);
console.log(`    ${worstChromeWhere}`);
console.log(`  Lowest chrome form-control ink: ${worstField}:1 (bar ${CHROME_TEXT_MIN}:1, caret ${CHROME_CARET_MIN}:1)`);
console.log(`  Unparsed colors: ${unparsedTotal} (every one fails by name).`);
console.log(`    ${worstFieldWhere}`);
console.log(`  Lowest exempt pressed specimen: ${worstExempt}:1 (declared pressed min ${PRESSED_MIN}, smoke floor ${CONTRAST_FLOOR.toFixed(1)}:1 — #1281/#1456, not a finding)`);
console.log(`    ${worstExemptWhere}`);
console.log(`  Paired specimens: ${pairedByClass.contracted} contracted, ${pairedByClass.exempt} exempt, ${pairedByClass.unmapped} unmapped (#779) across ${modeCells.size} brand × mode cells.`);

// =============================================================================================
// 1b. Color › Palettes — moved to the two panes (UI redesign S2), on its own hooks
// =============================================================================================
// The sweep above walks the Pages menu, and Palettes left it in S2: it is the opening page, drawn by
// `domains/color-palettes.ts` and `preview/palettes.ts`. So its sweep is here, on the new hooks, per corpus
// brand and per mode: what the preview shows is held against the brand's COMMITTED EMISSION
// (`packages/engine/out/<brand>.tokens.json`), never against the page: every ramp the emission carries, with
// every step's hex, and each specimen strip on that mode's `background.primary`. The chrome around it
// (contrast, edges, fonts, targets) is `test:chrome`'s.
console.log(`\nColor › Palettes — the moved page, against each brand's emission\n${'='.repeat(78)}`);
/** Emitted palettes the preview does not draw as ramps: the fixed white, black and transparent, and the two
 *  alpha ramps, which it draws from the engine's constant step set on a checkerboard. Literal. */
const NOT_RAMPS = ['white', 'black', 'transparent', 'black-alpha', 'white-alpha'];
/** EXPECTED, by name (represented, not counted; docs/34): every strip each corpus brand's Palettes preview
 *  draws at this suite's 1440px, as palette-strip (1-based), each a specimen root on the page color. Every
 *  emitted ramp has 20 steps, two strips of ten; the opacity scale's 12 steps make two more. Literal, per
 *  brand, from the committed emissions; a brand the start screen offers that is not listed fails by name. */
const strips2 = (ps) => [...ps, 'opacity'].flatMap((p) => [`${p}-1`, `${p}-2`]);
const EXPECT_STRIPS = {
  prism3: strips2(['primary', 'accent', 'neutral', 'success', 'warning', 'danger', 'info']),
  aurora: strips2(['primary', 'accent', 'neutral', 'success', 'warning', 'danger', 'info']),
  harbor: strips2(['primary', 'neutral', 'success', 'warning', 'danger', 'info']),
};
/** A brand's emitted ramps, step → hex, from its committed emission (the oracle). */
const emittedRamps = async (brand) => {
  const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
  const emitted = tree[Object.keys(tree)[0]].core.palette;
  return Object.fromEntries(Object.entries(emitted).filter(([k]) => !NOT_RAMPS.includes(k))
    .map(([k, steps]) => [k, Object.fromEntries(Object.entries(steps).filter(([s]) => !s.startsWith('$')).map(([s, v]) => [s, String(v.$value).toLowerCase()]))]));
};
/** What the preview draws: per ramp, each step's label hex and its SQUARE's computed color (in step order,
 *  read off the label beside it); and every strip by name, with whether it is a specimen root and its ground. */
const readPalettes = (page) => page.evaluate(() => {
  const hex = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); return m ? `#${m[1].split(/[,\s/]+/).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}` : s; };
  const ramps = {}, squares = {};
  for (const b of document.querySelectorAll('[data-p3="preview-body"] [data-p3="palette"]:not(.p3-pal-reuse)')) {
    const keys = [...b.querySelectorAll('.p3-sqk-item')].map((li) => li.querySelector('.p3-sqk-step').textContent.trim());
    ramps[b.dataset.palette] = Object.fromEntries([...b.querySelectorAll('.p3-sqk-item')].map((li, i) => [keys[i], `#${li.querySelector('.p3-sqk-hex').textContent.trim()}`]));
    squares[b.dataset.palette] = Object.fromEntries([...b.querySelectorAll('.p3-sq')].map((q, i) => [keys[i], hex(getComputedStyle(q).backgroundColor)]));
  }
  const seen = {};
  const strips = [...document.querySelectorAll('[data-p3="preview-body"] .p3-sqs:not(.p3-checker)')].map((n) => {
    const pal = n.closest('[data-palette]')?.dataset.palette ?? (n.closest('[data-p3="opacity-scale"]') ? 'opacity' : '?');
    seen[pal] = (seen[pal] ?? 0) + 1;
    return { name: `${pal}-${seen[pal]}`, root: n.getAttribute('data-p3') === 'specimen', ground: hex(getComputedStyle(n).backgroundColor) };
  });
  return { ramps, squares, strips };
});
/** Every ramp's labels AND squares against the emission, each failing by palette and step. */
const checkRamps = (where, want, shown) => {
  const missing = Object.keys(want).filter((k) => !shown.ramps[k]);
  const extra = Object.keys(shown.ramps).filter((k) => !want[k]);
  ok(missing.length === 0 && extra.length === 0, `${where}: the preview draws exactly the emission's ${Object.keys(want).length} ramps${missing.length ? ` — missing ${missing.join(', ')}` : ''}${extra.length ? ` — not emitted ${extra.join(', ')}` : ''}`);
  const off = [], offSq = [];
  for (const [k, steps] of Object.entries(want)) for (const [st, hx] of Object.entries(steps)) {
    if (shown.ramps[k] && shown.ramps[k][st] !== hx) off.push(`${k} ${st} shows ${shown.ramps[k][st]} (emitted ${hx})`);
    if (shown.squares[k] && shown.squares[k][st] !== hx) offSq.push(`${k} ${st} is painted ${shown.squares[k][st]} (emitted ${hx})`);
  }
  ok(off.length === 0, `${where}: every step of every ramp shows its emitted hex${off.length ? ` — ${off.slice(0, 3).join(' | ')}` : ''}`);
  ok(offSq.length === 0, `${where}: every square of every ramp is painted its emitted hex${offSq.length ? ` — ${offSq.slice(0, 3).join(' | ')}` : ''}`);
};
let palettesStates = 0;
let recolored = 0;
for (const [bi, brand] of BRANDS.entries()) {
  const { ctx, page, drain } = await openBrand(brand);
  await hooks.need(page, '[data-p3="palettes-levers"]');
  const want = await emittedRamps(brand);
  const expectStrips = EXPECT_STRIPS[brand.toLowerCase()];
  ok(!!expectStrips, `${brand} / Palettes: the suite lists the strips this brand's preview draws (EXPECT_STRIPS)`);
  const emission = await loadEmission(brand);
  const modes = (await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode)));
  ok(modes.length >= 2, `${brand} / Palettes: the mode control offers ${modes.length} modes (${modes.join(', ')})`);
  for (const mode of modes) {
    await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`));
    await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true', mode);
    const where = `${brand} / Palettes / ${mode}`;
    palettesStates++;
    const errs = drain();
    ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
    const shown = await readPalettes(page);
    const chrome = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      errorBar: (() => { const e = document.querySelector('[data-p3="error-bar"]'); return { mounted: !!e, shown: !!e && getComputedStyle(e).display !== 'none' }; })(),
    }));
    checkRamps(where, want, shown);
    const page0 = emission?.role('background.primary', mode)?.hex;
    ok(!!page0, `${where}: the emission names this mode's background.primary (${page0})`);
    for (const name of expectStrips ?? []) {
      const st = shown.strips.find((x) => x.name === name);
      ok(!!st && st.root && st.ground === page0, `${where}: strip ${name} is a specimen root on the emission's background.primary ${page0}${!st ? ' — not drawn' : !st.root ? ' — not a specimen root' : st.ground !== page0 ? ` — on ${st.ground}` : ''}`);
    }
    const unlisted = shown.strips.filter((x) => !(expectStrips ?? []).includes(x.name)).map((x) => x.name);
    ok(unlisted.length === 0, `${where}: every strip drawn is a listed specimen${unlisted.length ? ` — unlisted strip ${unlisted.join(', ')}` : ''}`);
    const shownErr = chrome;
    hooks.absent(ok, { seen: shownErr.errorBar.mounted, state: 'the global error bar mounted, found by its hook' }, !shownErr.errorBar.shown, `${where}: the global error bar is hidden`);
    ok(shownErr.overflowX <= 1, `${where}: no horizontal overflow (${shownErr.overflowX}px past the viewport)`);
  }
  // THE RECOLOR PATH. A ramp whose structure did not change keeps its nodes and only has its colors patched
  // (`recolor` in `preview/palettes.ts`). Switching to the next corpus brand from the brand menu takes that
  // path for every ramp both brands draw alike, and the squares must then show the NEW brand's emission.
  const next = BRANDS[(bi + 1) % BRANDS.length];
  // Back to the first mode, which a brand load resets to, so the page color under the ramps is the same
  // before and after and the ramps are not rebuilt for a change of ground.
  await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${modes[0]}"]`));
  await page.evaluate(() => { for (const b of document.querySelectorAll('[data-p3="preview-body"] [data-p3="palette"]')) b.__kept = true; });
  await hooks.click(page.locator('[data-p3="brand-switcher"]'));
  await hooks.click(page.locator('[data-p3="brand-menu"] [data-p3="brand-menu-example"]').filter({ hasText: next }).first());
  await page.waitForFunction((n) => document.querySelector('[data-p3="brand-switcher"]')?.textContent?.includes(n), next, { timeout: 10000 }).catch(() => {});
  await hooks.need(page, '[data-p3="palettes-levers"]');
  const after = await readPalettes(page);
  const kept = await page.evaluate(() => [...document.querySelectorAll('[data-p3="preview-body"] [data-p3="palette"]')].filter((b) => b.__kept).length);
  recolored += kept;
  checkRamps(`${brand} → ${next} / Palettes, ${kept} ramp(s) recolored in place`, await emittedRamps(next), after);
  await ctx.close();
}
ok(recolored > 0, `the brand switches recolored ${recolored} ramp(s) in place, so the recolor path was measured`);
ok(palettesStates >= BRANDS.length * 2, `the Palettes sweep visited ${palettesStates} brand × mode states (floor ${BRANDS.length * 2})`);

// =============================================================================================
// 1c. Color › Surfaces & fills — moved to the two panes (UI redesign S4a), on its own hooks
// =============================================================================================
// Its preview draws the legacy Style guide's five color sections (owner decision Q5, 2026-10-01) from the
// SAME modules the Style guide draws them with, plus the brand's gradients. Per corpus brand and per mode,
// against the brand's COMMITTED EMISSION, never the page:
//   · every section ground is a specimen root on the emission's `background.primary` (listed by name);
//   · every painted swatch (a card's fill, a border, an ink, an icon) is the emission's hex for its role, in
//     the page's mode, except the Text color section's second column, held by its POSITION to the opposite
//     mode — on Surfaces & fills and on the Style guide, in every mode;
//   · each of the five sections' roots carries the marker only its shared module stamps (`data-sg-section`),
//     and so does the Focus ring after Border (S4c, owner decision Q30), whose two rings are held, as
//     painted swatches, to the emission's `border.focus`;
//   · every ratio badge prints the ratio THIS FILE computes, with its own WCAG function, from the two
//     emitted hexes (the role and what the emission says it is measured against), and marks below-floor
//     exactly when that ratio is under the emission's `min`; a graded role's chip with no badge fails;
//   · the five sections draw, in order, the token chips the Style guide has always drawn (literal), on
//     Surfaces & fills AND on the Style guide itself, so a change to a shared section shows on both.
// S4f: Surfaces & fills also draws Scrim (QA-B10, out of Background) and Fields (#2016), each with its own marker and
// chips (literal); Background carries no badge (#1971) and Foreground badges its bold fills against the floor (GR2); every
// section sits on the page except Foreground,
// which sits on the contrast floor (the emission's own `against` for foreground.brand, resolved to its hex) under a line
// naming that step (#1971, the grounds the owner confirmed 2026-10-03); the
// Fields section paints every opaque field role, page and inverse, held to its emitted hex; and each levers section
// is described as the preview section it pairs with (Q23), Scrim and Fields included.
console.log(`\nColor › Surfaces & fills — the moved page, against each brand's emission\n${'='.repeat(78)}`);
/** The token chips each shared section draws, in order. Literal: the Style guide's sections as `main.ts` drew
 *  them before the lift (UI redesign S4a), which both pages must keep drawing. */
const SEM5 = ['brand', 'danger', 'success', 'warning', 'info'];
const EXPECT_SECTION_CHIPS = {
  // S4d (owner decision Q47): no "Inverse text" sample on the inverse Primary card, so no inverse.text.primary chip.
  Background: ['background.primary', 'background.secondary', 'background.tertiary', 'inverse.background.primary',
    'inverse.background.secondary', 'inverse.background.tertiary', 'scrim.default'],
  Foreground: ['foreground.primary', 'foreground.secondary', 'foreground.tertiary', 'inverse.foreground.primary', 'inverse.foreground.secondary',
    'inverse.foreground.tertiary', ...SEM5.flatMap((s) => [`foreground.${s}`, `text.on-${s}`]), ...SEM5.flatMap((s) => [`foreground.${s}-subtle`, `text.${s}`])],
  'Text color': ['text.primary', 'text.secondary', 'text.tertiary', ...SEM5.map((s) => `text.${s}`), ...SEM5.map((s) => `text.${s}-subtle`),
    'text.link.default', 'text.link.hover', 'text.link.pressed', 'text.link.visited', 'text.link.focused'],
  Border: ['border.primary', 'border.secondary', 'border.tertiary', 'inverse.border.primary', 'border.focus', 'inverse.border.focus',
    ...SEM5.map((s) => `border.${s}`)],
  Icon: ['icon.primary', 'icon.secondary', 'icon.tertiary', ...SEM5.map((s) => `icon.${s}`), ...SEM5.map((s) => `icon.on-${s}`)],
};
/** The specimen roots each corpus brand's Surfaces & fills preview draws: the five sections, and Gradients
 *  where the brand ships gradients (harbor ships none). Literal, per brand. S4f adds Scrim (QA-B10) and Fields
 *  (#2016, Q80). */
const FIVE = Object.keys(EXPECT_SECTION_CHIPS);
const FILLS_SECTIONS = [...FIVE, 'Scrim', 'Fields', 'Focus ring'];
const EXPECT_FILLS_ROOTS = { prism3: [...FILLS_SECTIONS, 'Gradients'], aurora: [...FILLS_SECTIONS, 'Gradients'], harbor: FILLS_SECTIONS };
/** S4f: Surfaces & fills draws Background WITHOUT the scrim, which has its own section there (QA-B10), and the Fields
 *  section (#2016): each state's border role, then its text role (the placeholder, or the ground's primary ink once
 *  filled), with the fill on the rest field, page then inverse. Literal. The Style guide keeps `EXPECT_SECTION_CHIPS`. */
const fieldChips = (p, ink) => [`${p}field.border.rest`, `${p}field.placeholder`, `${p}field.fill`, `${p}field.border.hover`, `${p}field.placeholder`, `${p}field.border.rest`, ink];
const EXPECT_FILLS_CHIPS = {
  ...EXPECT_SECTION_CHIPS,
  Background: EXPECT_SECTION_CHIPS.Background.filter((r) => r !== 'scrim.default'),
  Scrim: ['scrim.default'],
  Fields: [...fieldChips('', 'text.primary'), ...fieldChips('inverse.', 'inverse.text.primary')],
};
/** #1971 (Q81): on Surfaces & fills the page planes themselves, Background, carry no ratio badge. Literal. Foreground
 *  carries its badges again since it sits on the floor it is measured against (GR2, owner 2026-10-04). */
const FILLS_GROUNDS = ['Background'];
/** GR2: the Foreground roles each measured against the contrast floor, whose badges must be drawn in the Foreground
 *  section and print the ratio of the role's EMITTED hex against the EMITTED floor (the ground the section shows).
 *  Literal: the five bold fills. */
const FLOOR_BADGED = ['brand', 'danger', 'success', 'warning', 'info'].map((s) => `foreground.${s}`);
/** #1971 Q13(a) (owner, 2026-10-05): the Foreground cards whose badge describes the text drawn on the card's own fill,
 *  as [fill, text]: the three Inverse cards (their label) and the five Subtle cards. Literal. */
const ON_FILL_CARDS = [...['primary', 'secondary', 'tertiary'].map((t) => [`inverse.foreground.${t}`, 'inverse.text.primary']),
  ...['brand', 'danger', 'success', 'warning', 'info'].map((s) => [`foreground.${s}-subtle`, `text.${s}`])];
/** #2121: the minimum each of those cards' text is held to, which its badge's ✓/✗ is the verdict of. Literal, never
 *  the badge's or the resolver's own `min`: a status text 4.5:1, and 7:1 in the high-contrast modes; the inverse
 *  label 7:1, and 15:1 in the high-contrast modes (the engine's contracts, as `resolveAllModes` states them for every
 *  example brand on 2026-10-05). */
const ON_FILL_MIN = (mode, ink) => (ink === 'inverse.text.primary' ? (mode.startsWith('hc') ? 15 : 7) : (mode.startsWith('hc') ? 7 : 4.5));
/** #1971 (owner, 2026-10-03): the section that sits on the CONTRAST FLOOR, the step `foreground.*` is measured against,
 *  rather than on the page; every other section, Background included, sits on the page. Literal. Its ground's hex is
 *  the EMISSION's: `foreground.brand`'s `against` in the mode, resolved as a role or a palette step from the committed
 *  tree, never from the studio's resolver. */
const FILLS_ON_FLOOR = ['Foreground'];
/** The owner's call (2026-10-05): the three Neutral cards badge their text on their own fill too, as [fill, text], the
 *  badge naming that pair (`data-pair`). Literal. */
const NEUTRAL_ON_FILL = ['primary', 'secondary', 'tertiary'].map((t) => [`foreground.${t}`, 'text.primary']);
/** The line naming the floor inside that section's ground (APPROVED, owner 2026-10-04, GR1). Literal. */
const floorLabel = (step) => `On the contrast floor (${step})`;
/** Roles whose swatch must be among those checked, one or more per section, so an empty read fails by name. */
const MUST_PAINT = ['background.primary', 'inverse.background.primary', 'foreground.brand', 'text.on-brand', 'text.primary', 'border.secondary', 'icon.primary', 'icon.on-brand'];
/** #2016: the Fields section's own painted roles, every opaque field role page and inverse, each held to its emitted hex
 *  by the swatch check. Literal. (The fills are transparent by default: no opaque hex, so not listed.) */
const MUST_PAINT_FIELDS = ['field.border.rest', 'field.border.hover', 'field.placeholder', 'inverse.field.border.rest', 'inverse.field.border.hover', 'inverse.field.placeholder'];
/** Q23 on Surfaces & fills: each levers section and the preview section it is described as, by title. Background fills
 *  and Foreground fills are the owner's renames (Q26, Q44); Scrim and Fields are S4f's. Literal. */
const FILLS_Q23 = [['Background fills', 'Background'], ['Scrim', 'Scrim'], ['Foreground', 'Foreground'], ['Text color', 'Text color'], ['Border', 'Border'], ['Icon', 'Icon'], ['Fields', 'Fields']];
/** A palette step's emitted hex (`neutral.050` → `core.palette.neutral.050`), for an `against` that names one. */
const emittedPalette = async (brand) => {
  const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
  const pal = tree[Object.keys(tree)[0]].core.palette;
  return (ref) => { const [p, s] = [ref.slice(0, ref.lastIndexOf('.')), ref.slice(ref.lastIndexOf('.') + 1)]; const v = pal?.[p]?.[s]?.$value; return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null; };
};
const hexRgb = (hx) => ({ r: parseInt(hx.slice(1, 3), 16), g: parseInt(hx.slice(3, 5), 16), b: parseInt(hx.slice(5, 7), 16), a: 1 });
const rgbHex = (s) => { const c = parseRgb(s); return c && c.a > 0.999 ? hexOf(c) : null; };
const readSections = (page, hostSel) => page.evaluate((sel) => {
  const host = document.querySelector(sel);
  const hex = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s ?? ''); return m ? `#${m[1].split(/[,\s/]+/).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}` : s; };
  const sections = [...(host?.querySelectorAll('.psec') ?? [])].map((s) => ({
    name: s.querySelector('.psec-t')?.textContent ?? '?',
    shared: s.getAttribute('data-sg-section'),
    root: s.querySelector('.sg-ground')?.getAttribute('data-p3') === 'specimen',
    ground: hex(getComputedStyle(s.querySelector('.sg-ground') ?? s).backgroundColor),
    groundLabel: s.querySelector('.sg-ground [data-p3="ground-label"]')?.textContent ?? null,
    chips: [...s.querySelectorAll('.sg-ground [data-p3="token-pill"]')].map((p) => p.textContent.replace(/^color\./, '').replace(/!$/, '')),
    badges: s.querySelectorAll('[data-p3="ratio-badge"]').length,
  }));
  const paint = [...(host?.querySelectorAll('[data-sg-role]') ?? [])].map((n) => {
    const cs = getComputedStyle(n);
    // A cell of the Text color section's three-column grid reports its COLUMN, counted from its position
    // among the grid's children (the three heads, then a row of three per ink). The mode a swatch must show
    // is derived from that, never from the `data-sg-mode` the section writes about itself (read below for
    // the failure message only).
    const grid = n.parentElement?.classList.contains('sg-tcg') ? n.parentElement : null;
    return { role: n.dataset.sgRole, prop: n.dataset.sgPaint, claims: n.dataset.sgMode ?? null, section: n.closest('.psec')?.querySelector('.psec-t')?.textContent ?? null,
      col: grid ? [...grid.children].indexOf(n) % 3 : null,
      css: n.dataset.sgPaint === 'background' ? cs.backgroundColor : n.dataset.sgPaint === 'border' ? cs.borderTopColor : n.dataset.sgPaint === 'outline' ? cs.outlineColor : cs.color };
  });
  // A badge inside the Text color grid reports its COLUMN, by its cell's position (0: the page's mode, 1: the
  // opposite mode, 2: the token column), never by anything the section writes about it (S4d, Q46).
  const colOf = (b) => { const cell = b.closest('.sg-tc'); const grid = cell?.parentElement?.classList.contains('sg-tcg') ? cell.parentElement : null; return grid ? [...grid.children].indexOf(cell) % 3 : null; };
  const badges = [...(host?.querySelectorAll('[data-p3="ratio-badge"]') ?? [])].map((b) => ({ role: b.dataset.role, text: b.querySelector('.sg-ratio-n')?.textContent ?? '', below: b.dataset.below === 'true', mark: b.querySelector('.sg-ratio-mk')?.textContent ?? '', col: colOf(b), section: b.closest('.psec')?.querySelector('.psec-t')?.textContent ?? null, pair: b.dataset.pair ?? null }));
  // The Text color section's graded inks, by row: the token in the third column, and the column of each badge in that row.
  const tcRows = [...(host?.querySelectorAll('.sg-tcg') ?? [])].flatMap((g) => {
    const cells = [...g.children].slice(3);
    const out = [];
    for (let i = 0; i + 2 < cells.length; i += 3) out.push({ role: cells[i + 2].querySelector('[data-p3="token-pill"]')?.textContent.replace(/^color\./, '').replace(/!$/, '') ?? '?', cols: [0, 1, 2].map((c) => [...cells[i + c].querySelectorAll('[data-p3="ratio-badge"]')].map((b) => b.dataset.role)) });
    return out;
  });
  const chipsWithBadge = [...(host?.querySelectorAll('.sg-pills') ?? [])].flatMap((w) => [...w.querySelectorAll('[data-p3="token-pill"]')].map((p) => {
    const role = p.textContent.replace(/^color\./, '').replace(/!$/, '');
    let n = p.closest('[data-p3="token-pill-wrap"]') ?? p; n = n.nextElementSibling;
    return { role, badge: n?.getAttribute('data-p3') === 'ratio-badge' && n.dataset.role === role, section: w.closest('.psec')?.querySelector('.psec-t')?.textContent ?? null };
  }));
  return { sections, paint, badges, chipsWithBadge, tcRows };
}, hostSel);
/** THE TYPE SAMPLE'S ORACLE (#1942), from the brand's COMMITTED emission, never the renderer: the face each
 *  `core.font.family.<type>` resolves to in a mode (the mode's own value where the leaf carries one, its alias
 *  followed to the `core.font.typeface.*` it names), and the `type.*` styles the brand emits with their sizes. */
const emittedType = async (brand) => {
  const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
  const rootKey = Object.keys(tree)[0];
  const at = (path) => path.split('.').reduce((n, k) => n?.[k], tree[rootKey]);
  const valueIn = (leaf, mode) => leaf?.$extensions?.prism3?.modes?.[mode]?.$value ?? leaf?.$value;
  const face = (group, mode) => {
    let v = valueIn(at(`core.font.family.${group}`), mode);
    for (let hops = 0; typeof v === 'string' && v.startsWith('{') && hops < 8; hops++) v = valueIn(at(v.slice(1, -1).replace(`${rootKey}.`, '')), mode);
    return typeof v === 'string' ? v : null;
  };
  const styles = [];
  const walk = (n, path) => { for (const [k, v] of Object.entries(n ?? {})) { if (k.startsWith('$') || !v || typeof v !== 'object') continue; if (v.$type === 'typography') styles.push({ path: `${path}.${k}`, px: v.$extensions?.prism3?.sizePx }); else walk(v, `${path}.${k}`); } };
  walk(tree[rootKey].type, 'type');
  return { face, styles };
};
/** The display style the sample must open with: `type.display.md.strong` where the brand emits it (owner decision
 *  Q67's proposal, literal here), else the largest display style it emits. Then the title, body, label and caption
 *  lines, by text type, in that order. Literal. */
const SAMPLE_DISPLAY = 'type.display.md.strong';
const SAMPLE_GROUPS = ['display', 'title', 'body', 'label', 'caption'];
const firstFace = (css) => (css ?? '').split(',')[0].trim().replace(/^["']|["']$/g, '');
const readTypeSample = (page, hostSel) => page.evaluate((sel) => [...document.querySelectorAll(`${sel} [data-sg-section="type-sample"] [data-p3="type-sample-line"]`)].map((r) => {
  const t = r.querySelector('.tsm-text');
  const cs = t ? getComputedStyle(t) : null;
  return { token: r.querySelector('[data-p3="token-pill"]')?.textContent ?? '', family: cs?.fontFamily ?? '', size: cs?.fontSize ?? '' };
}), hostSel);
/** Hold one drawn type sample to the emission: its lines' text types in order, the display line's style, and each
 *  line's FIRST computed face against the face the emission binds that line's own text type to in `mode`. */
let typeSampleLines = 0;
const checkTypeSample = (where, lines, oracle, mode) => {
  const groups = lines.map((l) => l.token.split('.')[1]);
  ok(JSON.stringify(groups) === JSON.stringify(SAMPLE_GROUPS), `type sample: ${where}: draws a display, title, body, label and caption line, in order — drew ${JSON.stringify(lines.map((l) => l.token))}`);
  const displays = oracle.styles.filter((x) => x.path.startsWith('type.display.') && !/-(italic|link)/.test(x.path));
  const wantDisplay = displays.some((x) => x.path === SAMPLE_DISPLAY) ? SAMPLE_DISPLAY : displays.reduce((a, x) => (!a || x.px > a.px ? x : a), null)?.path;
  ok(lines[0]?.token === wantDisplay, `type sample: ${where}: the display line is ${wantDisplay} — drew ${lines[0]?.token}`);
  for (const l of lines) {
    typeSampleLines++;
    const g = l.token.split('.')[1];
    const want = oracle.face(g, mode);
    const got = firstFace(l.family);
    ok(!!want && got === want, `type sample: ${where}: ${g} line is set in ${want} (core.font.family.${g})${got === want ? '' : ` — drew ${got}`}`);
    const px = oracle.styles.find((x) => x.path === l.token)?.px;
    ok(px !== undefined && l.size === `${px}px`, `type sample: ${where}: ${l.token} is set at its emitted ${px}px${l.size === `${px}px` ? '' : ` — drew ${l.size}`}`);
  }
};
const SG_FILLS = '[data-p3="preview-body"] [data-p3="surfaces-style-guide"]';
/** The marker each shared section module stamps on its own root (`data-sg-section`, `kit.ts`'s header),
 *  by title. Literal. A section drawn by anything but its module (`main.ts` drawing its own Border through an
 *  aliased `palSection`, say) carries none, and fails here by name on whichever page drew it. */
const EXPECT_SHARED_MARKER = { Background: 'background', Foreground: 'foreground', 'Text color': 'text-color', Border: 'border', Icon: 'icon' };
/** The Style guide's last two sections, shared since S5.1 (`sections/disabled.ts`, `sections/interactive.ts`).
 *  The Style guide and Color › Interactive (S5.2, section 1d) draw them; Surfaces & fills does not. Literal. */
const EXPECT_SG_ONLY_MARKER = { Disabled: 'disabled', Interactive: 'interactive' };
/** The Focus ring, shared since S4c (`sections/focus-ring.ts`): Surfaces & fills draws it after Border (owner
 *  decision Q30); the Style guide does not. Literal. */
const EXPECT_FILLS_ONLY_MARKER = { 'Focus ring': 'focus-ring', Scrim: 'scrim', Fields: 'fields' };
const checkSharedMarkers = (where, got, expect = EXPECT_SHARED_MARKER) => {
  for (const [name, key] of Object.entries(expect)) {
    const s = got.sections.find((x) => x.name === name);
    ok(!!s && s.shared === key, `${where}: the ${name} section is the shared module's (data-sg-section="${key}")${!s ? ' — not drawn' : s.shared !== key ? ` — its root carries ${s.shared === null ? 'no marker' : `data-sg-section="${s.shared}"`}: drawn by something other than preview/sections/` : ''}`);
  }
};
/** The mode the Text color section's SECOND column shows, by THIS FILE's statement of the rule (the page
 *  mode's counterpart where the brand has it, else the first other mode), from the mode control's own list.
 *  The first column is the page's mode. Neither is read from the section (follow-up to #1951: reading the
 *  section's own `data-sg-mode` let a column paint the wrong mode and label itself to match). */
const OPPOSITE = { light: 'dark', dark: 'light', 'hc-light': 'hc-dark', 'hc-dark': 'hc-light' };
const oppositeMode = (cur, modes) => (OPPOSITE[cur] && modes.includes(OPPOSITE[cur]) ? OPPOSITE[cur] : (modes.find((m) => m !== cur) ?? cur));
/** Every painted swatch against the emission's hex for its role, in the mode its POSITION says it shows. */
const checkSwatches = (where, got, emission, mode, modes) => {
  const opp = oppositeMode(mode, modes);
  const offPaint = [], checked = new Set();
  let oppCells = 0;
  for (const n of got.paint) {
    const m = n.col === 1 ? opp : mode;
    const want = emission?.role(n.role, m)?.hex;
    if (!want) continue;   // a translucent role (an alpha) has no opaque hex to hold it to
    const drawn = rgbHex(n.css);
    checked.add(n.role);
    fillsPaint++;
    if (n.col === 1) oppCells++;
    if (drawn !== want) offPaint.push(`${n.role} ${n.prop}${n.col !== null ? ` (Text color column ${n.col + 1}, ${m})` : ''} is painted ${drawn ?? n.css} (emitted ${want} in ${m}${n.claims ? `; the node says data-sg-mode="${n.claims}"` : ''})`);
  }
  ok(offPaint.length === 0, `${where}: every swatch is painted its emitted hex, the Text color columns in ${mode} and ${opp}${offPaint.length ? ` — ${offPaint.slice(0, 3).join(' | ')}` : ''}`);
  const unpainted = MUST_PAINT.filter((r) => !checked.has(r));
  ok(unpainted.length === 0, `${where}: the swatch check read the listed roles${unpainted.length ? ` — not read: ${unpainted.join(', ')}` : ''}`);
  ok(oppCells > 0, `${where}: the swatch check read the Text color section's second column (${oppCells} cell(s) held to ${opp})`);
};
const floor2 = (r) => Math.floor(r * 100) / 100;
let fillsStates = 0, fillsBadges = 0, fillsPaint = 0, sgStates = 0, floorDiffers = 0, fillsDrawnPairs = 0, neutralPairs = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  const emission = await loadEmission(brand);
  const palOf = await emittedPalette(brand);
  const expectRoots = EXPECT_FILLS_ROOTS[brand.toLowerCase()];
  ok(!!expectRoots, `${brand} / Surfaces & fills: the suite lists the specimen roots this brand's preview draws (EXPECT_FILLS_ROOTS)`);
  await hooks.click(page.locator('[data-p3="tab-color"]'));
  await hooks.click(page.locator('[data-p3="color-sub-fills"]'));
  await hooks.need(page, '[data-p3="fills-levers"]');
  await hooks.need(page, SG_FILLS);
  const modes = (await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode)));
  for (const mode of modes) {
    await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`));
    await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true', mode);
    const where = `${brand} / Surfaces & fills / ${mode}`;
    fillsStates++;
    const errs = drain();
    ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
    const got = await readSections(page, SG_FILLS);
    const page0 = emission?.role('background.primary', mode)?.hex;
    // #1971: the contrast floor, from the emission: what foreground.brand is measured against in this mode, as a hex.
    const floorStep = emission?.role('foreground.brand', mode)?.against ?? null;
    const floor0 = floorStep ? (emission.role(floorStep, mode)?.hex ?? palOf(floorStep)) : null;
    ok(!!page0 && !!floor0, `${where}: the emission names this mode's background.primary (${page0}) and the contrast floor foreground.brand is measured against (${floorStep} ${floor0})`);
    if (floor0 && floor0 !== page0) floorDiffers++;
    for (const name of expectRoots ?? []) {
      const s = got.sections.find((x) => x.name === name);
      // #1971: Foreground on the contrast floor, every other section (Background included) on the page.
      const onFloor = FILLS_ON_FLOOR.includes(name);
      const want = onFloor ? floor0 : page0;
      ok(!!s && s.root && s.ground === want, `${where}: section ${name} is a specimen root on ${onFloor ? `the emission's contrast floor ${floorStep} ${floor0} (#1971)` : `the emission's background.primary ${page0}`}${!s ? ' — not drawn' : !s.root ? ' — not a specimen root' : s.ground !== want ? ` — on ${s.ground}` : ''}`);
    }
    // #1971: the floor's section names its ground, by the emission's step; no other section carries the line.
    for (const name of expectRoots ?? []) {
      const s = got.sections.find((x) => x.name === name);
      const want = FILLS_ON_FLOOR.includes(name) && floorStep ? floorLabel(floorStep) : null;
      ok((s?.groundLabel ?? null) === want, `${where}: section ${name} ${want ? `names its ground "${want}"` : 'carries no ground label'}${(s?.groundLabel ?? null) !== want ? ` — read ${JSON.stringify(s?.groundLabel ?? null)}` : ''}`);
    }
    const unlisted = got.sections.filter((x) => !(expectRoots ?? []).includes(x.name)).map((x) => x.name);
    ok(unlisted.length === 0, `${where}: every section drawn is a listed specimen root${unlisted.length ? ` — unlisted ${unlisted.join(', ')}` : ''}`);
    // #1971: the page planes carry no ratio badge.
    for (const name of FILLS_GROUNDS) {
      const n = got.sections.find((x) => x.name === name)?.badges ?? -1;
      ok(n === 0, `${where}: the ${name} section shows no contrast badge (#1971) — ${n} drawn`);
    }
    // GR2: on the floor, Foreground badges each bold fill, and each such badge prints the emitted fill against the
    // emitted floor: the ground the section is drawn on. Computed here, from the two emitted hexes.
    const offFloor = [];
    for (const role of FLOOR_BADGED) {
      const b = got.badges.find((x) => x.section === 'Foreground' && x.role === role);
      const r = emission?.role(role, mode);
      if (!b) { offFloor.push(`${role}: no badge drawn`); continue; }
      if (!r || !floor0 || r.against !== floorStep) { offFloor.push(`${role}: the emission measures it against ${r?.against}, not the floor ${floorStep}`); continue; }
      const want = wcag(hexRgb(r.hex), hexRgb(floor0));
      if (!(Math.abs(parseFloat(b.text) - floor2(want)) <= 0.011)) offFloor.push(`${role} prints ${b.text}, the emitted ${r.hex} on the floor ${floor0} measures ${want.toFixed(3)}:1`);
    }
    ok(offFloor.length === 0, `${where}: the Foreground section, on the contrast floor, badges each bold fill with its emitted ratio against that floor (GR2)${offFloor.length ? ` — ${offFloor.join(' | ')}` : ''}`);
    // #1971 Q13(a) (owner, 2026-10-05): every Subtle and Inverse card in Foreground badges what it DRAWS, its text on
    // its fill. Read off the render: the card's own fill and label colors, each held to the emission's hex for the role
    // it paints, and the ratio computed HERE from those two, never from the badge's own claim or the floor.
    const drawn = await page.evaluate((sel) => [...(document.querySelector(sel)?.querySelectorAll('.psec') ?? [])]
      .filter((x) => x.querySelector('.psec-t')?.textContent === 'Foreground')
      .flatMap((x) => [...x.querySelectorAll('.sg-cw')]).map((cw) => {
        const card = cw.querySelector('.sg-card'), lab = card?.querySelector('.sg-lab');
        const b = cw.querySelector('[data-p3="ratio-badge"][data-pair]');
        return { fillRole: card?.dataset.sgRole ?? null, inkRole: lab?.dataset.sgRole ?? null, fill: card ? getComputedStyle(card).backgroundColor : null,
          ink: lab ? getComputedStyle(lab).color : null, badge: b ? b.querySelector('.sg-ratio-n')?.textContent ?? '' : null, mark: b ? b.querySelector('.sg-ratio-mk')?.textContent ?? null : null, pair: b?.dataset.pair ?? null };
      }), SG_FILLS);
    const offDrawn = [];
    for (const [fillRole, inkRole] of ON_FILL_CARDS) {
      const d = drawn.find((x) => x.fillRole === fillRole);
      if (!d) { offDrawn.push(`${fillRole}: card not drawn`); continue; }
      if (d.inkRole !== inkRole) { offDrawn.push(`${fillRole}: its text is ${d.inkRole}, not ${inkRole}`); continue; }
      if (d.badge === null) { offDrawn.push(`${fillRole}: no badge of its drawn pairing`); continue; }
      const fillHex = rgbHex(d.fill), inkHex = rgbHex(d.ink);
      const wantFill = emission?.role(fillRole, mode)?.hex, wantInk = emission?.role(inkRole, mode)?.hex;
      if (fillHex !== wantFill || inkHex !== wantInk) { offDrawn.push(`${inkRole} on ${fillRole}: renders ${inkHex} on ${fillHex}, the emission says ${wantInk} on ${wantFill}`); continue; }
      const want = wcag(hexRgb(inkHex), hexRgb(fillHex));
      if (!(Math.abs(parseFloat(d.badge) - floor2(want)) <= 0.011)) offDrawn.push(`${inkRole} on ${fillRole} prints ${d.badge}, the drawn ${inkHex} on ${fillHex} measures ${want.toFixed(3)}:1`);
      // #2121: and its mark is the verdict of that measured ratio against the text's minimum, typed here (ON_FILL_MIN).
      const wantMark = want + 1e-9 < ON_FILL_MIN(mode, inkRole) ? '✗' : '✓';
      if (d.mark !== wantMark) offDrawn.push(`${inkRole} on ${fillRole} marks ${JSON.stringify(d.mark)}, the drawn ${want.toFixed(3)}:1 against the ${ON_FILL_MIN(mode, inkRole)}:1 minimum is ${wantMark}`);
      fillsDrawnPairs++;
    }
    ok(offDrawn.length === 0, `${where}: every Subtle and Inverse card in Foreground badges its text on its own fill, as drawn (#1971 Q13(a))${offDrawn.length ? ` — ${offDrawn.join(' | ')}` : ''}`);
    // The Neutral cards (owner, 2026-10-05): each carries a badge whose pair is its own ink on its own fill, the ratio
    // computed HERE from the two rendered colors, each held to the emission's hex for its role.
    const offNeutral = [];
    for (const [fillRole, inkRole] of NEUTRAL_ON_FILL) {
      const d = drawn.find((x) => x.fillRole === fillRole);
      if (!d) { offNeutral.push(`${fillRole}: card not drawn`); continue; }
      if (d.inkRole !== inkRole) { offNeutral.push(`${fillRole}: its text is ${d.inkRole}, not ${inkRole}`); continue; }
      if (d.badge === null) { offNeutral.push(`${fillRole}: no badge of its drawn pairing`); continue; }
      if (d.pair !== `${inkRole} on ${fillRole}`) { offNeutral.push(`${fillRole}: its badge's pair is ${JSON.stringify(d.pair)}, not "${inkRole} on ${fillRole}"`); continue; }
      const fillHex = rgbHex(d.fill), inkHex = rgbHex(d.ink);
      const wantFill = emission?.role(fillRole, mode)?.hex, wantInk = emission?.role(inkRole, mode)?.hex;
      if (fillHex !== wantFill || inkHex !== wantInk) { offNeutral.push(`${inkRole} on ${fillRole}: renders ${inkHex} on ${fillHex}, the emission says ${wantInk} on ${wantFill}`); continue; }
      const want = wcag(hexRgb(inkHex), hexRgb(fillHex));
      if (!(Math.abs(parseFloat(d.badge) - floor2(want)) <= 0.011)) { offNeutral.push(`${inkRole} on ${fillRole} prints ${d.badge}, the drawn ${inkHex} on ${fillHex} measures ${want.toFixed(3)}:1`); continue; }
      neutralPairs++;
    }
    ok(offNeutral.length === 0, `${where}: every Neutral card in Foreground badges its text on its own fill, its badge naming that pair${offNeutral.length ? ` — ${offNeutral.join(' | ')}` : ''}`);
    // #2016: the Fields section paints every opaque field role, page and inverse (the swatch check below holds each to its hex).
    const fieldsPaint = new Set(got.paint.filter((n) => n.section === 'Fields').map((n) => n.role));
    const unpaintedFields = MUST_PAINT_FIELDS.filter((r) => !fieldsPaint.has(r));
    ok(unpaintedFields.length === 0, `${where}: the Fields section draws each field role as a field, page and inverse${unpaintedFields.length ? ` — not drawn: ${unpaintedFields.join(', ')}` : ''}`);
    // Q23: each levers section's description is the preview section's it is paired with, both read as rendered.
    const q23 = await page.evaluate(() => ({
      levers: Object.fromEntries([...document.querySelectorAll('[data-p3="fills-levers"] .p3-lsec')].map((n) => [n.querySelector('.p3-lsec-title')?.textContent, n.querySelector('.p3-lsec-desc')?.textContent ?? null])),
      preview: Object.fromEntries([...document.querySelectorAll('[data-p3="preview-body"] [data-p3="section-head"]')].map((n) => [n.querySelector('[data-p3="section-title"]')?.textContent, n.querySelector('[data-p3="section-description"]')?.textContent ?? null])),
    }));
    const offQ23 = FILLS_Q23.filter(([l, pv]) => !q23.levers[l] || q23.levers[l] !== q23.preview[pv]).map(([l, pv]) => `${l} ${JSON.stringify(q23.levers[l])} vs ${pv} ${JSON.stringify(q23.preview[pv])}`);
    ok(offQ23.length === 0, `${where}: each levers section is described as its preview section is (Q23), Scrim and Fields included${offQ23.length ? ` — ${offQ23.join(' | ')}` : ''}`);
    for (const [name, chips] of Object.entries(EXPECT_FILLS_CHIPS)) {
      const s = got.sections.find((x) => x.name === name);
      ok(JSON.stringify(s?.chips) === JSON.stringify(chips), `${where}: the shared ${name} section draws its ${chips.length} chips in order — drew ${JSON.stringify(s?.chips)}`);
    }
    // Swatches: each painted node's computed color against the emission's hex for its role, in the mode its
    // position says it shows.
    checkSwatches(where, got, emission, mode, modes);
    checkSharedMarkers(where, got, { ...EXPECT_SHARED_MARKER, ...EXPECT_FILLS_ONLY_MARKER });
    for (const r of MUST_PAINT_FIELDS) ok(got.paint.some((n) => n.role === r), `${where}: the swatch check read ${r}`);
    // The Focus ring (S4c, owner decision Q30): its two rings were read by the swatch check above, which held
    // each outline to the emission's border.focus in this mode.
    const rings = got.paint.filter((n) => n.prop === 'outline' && n.role === 'border.focus').length;
    ok(rings === 2, `${where}: the Focus ring section draws its two rings in border.focus, and the swatch check read them (read ${rings})`);
    // Ratio badges: computed HERE from the emitted pair.
    const offBadge = [];
    const opp = oppositeMode(mode, modes);
    for (const b of got.badges) {
      // A badge of a card's drawn pairing (#1971 Q13(a)) is held by its own arm above, against the card as rendered.
      if (b.pair) continue;
      // A Text color badge in the second column is that column's mode's (Q46), by its position.
      const bm = b.col === 1 ? opp : mode;
      const r = emission?.role(b.role, bm);
      const ag = r?.against;
      const agHex = ag ? (emission.role(ag, bm)?.hex ?? palOf(ag)) : null;
      if (!r || !agHex) { offBadge.push(`${b.role}: the emission gives no pair to measure (against ${ag})`); continue; }
      const want = wcag(hexRgb(r.hex), hexRgb(agHex));
      const printed = parseFloat(b.text);
      const wantBelow = typeof r.min === 'number' && r.min > 0 && want + 1e-9 < r.min;
      fillsBadges++;
      if (!(Math.abs(printed - floor2(want)) <= 0.011)) offBadge.push(`${b.role} prints ${b.text}, the emitted pair ${r.hex} on ${agHex} measures ${want.toFixed(3)}:1`);
      else if (b.below !== wantBelow) offBadge.push(`${b.role} is ${b.below ? '' : 'not '}marked below floor at ${want.toFixed(2)}:1 against min ${r.min}`);
    }
    ok(offBadge.length === 0, `${where}: every ratio badge prints the emitted pair's ratio and marks its floor${offBadge.length ? ` — ${offBadge.slice(0, 3).join(' | ')}` : ''}`);
    // Q46: the Text color section's token column carries the pill alone; its badges are per column, below.
    const tcTokens = new Set(got.tcRows.map((t) => t.role));
    // #1971: Background carries none, held above; every other chip of a graded role carries its badge.
    const noBadge = got.chipsWithBadge.filter((c) => { if (tcTokens.has(c.role) || FILLS_GROUNDS.includes(c.section)) return false; const r = emission?.role(c.role, mode); return r && r.against && r.against !== 'self' && !c.badge; }).map((c) => c.role);
    ok(noBadge.length === 0, `${where}: every chip of a role measured against another carries its ratio badge${noBadge.length ? ` — no badge: ${[...new Set(noBadge)].slice(0, 5).join(', ')}` : ''}`);
    // Q46: every text token graded in a column's mode carries exactly one badge in that column, its own, and the
    // token column carries none. Which roles are graded is the emission's (an \`against\` other than itself).
    const graded = (role, m) => { const r = emission?.role(role, m); return !!(r && r.against && r.against !== 'self'); };
    const offCols = got.tcRows.filter((t) => {
      const want = [graded(t.role, mode) ? [t.role] : [], graded(t.role, opp) ? [t.role] : [], []];
      return JSON.stringify(t.cols) !== JSON.stringify(want);
    }).map((t) => `${t.role} ${JSON.stringify(t.cols)}`);
    ok(got.tcRows.length >= 18 && offCols.length === 0, `${where}: each text token has one ratio badge in the "On ${mode}" column and one in the "On ${opp}" column, none by the token (${got.tcRows.length} rows)${offCols.length ? ` — ${offCols.slice(0, 3).join(' | ')}` : ''}`);
  }
  // The Style guide itself (Brand's preview, lent by `main.ts`, S3) draws the same five sections.
  const typeOracle = await emittedType(brand);
  await hooks.click(page.locator('[data-p3="tab-brand"]'));
  await hooks.need(page, '[data-p3="preview-body"] [data-p3="brand-style-guide"] .psec');
  // Per mode, as on Surfaces & fills: its swatches (the Text color columns by position) and the shared marker.
  for (const mode of modes) {
    await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`));
    await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true', mode);
    const where = `${brand} / Style guide / ${mode}`;
    sgStates++;
    const sg = await readSections(page, '[data-p3="preview-body"] [data-p3="brand-style-guide"]');
    for (const [name, chips] of Object.entries(EXPECT_SECTION_CHIPS)) {
      const s = sg.sections.find((x) => x.name === name);
      ok(JSON.stringify(s?.chips) === JSON.stringify(chips), `${where}: the shared ${name} section draws its ${chips.length} chips in order — drew ${JSON.stringify(s?.chips)}`);
    }
    checkSwatches(where, sg, emission, mode, modes);
    checkSharedMarkers(where, sg, { ...EXPECT_SHARED_MARKER, ...EXPECT_SG_ONLY_MARKER, 'Type sample': 'type-sample', 'Radius and shadow sample': 'radius-sample' });
    // #1942, owner decision Q67: the type sample opens the Style guide, and every line is set in its own text type's
    // emitted face, in this mode. The radius sample follows it, before Background (owner decision D18 B, S7).
    ok(sg.sections[0]?.name === 'Type sample' && sg.sections[0]?.shared === 'type-sample' && sg.sections[1]?.name === 'Radius and shadow sample' && sg.sections[2]?.name === 'Background',
      `${where}: the Style guide's first section is the type sample (data-sg-section="type-sample"), then the radius sample, then Background — drew ${sg.sections.slice(0, 3).map((x) => `${x.name} [${x.shared}]`).join(', ')}`);
    checkTypeSample(`${brand.toLowerCase()} / Style guide / ${mode}`, await readTypeSample(page, '[data-p3="preview-body"] [data-p3="brand-style-guide"]'), typeOracle, mode);
    // D18 B's shadow half (S9.2): the radius sample's panel draws the emitted `shadow.sm` (the preview spec's Card binding)
    // for this mode, layer by layer: its color and alpha, offsets, blur and spread, read from the COMPUTED style and
    // held to the brand's committed emission (the mode's own value where the leaf carries one). The pill names it.
    {
      const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
      const leaf = tree[Object.keys(tree).find((k) => !k.startsWith('$'))].shadow?.sm;
      const want = (leaf?.$extensions?.prism3?.modes?.[mode]?.$value ?? leaf?.$value ?? []).map((l) => {
        const hx = l.color.replace('#', ''); const a = hx.length === 8 ? parseInt(hx.slice(6), 16) / 255 : 1;
        return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16), Math.round(a * 100) / 100, ...['offsetX', 'offsetY', 'blur', 'spread'].map((k) => parseFloat(l[k]))].join(' ');
      });
      const got = await page.evaluate(() => {
        const p = document.querySelector('[data-p3="brand-style-guide"] [data-sg-section="radius-sample"] [data-p3="radius-sample-panel"]');
        const cs = p ? getComputedStyle(p).boxShadow : '';
        const layers = cs && cs !== 'none' ? cs.split(/,(?![^(]*\))/).map((x) => {
          const c = /rgba?\(([^)]+)\)/.exec(x)?.[1].split(/[,\s/]+/).filter(Boolean).map(Number) ?? [];
          const n = x.replace(/rgba?\([^)]+\)/, '').trim().split(/\s+/).map(parseFloat);
          return [c[0], c[1], c[2], Math.round((c[3] ?? 1) * 100) / 100, ...n].join(' ');
        }) : [];
        return { found: !!p, layers, pill: !!p?.querySelector('[data-p3="radius-sample-shadow"]') && p.querySelector('[data-p3="radius-sample-shadow"]').textContent === 'shadow.sm' };
      });
      // HC light and HC dark are generated from Light and Dark; the emission carries Light's and Dark's shadows.
      if (mode === 'light' || mode === 'dark') ok(got.found && want.length > 0 && JSON.stringify(got.layers) === JSON.stringify(want) && got.pill,
        `D18 B: ${where}: the radius sample's panel draws the emitted shadow.sm for this mode, and names it — drew ${JSON.stringify(got.layers)}, the emission ${JSON.stringify(want)}, pill ${got.pill}`);
      else ok(got.found && got.layers.length > 0 && got.pill, `D18 B: ${where}: the radius sample's panel draws a shadow, and names shadow.sm — drew ${JSON.stringify(got.layers)}, pill ${got.pill}`);
    }
    hooks.absent(ok, { seen: sg.sections.length >= 5, state: 'the Style guide\'s sections' }, sg.badges.length === 0, `${where}: draws no ratio badge (owner decision Q5: badges on Surfaces & fills only)`);
  }
  await ctx.close();
}
ok(fillsStates >= BRANDS.length * 2, `the Surfaces & fills sweep visited ${fillsStates} brand × mode states (floor ${BRANDS.length * 2})`);
ok(fillsDrawnPairs >= BRANDS.length * 2 * 8, `the drawn-pairing badge arm measured ${fillsDrawnPairs} Subtle and Inverse cards (#1971 Q13(a); floor ${BRANDS.length * 2 * 8})`);
ok(neutralPairs >= BRANDS.length * 2 * 3, `the Neutral on-fill badge arm measured ${neutralPairs} Neutral cards (floor ${BRANDS.length * 2 * 3})`);
// #1971: the floor check can tell the floor from the page only where they differ; the corpus must give it such a cell.
ok(floorDiffers > 0, `the Surfaces & fills sweep met a contrast floor that differs from the page in ${floorDiffers} brand × mode state(s), so a Foreground on the page fails`);
ok(sgStates >= BRANDS.length * 2, `the Style guide sweep visited ${sgStates} brand × mode states (floor ${BRANDS.length * 2})`);
console.log(`  ${fillsStates} + ${sgStates} states, ${fillsPaint} swatches and ${fillsBadges} ratio badges checked against the emissions.`);

/** Open Color › Interactive through the tab row (UI redesign S5.2: it left the Pages menu for the two panes). */
const gotoInteractive = async (page) => {
  await hooks.click(page.locator('[data-p3="tab-color"]'));
  await hooks.click(page.locator('[data-p3="color-sub-interactive"]'));
  await hooks.need(page, '[data-p3="interactive-levers"]');
  await page.evaluate(() => document.fonts.ready);
};
/** Choose a mode in the preview header's mode control, and wait for it to be the checked one. */
const chooseMode = async (page, mode) => {
  await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`));
  await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true', mode);
};
// =============================================================================================
// 1d. Color › Interactive — moved to the two panes (UI redesign S5.2), on its own hooks
// =============================================================================================
// Its preview draws the Style guide's Interactive section (with the Text row, Q32, and every column, Q39) and
// Disabled section from the SAME modules the Style guide draws them with, then Links (no Icons since S5.3, the
// owner's QA-I10: the icon contrast control left the page, and the preview's sections match the levers'). Per corpus
// brand and per mode, against the brand's COMMITTED EMISSION, never the page:
//   · every section ground is a specimen root on the emission's `background.primary` (listed by name);
//   · the shared sections' roots carry the marker only their modules stamp (Interactive, Disabled, Links);
//   · every Text-row button inks `interactive.<c>.text.<state>`, and every painted link and icon is its emitted hex;
//   · every paired specimen renders exactly the engine role pair it claims and meets that pair's contract (#1652);
//   · every ratio badge prints the ratio THIS FILE computes from the two emitted hexes, and marks its floor.
console.log(`\nColor › Interactive — the moved page, against each brand's emission\n${'='.repeat(78)}`);
const SG_INTERACTIVE = '[data-p3="preview-body"] [data-p3="interactive-style-guide"]';
/** The preview's specimen roots, by title, in order. Literal (S5.2; Icons gone in S5.3, QA-I10). */
const EXPECT_INTERACTIVE_ROOTS = ['Interactive', 'Disabled', 'Links'];
/** The shared sections Color › Interactive draws, by title, with the marker each module stamps. Literal. */
const EXPECT_INTERACTIVE_MARKER = { Interactive: 'interactive', Disabled: 'disabled', Links: 'links' };
/** The Text row's ink per column, as drawn: [column name, [rest, hover, pressed] computed colors]. */
const READ_TEXT_ROWS = (sel) => [...document.querySelectorAll(`${sel} [data-p3="style-guide-palette"]`)]
  .map((b) => [b.querySelector('.sg-rn')?.textContent, [...(b.querySelector('[data-p3="style-guide-text"]')?.querySelectorAll('[data-p3="style-guide-button"]') ?? [])].map((x) => getComputedStyle(x).color)])
  .filter(([n]) => n !== 'Disabled');
let intStates = 0, intBadges = 0, intPaired = 0, intText = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  const emission = await loadEmission(brand);
  const palOf = await emittedPalette(brand);
  await gotoInteractive(page);
  await hooks.need(page, SG_INTERACTIVE);
  const modes = (await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode)));
  for (const mode of modes) {
    await chooseMode(page, mode);
    const where = `${brand} / Interactive / ${mode}`;
    intStates++;
    const errs = drain();
    ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
    const got = await readSections(page, SG_INTERACTIVE);
    const page0 = emission?.role('background.primary', mode)?.hex;
    for (const name of EXPECT_INTERACTIVE_ROOTS) {
      const s = got.sections.find((x) => x.name === name);
      ok(!!s && s.root && s.ground === page0, `${where}: section ${name} is a specimen root on the emission's background.primary ${page0}${!s ? ' — not drawn' : !s.root ? ' — not a specimen root' : s.ground !== page0 ? ` — on ${s.ground}` : ''}`);
    }
    ok(JSON.stringify(got.sections.map((x) => x.name)) === JSON.stringify(EXPECT_INTERACTIVE_ROOTS), `${where}: the preview draws exactly ${EXPECT_INTERACTIVE_ROOTS.join(', ')}, in order — drew ${got.sections.map((x) => x.name).join(', ')}`);
    checkSharedMarkers(where, got, EXPECT_INTERACTIVE_MARKER);
    // The Text row, per column and state, against the emitted ink.
    const text = await page.evaluate(READ_TEXT_ROWS, SG_INTERACTIVE);
    const offText = [];
    for (const [name, inks] of text) {
      const col = name.toLowerCase();
      if (inks.length !== 3) { offText.push(`${col} draws ${inks.length} text buttons`); continue; }
      ['rest', 'hover', 'pressed'].forEach((st, i) => { intText++; const want = emission?.role(`interactive.${col}.text.${st}`, mode)?.hex; if (rgbHex(inks[i]) !== want) offText.push(`${col}/${st} Text hover ink ${rgbHex(inks[i])}, emitted interactive.${col}.text.${st} ${want}`); });
    }
    ok(text.length >= 3 && offText.length === 0, `${where}: every column's Text row inks its emitted interactive.<c>.text.<state> (${text.length} columns)${offText.length ? ` — ${offText.slice(0, 3).join(' | ')}` : ''}`);
    // Painted links, icons and disabled cards against the emission.
    const offPaint = [];
    for (const n of got.paint) {
      const want = emission?.role(n.role, mode)?.hex;
      if (!want) continue;
      if (rgbHex(n.css) !== want) offPaint.push(`${n.role} ${n.prop} is ${rgbHex(n.css) ?? n.css} (emitted ${want})`);
    }
    // Floor 22: the links and the disabled cards. It was 25 until S5.3 took the Icons section's three cards out (QA-I10).
    ok(got.paint.length >= 22 && offPaint.length === 0, `${where}: every painted link and card is its emitted hex (${got.paint.length} read)${offPaint.length ? ` — ${offPaint.slice(0, 3).join(' | ')}` : ''}`);
    // Paired specimens (#1652), as the sweep holds them on the Style guide.
    const probe = await page.evaluate(LEGIBILITY_PROBE, SG_INTERACTIVE);
    assertParsed(where, probe.unparsed);
    const paired = probe.text.filter((r) => r.pair);
    const judged = paired.map((r) => ({ r, c: classifyPair(r.pair, emission, mode) }));
    const bad = judged.filter(({ c }) => c.problem);
    intPaired += paired.length;
    ok(paired.length >= 20 && bad.length === 0, `${where}: every one of ${paired.length} paired specimens renders exactly the engine role pair it claims${bad.length ? ` — ${bad.slice(0, 3).map(({ r, c }) => `"${r.pair.state}" ${c.problem}`).join(' | ')}` : ''}`);
    const pairUnder = judged.filter(({ r, c }) => !c.problem && r.ratio < c.bar);
    ok(pairUnder.length === 0, `${where}: every paired specimen meets the contract of the pair it previews${pairUnder.length ? ` — ${pairUnder.slice(0, 3).map(({ r, c }) => `${r.pair.claim} at ${r.ratio}:1 (${c.contract}, needs ${c.bar}:1)`).join(' | ')}` : ''}`);
    // Ratio badges: computed HERE from the emitted pair.
    const offBadge = [];
    for (const b of got.badges) {
      const r = emission?.role(b.role, mode);
      const ag = r?.against;
      const agHex = ag ? (emission.role(ag, mode)?.hex ?? palOf(ag)) : null;
      if (!r || !agHex) { offBadge.push(`${b.role}: the emission gives no pair to measure (against ${ag})`); continue; }
      const want = wcag(hexRgb(r.hex), hexRgb(agHex));
      const wantBelow = typeof r.min === 'number' && r.min > 0 && want + 1e-9 < r.min;
      intBadges++;
      if (!(Math.abs(parseFloat(b.text) - floor2(want)) <= 0.011)) offBadge.push(`${b.role} prints ${b.text}, the emitted pair ${r.hex} on ${agHex} measures ${want.toFixed(3)}:1`);
      else if (b.below !== wantBelow) offBadge.push(`${b.role} is ${b.below ? '' : 'not '}marked below floor at ${want.toFixed(2)}:1 against min ${r.min}`);
    }
    ok(got.badges.length >= 60 && offBadge.length === 0, `${where}: every one of ${got.badges.length} ratio badges prints the emitted pair's ratio and marks its floor${offBadge.length ? ` — ${offBadge.slice(0, 3).join(' | ')}` : ''}`);
  }
  await ctx.close();
}
ok(intStates >= BRANDS.length * 2, `the Interactive sweep visited ${intStates} brand × mode states (floor ${BRANDS.length * 2})`);
console.log(`  ${intStates} states, ${intText} Text-row inks, ${intPaired} paired specimens and ${intBadges} ratio badges checked against the emissions.`);
// 1e. S4c: the surface controls edit the previewed mode (owner decision Q22), and a Fields edit reaches the
//     exported tokens (Q29). Per corpus brand. EXPECTED: the persisted brand's `surfaces.<mode>` key, worked out
//     HERE from the option chosen (white and black as words, a step as a number), and the other mode's key
//     held to what was persisted before the edit; the exported DTCG tree's alias for the field role, the
//     literal `{<root>.core.palette.neutral.<step>}`, against the committed emission, which must alias
//     something else so the edit is seen to move it.
console.log(`\nColor › Surfaces & fills — the previewed mode's surfaces, and the Fields rows reaching the export (S4c)\n${'='.repeat(78)}`);
const inputAt = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('prism3:brandInput'))?.input ?? null; } catch { return null; } });
const toSurface = (v) => (v === 'white' || v === 'black' ? v : Number(v));
/** A click that waits for its target to SETTLE first, and is BOUNDED (#2080). Measured before writing it
 *  (2026-10-06): across 300 clicks on the Dark option in this suite and test:chrome, at load averages 7 to 14 and
 *  with the renderer's CPU throttled 4×, the button was never replaced and never moved before the click, and each
 *  click took as long as the page's longest main-thread task during it (127ms at most unthrottled, 380ms
 *  throttled). So a 30-second stall is a renderer that could not run for 30 seconds, not a control that would not
 *  hold still. This waits until the page renders frames with the target holding still: its box, and its scroller's
 *  scrollTop, unchanged across consecutive frames. That is a measured settle, not a sleep, and it covers an eased
 *  scroll still stepping (`follow-edit.ts`). Then it clicks. BOTH are bounded, so either stall fails the arm by name
 *  and the suite reaches its report, instead of dying on a bare Playwright timeout. Kept here, beside its one user:
 *  test-hooks.mjs's shared `hooks.click` is unchanged. */
const SETTLE_CLICK_MS = 15000;
/** Pages whose renderer rendered no frame within the bound (#2231 review). Such a page is DEAD: every later
 *  `evaluate` on it waits with no timeout of its own, so the suite would hang (measured: 25+ minutes). Its
 *  context is closed, and the arm that owns it skips to the next brand. Read by every `previewMode` caller. */
const deadPages = new WeakSet();
const closeDead = async (page, label) => {
  deadPages.add(page);
  ok(false, `${label}: the page rendered no frame within ${SETTLE_CLICK_MS}ms, so it is treated as dead — its context is closed and the rest of this arm is skipped`);
  // Bounded too: a close against a frozen renderer is the one call left, and it must not become the hang.
  await Promise.race([page.context().close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
};
/** Whether the page renders a frame within 3s, bounded on this side. After a failed click this tells a frozen
 *  renderer (dead: close it) from a control that would not take the click (alive: carry on). */
const rendersFrame = (page) => Promise.race([
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(true)))).catch(() => false),
  new Promise((r) => setTimeout(() => r(false), 3000)),
]);
const settledClick = async (page, selector, label) => {
  const deadline = Date.now() + SETTLE_CLICK_MS * 2;
  const settled = await Promise.race([
    page.evaluate(async ([sel, cap]) => {
      const scrollerOf = (n) => {
        for (let p = n.parentElement; p; p = p.parentElement) {
          const oy = getComputedStyle(p).overflowY;
          if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
        }
        return document.scrollingElement;
      };
      const read = () => {
        const n = document.querySelector(sel);
        if (!n) return null;
        const r = n.getBoundingClientRect(), sc = scrollerOf(n);
        return `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}|${sc ? Math.round(sc.scrollTop) : 0}`;
      };
      const t0 = performance.now();
      let prev, still = 0, frames = 0;
      while (performance.now() - t0 < cap) {
        await new Promise((r) => requestAnimationFrame(r));
        frames++;
        const now = read();
        if (now !== null && now === prev) { if (++still >= 2) return { ok: true }; } else still = 0;
        prev = now;
      }
      return { ok: false, why: prev === null ? 'it is not in the page' : `it was still moving after ${frames} frames (last box ${prev})` };
    }, [selector, SETTLE_CLICK_MS]),
    new Promise((r) => setTimeout(() => r({ ok: false, dead: true }), SETTLE_CLICK_MS + 1000)),
  ]).catch((e) => ({ ok: false, why: String(e?.message ?? e).split('\n')[0] }));
  if (settled.dead) { await closeDead(page, label); return false; }
  if (!settled.ok) { ok(false, `${label}: ${selector} did not settle before its click — ${settled.why}`); return false; }
  try {
    await hooks.click(page.locator(selector), { timeout: Math.max(1000, deadline - Date.now()) });
    return true;
  } catch (e) {
    // A renderer that froze AFTER the settle (measured: the click then times out, and the page is dead) is named
    // as dead here, at the first failure, rather than one call later.
    if (!await rendersFrame(page)) { await closeDead(page, label); return false; }
    ok(false, `${label}: the click on ${selector} did not land — ${String(e?.message ?? e).split('\n')[0]}`);
    return false;
  }
};
const previewMode = async (page, m) => {
  const sel = `[data-p3="mode-option"][data-mode="${m}"]`;
  if (m === 'dark') await page.evaluate(() => { setTimeout(() => { for (;;) {} }, 50); });
  if (!await settledClick(page, sel, `previewMode ${m}`)) return false;
  // Bounded too: unbounded, a click that landed without taking effect was the same bare 30-second throw.
  const on = await page.waitForFunction((s) => document.querySelector(s)?.getAttribute('aria-checked') === 'true', sel, { timeout: SETTLE_CLICK_MS })
    .then(() => true, () => false);
  if (!on) ok(false, `previewMode ${m}: the ${m} option was clicked and is still not checked after ${SETTLE_CLICK_MS}ms`);
  return on;
};
// S4d (owner decision Q45): the Page (Primary since S4f, QA-B3) and the band step are step pickers; the band palette stays
// a select. S4f (QA-B1): the contrast floor is a row, its control the step picker, writing what its select wrote.
const SURF_HOOKS = { base: '[data-p3="levers-pane"] [data-p3="surface-base-pick"]', floor: '[data-p3="levers-pane"] [data-p3="surface-floor-pick"]',
  'band-palette': '[data-p3="levers-pane"] [data-p3="surface-band-palette"]', 'band-step': '[data-p3="levers-pane"] [data-p3="surface-band-step-pick"]',
  // S4e (#1972): the four background tiers, step pickers writing their own inputs.
  secondary: '[data-p3="levers-pane"] [data-p3="surface-secondary-pick"]', tertiary: '[data-p3="levers-pane"] [data-p3="surface-tertiary-pick"]',
  'inverse-secondary': '[data-p3="levers-pane"] [data-p3="surface-inverse-secondary-pick"]', 'inverse-tertiary': '[data-p3="levers-pane"] [data-p3="surface-inverse-tertiary-pick"]' };
const PICKED = new Set(['base', 'floor', 'band-step', 'secondary', 'tertiary', 'inverse-secondary', 'inverse-tertiary']);
const SURF = (k) => SURF_HOOKS[k];
s4cArm: for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await hooks.click(page.locator('[data-p3="tab-color"]'));
  await hooks.click(page.locator('[data-p3="color-sub-fills"]'));
  await hooks.need(page, '[data-p3="fills-levers"]');
  const modes = await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode));
  // One set of controls, whichever mode is previewed (Q22: Light and Dark are no longer side by side).
  const sets = await page.locator('[data-p3="levers-pane"] [data-p3="surfaces-group"]').count();
  ok(sets === 1, `S4c ${brand}: Surfaces & fills draws one set of surface controls (${sets})`);
  for (const [m, other] of [['dark', 'light'], ['light', 'dark']]) {
    if (!modes.includes(m)) continue;
    if (!await previewMode(page, m)) { if (deadPages.has(page)) continue s4cArm; continue; }
    for (const [k, field, pick] of [['base', 'base', 3], ['floor', 'floorStep', 5], ['band-step', 'inverseBase', 4],
      ['secondary', 'secondary', 4], ['tertiary', 'tertiary', 6], ['inverse-secondary', 'inverseSecondary', 3], ['inverse-tertiary', 'inverseTertiary', 5]]) {
      const before = (await inputAt(page))?.surfaces ?? {};
      let v;
      if (PICKED.has(k)) {
        // The picker: open it, choose its pick-th step (a key: `white`, `050`), close it.
        await hooks.click(page.locator(SURF(k)));
        await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]');
        const keys = await page.locator('[data-p3="levers-pane"] [data-p3="step-picker-step"]').evaluateAll((ns) => ns.map((n) => n.dataset.step));
        v = keys[Math.min(pick, keys.length - 1)];
        await hooks.click(page.locator(`[data-p3="levers-pane"] [data-p3="step-picker-step"][data-step="${v}"]`));
        // Bounded: a control that wrote the wrong key redraws on its old value, and the check below says so.
        await page.waitForFunction((vv) => document.querySelector(`[data-p3="levers-pane"] [data-p3="step-picker-step"][data-step="${vv}"]`)?.getAttribute('aria-pressed') === 'true', v, { timeout: 5000 }).catch(() => {});
        await page.keyboard.press('Escape');
      } else {
        const values = await page.locator(SURF(k)).evaluate((x) => [...x.options].map((o) => o.value));
        v = values[Math.min(pick, values.length - 1)];
        await page.locator(SURF(k)).selectOption(v);
        await page.waitForFunction(([sel, vv]) => document.querySelector(sel)?.value === vv, [SURF(k), v], { timeout: 5000 }).catch(() => {});
      }
      const after = (await inputAt(page))?.surfaces ?? {};
      const want = toSurface(v);
      ok(JSON.stringify(after?.[m]?.[field]) === JSON.stringify(want) && JSON.stringify(after?.[other]) === JSON.stringify(before?.[other]),
        `S4c ${brand}: previewing ${m}, the ${k} control writes surfaces.${m}.${field} = ${JSON.stringify(want)} and leaves surfaces.${other} as it was — wrote surfaces ${JSON.stringify(after)} (before ${JSON.stringify(before)})`);
    }
  }
  // A derived mode: the controls show its family's surfaces and are disabled, as the rows are.
  const derived = modes.find((m) => m.startsWith('hc-'));
  if (derived) {
    if (await previewMode(page, derived)) {
      const dis = await page.evaluate((sels) => sels.map((x) => document.querySelector(x)?.disabled ?? null), Object.keys(SURF_HOOKS).map(SURF));
      ok(dis.every((d) => d === true), `S4c ${brand}: previewing ${derived}, every surface control is disabled (${JSON.stringify(dis)})`);
    } else if (deadPages.has(page)) continue s4cArm;
  }
  // Every Fields row, in Dark and then in Light, writes its own role and no other (review of #1980: a row
  // wired to its sibling's role went green while only three rows were edited). EXPECTED: the role is the
  // literal below, never the row's own `data-role`, which the row selector only uses to find the row; the
  // step is a literal per row; the persisted brand's `overrides.<mode>` must equal what it was before the
  // edit with exactly that one role set to `{ palette: 'neutral', step }`, and the other mode's untouched.
  const ALL_FIELD_ROLES = ['field.fill', 'field.border.rest', 'field.border.hover', 'field.placeholder',
    'inverse.field.fill', 'inverse.field.border.rest', 'inverse.field.border.hover', 'inverse.field.placeholder'];
  const FIELD_STEPS = { dark: ['150', '250', '350', '450', '550', '650', '750', '850'], light: ['200', '300', '400', '500', '600', '700', '800', '900'] };
  const brandRaw = (page) => page.evaluate(() => { try { return localStorage.getItem('prism3:brandInput'); } catch { return null; } });
  const sorted = (o) => JSON.stringify(Object.fromEntries(Object.entries(o ?? {}).sort(([a], [b]) => a.localeCompare(b))));
  let fieldEdits = 0;
  for (const [m, other] of [['dark', 'light'], ['light', 'dark']]) {
    if (!modes.includes(m)) continue;
    if (!await previewMode(page, m)) { if (deadPages.has(page)) continue s4cArm; continue; }
    for (const [i, role] of ALL_FIELD_ROLES.entries()) {
      fieldEdits++;
      const step = FIELD_STEPS[m][i];
      const before = (await inputAt(page))?.overrides ?? {};
      const rawBefore = await brandRaw(page);
      const row = `[data-p3="levers-pane"] [data-p3="field-rows"] .p3-fillrow[data-role="${role}"]`;
      await hooks.click(page.locator(`${row} [data-p3="fill-pick"]`));
      await hooks.click(page.locator(`[data-p3="levers-pane"] [data-p3="step-picker-step"][data-step="${step}"]`));
      // Bounded: an edit that writes nothing leaves the brand as it was, and the check below says so.
      await page.waitForFunction((was) => { try { return localStorage.getItem('prism3:brandInput') !== was; } catch { return false; } }, rawBefore, { timeout: 5000 }).catch(() => {});
      await page.keyboard.press('Escape');
      const after = (await inputAt(page))?.overrides ?? {};
      const want = { ...(before[m] ?? {}), [role]: { palette: 'neutral', step } };
      const held = JSON.stringify(after[other]) === JSON.stringify(before[other]);
      ok(sorted(after[m]) === sorted(want) && held,
        `S4c ${brand}: previewing ${m}, the Fields row ${role} writes overrides.${m}["${role}"] = neutral ${step} and nothing else — wrote ${sorted(after[m])} (before ${sorted(before[m])}; ${other} ${held ? 'unchanged' : 'CHANGED'})`);
    }
  }
  ok(fieldEdits === ALL_FIELD_ROLES.length * 2, `S4c ${brand}: every Fields row was edited in Dark and in Light (${fieldEdits} edits, want ${ALL_FIELD_ROLES.length * 2})`);
  // A Fields edit, in Dark and in Light, reaches the exported token tree.
  const emission = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
  const root = Object.keys(emission)[0];
  const leaf = (tree, role) => role.split('.').reduce((n, x) => n?.[x], tree[root]?.color);
  const aliasIn = (tree, role, m) => (m === 'light' ? leaf(tree, role)?.$value : leaf(tree, role)?.$extensions?.prism3?.modes?.[m]?.$value) ?? null;
  const EDITS = [['dark', 'field.border.rest', '300'], ['light', 'inverse.field.placeholder', '200'], ['dark', 'field.fill', '100']];
  for (const [m, role, step] of EDITS) {
    if (!await previewMode(page, m)) { if (deadPages.has(page)) continue s4cArm; continue; }
    const row = `[data-p3="levers-pane"] [data-p3="field-rows"] .p3-fillrow[data-role="${role}"]`;
    await hooks.click(page.locator(`${row} [data-p3="fill-pick"]`));
    await hooks.click(page.locator(`[data-p3="levers-pane"] [data-p3="step-picker-step"][data-step="${step}"]`));
    await page.waitForFunction((sel) => /Override/.test(document.querySelector(sel)?.textContent ?? ''), `${row} [data-p3="fill-pick"]`, { timeout: 5000 }).catch(() => {});
    await page.keyboard.press('Escape');
  }
  await hooks.click(page.locator('[data-p3="export-open"]'));
  await hooks.need(page, '[data-p3="export-dialog"]');
  const pending = page.waitForEvent('download');
  await hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-confirm"]'));
  let exported = null;
  try { exported = JSON.parse(await readFile(await (await pending).path(), 'utf8')); } catch { /* reported below */ }
  for (const [m, role, step] of EDITS) {
    const want = `{${root}.core.palette.neutral.${step}}`;
    const was = aliasIn(emission, role, m), got = exported ? aliasIn(exported, role, m) : null;
    ok(got === want && was !== want, `S4c ${brand}: a Fields edit of ${role} in ${m} to neutral ${step} reaches the exported tokens as ${want} (exported ${got}; the committed emission has ${was})`);
  }
  const errs = drain();
  ok(errs.length === 0, `S4c ${brand}: 0 console errors across the surface and Fields edits${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// 1e. S4e: a Secondary pick moves the contrast floor with it (#1972, the engine's #1987, option A). Per corpus brand,
//     in Light. EXPECTED: before the pick, the floor's Auto option and the floor-gated text.secondary's picker name
//     the step the COMMITTED EMISSION aliases for background.secondary in light; after it, the literal step picked
//     (neutral 200), in the floor's Auto label and as text.secondary's ground; the persisted brand carries
//     `surfaces.light.secondary: 200` and the overrides it carried before; Return to Auto removes the key. Then
//     (the review): the page tiers' pickers offer neutral only and the inverse tiers the Inverse fill's palettes,
//     and at a ladder-end Page in Light and in Dark the floor's Auto label names the engine's floor alone.
console.log(`\nColor › Surfaces & fills — a Secondary pick carries the contrast floor (S4e)\n${'='.repeat(78)}`);
s4eArm: for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await hooks.click(page.locator('[data-p3="tab-color"]'));
  await hooks.click(page.locator('[data-p3="color-sub-fills"]'));
  await hooks.need(page, '[data-p3="fills-levers"]');
  if (!await previewMode(page, 'light')) { if (!deadPages.has(page)) await ctx.close(); continue s4eArm; }
  const emission = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
  const root = Object.keys(emission)[0];
  const wasAlias = emission[root]?.color?.background?.secondary?.$value ?? '';
  const wasStep = (/\.neutral\.([0-9]+)\}$/.exec(wasAlias) ?? [])[1] ?? null;
  // The floor's Auto label, in full: since FL1 A (#2197) the floor's picker button shows "Auto · ‹step›" and carries the
  // full sentence, the tier it follows included, as its tooltip (each read below is with the floor on Auto, as the brand loads).
  const floorAuto = () => page.evaluate(() => { const b = document.querySelector('[data-p3="levers-pane"] [data-p3="surface-floor-pick"]'); return b?.getAttribute('title') ?? null; });
  const TEXT_SEC = '[data-p3="levers-pane"] [data-p3="text-rows"] .p3-fillrow[data-role="text.secondary"] [data-p3="fill-pick"]';
  const groundOf = async () => {
    await hooks.click(page.locator(TEXT_SEC));
    await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]');
    const hint = await page.evaluate(() => document.querySelector('[data-p3="levers-pane"] [data-p3="step-picker"] .p3-picker-hint')?.textContent ?? '');
    await page.keyboard.press('Escape');
    return (/against ([a-z0-9-]+\.[0-9]+)/.exec(hint) ?? [])[1] ?? hint;
  };
  const brandRaw = () => page.evaluate(() => { try { return localStorage.getItem('prism3:brandInput'); } catch { return null; } });
  const before = await inputAt(page);
  const autoBefore = await floorAuto(), groundBefore = await groundOf();
  ok(wasStep !== null && wasStep !== '200' && autoBefore === `Auto · follows background.secondary (neutral ${wasStep})` && groundBefore === `neutral.${wasStep}`,
    `S4e ${brand}: before, the floor's Auto follows background.secondary at the emission's neutral ${wasStep}, and text.secondary is measured on neutral.${wasStep} — read ${JSON.stringify(autoBefore)}, ${JSON.stringify(groundBefore)}`);
  const raw0 = await brandRaw();
  await hooks.click(page.locator(SURF('secondary')));
  await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-step"][data-step="200"]'));
  await page.waitForFunction((was) => { try { return localStorage.getItem('prism3:brandInput') !== was; } catch { return false; } }, raw0, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press('Escape');
  const after = await inputAt(page);
  ok(after?.surfaces?.light?.secondary === 200 && JSON.stringify(after?.overrides) === JSON.stringify(before?.overrides) && JSON.stringify(after?.surfaces?.dark) === JSON.stringify(before?.surfaces?.dark),
    `S4e ${brand}: the Secondary pick persists surfaces.light.secondary = 200 and no override — persisted surfaces ${JSON.stringify(after?.surfaces)}, overrides ${JSON.stringify(after?.overrides)}`);
  const autoAfter = await floorAuto(), groundAfter = await groundOf();
  ok(autoAfter === 'Auto · follows background.secondary (neutral 200)', `S4e ${brand}: the floor's Auto label follows the pick: "Auto · follows background.secondary (neutral 200)" — read ${JSON.stringify(autoAfter)}`);
  ok(groundAfter === 'neutral.200', `S4e ${brand}: the floor-gated text.secondary re-derives against neutral.200 — read ${JSON.stringify(groundAfter)} (was ${groundBefore})`);
  const raw1 = await brandRaw();
  await hooks.click(page.locator(SURF('secondary')));
  // Bounded: with nothing to return (a pick that wrote no input), Return to Auto is disabled, and the check below says so.
  const autoBtn = page.locator('[data-p3="levers-pane"] [data-p3="step-picker-auto"]');
  await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker-auto"]');
  if (await autoBtn.isEnabled()) await hooks.click(autoBtn);
  await page.waitForFunction((was) => { try { return localStorage.getItem('prism3:brandInput') !== was; } catch { return false; } }, raw1, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press('Escape');
  const cleared = await inputAt(page);
  ok(!('secondary' in (cleared?.surfaces?.light ?? {})) && JSON.stringify(cleared?.surfaces) === JSON.stringify(before?.surfaces),
    `S4e ${brand}: Return to Auto clears surfaces.light.secondary, the surfaces as loaded — persisted ${JSON.stringify(cleared?.surfaces)} (loaded ${JSON.stringify(before?.surfaces)})`);
  const autoBack = await floorAuto();
  ok(autoBack === autoBefore, `S4e ${brand}: and the floor's Auto label is back to ${JSON.stringify(autoBefore)} — read ${JSON.stringify(autoBack)}`);
  // The page tiers draw on the neutral palette only (S4e review): their pickers' palette select offers neutral and
  // nothing else, the palette the committed emission aliases background.secondary to. The inverse tiers keep every
  // palette the Inverse fill can draw on (owner, 2026-10-03: the picker's palette select stays), read off the
  // Inverse fill's own palette select. EXPECTED: literal 'neutral', and the emission's alias.
  const wasPalette = (/\.palette\.([a-z0-9-]+)\.[0-9]+\}$/.exec(wasAlias) ?? [])[1] ?? null;
  const pickerPalettes = async (k) => {
    await hooks.click(page.locator(SURF(k)));
    await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker-palette"]');
    const vals = await page.evaluate(() => [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="step-picker"] [data-p3="step-picker-palette"] option')].map((o) => o.value));
    await page.keyboard.press('Escape');
    return vals;
  };
  const bandPals = await page.evaluate(() => [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="surface-band-palette"] option')].map((o) => o.value));
  for (const k of ['secondary', 'tertiary']) {
    const pals = await pickerPalettes(k);
    ok(wasPalette === 'neutral' && JSON.stringify(pals) === JSON.stringify(['neutral']),
      `S4e ${brand}: the ${k} picker offers the neutral palette only (the emission draws background.secondary on ${wasPalette}) — read ${JSON.stringify(pals)}`);
  }
  for (const k of ['inverse-secondary', 'inverse-tertiary']) {
    const pals = await pickerPalettes(k);
    ok(pals.includes('neutral') && pals.includes('primary') && JSON.stringify(pals) === JSON.stringify(bandPals),
      `S4e ${brand}: the ${k} picker still offers the Inverse fill's palettes ${JSON.stringify(bandPals)} — read ${JSON.stringify(pals)}`);
  }
  // The floor's Auto label names the ENGINE's floor (S4e review). At a ladder end the second tier snaps to black
  // (Light, Page Black) or white (Dark, Page White) while the floor stays a neutral step, so the label names the
  // floor alone. EXPECTED: the literal label, and the floor the engine measures the floor-gated text.secondary on
  // (its picker's hint), the two read through different controls.
  for (const [m, pageKey, want] of [['light', 'black', 'Auto · neutral 950'], ['dark', 'white', 'Auto · neutral 050']]) {
    if (!await previewMode(page, m)) { if (deadPages.has(page)) continue s4eArm; continue; }
    const rawP = await brandRaw();
    await hooks.click(page.locator(SURF('base')));
    await hooks.click(page.locator(`[data-p3="levers-pane"] [data-p3="step-picker-step"][data-step="${pageKey}"]`));
    await page.waitForFunction((was) => { try { return localStorage.getItem('prism3:brandInput') !== was; } catch { return false; } }, rawP, { timeout: 5000 }).catch(() => {});
    await page.keyboard.press('Escape');
    const persisted = (await inputAt(page))?.surfaces?.[m]?.base;
    const label = await floorAuto(), ground = await groundOf();
    ok(persisted === pageKey && label === want && `Auto · ${String(ground).split('.').join(' ')}` === want,
      `S4e ${brand}: ${m}, Page ${pageKey} (a ladder end): the floor's Auto reads ${JSON.stringify(want)}, the floor text.secondary is measured on — read ${JSON.stringify(label)}, against ${JSON.stringify(ground)}, base ${JSON.stringify(persisted)}`);
  }
  const errs = drain();
  ok(errs.length === 0, `S4e ${brand}: 0 console errors across the Secondary and Page edits${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// 1e. S4d: the icon rows' lock (owner decision Q50; the engine's #1968), and an edit in each section S4d added
//     reaching the exported tokens (Q44, Q49). Per corpus brand. EXPECTED: whether a brand loads paired is its
//     example input's `iconContrast`, written here per brand (literal); the text role an icon row follows is the
//     engine's twin rule (`text` for `icon`), restated here; Unpair's write is the literal `iconContrast: "3:1"`;
//     an edit's persisted override and its exported alias are literals worked out here from the step chosen.
console.log(`\nColor › Surfaces & fills — the icon lock, and an edit in each new section reaching the export (S4d)\n${'='.repeat(78)}`);
const ICONS_PAIRED = { prism3: true, aurora: false, harbor: true };
const ICON_TWIN = (r) => r.replace(/(^|\.)icon\./, '$1text.');
const iconRowsAt = (page) => page.evaluate(() => [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="icon-rows"] .p3-fillrow [data-p3="fill-pick"]')]
  .map((b) => ({ role: b.dataset.role, disabled: b.disabled, text: b.querySelector('.p3-btn-label')?.textContent ?? '' })));
/** One edit per section S4d added or filled, in both modes: [mode, role, palette, step, section]. */
const S4D_EDITS = [
  ['dark', 'inverse.foreground.secondary', 'neutral', '300', 'Foreground'],
  ['light', 'foreground.brand-subtle', 'primary', '200', 'Foreground fills'],
  ['dark', 'text.on-brand', 'neutral', '100', 'Foreground fills'],
  ['light', 'inverse.text.brand', 'primary', '250', 'Text color'],
  ['dark', 'border.warning', 'warning', '250', 'Border'],
  ['light', 'icon.brand', 'primary', '750', 'Icon'],
  ['dark', 'inverse.icon.success', 'success', '350', 'Icon'],
];
s4dArm: for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  const b = brand.toLowerCase();
  await hooks.click(page.locator('[data-p3="tab-color"]'));
  await hooks.click(page.locator('[data-p3="color-sub-fills"]'));
  await hooks.need(page, '[data-p3="fills-levers"]');
  if (!await previewMode(page, 'light')) { if (!deadPages.has(page)) await ctx.close(); continue s4dArm; }
  ok(b in ICONS_PAIRED, `S4d ${brand}: the suite says whether this brand loads with icons paired (ICONS_PAIRED)`);
  const rows0 = await iconRowsAt(page);
  ok(rows0.length === 31, `S4d ${brand}: the Icon section draws the 31 icon rows (read ${rows0.length})`);
  if (ICONS_PAIRED[b]) {
    const bad = rows0.filter((r) => !r.disabled || r.text !== `Follows ${ICON_TWIN(r.role)}`);
    ok(bad.length === 0, `S4d ${brand}: paired, every icon row is disabled and reads "Follows text.X"${bad.length ? ` — ${bad.slice(0, 3).map((r) => JSON.stringify(r)).join(' | ')}` : ''}`);
    const before = await inputAt(page);
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="icons-unpair"]'));
    await page.waitForFunction(() => !document.querySelector('[data-p3="levers-pane"] [data-p3="icons-unpair"]'), null, { timeout: 5000 }).catch(() => {});
    const after = await inputAt(page);
    ok(after?.iconContrast === '3:1' && JSON.stringify({ ...after, iconContrast: before?.iconContrast }) === JSON.stringify(before),
      `S4d ${brand}: Unpair icons from text persists iconContrast "3:1" and nothing else (persisted ${JSON.stringify(after?.iconContrast)}, was ${JSON.stringify(before?.iconContrast)})`);
  } else {
    const note = await page.locator('[data-p3="levers-pane"] [data-p3="icons-unpair"]').count();
    ok(note === 0, `S4d ${brand}: loads unpaired, so no Unpair note is drawn (${note})`);
  }
  const rows1 = await iconRowsAt(page);
  // The nineteen that follow their text under both lever values: the seven that keep their text's 4.5:1 floor
  // under "3:1" (#1982), and tertiary and the -subtle inks, page and inverse, whose text is held to the same 3:1
  // floor as an icon (#2024). A literal typed here; 12 rows stay editable.
  const FOLLOW_ALWAYS = [
    'icon.primary', 'inverse.icon.primary', 'icon.on-brand', 'icon.on-success', 'icon.on-warning', 'icon.on-danger', 'icon.on-info',
    'icon.tertiary', 'inverse.icon.tertiary',
    'icon.brand-subtle', 'icon.success-subtle', 'icon.warning-subtle', 'icon.danger-subtle', 'icon.info-subtle',
    'inverse.icon.brand-subtle', 'inverse.icon.success-subtle', 'inverse.icon.warning-subtle', 'inverse.icon.danger-subtle', 'inverse.icon.info-subtle',
  ];
  const still = rows1.filter((r) => !FOLLOW_ALWAYS.includes(r.role) && (r.disabled || /^Follows/.test(r.text)));
  ok(rows1.length === 31 && FOLLOW_ALWAYS.length === 19 && still.length === 0, `S4d ${brand}: unpaired, every icon row but the nineteen is enabled and edits${still.length ? ` — still locked: ${still.slice(0, 3).map((r) => r.role).join(', ')}` : ''}`);
  const loose = FOLLOW_ALWAYS.filter((role) => { const r = rows1.find((x) => x.role === role); return !r || !r.disabled || r.text !== `Follows ${ICON_TWIN(role)}`; });
  ok(loose.length === 0, `S4d ${brand}: #1982/#2024 unpaired, the nineteen stay disabled and read "Follows text.X"${loose.length ? ` — not locked: ${loose.join(', ')}` : ''}`);
  for (const [m, role, pal, step, sec] of S4D_EDITS) {
    if (!await previewMode(page, m)) { if (deadPages.has(page)) continue s4dArm; continue; }
    const row = `[data-p3="levers-pane"] .p3-fillrow[data-role="${role}"]`;
    // Bounded: a row left locked (or not drawn) is a failure by name here, not a 30-second timeout.
    const can = await page.evaluate((sel) => { const b = document.querySelector(sel); return !!b && !b.disabled; }, `${row} [data-p3="fill-pick"]`);
    if (!can) { ok(false, `S4d ${brand}: the ${sec} row ${role} in ${m} is drawn and enabled, so it can be edited`); continue; }
    await hooks.click(page.locator(`${row} [data-p3="fill-pick"]`));
    await hooks.click(page.locator(`[data-p3="levers-pane"] [data-p3="step-picker-step"][data-step="${step}"]`));
    await page.waitForFunction((sel) => /Override/.test(document.querySelector(sel)?.textContent ?? ''), `${row} [data-p3="fill-pick"]`, { timeout: 5000 }).catch(() => {});
    await page.keyboard.press('Escape');
    const ov = (await inputAt(page))?.overrides?.[m]?.[role];
    ok(JSON.stringify(ov) === JSON.stringify({ palette: pal, step }), `S4d ${brand}: the ${sec} row ${role} in ${m} persists overrides.${m}["${role}"] = ${JSON.stringify({ palette: pal, step })} (persisted ${JSON.stringify(ov)})`);
  }
  const emission = JSON.parse(await readFile(join(OUT_DIR, `${b}.tokens.json`), 'utf8'));
  const root = Object.keys(emission)[0];
  const leaf = (tree, role) => role.split('.').reduce((n, x) => n?.[x], tree[root]?.color);
  const aliasIn = (tree, role, m) => (m === 'light' ? leaf(tree, role)?.$value : leaf(tree, role)?.$extensions?.prism3?.modes?.[m]?.$value) ?? null;
  await hooks.click(page.locator('[data-p3="export-open"]'));
  await hooks.need(page, '[data-p3="export-dialog"]');
  const pending = page.waitForEvent('download');
  await hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-confirm"]'));
  let exported = null;
  try { exported = JSON.parse(await readFile(await (await pending).path(), 'utf8')); } catch { /* reported below */ }
  for (const [m, role, pal, step, sec] of S4D_EDITS) {
    const want = `{${root}.core.palette.${pal}.${step}}`;
    const was = aliasIn(emission, role, m), got = exported ? aliasIn(exported, role, m) : null;
    ok(got === want && was !== want, `S4d ${brand}: an edit on the ${sec} section's ${role} in ${m} reaches the exported tokens as ${want} (exported ${got}; the committed emission has ${was})`);
  }
  const errs = drain();
  ok(errs.length === 0, `S4d ${brand}: 0 console errors across the icon lock and the section edits${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
// 1f. Type — moved to the two panes (UI redesign S6.2), its preview against each brand's emission
// =============================================================================================
// The Type preview draws the shared type sample (#1942), Font families, Scale, Weights and styles, Line height and
// letter spacing, and Building blocks (S6.3), all from `preview/sections/`. Per corpus brand and per mode, against
// the brand's COMMITTED EMISSION, never the page:
//   · the sections are exactly the listed ones, in order, each a specimen root on the emission's
//     `background.primary` in that mode, and each shared one carries the marker only its module stamps;
//   · the type sample's lines are a display, title, body, label and caption, the display line the proposed
//     `display.md.strong` (or the largest display style where a brand has none), each line set in its own text
//     type's emitted face (`core.font.family.<type>`, alias followed) at its emitted size;
//   · the Faces section names, for each text type, the face the emission binds in that mode;
//   · in Light, Scale lists every style (`type.<text type>.<size>`) the emission carries, once, at its emitted
//     desktop and mobile size, with every weight it ships at the emitted number;
//   · Layout draws no fluid read-out: S6.3 folded it into Scale (owner decision Q71).
console.log(`\nType — the moved page, against each brand's emission\n${'='.repeat(78)}`);
const SG_TYPE = '[data-p3="preview-body"] [data-p3="type-style-guide"]';
/** The Type preview's sections, by title, in order. Literal (S6.3). */
const EXPECT_TYPE_SECTIONS = ['Type sample', 'Font families', 'Scale', 'Weights and styles', 'Line height and letter spacing', 'Building blocks'];
/** The shared sections it draws, by title, with the marker each module stamps on its root. Literal. */
const EXPECT_TYPE_PREVIEW_MARKER = { 'Type sample': 'type-sample', 'Font families': 'faces', Scale: 'type-scale', 'Weights and styles': 'weights-by-face',
  'Line height and letter spacing': 'line-spacing', 'Building blocks': 'building-blocks' };
let typePreviewStates = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  const emission = await loadEmission(brand);
  const oracle = await emittedType(brand);
  await gotoType(page);
  await hooks.need(page, `${SG_TYPE} .psec`);
  const modes = (await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode)));
  for (const mode of modes) {
    await chooseMode(page, mode);
    const where = `${brand} / Type / ${mode}`;
    typePreviewStates++;
    const errs = drain();
    ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
    const got = await readSections(page, SG_TYPE);
    ok(JSON.stringify(got.sections.map((x) => x.name)) === JSON.stringify(EXPECT_TYPE_SECTIONS),
      `${where}: the preview draws exactly ${EXPECT_TYPE_SECTIONS.join(', ')}, in order — drew ${got.sections.map((x) => x.name).join(', ')}`);
    const page0 = emission?.role('background.primary', mode)?.hex;
    for (const name of EXPECT_TYPE_SECTIONS) {
      const x = got.sections.find((y) => y.name === name);
      ok(!!x && x.root && x.ground === page0, `${where}: section ${name} is a specimen root on the emission's background.primary ${page0}${!x ? ' — not drawn' : !x.root ? ' — not a specimen root' : x.ground !== page0 ? ` — on ${x.ground}` : ''}`);
    }
    checkSharedMarkers(where, got, EXPECT_TYPE_PREVIEW_MARKER);
    checkTypeSample(`${brand.toLowerCase()} / Type / ${mode}`, await readTypeSample(page, SG_TYPE), oracle, mode);
    const faces = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} [data-sg-section="faces"] [data-p3="faces-type-row"]`)]
      .map((r) => [r.dataset.group, r.querySelectorAll('td')[1]?.textContent ?? '']), SG_TYPE);
    const offFace = faces.filter(([g, f]) => oracle.face(g, mode) !== f).map(([g, f]) => `${g} names ${f}, the emission binds ${oracle.face(g, mode)}`);
    ok(faces.length >= 6 && offFace.length === 0, `${where}: the Faces section names each text type's emitted face (${faces.length} text types)${offFace.length ? ` — ${offFace.slice(0, 3).join(' | ')}` : ''}`);
    if (mode !== 'light') continue;
    // Scale, in Light, against the emission: every style (`type.<text type>.<size>`) once, at its emitted desktop
    // and mobile size, listing every weight it ships at the emitted number.
    const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
    const rootNode = tree[Object.keys(tree)[0]];
    const leaves = [];
    const walk = (n, path) => { for (const [k, v] of Object.entries(n ?? {})) { if (k.startsWith('$') || !v || typeof v !== 'object') continue; if (v.$type === 'typography') leaves.push([`${path}.${k}`, v]); else walk(v, `${path}.${k}`); } };
    walk(rootNode.type, 'type');
    const roleNum = (r) => rootNode.core?.font?.['weight-role']?.[r]?.$extensions?.prism3?.numeric;
    const want = new Map();
    for (const [, v] of leaves) {
      const x = v.$extensions?.prism3 ?? {};
      const key = `${x.group}.${x.variant}`;
      const w = want.get(key) ?? { px: x.sizePx, min: x.responsive?.min?.px ?? x.sizePx, weights: new Set() };
      w.weights.add(`${x.weightRole} ${roleNum(x.weightRole)}`);
      want.set(key, w);
    }
    const rows = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} [data-sg-section="type-scale"] [data-p3="type-scale-row"]`)].map((r) => ({
      style: r.dataset.style, pill: r.querySelector('[data-p3="token-pill"]')?.textContent ?? '',
      desk: r.querySelector('[data-p3="type-scale-desktop"]')?.textContent ?? '', mob: r.querySelector('[data-p3="type-scale-mobile"]')?.textContent ?? '',
      weights: r.querySelector('[data-p3="type-scale-weights"]')?.textContent ?? '',
    })), SG_TYPE);
    const missing = [...want.keys()].filter((k) => !rows.some((r) => r.style === k));
    const extra = rows.filter((r) => !want.has(r.style)).map((r) => r.style);
    ok(want.size > 0 && missing.length === 0 && extra.length === 0 && rows.length === want.size,
      `${where}: Scale draws the emission's ${want.size} styles, each once${missing.length || extra.length ? ` — missing ${missing.slice(0, 3).join(', ')}; extra ${extra.slice(0, 3).join(', ')}` : ` (drew ${rows.length})`}`);
    const off = [];
    for (const r of rows) {
      const w = want.get(r.style); if (!w) continue;
      const wantMob = w.min !== w.px ? `${w.min}px` : 'Same';
      const ws = r.weights.split(', ').sort().join(', '), wantWs = [...w.weights].sort().join(', ');
      if (r.pill !== `type.${r.style}` || r.desk !== `${w.px}px` || r.mob !== wantMob || ws !== wantWs) off.push(`${r.style} reads ${r.pill} ${r.desk} / ${r.mob} / ${r.weights}, the emission says ${w.px}px / ${wantMob} / ${wantWs}`);
    }
    ok(rows.length > 0 && off.length === 0, `${where}: every Scale row is the emitted style at its emitted desktop and mobile size, with its weights${off.length ? ` — ${off.slice(0, 3).join(' | ')}` : ''}`);
  }
  await chooseMode(page, 'light');
  await gotoLayout(page);
  // S6.3 (owner decision Q71): Layout no longer draws the fluid read-out; Type's Scale holds what it showed. Since S10
  // Layout is a moved page, so this reads its preview, which draws Breakpoints, Grid and Containers and nothing of Type's.
  const layoutFluid = await page.evaluate(() => ({ frame: !!document.querySelector('[data-p3="layout-style-guide"] .psec'),
    marked: document.querySelectorAll('[data-p3="preview-body"] :is([data-sg-section="type-scale"], [data-sg-section="type-fluid"])').length, list: document.querySelectorAll('[data-p3="preview-body"] .fz-list').length }));
  hooks.absent(ok, { seen: layoutFluid.frame, state: 'the Layout preview' }, layoutFluid.marked === 0 && layoutFluid.list === 0,
    `${brand} / Layout: draws no fluid read-out (S6.3 moved it to Type's Scale)${layoutFluid.marked || layoutFluid.list ? ` — ${layoutFluid.marked} shared section(s), ${layoutFluid.list} fz-list(s)` : ''}`);
  const errs = drain();
  ok(errs.length === 0, `${brand} / Type and Layout: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
// 1i. Layout — moved to the two panes (UI redesign S10), its preview against each brand's emission
// =============================================================================================
// The Layout preview draws Breakpoints, Grid and Containers (`preview/sections/`). Per corpus brand and per mode,
// against the brand's COMMITTED EMISSION, never the page:
//   · the sections are exactly the listed ones, in order, each a specimen root on the emission's `background.primary`
//     in that mode, and each carries the marker only its module stamps;
//   · every breakpoint the emission carries (`breakpoint.<bp>`) is drawn, at its emitted px; every grid's columns,
//     gutter and margin read the emitted `grid.<bp>.*` (an alias followed to its space step); the two container
//     widths read `container.max` and `container.narrow`;
//   · every text node clears its floor (the legibility probe), and inline ink is marked a specimen.
console.log(`\nLayout — the moved page, against each brand's emission\n${'='.repeat(78)}`);
const SG_LAYOUT = '[data-p3="preview-body"] [data-p3="layout-style-guide"]';
/** The Layout preview's sections, by title, in order, with the marker each module stamps. Literal (S10). */
const EXPECT_LAYOUT_SECTIONS = ['Breakpoints', 'Grid', 'Containers'];
const EXPECT_LAYOUT_MARKER = { Breakpoints: 'breakpoints', Grid: 'grid', Containers: 'containers' };
/** The emitted layout tokens of `brand`: `{ bp: px }`, `{ bp: { columns, gutter, margin } }` (px), and the containers. */
const emittedLayout = async (brand) => {
  const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
  const rootKey = Object.keys(tree)[0];
  const root = tree[rootKey];
  const at = (path) => path.split('.').reduce((n, k) => n?.[k], root);
  const px = (v, hops = 0) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.startsWith('{') && hops < 8) return px(at(v.slice(1, -1).replace(`${rootKey}.`, ''))?.$value, hops + 1);
    return typeof v === 'string' ? parseFloat(v) : NaN;
  };
  const bps = Object.fromEntries(Object.entries(root.breakpoint ?? {}).filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, px(v.$value)]));
  const grid = Object.fromEntries(Object.entries(root.grid ?? {}).filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, { columns: px(v.columns?.$value), gutter: px(v.gutter?.$value), margin: px(v.margin?.$value) }]));
  return { bps, grid, max: px(root.container?.max?.$value), narrow: px(root.container?.narrow?.$value) };
};
let layoutStates = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  const emission = await loadEmission(brand);
  const want = await emittedLayout(brand);
  ok(Object.keys(want.bps).length >= 2 && Object.keys(want.grid).length === Object.keys(want.bps).length && want.max > 0,
    `${brand} / Layout: the emission carries ${Object.keys(want.bps).length} breakpoints, a grid for each, and the containers (the oracle)`);
  await gotoLayout(page);
  const modes = (await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode)));
  for (const mode of modes) {
    await chooseMode(page, mode);
    const where = `${brand} / Layout / ${mode}`;
    layoutStates++;
    const errs = drain();
    ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
    const got = await readSections(page, SG_LAYOUT);
    ok(JSON.stringify(got.sections.map((x) => x.name)) === JSON.stringify(EXPECT_LAYOUT_SECTIONS),
      `${where}: the preview draws exactly ${EXPECT_LAYOUT_SECTIONS.join(', ')}, in order — drew ${got.sections.map((x) => x.name).join(', ')}`);
    const page0 = emission?.role('background.primary', mode)?.hex;
    for (const name of EXPECT_LAYOUT_SECTIONS) {
      const x = got.sections.find((y) => y.name === name);
      ok(!!x && x.root && x.ground === page0, `${where}: section ${name} is a specimen root on the emission's background.primary ${page0}${!x ? ' — not drawn' : !x.root ? ' — not a specimen root' : x.ground !== page0 ? ` — on ${x.ground}` : ''}`);
    }
    checkSharedMarkers(where, got, EXPECT_LAYOUT_MARKER);
    const shown = await page.evaluate((sel) => {
      const h = document.querySelector(sel);
      const read = (attr) => Object.fromEntries([...h.querySelectorAll(`[data-${attr}]`)].map((n) => [n.dataset[attr], parseFloat(n.textContent)]));
      const cont = Object.fromEntries([...h.querySelectorAll('[data-p3="layout-container"]')].map((r) => [r.dataset.token, parseFloat(r.querySelector('.lyv-val')?.textContent ?? '')]));
      return { bps: read('bppx'), cols: read('bpcol'), gut: read('bpgut'), mar: read('bpmar'), cont };
    }, SG_LAYOUT);
    const off = [];
    for (const [bp, px] of Object.entries(want.bps)) if (shown.bps[bp] !== px) off.push(`breakpoint.${bp} shows ${shown.bps[bp]}, emits ${px}`);
    for (const [bp, g] of Object.entries(want.grid)) {
      if (shown.cols[bp] !== g.columns) off.push(`grid.${bp}.columns shows ${shown.cols[bp]}, emits ${g.columns}`);
      if (shown.gut[bp] !== g.gutter) off.push(`grid.${bp}.gutter shows ${shown.gut[bp]}, emits ${g.gutter}`);
      if (shown.mar[bp] !== g.margin) off.push(`grid.${bp}.margin shows ${shown.mar[bp]}, emits ${g.margin}`);
    }
    if (shown.cont['container.max'] !== want.max) off.push(`container.max shows ${shown.cont['container.max']}, emits ${want.max}`);
    if (shown.cont['container.narrow'] !== want.narrow) off.push(`container.narrow shows ${shown.cont['container.narrow']}, emits ${want.narrow}`);
    const extra = Object.keys(shown.bps).filter((bp) => !(bp in want.bps));
    ok(off.length === 0 && extra.length === 0, `${where}: every breakpoint, grid and container value reads the emission's${off.length || extra.length ? ` — ${[...off, ...extra.map((b) => `${b} drawn, not emitted`)].slice(0, 4).join(' | ')}` : ''}`);
    await settle(page, where);
    const probe = await page.evaluate(LEGIBILITY_PROBE, SG_LAYOUT);
    assertParsed(where, probe.unparsed);
    ok(probe.rootFound, `${where}: the Layout preview was measured`);
    const rows = probe.text;
    nodesMeasured += rows.length;
    ok(rows.length >= STATE_NODE_FLOOR, `${where}: the contrast probe measured ${rows.length} text nodes in the Layout preview (floor ${STATE_NODE_FLOOR})`);
    for (const r of rows) if (r.ratio < worstRatio) { worstRatio = r.ratio; worstWhere = `${where} — ${r.cls} "${r.text}"`; }
    const under = rows.filter((r) => r.ratio < CONTRAST_FLOOR);
    ok(under.length === 0, `${where}: every one of ${rows.length} text nodes clears ${CONTRAST_FLOOR}:1${under.length ? ` — ${under.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1`).join(' | ')}` : ''}`);
    const unmarked = rows.filter((r) => r.inlineInk && !r.specimen);
    ok(unmarked.length === 0, `${where}: every node inked by an inline style is marked data-specimen at its render site${unmarked.length ? ` — ${unmarked.slice(0, 3).map((u) => `${u.cls} "${u.text}"`).join(' | ')}` : ''}`);
  }
  await ctx.close();
}
ok(layoutStates >= 2 * BRANDS.length, `Layout: ${layoutStates} brand × mode states measured against the emission (floor ${2 * BRANDS.length})`);
ok(typePreviewStates >= BRANDS.length * 2, `the Type sweep visited ${typePreviewStates} brand × mode states (floor ${BRANDS.length * 2})`);
ok(typeSampleLines >= BRANDS.length * 2 * 2 * 5, `the type sample check read ${typeSampleLines} lines on the Type preview and the Style guide (floor ${BRANDS.length * 2 * 2 * 5})`);

// =============================================================================================
// 1g. Shape — moved to the two panes (UI redesign S7), its preview against each brand's emission
// =============================================================================================
// The Shape preview draws Density, Radius, Spacing and Building blocks from `preview/sections/`. Per corpus brand and
// per mode, against the brand's COMMITTED EMISSION, never the page:
//   · the sections are exactly the listed ones, in order, each a specimen root on the emission's `background.primary`
//     in that mode, and each carries the marker only its module stamps;
//   · Radius draws every `radius.*` the emission carries, in its order, each at its emitted px in that mode (the
//     mode's own value where the leaf carries one) — #1881's done-when, with #2053's hairline;
//   · Density draws every `size.*.height`, each at its emitted px in that mode, and Building blocks every
//     `border-width.*` and `icon.size.*` at its emitted px, and Spacing every `space.*`;
//   · every painted sample is its role's emitted hex in that mode (D2 A);
//   · in every mode but Light, the Density lever says the decided per-mode sentence (moved from the sweep).
//
// Mutation this fails by name: the radius list built from a hand list (`RADIUS_STEPS` without `xl`, `2xl`, `3xl` and
// `hairline`) → `… Radius draws every radius.* the emission carries — missing radius.xl, …`.
console.log(`\nShape — the moved page, against each brand's emission\n${'='.repeat(78)}`);
const SG_SHAPE = '[data-p3="preview-body"] [data-p3="shape-style-guide"]';
/** The Shape preview's sections, by title, in order, with the marker each module stamps. Literal (owner decision D1 A). */
const EXPECT_SHAPE_SECTIONS = ['Density', 'Radius', 'Spacing', 'Building blocks'];
const EXPECT_SHAPE_MARKER = { Density: 'control-heights', Radius: 'radius', Spacing: 'spacing', 'Building blocks': 'shape-building-blocks' };
/** The dimension tokens the emission carries, by group, each with its px in a mode: the leaf's own, or the mode's
 *  override where the leaf carries one. From the committed tree, never the page. */
const emittedDims = async (brand) => {
  const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
  const root = tree[Object.keys(tree)[0]];
  const px = (leaf, mode) => leaf?.$extensions?.prism3?.modes?.[mode]?.px ?? leaf?.$extensions?.prism3?.px;
  const leaves = (node, pick = (v) => v) => Object.entries(node ?? {}).filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, pick(v)]);
  return {
    radius: (mode) => leaves(root.radius).map(([k, v]) => [k, px(v, mode)]),
    height: (mode) => leaves(root.size, (v) => v.height).map(([k, v]) => [k, px(v, mode)]),
    // By px: a parsed object lists integer-like keys (`100`) before the rest (`025`), so the tree's own order is lost.
    space: () => leaves(root.space).map(([k, v]) => [k, px(v)]).sort((a, b) => a[1] - b[1]),
    border: () => leaves(root['border-width']).map(([k, v]) => [k, px(v)]),
    icon: () => leaves(root.icon?.size).map(([k, v]) => [k, px(v)]),
  };
};
/** Open Shape through the tab row and wait for its levers. */
const gotoShape = async (page) => {
  await hooks.click(page.locator('[data-p3="tab-shape"]'));
  await hooks.need(page, '[data-p3="shape-levers"]');
  await hooks.need(page, `${SG_SHAPE} .psec`);
  await page.evaluate(() => document.fonts.ready);
};
let shapeStates = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  const emission = await loadEmission(brand);
  const dims = await emittedDims(brand);
  await gotoShape(page);
  const modes = (await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode)));
  for (const mode of modes) {
    await chooseMode(page, mode);
    const where = `${brand} / Shape / ${mode}`;
    shapeStates++;
    const errs = drain();
    ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
    const got = await readSections(page, SG_SHAPE);
    ok(JSON.stringify(got.sections.map((x) => x.name)) === JSON.stringify(EXPECT_SHAPE_SECTIONS),
      `${where}: the preview draws exactly ${EXPECT_SHAPE_SECTIONS.join(', ')}, in order — drew ${got.sections.map((x) => x.name).join(', ')}`);
    const page0 = emission?.role('background.primary', mode)?.hex;
    for (const name of EXPECT_SHAPE_SECTIONS) {
      const x = got.sections.find((y) => y.name === name);
      ok(!!x && x.root && x.ground === page0, `${where}: section ${name} is a specimen root on the emission's background.primary ${page0}${!x ? ' — not drawn' : !x.root ? ' — not a specimen root' : x.ground !== page0 ? ` — on ${x.ground}` : ''}`);
    }
    checkSharedMarkers(where, got, EXPECT_SHAPE_MARKER);
    // Every painted sample, its role's emitted hex in this mode (D2 A).
    const offPaint = got.paint.filter((n) => { const want = emission?.role(n.role, mode)?.hex; return !want || rgbHex(n.css) !== want; })
      .map((n) => `${n.role} ${n.prop} ${rgbHex(n.css) ?? n.css} (emitted ${emission?.role(n.role, mode)?.hex})`);
    ok(got.paint.length >= 20 && offPaint.length === 0, `${where}: every sample is painted its role's emitted hex (${got.paint.length} read)${offPaint.length ? ` — ${offPaint.slice(0, 3).join(' | ')}` : ''}`);
    // The rows against the emission, by group.
    const rows = await page.evaluate((sel) => Object.fromEntries(['radius-row', 'height-row', 'space-row', 'border-width-row', 'icon-size-row'].map((hk) =>
      [hk, [...document.querySelectorAll(`${sel} [data-p3="${hk}"]`)].map((r) => {
        const label = r.querySelector('[data-p3="shape-row-label"]')?.textContent ?? '';
        // A pill size reads "Pill", no px (#2078): its value is read off the sample it draws instead.
        const px = label === 'Pill' ? /^(\d+(?:\.\d+)?)px$/.exec(r.querySelector('.shp-sw')?.style.borderRadius ?? '')?.[1] : /(\d+(?:\.\d+)?)px/.exec(label)?.[1];
        return [r.dataset.step, r.querySelector('[data-p3="token-pill"]')?.textContent ?? '', Number(px), label];
      })])), SG_SHAPE);
    const against = (label, hk, prefix, suffix, want) => {
      const drawn = rows[hk];
      const missing = want.filter(([k]) => !drawn.some(([s]) => s === k)).map(([k]) => `${prefix}${k}${suffix}`);
      const extra = drawn.filter(([s]) => !want.some(([k]) => k === s)).map(([s]) => `${prefix}${s}${suffix}`);
      const order = JSON.stringify(drawn.map(([s]) => s)) === JSON.stringify(want.map(([k]) => k));
      const off = drawn.filter(([s, tok, v]) => { const w = want.find(([k]) => k === s); return w && (tok !== `${prefix}${s}${suffix}` || v !== w[1]); })
        .map(([s, tok, v]) => `${tok} reads ${v}px, emitted ${want.find(([k]) => k === s)?.[1]}px`);
      ok(want.length > 0 && missing.length === 0 && extra.length === 0 && order,
        `${where}: ${label} draws every ${prefix}*${suffix} the emission carries, in its order (${want.length})${missing.length ? ` — missing ${missing.join(', ')}` : ''}${extra.length ? ` — extra ${extra.join(', ')}` : ''}${!order && !missing.length && !extra.length ? ` — out of order: ${drawn.map(([s]) => s).join(', ')}` : ''}`);
      ok(off.length === 0, `${where}: each ${label} row is its emitted value in ${mode}${off.length ? ` — ${off.slice(0, 3).join(' | ')}` : ''}`);
    };
    against('Radius', 'radius-row', 'radius.', '', dims.radius(mode));
    // #2078 (owner, 2026-10-04, per #1177): the two pill sizes read "Pill", by which size each is (oracle: the names
    // round and capsule, literal), in every mode, wireframe's 0px included; every other size reads its px.
    const PILL_SIZES = ['round', 'capsule'];
    const offLabel = rows['radius-row'].filter(([s, , v, label]) => (PILL_SIZES.includes(s) ? label !== 'Pill' : label !== `${v}px`)).map(([s, , , label]) => `radius.${s} reads "${label}"`);
    ok(PILL_SIZES.every((p) => rows['radius-row'].some(([s]) => s === p)) && offLabel.length === 0,
      `${where}: Radius labels radius.round and radius.capsule "Pill" and every other size its px${offLabel.length ? ` — ${offLabel.join(' | ')}` : ''}`);
    against('Density', 'height-row', 'size.', '.height', dims.height(mode));
    against('Spacing', 'space-row', 'space.', '', dims.space());
    against('Building blocks (border widths)', 'border-width-row', 'border-width.', '', dims.border());
    against('Building blocks (icon sizes)', 'icon-size-row', 'icon.size.', '', dims.icon());
    // The decided per-mode density sentence, in every mode but Light (the sweep counted it on the legacy page).
    const sentence = await page.evaluate(() => document.querySelector('[data-p3="levers-pane"] [data-p3="shape-density-mode"]')?.textContent ?? null);
    if (mode === 'light') hooks.absent(ok, { seen: (await page.locator('[data-p3="lever-density"]').count()) === 1, state: 'Shape\'s Density lever' }, sentence === null, `${where}: in Light the Density lever carries no per-mode sentence`);
    else {
      perModeDensityKnobs++;
      if (sentence !== PER_MODE_DENSITY_SENTENCE) perModeDensityMissing.push(`${where}: ${String(sentence).slice(0, 80)}`);
    }
  }
  await chooseMode(page, 'light');
  const errs = drain();
  ok(errs.length === 0, `${brand} / Shape: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}
ok(shapeStates >= BRANDS.length * 2, `the Shape sweep visited ${shapeStates} brand × mode states (floor ${BRANDS.length * 2})`);
ok(perModeDensityKnobs >= BRANDS.length && perModeDensityMissing.length === 0,
  `per-mode density: every per-mode Density lever (${perModeDensityKnobs} met, floor ${BRANDS.length}) says "${PER_MODE_DENSITY_SENTENCE}"${perModeDensityMissing.length ? ` — MISSING: ${perModeDensityMissing.slice(0, 3).join(' | ')}` : ''}`);

// =============================================================================================
// 1h. Depth & motion — moved to the two panes (UI redesign S9.2), its preview against each brand's emission
// =============================================================================================
// S9.1 lifted the legacy Elevation and Motion pages' read-only pieces into `preview/sections/`; S9.2 retired the two
// pages, so the Depth & motion preview draws them. Per corpus brand and per mode, against the brand's COMMITTED
// EMISSION, never the page:
//   · the preview draws exactly Elevation then Motion, each a specimen root on the emission's `background.primary`;
//   · each of the six pieces is the shared module's (its root carries the marker only that module stamps), drawn
//     exactly once, in the section it belongs to (a piece drawn by anything else carries no marker);
//   · the durations table lists the emission's `motion.duration.*` steps for the mode, at their emitted ms, and the
//     spinner's turn is NOT a row of it: it is drawn apart, as a loop (T9), at its emitted ms;
//   · each transition traces the curve the emission's `motion.easing-role.<transition>` resolves to IN THAT MODE
//     (#2046: the legacy specimen read the transition's fixed default curve), read from the drawn path's geometry;
//   · each curve's role tags are the roles the emission points at it in that mode;
//   · the preview's text and form controls through the legibility probe, at the bars the sweep above holds.
console.log(`\nDepth & motion — the moved page, against each brand's emission\n${'='.repeat(78)}`);
const SG_DEPTH = '[data-p3="preview-body"] [data-p3="depth-style-guide"]';
/** The Depth & motion preview's sections, by title, in order (V4), and the marker each piece stamps, by the section it
 *  sits in. Literal. */
const EXPECT_DEPTH_SECTIONS = ['Elevation', 'Motion'];
const EXPECT_DEPTH_PIECES = { 'shadow-ramp': 'Elevation', 'shadow-tint': 'Elevation', 'motion-curves': 'Motion', 'duration-ramp': 'Motion', springs: 'Motion', 'motion-transitions': 'Motion' };
/** Open Depth & motion through the tab row (S9.2: it left the Pages menu for the two panes). */
const gotoDepth = async (page) => {
  await hooks.click(page.locator('[data-p3="tab-depth"]'));
  await hooks.need(page, '[data-p3="depth-levers"]');
  await hooks.need(page, `${SG_DEPTH} .psec`);
  await page.evaluate(() => document.fonts.ready);
};
/** THE MOTION ORACLE, from a token tree (the committed emission, or an export the test downloads), in one mode: each
 *  duration step's ms (the mode's own where the leaf carries one), and the curve each easing role resolves to (the
 *  mode's alias where it has one, followed to `motion.easing.<curve>`, its bezier). */
const motionOracle = (tree, mode) => {
  const rootKey = Object.keys(tree).find((k) => !k.startsWith('$'));
  const mo = tree[rootKey].motion;
  const leaves = (n) => Object.entries(n ?? {}).filter(([k]) => !k.startsWith('$'));
  const ms = (leaf) => leaf.$extensions?.prism3?.modes?.[mode]?.ms ?? leaf.$extensions?.prism3?.ms;
  const curve = (role) => {
    const leaf = mo['easing-role']?.[role];
    if (!leaf) return null;
    const v = leaf.$extensions?.prism3?.modes?.[mode]?.$value ?? leaf.$value;
    const name = String(v).slice(1, -1).split('.').pop();
    return { name, bez: mo.easing?.[name]?.$value ?? null };
  };
  return {
    durations: Object.fromEntries(leaves(mo.duration).map(([k, l]) => [k, ms(l)])),
    reduced: Object.fromEntries(leaves(mo['duration-reduced']).map(([k, l]) => [k, ms(l)])),
    roles: leaves(mo['easing-role']).map(([k]) => k), curve,
  };
};
/** What the Depth & motion preview draws for motion: each duration row and the spin block, each transition with the
 *  bezier its stage path DRAWS (the cubic's control points, read back out of the 100-unit plot), and each curve card's
 *  role tags. */
const readDepthMotion = (page) => page.evaluate((sel) => {
  const host = document.querySelector(sel);
  const P = 11.364, span = 100 - 2 * P;
  const bezOf = (path) => {
    const m = /C\s*([\d.-]+),([\d.-]+)\s+([\d.-]+),([\d.-]+)/.exec(path?.getAttribute('d') ?? '');
    if (!m) return null;
    const [x1, y1, x2, y2] = m.slice(1).map(Number);
    return [(x1 - P) / span, (100 - P - y1) / span, (x2 - P) / span, (100 - P - y2) / span].map((n) => Math.round(n * 1000) / 1000);
  };
  const ms = (t) => Number(/(\d+)ms/.exec(t ?? '')?.[1] ?? NaN);
  return {
    rows: [...(host?.querySelectorAll('[data-sg-section="duration-ramp"] [data-p3="duration-row"]') ?? [])].map((r) => ({
      step: r.dataset.step, pill: r.querySelector('[data-p3="token-pill"]')?.textContent ?? '', ms: ms(r.children[1]?.textContent), reduced: ms(r.children[2]?.textContent) })),
    spinInTable: [...(host?.querySelectorAll('[data-sg-section="duration-ramp"] table [data-p3="token-pill"]') ?? [])].some((p) => /^motion\.duration(-reduced)?\.spin$/.test(p.textContent)),
    spin: (() => { const b = host?.querySelector('[data-sg-section="duration-ramp"] [data-p3="duration-spin"]'); return b ? { pills: [...b.querySelectorAll('[data-p3="token-pill"]')].map((p) => p.textContent), text: b.textContent } : null; })(),
    traces: [...(host?.querySelectorAll('[data-sg-section="motion-transitions"] [data-p3="transition"]') ?? [])].map((t) => ({
      name: t.dataset.transition, bez: bezOf(t.querySelector('.mo-stage-line')), label: t.querySelector('.mo-meta')?.textContent ?? '' })),
    cards: [...(host?.querySelectorAll('[data-sg-section="motion-curves"] [data-p3="curve-card"]') ?? [])].map((c) => ({
      curve: c.querySelector('.mo-ez-name')?.textContent ?? '', roles: [...c.querySelectorAll('[data-p3="curve-role"]')].map((r) => r.textContent) })),
  };
}, SG_DEPTH);
const sameBez = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === 4 && b.length === 4 && a.every((x, i) => Math.abs(x - b[i]) < 0.002);
/** Hold what the preview draws for motion against the oracle, in one mode. */
const checkDepthMotion = (where, got, o) => {
  const steps = Object.keys(o.durations).filter((k) => k !== 'spin');
  ok(JSON.stringify(got.rows.map((r) => r.step)) === JSON.stringify(steps),
    `${where}: the durations table lists the emission's steps, in order, the spinner's turn not among them — drew ${got.rows.map((r) => r.step).join(', ')}, the emission has ${steps.join(', ')}`);
  const offMs = got.rows.filter((r) => r.pill !== `motion.duration.${r.step}` || r.ms !== o.durations[r.step] || r.reduced !== o.reduced[r.step])
    .map((r) => `${r.step} draws ${r.ms}ms / reduced ${r.reduced}ms (${r.pill}), the emission ${o.durations[r.step]}ms / ${o.reduced[r.step]}ms`);
  ok(got.rows.length > 0 && offMs.length === 0, `${where}: every duration row is the emitted ms and reduced ms for this mode${offMs.length ? ` — ${offMs.slice(0, 3).join(' | ')}` : ''}`);
  ok(!got.spinInTable && !!got.spin && got.spin.pills.includes('motion.duration.spin') && got.spin.text.includes(`${o.durations.spin}ms`) && got.spin.text.includes(`${o.reduced.spin}ms`),
    `T9: ${where}: the spinner's turn is drawn apart from the duration steps, as a loop, at its emitted ${o.durations.spin}ms (reduced ${o.reduced.spin}ms) — in the table ${got.spinInTable}, apart ${JSON.stringify(got.spin)}`);
  const offTrace = o.roles.map((role) => ({ role, want: o.curve(role), t: got.traces.find((x) => x.name === role) }))
    .filter(({ want, t }) => !t || !want || !sameBez(t.bez, want.bez) || !t.label.endsWith(want.name))
    .map(({ role, want, t }) => `${role} traces ${t ? `${JSON.stringify(t.bez)} "${t.label}"` : 'nothing'}, the emission's motion.easing-role.${role} is ${want?.name} ${JSON.stringify(want?.bez)}`);
  ok(got.traces.length === o.roles.length && offTrace.length === 0,
    `#2046: ${where}: each transition traces the curve its role resolves to in this mode's emission${offTrace.length ? ` — ${offTrace.slice(0, 2).join(' | ')}` : ` (${got.traces.length} traced)`}`);
  const offTags = got.cards.filter((c) => JSON.stringify([...c.roles].sort()) !== JSON.stringify(o.roles.filter((r) => o.curve(r)?.name === c.curve).sort()))
    .map((c) => `${c.curve} tags ${c.roles.join(', ') || 'none'}`);
  ok(got.cards.length === 6 && offTags.length === 0, `${where}: each of the six curves is tagged with the roles the emission points at it in this mode${offTags.length ? ` — ${offTags.join(' | ')}` : ''}`);
};
let depthStates = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  const emission = await loadEmission(brand);
  const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
  await gotoDepth(page);
  const modes = await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode));
  for (const mode of modes) {
    await chooseMode(page, mode);
    const where = `${brand} / Depth & motion / ${mode}`;
    depthStates++;
    const errs = drain();
    ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
    const got = await readSections(page, SG_DEPTH);
    ok(JSON.stringify(got.sections.map((x) => x.name)) === JSON.stringify(EXPECT_DEPTH_SECTIONS),
      `${where}: the preview draws exactly ${EXPECT_DEPTH_SECTIONS.join(' then ')} (V4) — drew ${got.sections.map((x) => x.name).join(', ')}`);
    const page0 = emission?.role('background.primary', mode)?.hex;
    for (const name of EXPECT_DEPTH_SECTIONS) {
      const x = got.sections.find((y) => y.name === name);
      ok(!!x && x.root && x.ground === page0, `${where}: section ${name} is a specimen root on the emission's background.primary ${page0}${!x ? ' — not drawn' : !x.root ? ' — not a specimen root' : x.ground !== page0 ? ` — on ${x.ground}` : ''}`);
    }
    const marks = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} [data-sg-section]`)].map((n) => ({
      key: n.getAttribute('data-sg-section'), in: n.closest('.psec')?.querySelector('.psec-t')?.textContent ?? null })), SG_DEPTH);
    for (const [key, sec] of Object.entries(EXPECT_DEPTH_PIECES)) {
      const hits = marks.filter((m) => m.key === key);
      ok(hits.length === 1 && hits[0].in === sec, `${where}: the shared ${key} piece is drawn exactly once, in ${sec} — drawn ${hits.length} time(s)${hits.length ? ` in ${hits.map((h) => h.in).join(', ')}` : ': drawn by something other than preview/sections/, or not at all'}`);
    }
    checkDepthMotion(where, await readDepthMotion(page), motionOracle(tree, mode));
    await settle(page, where);
    const probe = await page.evaluate(LEGIBILITY_PROBE, SG_DEPTH);
    assertParsed(where, probe.unparsed);
    ok(probe.rootFound && probe.text.length >= STATE_NODE_FLOOR, `${where}: the contrast probe measured ${probe.text.length} text nodes in the preview (floor ${STATE_NODE_FLOOR})`);
    const under = probe.text.filter((r) => r.ratio < CONTRAST_FLOOR);
    ok(under.length === 0, `${where}: every one of ${probe.text.length} text nodes clears ${CONTRAST_FLOOR}:1${under.length ? ` — ${under.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1`).join(' | ')}` : ''}`);
    const chrome = probe.text.filter((r) => !r.specimen);
    const chromeUnder = chrome.filter((r) => r.ratio < barOf(r));
    ok(chromeUnder.length === 0, `${where}: every one of ${chrome.length} chrome text nodes meets WCAG 1.4.3 (${CHROME_TEXT_MIN}:1, ${CHROME_LARGE_TEXT_MIN}:1 large)${chromeUnder.length ? ` — ${chromeUnder.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1 (needs ${barOf(u)}:1)`).join(' | ')}` : ''}`);
    const unmarked = probe.text.filter((r) => r.inlineInk && !r.specimen);
    ok(unmarked.length === 0, `${where}: every node inked by an inline style is marked data-specimen at its render site${unmarked.length ? ` — ${unmarked.slice(0, 3).map((u) => `${u.cls} "${u.text}"`).join(' | ')}` : ''}`);
    const fieldsUnder = fieldsUnderBar(probe, where);
    ok(probe.fields.length >= 1 && fieldsUnder.length === 0, `${where}: every one of ${probe.fields.length} form control(s) in the preview inks its value at its text bar${fieldsUnder.length ? ` — ${fieldsUnder.slice(0, 3).map(describeField).join(' | ')}` : ''}`);
  }
  await ctx.close();
}
ok(depthStates >= BRANDS.length * 2, `the Depth & motion sweep visited ${depthStates} brand × mode states (floor ${BRANDS.length * 2})`);

// =============================================================================================
// 2. The controls — driven, not merely rendered
// =============================================================================================
// A page that loads clean proves the renderer runs. It proves nothing about what the controls DO,
// which is where #330 and #485 both lived. These three drives are the core interactions #767 names:
// the mode switch (exercised throughout the sweep above), an override picker, and an export.
console.log(`\nControls\n${'='.repeat(78)}`);

// ---- the overlay-wash oracle, read from the engine (#1210) -----------------------------------
//
// EXPECTED comes from `modes.ts` — the code that MINTS these roles — never from the studio and never
// from the studio's own resolution. Reading the primitive back out of what the row renders would be
// docs/34 shape 1 with extra steps: both sides from the subject, so it would go green on the exact
// defect it exists for. The row DID render "Auto · neutral 10" for `<ns>.black-alpha.10`, and a gate
// derived from the renderer would have called that agreement.
//
// The polarity ternary is parsed as well as the steps, because the polarity is the load-bearing half:
// the page wash darkens a light page and lightens a dark one, so an underlay pinned to one colour is
// wrong in one of the two modes and the assertions below drive both.
//
// Throws rather than defaulting — an oracle with a fallback agrees with anything (`constFromEngine`
// takes the same posture at section 3).
const ENGINE_MODES = join(ROOT, '..', '..', 'packages', 'engine', 'modes.ts');
const modesSrc = await readFile(ENGINE_MODES, 'utf8');
const OVERLAY_STEPS = (() => {
  const m = /const OVERLAY_ALPHA[^=]*=\s*\[(.*?)\];/s.exec(modesSrc);
  if (!m) throw new Error('OVERLAY_ALPHA not found in packages/engine/modes.ts — this suite\'s oracle reads the wash steps from there');
  const out = {};
  for (const pair of m[1].matchAll(/\[\s*'([\w-]+)'\s*,\s*(\d+)\s*\]/g)) out[pair[1]] = pair[2];
  if (!out.hover || !out.pressed) throw new Error(`OVERLAY_ALPHA parsed to ${JSON.stringify(out)} — the oracle needs hover and pressed`);
  return out;
})();
const OVERLAY_PAL = (() => {
  const m = /const overlayPal\s*=\s*cfg\.family === 'light' \? '([\w-]+)' : '([\w-]+)'/.exec(modesSrc);
  if (!m) throw new Error('the overlayPal polarity ternary not found in packages/engine/modes.ts — this suite\'s oracle reads the wash palettes from there');
  return { light: m[1], dark: m[2] };
})();
ok(/-alpha$/.test(OVERLAY_PAL.light) && /-alpha$/.test(OVERLAY_PAL.dark) && OVERLAY_PAL.light !== OVERLAY_PAL.dark,
  `the oracle read the wash palettes from packages/engine/modes.ts: ${OVERLAY_PAL.light} on a light page, ${OVERLAY_PAL.dark} on a dark one`);
ok(Object.keys(OVERLAY_STEPS).length >= 2,
  `the oracle read ${Object.keys(OVERLAY_STEPS).length} wash steps from packages/engine/modes.ts (${Object.entries(OVERLAY_STEPS).map(([k, v]) => `${k} ${v}`).join(', ')})`);

/**
 * Every overlay-wash row as it RENDERS on Color › Interactive (UI redesign S5.2): its read-out, its swatch, and
 * its Pressed row nested under it. Found by the role each row names (`data-role`), never by index — an index
 * would silently start measuring a different row the day one is inserted, and a class would not tell the wash
 * row from the `subtle-fill` row beside it.
 *
 * The compositing math runs in the page, not in Node, so the ONE copy of it in this file (inside
 * `LEGIBILITY_PROBE`) does not become three. What comes back are the judgements: is there a wash layer
 * at all, is the layer it sits on opaque, and how far the composite lands from that layer. That last
 * number is what tells a true wash from an invisible one — a light underlay in Dark mode would put a
 * white wash on white and read 0, which is the same defect as the original in the other direction.
 */
const READ_OVERLAY_ROWS = () => {
  const parse = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s ?? '');
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = (c) => {
    const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  /** A swatch's verdict: the wash layer it carries, the ground beneath it, and the distance between
   *  the composite and that ground. `null` for `image` means the swatch paints no wash layer at all. */
  const readSwatch = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const wash = parse(cs.backgroundImage);
    const under = parse(cs.backgroundColor);
    const comp = wash && under
      ? { r: wash.r * wash.a + under.r * (1 - wash.a), g: wash.g * wash.a + under.g * (1 - wash.a), b: wash.b * wash.a + under.b * (1 - wash.a) }
      : null;
    return {
      hasWashLayer: cs.backgroundImage !== 'none' && wash !== null && wash.a < 1,
      washAlpha: wash?.a ?? null,
      underOpaque: under !== null && under.a === 1,
      underColor: cs.backgroundColor,
      deltaLum: comp && under ? Math.abs(lum(comp) - lum(under)) : null,
    };
  };
  const readRow = (row) => ({
    role: row?.dataset.role ?? null,
    text: row?.querySelector('[data-p3="int-readout"]')?.textContent?.trim() ?? null,
    pickers: row?.querySelectorAll('[data-p3="int-pick"], select').length ?? 0,
    swatch: readSwatch(row?.querySelector('.p3-fill-sw')),
  });
  return [...document.querySelectorAll('[data-p3="levers-pane"] .p3-fillrow[data-role$=".overlay.hover"]')].map((row) => {
    const group = row.closest('[data-p3="int-row-group"]');
    return { ...readRow(row), states: [...(group?.querySelectorAll('[data-p3="int-row-states"] .p3-fillrow') ?? [])].map(readRow) };
  });
};
/** The preview's Outline row in one column, as drawn: per state, the ink and the ground of its button. */
const READ_OUTLINE = (name) => {
  const block = [...document.querySelectorAll('[data-p3="interactive-style-guide"] [data-p3="style-guide-palette"]')].find((b) => b.querySelector('.sg-rn')?.textContent === name);
  return [...(block?.querySelectorAll('[data-p3="style-guide-outline"] [data-p3="style-guide-button"]') ?? [])].map((b) => { const cs = getComputedStyle(b); return { ink: cs.color, bg: cs.backgroundColor, edge: cs.borderTopColor }; });
};
/** A row's picker button, its swatch and its label, by role. */
const readIRow = (page, role) => page.evaluate((r) => {
  const row = document.querySelector(`[data-p3="levers-pane"] .p3-fillrow[data-role="${r}"]`);
  return row ? { label: row.querySelector('[data-p3="int-pick"] .p3-btn-label')?.textContent?.trim() ?? null, swatch: getComputedStyle(row.querySelector('.p3-fill-sw')).backgroundColor } : null;
}, role);
/** Open `role`'s step picker, run `act` on it, and close it again with Escape. */
const withPicker = async (page, role, act) => {
  await hooks.click(page.locator(`[data-p3="levers-pane"] [data-p3="int-pick"][data-role="${role}"]`));
  await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]');
  await act(page.locator('[data-p3="levers-pane"] [data-p3="step-picker"]'));
  await page.keyboard.press('Escape');
};

/** The wash rows this suite actually judged, and in how many polarities. Floored after the loop: the
 *  polarity flip is the reason the underlay is derived rather than pinned, so a run that only ever saw
 *  one mode has not checked the thing that decision was made for. */
let washRowsSeen = 0;
let washPolarities = new Set();

for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);

  // --- 2a. the override picker: does its "Auto" tell the truth? (#330) --------------------------
  //
  // #330's repro: pick a step, then Auto again. The defect was that the Auto baseline came from the LIVE
  // resolved role — which already reflects the override — so Auto named the user's own pick and then landed
  // on a different value when chosen. On Color › Interactive (UI redesign S5.2) a row names its Auto only
  // while it is on Auto (an override reads "Override · …"), so the claim is the round trip: Auto names a
  // step, a pick moves the color and says Override, and Return to Auto lands on exactly the color and the
  // words the row showed before.
  //
  // The row is found by its ROLE, not by index: `interactive.primary.text.rest`.
  await gotoInteractive(page);
  const ROLE = 'interactive.primary.text.rest';
  const before = await readIRow(page, ROLE);
  ok(before !== null, `${brand}: the ${ROLE} row is present`);
  ok(/^Auto · \S+ \S+/.test(before?.label ?? ''), `${brand}: the row starts on Auto and names its step ("${before?.label}")`);
  // The step to pick has to be one that MOVES the resolved color — an override that happens to land on the
  // baseline would leave every reading below identical and pass this whole section on a defect.
  const stepsOffered = await (async () => {
    let s = [];
    await withPicker(page, ROLE, async (pk) => { s = await pk.locator('[data-p3="step-picker-step"]').evaluateAll((ns) => ns.map((n) => n.dataset.step)); });
    return s;
  })();
  let pick = null, during = null;
  for (const step of stepsOffered) {
    await withPicker(page, ROLE, (pk) => hooks.click(pk.locator(`[data-p3="step-picker-step"][data-step="${step}"]`)));
    during = await readIRow(page, ROLE);
    if (during?.swatch !== before?.swatch) { pick = step; break; }
  }
  ok(pick !== null, `${brand}: some step in the picker moves the resolved color (picked '${pick}')`);
  ok(new RegExp(`^Override · \\S+ ${pick}\\b`).test(during?.label ?? ''), `${brand}: picking '${pick}' sets the override and says so ("${during?.label}")`);
  // THE #330 ASSERTION: Auto produces the value its own words promised.
  await withPicker(page, ROLE, (pk) => hooks.click(pk.locator('[data-p3="step-picker-auto"]')));
  const after = await readIRow(page, ROLE);
  ok(after?.swatch === before?.swatch, `${brand}: Return to Auto returns the color the Auto label named (was ${before?.swatch}, now ${after?.swatch}) (#330)`);
  ok(after?.label === before?.label, `${brand}: the Auto label is unchanged after the round trip ("${before?.label}" → "${after?.label}") (#330)`);

  // --- 2a-ii. the overlay wash is presented as a wash, not as a ramp step (#1210) ---------------
  //
  // #1210 part 2 was two untruths in the same row, both from treating a TRANSLUCENT role as an opaque one:
  //   (a) the row offered a step of the NEUTRAL RAMP and labelled it "Auto · neutral 10". The primitive is
  //       `<ns>.black-alpha.10` — the neutral ramp has no step 10 to be — and a pick wrote an opaque ramp step
  //       that still rendered at 10%;
  //   (b) the swatch painted the `rgba()` with no underlay, over whatever chrome sat behind it.
  // BOTH MODES ARE DRIVEN, and that is the assertion: the wash flips polarity with the page (`black-alpha` on
  // a light page, `white-alpha` on a dark one), so an underlay pinned to one colour is wrong in one of the
  // two. The derived modes are read-only (their rows are disabled), so the customizable pair is the population.
  //
  // (c), #812, moved with the specimen (UI redesign S5.2: the levers edit, the preview shows): the preview's
  // Outline row draws each column's HOVER pair, `interactive.<c>.text.hover` over the hover wash, the pair a
  // Button binds as `outline.label.hover` over `outline.overlay.hover`, and that pair must clear the ink's
  // own contract. The ratio is computed here from what is drawn.
  const washModes = (await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode))).filter((m) => /^(light|dark)$/.test(m));
  ok(washModes.length === 2, `${brand}: the Interactive page offers both customizable modes (${washModes.join(', ')})`);
  const washEmission = await loadEmission(brand);
  for (const mode of washModes) {
    await chooseMode(page, mode);
    const dark = mode === 'dark';
    const expectPal = dark ? OVERLAY_PAL.dark : OVERLAY_PAL.light;
    const ground = washEmission?.role('background.primary', mode)?.hex;
    const rows = await page.evaluate(READ_OVERLAY_ROWS);
    // Named, not counted: three built-in action palettes each carry an overlay row under `overlay-neutral`.
    ok(rows.length >= 3, `${brand} / ${mode}: the Interactive page renders ${rows.length} overlay-wash row(s) to judge (floor 3)`);
    for (const row of rows) {
      const where = `${brand} / ${mode} / ${row.role}`;
      const readSeen = { seen: row.text !== null, state: "this row's read-out" };
      hooks.absent(ok, readSeen, row.pickers === 0,
        `${where}: the row offers no ramp-step picker — a step of the neutral ramp is opaque and would replace the wash, not retint it (#1210a)`);
      ok(row.text === `${expectPal} ${OVERLAY_STEPS.hover}`, `${where}: the read-out says "${expectPal} ${OVERLAY_STEPS.hover}", the primitive the engine minted — got "${row.text}" (#1210a)`);
      hooks.absent(ok, readSeen, !/\bneutral\s+\d+\b/.test(row.text ?? ''), `${where}: the read-out does not present the wash as a step of the neutral ramp — got "${row.text}" (#1210a)`);
      ok(row.swatch?.hasWashLayer === true, `${where}: the swatch paints the wash as a translucent LAYER (alpha ${row.swatch?.washAlpha}) rather than as its opaque base (#1210b)`);
      ok(row.swatch?.underOpaque === true, `${where}: the swatch layer sits on an opaque underlay (${row.swatch?.underColor}) instead of on whatever chrome is behind it (#1210b)`);
      ok(rgbHex(row.swatch?.underColor) === ground, `${where}: the swatch's underlay is the ground the wash is measured on, the emitted background.primary ${ground} (drew ${row.swatch?.underColor})`);
      ok((row.swatch?.deltaLum ?? 0) > 0.005, `${where}: the composited wash is visible against that ground (Δluminance ${row.swatch?.deltaLum?.toFixed(4)}) — a wash pinned to the wrong polarity's ground would read 0`);
      ok(row.states.length === 1 && row.states[0].role === row.role.replace(/\.hover$/, '.pressed'), `${where}: its Pressed row sits under it (${row.states.map((s) => s.role).join(', ')})`);
      for (const st of row.states) {
        hooks.absent(ok, { seen: st.text !== null, state: 'the Pressed row\'s read-out' }, st.pickers === 0, `${where} / Pressed: offers no ramp-step picker (#1210a)`);
        ok(st.text === `${expectPal} ${OVERLAY_STEPS.pressed ?? '?'}`, `${where} / Pressed: reads "${expectPal} ${OVERLAY_STEPS.pressed}" — got "${st.text}" (#1210a)`);
        ok(st.swatch?.hasWashLayer === true && st.swatch?.underOpaque === true, `${where} / Pressed: the swatch paints the wash as a layer on an opaque underlay (#1210b)`);
        ok((st.swatch?.deltaLum ?? 0) > 0.005, `${where} / Pressed: the composited wash is visible against that ground (Δluminance ${st.swatch?.deltaLum?.toFixed(4)})`);
      }
      // (c) — the preview's Outline row inks the Button's hover pair, and that pair clears its contract (#812).
      const fam = /^interactive\.([a-z0-9-]+)\.overlay\.hover$/.exec(row.role)?.[1];
      const name = fam ? fam.charAt(0).toUpperCase() + fam.slice(1) : '?';
      const drawnRow = await page.evaluate(READ_OUTLINE, name);
      const hov = drawnRow[1];
      const want = fam && washEmission ? washEmission.role(`interactive.${fam}.text.hover`, mode) : null;
      const ink = parseRgb(hov?.ink), wash = parseRgb(hov?.bg);
      const drawn = ink && wash && ground ? wcag(ink, over(wash, hexRgb(ground))) : null;
      ok(want !== null && hexOf(ink) === want.hex, `${where}: the preview's Outline hover inks the Button's hover pair — ${hexOf(ink)}, emitted interactive.${fam}.text.hover ${want?.hex ?? 'unresolved'} (#812)`);
      ok(drawn !== null && typeof want?.min === 'number' && drawn >= want.min, `${where}: the hover pair as drawn clears text.hover's own contract — ${drawn?.toFixed(2)}:1 against ${want?.min}:1 (#812)`);
      washRowsSeen++;
      washPolarities.add(expectPal);
    }
  }
  await chooseMode(page, 'light');

  // --- 2b. (#485, a select jumping the page while scrolled) RETIRED with the legacy tier, S8.3 -------------------------
  // #485 lived in `applyFull()` → `renderWorkspace()`'s teardown of the legacy workspace; the two panes never run it. The
  // hold S8.2 left here is now section 1's: every place, in every mode, on every brand, asserts that no legacy page is drawn.

  // --- 2c. the export actually writes a file ----------------------------------------------------
  // The dialog rendering is #723's suite; what only a browser can check is that clicking Download
  // produces a real file whose bytes parse.
  //
  // #1830 — the Export button used to be FOUND by its accessible name, which asserted that name for free.
  // F1 moved the lookup to its hook, so the name is asserted here instead, by what the accessibility tree
  // computes. `renderBar` sets it on purpose as the button's stable name once the narrow bar hides the word;
  // without it the wide bar's name is "↓ Export" and the narrow bar's is "↓", and neither matches exactly.
  const exportNamed = await page.getByRole('button', { name: 'Export', exact: true })
    .evaluateAll((ns) => ns.map((n) => n.getAttribute('data-p3')));
  ok(exportNamed.length === 1 && exportNamed[0] === 'export-open',
    `${brand}: the Export button's accessible name is "Export" — buttons by that name: ${JSON.stringify(exportNamed)}`);
  await hooks.click(page.locator('[data-p3="export-open"]'));
  await hooks.need(page, '[data-p3="export-dialog"]');
  const pending = page.waitForEvent('download');
  await hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-confirm"]'));
  const dl = await pending;
  ok(dl.suggestedFilename().endsWith('.tokens.json'), `${brand}: the export downloads ${dl.suggestedFilename()}`);
  const body = await readFile(await dl.path(), 'utf8');
  let parsed = null;
  try { parsed = JSON.parse(body); } catch { /* reported by the assertion below */ }
  ok(parsed !== null && typeof parsed === 'object', `${brand}: the exported token file is valid JSON (${body.length} bytes)`);
  ok(parsed !== null && Object.keys(parsed).length > 0, `${brand}: the exported token tree is not empty`);

  // --- 2d. an engine throw from a NON-COLOR page is visible (#388 / #772) ------------------------
  //
  // #388's original defect path, driven. `lastError` was surfaced only by `renderPrimitives`' paint
  // closure, so a throw raised on Typography set the flag and showed nothing while the control went on
  // displaying the value the engine had refused. Every assertion here is on a page that is NOT the
  // Color page, which is the whole point — a check run on Palettes would have passed on the defect.
  //
  // THE REPRO (#2054, #2055, re-pointed a third time). S6.3 drove this through a display size set individually and
  // then the largest display size lowered below it. #2044 disabled that ceiling up front, and #2054 and #2055 did the
  // same for the 18px smallest title and the fluid switch, so the Type page has no control left that makes an edit the
  // engine refuses. The trigger is now the studio's test-only edit hook, `window.__prism3TestEdit`, defined only on web
  // and only when the page is opened with `?p3-test-hooks` (entry.ts, step 8). It writes one path and rebuilds, the
  // two steps a control's edit takes, so the engine's refusal and the bar that shows it are the real ones; only the
  // control is not. The precondition is a HAND-WRITTEN BRAND INPUT, stored the way the studio stores a brand: the
  // 16px title floor on, the Default scale, and title 2xs set individually at 16px. The engine takes that brand. The
  // hook then removes the title floor, which drops title 2xs while a size is still set on it, so the engine refuses
  // `typography.sizes.title.2xs` ("not enabled by titleFloor"). Undo is a real control: the 16px chip, which puts
  // the floor back.
  //
  // Brand-agnostic on purpose: the seed is written over whatever this context's brand is, and put back after.
  const stored0 = await page.evaluate(() => { try { return localStorage.getItem('prism3:brandInput'); } catch { return null; } });
  ok(!!stored0, `${brand}: the studio has stored this brand, so a hand-written one can be stored in its place`);
  const seed = JSON.parse(stored0);
  const ty0 = { ...(seed.input.typography ?? {}) };
  delete ty0.typeScale;   // Compact refuses the 16px title floor (B8b), so the seed is on the Default scale
  seed.input.typography = { ...ty0, titleFloor: 16, sizes: { ...(ty0.sizes ?? {}), title: { ...(ty0.sizes?.title ?? {}), '2xs': 16 } } };
  await page.evaluate((raw) => localStorage.setItem('prism3:brandInput', raw), JSON.stringify(seed));
  const plainUrl = page.url();
  const hookUrl = new URL(plainUrl); hookUrl.searchParams.set('p3-test-hooks', '');
  await page.goto(hookUrl.href);
  await gotoType(page);
  ok(await page.evaluate(() => typeof window.__prism3TestEdit === 'function'), `${brand}: the page opened with ?p3-test-hooks has the test edit hook`);
  ok((await page.locator('[data-p3="title-floor-16"]').getAttribute('aria-checked')) === 'true', `${brand}: the hand-written brand loads with the 16px smallest title`);
  ok((await page.locator('[data-p3="type-size-desktop"][data-group="title"][data-variant="2xs"]').getAttribute('data-set')) === 'true', `${brand}: the hand-written brand loads with title 2xs set individually`);

  const errState = () => page.evaluate(() => {
    const e = document.querySelector('[data-p3="error-bar"]');
    return { present: !!e, shown: !!e && getComputedStyle(e).display !== 'none', text: e?.textContent?.trim() ?? '' };
  });
  const clean = await errState();
  ok(clean.present && !clean.shown, `${brand}: the error surface is mounted and quiet before the refused edit`);

  await page.evaluate(() => window.__prism3TestEdit('typography.titleFloor', undefined));
  // Wait on the BAR, not on a timer — this condition is the assertion's subject, so a hang here fails
  // loudly as the defect it is rather than passing on a measurement taken too early.
  const surfaced = await page.waitForFunction(() => {
    const e = document.querySelector('[data-p3="error-bar"]');
    return !!e && getComputedStyle(e).display !== 'none';
  }, null, { timeout: 5000 }).then(() => true, () => false);
  ok(surfaced, `${brand}: an engine throw raised on Type SURFACES (#388's defect path)`);
  const raised = await errState();
  ok(/typography\.sizes\.title\.2xs/.test(raised.text), `${brand}: the bar names the field the engine refused — "${raised.text.slice(0, 90)}"`);

  // THE GENERALIZATION, not just the instance: the surface belongs to the view, so navigating to a
  // third page must not lose it. A page-local bar would vanish here, which is the state #388 described
  // from the other end — the error existing with nothing rendering it.
  // (Motion until UI redesign S9.2 moved it into Depth & motion's two panes: the third page is that one now.)
  await gotoDepth(page);
  const afterNav = await errState();
  ok(afterNav.shown, `${brand}: the error is still shown after navigating to Depth & motion — it belongs to the chrome, not to a page`);

  // Put it back, and check the bar CLEARS. A surface that only ever appears is half a surface, and the
  // rest of this context (and the console-error drain below) needs a resolved theme.
  await gotoType(page);
  await hooks.click(page.locator('[data-p3="title-floor-16"]'));
  const cleared = await page.waitForFunction(() => {
    const e = document.querySelector('[data-p3="error-bar"]');
    return !!e && getComputedStyle(e).display === 'none';
  }, null, { timeout: 5000 }).then(() => true, () => false);
  ok(cleared, `${brand}: undoing the refused edit clears the bar`);
  // Put this context's own brand back, so the sections below run on it.
  await page.evaluate((raw) => localStorage.setItem('prism3:brandInput', raw), stored0);
  await page.goto(plainUrl);
  await gotoType(page);
  ok(await page.evaluate(() => typeof window.__prism3TestEdit === 'undefined'), `${brand}: without ?p3-test-hooks the page has no test edit hook`);

  // --- 2e. the weight checkboxes refuse what the engine refuses (#1639, #1681) ----------------------
  // The engine refuses a category with no weight, and a label without `emphasis`. The studio's
  // category table must not offer either untick: the box is disabled, with the reason on hover. The
  // required pair (label → emphasis) is authored here, not read from the engine (docs/34). A swap the
  // owner allowed is driven too: tick a second eyebrow weight, then clear the first, with no error.
  // S6.3: the table is Weights and styles' matrix, one check per (text type, weight), locked with aria-disabled and
  // the reason in its title, the style count beside each text type.
  const weightRow = (cat) => page.evaluate((c) => [...document.querySelectorAll(`[data-p3="weights-row"][data-group="${c}"] [data-p3="weight-cell"]`)]
    .map((b) => ({ role: b.dataset.role, checked: b.getAttribute('aria-checked') === 'true', disabled: b.getAttribute('aria-disabled') === 'true', title: b.title ?? '' })), cat);
  // The row's style count is re-derived from the rebuilt theme, so it moves only once the matrix has
  // re-rendered: the wait is on the ENGINE's answer painting, not on the click. Read before clicking.
  const countOf = (cat) => page.evaluate((c) => document.querySelector(`[data-p3="weights-row"][data-group="${c}"] [data-p3="weights-count"]`)?.textContent, cat);
  const repainted = (cat, before) => page.waitForFunction(({ c, b }) => document.querySelector(`[data-p3="weights-row"][data-group="${c}"] [data-p3="weights-count"]`)?.textContent !== b, { c: cat, b: before });
  const boxIn = (cat, _row0, role) => page.locator(`[data-p3="weights-row"][data-group="${cat}"] [data-p3="weight-cell"][data-role="${role}"]`);
  // Give label a SECOND weight first, so the last-weight rule cannot be what holds `emphasis`: only
  // the label rule can, and the box must say why.
  const label0 = await weightRow('label');
  const labelExtra = label0.find((b) => !b.checked && b.role !== 'emphasis');
  if (labelExtra) {
    const before = await countOf('label');
    await hooks.click(boxIn('label', label0, labelExtra.role));
    await repainted('label', before);
  }
  const label1 = await weightRow('label');
  const labelEmphasis = label1.find((b) => b.role === 'emphasis');
  ok(label1.filter((b) => b.checked).length >= 2 && !!labelEmphasis && labelEmphasis.checked && labelEmphasis.disabled && /button/.test(labelEmphasis.title),
    `${brand}: with two label weights ticked, label's emphasis box is still disabled, and says the button uses it (${JSON.stringify(label1.filter((b) => b.checked))})`);
  // #1681: body and caption keep `default` the same way, for the form controls. The control each
  // tooltip must name is authored here (docs/34), not read from the engine's `why`. As with label, a
  // second weight is ticked first when the row has only one, so the last-weight rule can't be what
  // holds the box.
  for (const [cat, control] of [['body', /text field/], ['caption', /field message/]]) {
    const row0 = await weightRow(cat);
    if (row0.filter((b) => b.checked).length < 2) {
      const extra = row0.find((b) => !b.checked && b.role !== 'default');
      if (extra) {
        const before = await countOf(cat);
        await hooks.click(boxIn(cat, row0, extra.role));
        await repainted(cat, before);
      }
    }
    const row1 = await weightRow(cat);
    const def = row1.find((b) => b.role === 'default');
    ok(row1.filter((b) => b.checked).length >= 2 && !!def && def.checked && def.disabled && control.test(def.title),
      `${brand}: with two ${cat} weights ticked, ${cat}'s default box is still disabled, and names the ${control.source} (${JSON.stringify(row1.filter((b) => b.checked))})`);
  }
  const eyebrow0 = await weightRow('eyebrow');
  const eyebrowOn = eyebrow0.filter((b) => b.checked);
  ok(eyebrowOn.length === 1 && eyebrowOn[0].disabled,
    `${brand}: eyebrow's only weight is disabled — a category keeps at least one (${eyebrowOn.map((b) => `${b.role}${b.disabled ? ' disabled' : ''}`).join(', ')})`);
  const other = eyebrow0.find((b) => !b.checked);
  if (eyebrowOn.length === 1 && other) {
    const count1 = await countOf('eyebrow');
    await hooks.click(boxIn('eyebrow', eyebrow0, other.role));
    await repainted('eyebrow', count1);
    const two = await weightRow('eyebrow');
    ok(two.filter((b) => b.checked).every((b) => !b.disabled),
      `${brand}: with two eyebrow weights ticked, either can be cleared (${JSON.stringify(two.filter((b) => b.checked))})`);
    const count2 = await countOf('eyebrow');
    await hooks.click(boxIn('eyebrow', eyebrow0, eyebrowOn[0].role));
    await repainted('eyebrow', count2);
    const swapped = await weightRow('eyebrow');
    const swapErr = await errState();
    ok(swapped.find((b) => b.checked)?.role === other.role && swapErr.present && !swapErr.shown,
      `${brand}: eyebrow swaps ${eyebrowOn[0].role} → ${other.role} with no engine error (${swapErr.text.slice(0, 90)})`);
  }

  // --- 2f. the Italic default column says what the engine EMITTED (#1296) ----------------------------
  // ORACLE: the brand's committed token tree — a category is italic by default when EVERY composite
  // under `type.<cat>` carries `$value.fontStyle: 'italic'` and none carries the `-italic` modifier
  // name. Read from the emission, never from the studio (docs/34 shape 1). ACTUAL: the column's boxes,
  // and the exclusivity the engine enforces — an italic-default category's Italic box is disabled.
  {
    const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
    const typeNode = tree[Object.keys(tree)[0]].type ?? {};
    const leavesOf = (n, out = []) => { for (const [k, v] of Object.entries(n)) { if (k.startsWith('$')) continue; if (v && v.$type === 'typography') out.push([k, v]); else if (v && typeof v === 'object') leavesOf(v, out); } return out; };
    const expected = Object.entries(typeNode).filter(([, n]) => {
      const leaves = leavesOf(n);
      return leaves.length > 0 && leaves.every(([k, v]) => v.$value?.fontStyle === 'italic' && !/-italic/.test(k));
    }).map(([cat]) => cat).sort();
    // S6.3: the italic styles are a 3-chip per text type (owner decision Q6); "Italic only" is the italic default.
    const shown = await page.evaluate(() => [...document.querySelectorAll('[data-p3="italic-row"]')].map((r) => ({
      cat: r.dataset.group, idOn: r.querySelector('[data-p3="italic-choice-only"]')?.getAttribute('aria-checked') === 'true',
      checked: r.querySelectorAll('[role="radio"][aria-checked="true"]').length, found: !!r.querySelector('[data-p3="italic-choice-only"]') && !!r.querySelector('[data-p3="italic-choice-both"]'),
      iDisabled: r.querySelector('[data-p3="italic-choice-both"]')?.getAttribute('aria-checked') !== 'true',
    })));
    const shownOn = shown.filter((r) => r.idOn).map((r) => r.cat).sort();
    ok(shown.length > 0 && shown.every((r) => r.found) && JSON.stringify(shownOn) === JSON.stringify(expected),
      `${brand}: "Italic only" is on for exactly the text types the emission sets italic [${expected.join(', ') || 'none'}] (shows [${shownOn.join(', ') || 'none'}])`);
    ok(shown.every((r) => r.checked === 1) && shown.filter((r) => r.idOn).every((r) => r.iDisabled),
      `${brand}: each text type has exactly one italic chip on, so Italic only and Upright + italic never both hold — the engine refuses both (${shown.map((r) => `${r.cat}:${r.checked}`).join(', ')})`);
  }

  const errs = drain();
  ok(errs.length === 0, `${brand}: driving the controls raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// The wash section's own "did it look?" floors (#1210), asserted over the sweep rather than per brand —
// same reasoning as the totals at the end of section 1. The ROW count catches a page that stopped
// rendering the row; the POLARITY count catches the sharper regression, a run that saw only one page
// family and therefore never exercised the flip the derived underlay exists for. Measured: 12 rows
// (2 brands × 2 customizable modes × 3 action palettes) in 2 polarities.
ok(washRowsSeen >= 12,
  `the wash section judged ${washRowsSeen} overlay row(s) (floor 12 = 2 brands × 2 customizable modes × 3 action palettes)`);
ok(washPolarities.size === 2,
  `the wash section saw both page polarities (${[...washPolarities].sort().join(', ')}) — one alone would pass a pinned underlay`);

// =============================================================================================
// 3. Displayed values against the resolved theme — #800, the first instance of #802
// =============================================================================================
/**
 * WHAT THIS ASSERTS, AND THE LIMIT ON IT — read the limit first (#802, #799's posture on
 * `lint-shape-index`'s arm B: a gate whose limits are undocumented gets trusted past them).
 *
 * It covers values rendered AS TEXT. A spacing token rendered as a swatch's *width* is geometry
 * wearing a value's clothes, and a text comparison passes it — as does a radius shown as a corner,
 * an elevation as a shadow, a duration as an animation. A green run establishes *"every value
 * displayed as text matches the resolved theme"*, not *"every displayed value is correct."*
 *
 * WHY IT EXISTS. Every other gate in this repo checks that a thing EXISTS, a reference RESOLVES, a
 * count MATCHES, nothing THREW, or contrast CLEARS. None of them asserts that a number a human can
 * read equals the number the engine computed. #800 lived in that gap for as long as the page has
 * existed: legible, silent, structurally complete, contrast-clean, and showing the previous tempo's
 * six durations.
 *
 * THE ORACLE, WHICH IS THE WHOLE DESIGN. EXPECTED is derived from the engine's INPUT by this file's
 * own walk — `DURATION_BASE` and `TEMPO_FACTOR`, read out of `packages/engine/theme.ts`, multiplied
 * and rounded here. It is NOT obtained by asking the studio what it resolved. Reading EXPECTED from
 * the renderer's own resolution and ACTUAL from the renderer's output is `docs/34` shape 1 with
 * extra steps: both sides come from the subject, so it would have passed on #800 with the defect
 * fully present and reported that as coverage. This is exactly what `lint-overlay-completeness.ts`
 * gets right by deriving from the projector's input rather than re-running it, and the two walks
 * below are DELIBERATELY DUPLICATED — the duplication is the gate, not redundancy to DRY away.
 *
 * Parsed from the source rather than hand-copied here so the duplication cannot go stale silently:
 * rename or retype either constant and this fails by name instead of asserting yesterday's ladder.
 *
 * WHERE ACTUAL COMES FROM, AND WHY NOT THE STAGED TREE. #802's decision names #791's staged detached
 * tree as the studio's pre-layout artifact. That was reasoned from the hypothesis that #800 was a
 * painter holding a stale theme reference — and measurement falsified it. The staged tree is built
 * inside `renderWorkspace` and is CORRECT every time; the defect was that a tempo edit never reached
 * `renderWorkspace` at all, so nothing replaced the live section. A staged-tree read would have
 * reported green with the defect fully present. So ACTUAL is read from the LIVE DOM, which costs
 * nothing the decision was trying to avoid: text needs no layout either way.
 *
 * READ WITHOUT TAGGING (#817). Nothing here writes to the subject. `outerHTML` IS #791's region
 * signature, so a marker added to correlate a row with a token path would change the keep decision —
 * altering the behavior being checked, silently and in the direction of looking fine. The rows are
 * correlated by the `motion.duration.<step>` token pill the renderer ALREADY prints in them.
 *
 * NARROW ON PURPOSE. One page, one section, one lever. The general cross-tier gate is #802's
 * decision 2 and its own piece of work; this is built in that shape so it seeds it.
 *
 * MOVED IN UI REDESIGN S9.2 to Depth & motion's two panes, its oracle unchanged. The tempo control is the levers kit's
 * chips (`button[role="radio"]`), and the durations are the preview's Durations block (`section-duration-ramp`). It now
 * also drives Dark (owner decision Q22; #1854's tempo half): previewing Dark, each tempo chip writes
 * `modeLevers.dark.tempo` and never the brand value, read back from the PERSISTED brand, and the durations shown are
 * that tempo's; Return to Auto clears it, and the durations follow Light's tempo again. The trap #800 named, a tempo
 * edit that leaves the read-only durations stale, cannot recur by construction there (the preview repaints from the
 * store), and this still drives it, between commits, with no navigation in between.
 */
console.log(`\nDisplayed values vs the resolved theme (#800)\n${'='.repeat(78)}`);

const ENGINE_THEME = join(ROOT, '..', '..', 'packages', 'engine', 'theme.ts');
/** The gate's own read of the engine's authored input. Throws rather than degrading: an oracle that
 *  quietly falls back to a default is an oracle that agrees with anything. */
const constFromEngine = (src, name) => {
  const m = new RegExp(`const ${name}[^=]*=\\s*\\{([^}]*)\\}`).exec(src);
  if (!m) throw new Error(`${name} not found in packages/engine/theme.ts — this suite's oracle reads it from there`);
  const out = {};
  for (const part of m[1].split(',')) {
    const kv = /^\s*([A-Za-z_][\w]*)\s*:\s*([0-9.]+)\s*$/.exec(part.replace(/\/\/.*$/, ''));
    if (kv) out[kv[1]] = Number(kv[2]);
  }
  if (!Object.keys(out).length) throw new Error(`${name} parsed to an empty object — the oracle would assert nothing`);
  return out;
};
const engineSrc = await readFile(ENGINE_THEME, 'utf8');
const DURATION_BASE = constFromEngine(engineSrc, 'DURATION_BASE');
const TEMPO_FACTOR = constFromEngine(engineSrc, 'TEMPO_FACTOR');
ok(Object.keys(DURATION_BASE).length >= 6, `the oracle read ${Object.keys(DURATION_BASE).length} base durations from packages/engine/theme.ts`);
ok(Object.keys(TEMPO_FACTOR).length >= 3, `the oracle read ${Object.keys(TEMPO_FACTOR).length} tempo factors from packages/engine/theme.ts`);
// The engine's own rounding rule, restated here — the second of the two duplicated walks.
const expectedRamp = (tempo) => Object.fromEntries(
  Object.entries(DURATION_BASE).map(([k, v]) => [k, `${Math.round((v * TEMPO_FACTOR[tempo]) / 5) * 5}ms`]));

/** ACTUAL — the durations as a reader sees them, in the Depth & motion preview. Rows keyed by the token path already
 *  printed in them, so nothing is added to the DOM to identify them. */
const READ_DURATION_RAMP = () => {
  const sec = document.querySelector('[data-p3="preview-body"] [data-p3="section-duration-ramp"]');
  if (!sec) return null;
  const rows = {};
  for (const tr of sec.querySelectorAll('table tr')) {
    const cells = [...tr.children];
    if (cells.length < 2) continue;
    const pill = [...cells[0].querySelectorAll('*')]
      .find((n) => /^motion\.duration\.[a-z]+$/.test(n.textContent.trim()));
    if (!pill) continue;
    rows[pill.textContent.trim().split('.').pop()] = cells[1].textContent.trim();
  }
  return { rows };
};

/** Wait for the chip `want` to be the checked one in the group at `sel`, as a condition with a bound
 *  rather than a hang: a chip whose write went to another option is re-rendered with THAT option
 *  checked, and the caller reports it by name instead of timing out (#1675). Legacy radios and the levers kit's
 *  `button[role="radio"]` chips alike. */
const waitChecked = (page, sel, want) => page.waitForFunction(([s, w]) => (document.querySelector(`${s} input:checked`)?.value ?? document.querySelector(`${s} [role="radio"][aria-checked="true"]`)?.dataset.value) === w, [sel, want], { timeout: 5000 })
  .then(() => true, () => false);
/** The brand as persisted, whole (`localStorage`, a store no control paints). */
const persistedBrand = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('prism3:brandInput'))?.input ?? null; } catch { return null; } });
/** The persisted brand, as stored: the bytes the Auto-chip rule (#2078) holds unchanged. */
const persistedRaw = (page) => page.evaluate(() => { try { return localStorage.getItem('prism3:brandInput'); } catch { return null; } });
/** THE AUTO-CHIP RULE (owner-decided, 2026-10-04; one rule for S7's density and S9.2's tempo, #2078). Previewing a
 *  mode on Auto, the checked chip is Light's value, the one the mode already follows; choosing it writes nothing, so a
 *  mode never pins Light's own value while it follows it. `chip` is that chip; a write, if one comes, lands within a
 *  repaint, so the wait ends at the first change and only an unchanged store waits it out. */
const autoChipWritesNothing = async (page, chip) => {
  const before = await persistedRaw(page);
  await hooks.click(chip);
  await page.waitForFunction((was) => { try { return localStorage.getItem('prism3:brandInput') !== was; } catch { return false; } }, before, { timeout: 1500 }).catch(() => {});
  const after = await persistedRaw(page);
  let dark = null;
  try { dark = JSON.parse(after)?.input?.modeLevers?.dark ?? null; } catch { /* reported below as changed */ }
  return { same: before !== null && after === before, dark };
};

const TEMPO = '[data-p3="lever-motion-personality-tempo"]';
/** Each tempo's label, read from the committed `schema/lever-manifest.json` (the oracle for what Auto names). */
const TEMPO_LABELS = Object.fromEntries((JSON.parse(await readFile(join(ROOT, '..', '..', 'packages', 'engine', 'schema', 'lever-manifest.json'), 'utf8'))
  .levers.find((l) => l.key === 'motionPersonality.tempo')?.options ?? []).map((o) => [String(o.value), o.label]));
const LEVER_TEMPO_LABEL = (v) => TEMPO_LABELS[v] ?? v;
let rampChecks = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await gotoDepth(page);
  const options = await page.locator(`${TEMPO} [role="radio"]`).evaluateAll((os) => os.map((o) => o.dataset.value));
  ok(options.length >= 2, `${brand}: the Tempo control offers ${options.length} tempi`);
  const checkShown = async (where, tempo) => {
    const shown = await page.evaluate(READ_DURATION_RAMP);
    if (!shown) { ok(false, `${where}: the Durations block is on the page`); return; }
    const want = expectedRamp(tempo);
    const wrong = Object.entries(want).filter(([k, v]) => shown.rows[k] !== v);
    ok(Object.keys(shown.rows).length === Object.keys(want).length,
      `${where}: the durations show ${Object.keys(shown.rows).length} of ${Object.keys(want).length} semantic durations`);
    ok(wrong.length === 0, `#800: ${where}: every displayed duration is tempo '${tempo}''s${
      wrong.length ? ` — ${wrong.map(([k, v]) => `${k} shows ${shown.rows[k] ?? '(absent)'}, resolves to ${v}`).join('; ')}` : ''}`);
    rampChecks += Object.keys(want).length;
  };

  // NO NAVIGATION INSIDE THESE LOOPS. Leaving the page and coming back re-renders it and would cure
  // the very staleness being asserted — the defect is only visible between commits.
  await chooseMode(page, 'light');
  for (const tempo of options) {
    await hooks.click(page.locator(`${TEMPO} [role="radio"][data-value="${tempo}"]`));
    const held = await waitChecked(page, TEMPO, tempo);
    ok(held, `${brand}/${tempo}: the tempo chip clicked is the one checked once the page has repainted`);
    if (!held) continue;
    ok((await persistedBrand(page))?.motionPersonality?.tempo === tempo || ((await persistedBrand(page))?.motionPersonality?.tempo === undefined && tempo === 'standard'),
      `${brand}/${tempo}: previewing Light, the chip writes motionPersonality.tempo (persisted ${JSON.stringify((await persistedBrand(page))?.motionPersonality?.tempo)})`);
    await checkShown(`${brand}/${tempo}`, tempo);
  }
  // Light's tempo, left at the last option: Dark's Auto follows it.
  const lightTempo = options[options.length - 1];
  const modes = await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode));
  if (modes.includes('dark')) {
    await chooseMode(page, 'dark');
    const brandBefore = (await persistedBrand(page))?.motionPersonality?.tempo;
    for (const tempo of options.filter((t) => t !== lightTempo)) {
      await hooks.click(page.locator(`${TEMPO} [role="radio"][data-value="${tempo}"]`));
      const held = await waitChecked(page, TEMPO, tempo);
      const b = await persistedBrand(page);
      ok(held && b?.modeLevers?.dark?.tempo === tempo && b?.motionPersonality?.tempo === brandBefore,
        `#1854 (Q22): ${brand}: previewing Dark, a tempo edit writes modeLevers.dark.tempo and not the brand value — chose ${tempo}, persisted dark ${JSON.stringify(b?.modeLevers?.dark?.tempo)}, brand ${JSON.stringify(b?.motionPersonality?.tempo)} (was ${JSON.stringify(brandBefore)})`);
      await checkShown(`${brand}/Dark/${tempo}`, tempo);
    }
    await hooks.click(page.locator('[data-p3="tempo-reset"]'));
    await waitChecked(page, TEMPO, lightTempo);
    const b = await persistedBrand(page);
    ok(b?.modeLevers?.dark?.tempo === undefined && b?.motionPersonality?.tempo === brandBefore,
      `#1854 (Q22): ${brand}: previewing Dark, Return to Auto clears modeLevers.dark.tempo (persisted ${JSON.stringify(b?.modeLevers?.dark ?? null)})`);
    const autoLine = await page.evaluate(() => document.querySelector('[data-p3="tempo-auto"]:not([hidden])')?.textContent ?? null);
    const label = LEVER_TEMPO_LABEL(lightTempo);
    ok(autoLine === `Auto: follows Light (${label})`, `Q22: ${brand}: previewing Dark under Auto, the tempo says "Auto: follows Light (${label})" (says ${JSON.stringify(autoLine)})`);
    await checkShown(`${brand}/Dark/Auto`, lightTempo);
    // The Auto-chip rule (#2078): on Auto, Light's tempo chip is the checked one; choosing it writes nothing.
    const onAuto = (await persistedBrand(page))?.modeLevers?.dark?.tempo === undefined && await waitChecked(page, TEMPO, lightTempo);
    const t = await autoChipWritesNothing(page, page.locator(`${TEMPO} [role="radio"][data-value="${lightTempo}"]`));
    ok(onAuto && t.same, `Auto chip (#2078): ${brand}: previewing Dark on Auto, choosing the tempo chip Dark already follows (Light's ${lightTempo}) writes nothing — prism3:brandInput ${!onAuto ? 'was not on Auto first' : t.same ? 'byte-identical' : `changed, modeLevers.dark ${JSON.stringify(t.dark)}`}`);
    await chooseMode(page, 'light');
  }

  const errs = drain();
  ok(errs.length === 0, `${brand}: driving the tempo raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}
// The "did it look?" floor, same discipline as SWEEP_NODE_FLOOR above: a comparison over an empty
// set is true, and would print as coverage.
ok(rampChecks >= 2 * 5 * 6, `${rampChecks} displayed durations compared against the resolved theme (floor: 2 brands × 3 Light and 2 Dark tempi × 6)`);

// =============================================================================================
// 3b. Lever chips — the 2-4-option enum levers as native radio groups (#1675): RETIRED in UI redesign S8.2
// =============================================================================================
// WHAT THIS HELD. #1675 turned every enum lever with 2-4 options and no Auto entry from a select into a row of native
// radio chips on the legacy pages. One by one the domain slices moved those levers to the levers kit's chips (Interactive
// in S5.2, Tempo in S9.2, Density and Control shape in S7), each held in its own section below, and S8.2 moved the last
// three, the Button options, off the legacy Size & radius page to Components (section 3e). No legacy radio chip is left
// on the web, so this section has no subject. Its oracle and its write read-back are kept for the sections below: the
// committed `schema/lever-manifest.json` (labels and options), and the persisted brand in `localStorage`.
console.log(`\nLever chips (#1675): the legacy radio groups retired with their last page (S8.2)\n${'='.repeat(78)}`);

const LEVER_MANIFEST = JSON.parse(await readFile(join(ROOT, '..', '..', 'packages', 'engine', 'schema', 'lever-manifest.json'), 'utf8'));
const leverOf = (key) => LEVER_MANIFEST.levers.find((l) => l.key === key);
const persistedAt = (page, key) => page.evaluate((k) => {
  try { const o = JSON.parse(localStorage.getItem('prism3:brandInput')); return k.split('.').reduce((n, s) => n?.[s], o?.input) ?? null; } catch { return null; }
}, key);

// =============================================================================================
// 3c. Lever chips on Color › Interactive — the new markup (UI redesign S5.2)
// =============================================================================================
// The page's enum levers draw as the levers kit's chips: a `fieldset` whose `legend` names the lever, holding
// a radio group of `button[role="radio"]` (not radios in labels). Held here as #1675 held the legacy chips: the
// manifest's options and labels (oracle: the committed `schema/lever-manifest.json`), exactly one checked and
// it is the brand's stored value (read from the persisted brand, a store the chip does not paint), a click
// writes, ArrowRight writes the next, each chip a >= 24px target, and at 380 the chips stay inside the panel.
// The reduced disabled floor is four chips, 3, 3.5, 4 and 4.5 (owner decision Q37), drawn only while the Full
// contrast switch is off (S5.3, the owner's QA-I8). Since S5.3 the disabled contrast is that switch, not chips, and
// the icon contrast chips left the page (QA-I10), so two enum levers are chips here.
console.log(`\nLever chips on Color › Interactive (S5.2)\n${'='.repeat(78)}`);
const INTERACTIVE_CHIPS = [
  { key: 'outlineInteraction', group: '[data-p3="lever-outline-interaction"]' },
  { key: 'neutralEmphasis', group: '[data-p3="lever-neutral-emphasis"]' },
];
const DISABLED_MIN_CHIPS = [['3', '3:1'], ['3.5', '3.5:1'], ['4', '4:1'], ['4.5', '4.5:1']];
const readNewChips = (sel) => {
  const all = document.querySelectorAll(sel);
  const fs = all[0];
  if (!fs) return { found: 0 };
  const radios = [...fs.querySelectorAll('button[role="radio"]')];
  return {
    found: all.length, tag: fs.tagName, legend: fs.querySelector(':scope > legend .p3-lever-name')?.textContent?.trim() ?? null,
    group: fs.querySelector('[role="radiogroup"]')?.getAttribute('aria-label') ?? null,
    values: radios.map((r) => r.dataset.value), labels: radios.map((r) => r.textContent.trim()),
    checked: radios.filter((r) => r.getAttribute('aria-checked') === 'true').map((r) => r.dataset.value),
    disabled: radios.map((r) => r.disabled),
    small: radios.map((r) => r.getBoundingClientRect()).filter((b) => b.width < 24 || b.height < 24).length,
  };
};
{
  const brand = BRANDS[0];
  const { ctx, page, drain } = await openBrand(brand);
  await gotoInteractive(page);
  for (const c of INTERACTIVE_CHIPS) {
    const lever = leverOf(c.key);
    const where = `${brand} / Interactive / ${c.key}`;
    const g = await page.evaluate(readNewChips, c.group);
    if (!g.found) { ok(false, `${where}: renders a chip group`); continue; }
    ok(g.found === 1 && g.tag === 'FIELDSET' && g.legend === lever.label && g.group === lever.label, `${where}: one fieldset whose legend and radio group name the lever ("${g.legend}", "${g.group}", want "${lever.label}")`);
    ok(JSON.stringify(g.values) === JSON.stringify(lever.options.map((o) => String(o.value))) && JSON.stringify(g.labels) === JSON.stringify(lever.options.map((o) => o.label)),
      `${where}: offers the manifest's ${lever.options.length} options with its labels (${g.labels.join(', ')})`);
    const stored = (await persistedAt(page, c.key)) ?? lever.default;
    ok(g.checked.length === 1 && g.checked[0] === String(stored), `${where}: exactly one chip is checked, the brand's value (${g.checked.join(', ') || 'none'}, stored ${stored})`);
    ok(g.small === 0, `${where}: every chip is a >= 24px hit target (${g.small} smaller)`);
    for (const o of lever.options) {
      const v = String(o.value);
      if ((await page.evaluate(readNewChips, c.group)).checked[0] === v) continue;
      await hooks.click(page.locator(`${c.group} button[role="radio"]`).filter({ hasText: o.label }).first());
      await page.waitForFunction(([s, w]) => document.querySelector(`${s} button[aria-checked="true"]`)?.dataset.value === w, [c.group, v], { timeout: 5000 }).catch(() => {});
      ok(String(await persistedAt(page, c.key)) === v, `${where}: choosing "${o.label}" writes ${v} to the brand (wrote ${await persistedAt(page, c.key)})`);
    }
    const before = await page.evaluate(readNewChips, c.group);
    const next = before.values[(before.values.indexOf(before.checked[0]) + 1) % before.values.length];
    await page.locator(`${c.group} button[aria-checked="true"]`).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(([s, w]) => document.querySelector(`${s} button[aria-checked="true"]`)?.dataset.value === w, [c.group, next], { timeout: 5000 }).catch(() => {});
    ok(String(await persistedAt(page, c.key)) === next, `${where}: ArrowRight writes ${next} to the brand, and focus stays in the group (${await page.evaluate((s) => !!document.activeElement?.closest(s), c.group)})`);
  }
  // The reduced floor (Q37): four chips, written as numbers, drawn while the Full contrast switch is off (QA-I8),
  // and not drawn while it is on.
  const dm = '[data-p3="lever-disabled-min"]';
  const fullSwitch = '[data-p3="disabled-full-switch"]';
  const fullOn = () => page.evaluate((s) => document.querySelector(s)?.getAttribute('aria-checked'), fullSwitch);
  if (await fullOn() === 'true') await hooks.click(page.locator(fullSwitch));
  await page.waitForFunction((s) => !!document.querySelector(`${s} button`) && !document.querySelector(`${s} button`).disabled, dm, { timeout: 5000 }).catch(() => {});
  const r0 = await page.evaluate(readNewChips, dm);
  ok(JSON.stringify(r0.values) === JSON.stringify(DISABLED_MIN_CHIPS.map(([v]) => v)) && JSON.stringify(r0.labels) === JSON.stringify(DISABLED_MIN_CHIPS.map(([, l]) => l)) && r0.disabled.every((d) => !d),
    `${brand} / Interactive / disabledMin: under Reduced, four chips ${r0.labels.join(', ')}, all enabled (Q37)`);
  // Every chip, by value: the expectation is this literal list, never the subject's own chip set (docs/34),
  // so a chip that writes its neighbor's number fails here by name. Visited starting after the checked chip,
  // so every click is a change and must write.
  const FLOORS = [3, 3.5, 4, 4.5];
  const at = FLOORS.findIndex((f) => String(f) === r0.checked[0]);
  for (const f of [...FLOORS.slice(at + 1), ...FLOORS.slice(0, at + 1)]) {
    await hooks.click(page.locator(`${dm} button[role="radio"][data-value="${f}"]`));
    await page.waitForFunction(([s, w]) => document.querySelector(`${s} button[aria-checked="true"]`)?.dataset.value === w, [dm, String(f)], { timeout: 5000 }).catch(() => {});
    const wrote = await persistedAt(page, 'disabledMin');
    ok(wrote === f, `${brand} / Interactive / disabledMin: ${f}:1 writes the number ${f} (wrote ${JSON.stringify(wrote)})`);
  }
  await hooks.click(page.locator(fullSwitch));
  await page.waitForFunction((s) => !document.querySelector(s), dm, { timeout: 5000 }).catch(() => {});
  const r1 = await page.evaluate(readNewChips, dm);
  const on = await fullOn();
  hooks.absent(ok, { seen: on === 'true', state: 'the Full contrast switch, on' }, r1.found === 0,
    `${brand} / Interactive / disabledMin: under Full contrast the floor chips are not drawn (QA-I8) — ${r1.found} drawn, switch ${on}`);
  ok((await persistedAt(page, 'disabledStrategy')) === 'full', `${brand} / Interactive / disabledStrategy: the Full contrast switch on writes "full" (wrote ${JSON.stringify(await persistedAt(page, 'disabledStrategy'))})`);
  // At 380 the page's chips stay inside the panel (long labels wrap onto a second row). The frame's width tier
  // (`data-w`) is set by a ResizeObserver at the next rendering step, which can come after `setViewportSize`
  // resolves (#2095, the race #2090 fixed for Button options), so wait on the tier and require it: measured in the
  // wide tier, this check would be passing on the two-pane layout squeezed to 380, not the narrow one.
  await page.setViewportSize({ width: 380, height: 900 });
  await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.w === 'narrow', null, { timeout: 5000 }).catch(() => {});
  const { tier, over } = await page.evaluate(() => ({
    tier: document.querySelector('[data-p3="frame"]')?.dataset.w,
    over: [...document.querySelectorAll('[data-p3="interactive-levers"] [role="radiogroup"]')].map((g) => g.scrollWidth - g.clientWidth).filter((x) => x > 1).length,
  }));
  ok(tier === 'narrow' && over === 0, `${brand} / Interactive at 380: every chip group fits its panel (${over} overflow, frame tier ${tier})`);
  const errs = drain();
  ok(errs.length === 0, `${brand}: driving the Interactive chips raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// Tempo on Depth & motion (UI redesign S9.2), the same markup and the same contract: the legacy Motion page's chips
// (#1675's CHIP_LEVERS row) moved here with the page. Its radio group's name adds the mode it edits (Q22).
{
  const brand = BRANDS[0];
  const { ctx, page, drain } = await openBrand(brand);
  await gotoDepth(page);
  const c = { key: 'motionPersonality.tempo', group: '[data-p3="lever-motion-personality-tempo"]' };
  const lever = leverOf(c.key);
  const where = `${brand} / Depth & motion / ${c.key}`;
  const g = await page.evaluate(readNewChips, c.group);
  ok(g.found === 1 && g.tag === 'FIELDSET' && g.legend === lever.label && (g.group ?? '').startsWith(lever.label),
    `${where}: one fieldset whose legend and radio group name the lever ("${g.legend}", "${g.group}", want "${lever.label}")`);
  ok(JSON.stringify(g.values) === JSON.stringify(lever.options.map((o) => String(o.value))) && JSON.stringify(g.labels) === JSON.stringify(lever.options.map((o) => o.label)),
    `${where}: offers the manifest's ${lever.options.length} options with its labels (${(g.labels ?? []).join(', ')})`);
  const stored = (await persistedAt(page, c.key)) ?? lever.default;
  ok(g.checked?.length === 1 && g.checked[0] === String(stored), `${where}: exactly one chip is checked, the brand's value (${(g.checked ?? []).join(', ') || 'none'}, stored ${stored})`);
  ok(g.small === 0, `${where}: every chip is a >= 24px hit target (${g.small} smaller)`);
  const before = await page.evaluate(readNewChips, c.group);
  const next = before.values[(before.values.indexOf(before.checked[0]) + 1) % before.values.length];
  await page.locator(`${c.group} button[aria-checked="true"]`).focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(([s, w]) => document.querySelector(`${s} button[aria-checked="true"]`)?.dataset.value === w, [c.group, next], { timeout: 5000 }).catch(() => {});
  ok(String(await persistedAt(page, c.key)) === next, `${where}: ArrowRight writes ${next} to the brand, and focus stays in the group (${await page.evaluate((s) => !!document.activeElement?.closest(s), c.group)})`);
  const errs = drain();
  ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
// 3d. Easing per motion role reaches the export, per mode and on a one-mode brand (#2046, UI redesign S9.2)
// =============================================================================================
// The legacy table that picked a curve per role sat inside `rp.modes.length > 1`, so a one-mode brand could not pick
// one at all, and the traced transitions read each transition's fixed default curve. Driven through the value picker:
//   · previewing Dark, a role's pick writes `modeLevers.dark.easings.<role>` and not the brand value, the EXPORTED
//     DTCG's `motion.easing-role.<role>` carries it for dark only, and the traced transition draws the exported curve
//     in Dark and Light's in Light; picking Light's own curve, or Return to Auto, clears it (Auto stands for it);
//   · on a one-mode brand (Start blank), a pick in Light writes `motionPersonality.easingRoles.<role>`, the export
//     carries it, and the trace draws it.
// Oracle: the export, downloaded and parsed here (`motionOracle`), and the persisted brand; never the page's own model.
console.log(`\nEasing per motion role, through the export (#2046)\n${'='.repeat(78)}`);
const exportTree = async (page, where) => {
  await hooks.click(page.locator('[data-p3="export-open"]'));
  await hooks.need(page, '[data-p3="export-dialog"]');
  const pending = page.waitForEvent('download');
  await hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-confirm"]'));
  const dl = await pending;
  try { return JSON.parse(await readFile(await dl.path(), 'utf8')); } catch { ok(false, `${where}: the export is a parseable token file`); return null; }
};
/** Pick `curve` for `role` in the value picker, and wait for the picker to close or the row to say it. */
const pickEasing = async (page, role, curve) => {
  await hooks.click(page.locator(`[data-p3="easing-pick"][data-role="${role}"]`));
  await hooks.need(page, '[data-p3="value-picker"]');
  const v = await page.evaluate((c) => [...document.querySelectorAll('[data-p3="value-picker"] [data-p3="value-picker-value"]')].find((b) => b.querySelector('[data-curve]')?.dataset.curve === c)?.dataset.value ?? null, curve);
  await hooks.click(page.locator(`[data-p3="value-picker"] [data-p3="value-picker-value"][data-value="${v}"]`));
  await page.waitForFunction(([r, c]) => (document.querySelector(`[data-p3="easing-pick"][data-role="${r}"]`)?.textContent ?? '').includes(c), [role, curve], { timeout: 5000 }).catch(() => {});
};
const tracedCurve = async (page, role) => (await readDepthMotion(page)).traces.find((t) => t.name === role) ?? null;
let easingTrips = 0;
{
  const brand = BRANDS[0];
  const { ctx, page, drain } = await openBrand(brand);
  await gotoDepth(page);
  const role = 'emphasized', curve = 'calm';
  const lightBefore = (await persistedBrand(page))?.motionPersonality?.easingRoles?.[role];
  await chooseMode(page, 'dark');
  await pickEasing(page, role, curve);
  const b = await persistedBrand(page);
  ok(b?.modeLevers?.dark?.easings?.[role] === curve && b?.motionPersonality?.easingRoles?.[role] === lightBefore,
    `Q22: ${brand}: previewing Dark, picking ${curve} for ${role} writes modeLevers.dark.easings.${role} and not the brand value (dark ${JSON.stringify(b?.modeLevers?.dark?.easings ?? null)}, brand ${JSON.stringify(b?.motionPersonality?.easingRoles ?? null)})`);
  const tree = await exportTree(page, `${brand} / Dark easing`);
  if (tree) {
    const dark = motionOracle(tree, 'dark'), light = motionOracle(tree, 'light');
    ok(dark.curve(role)?.name === curve && light.curve(role)?.name !== curve,
      `#2046: ${brand}: the exported motion.easing-role.${role} is ${curve} in dark only (dark ${dark.curve(role)?.name}, light ${light.curve(role)?.name})`);
    const t = await tracedCurve(page, role);
    ok(!!t && sameBez(t.bez, dark.curve(role)?.bez), `#2046: ${brand}: previewing Dark, the traced ${role} transition draws the exported dark curve ${JSON.stringify(dark.curve(role)?.bez)} (draws ${JSON.stringify(t?.bez)})`);
    await chooseMode(page, 'light');
    const tl = await tracedCurve(page, role);
    ok(!!tl && sameBez(tl.bez, light.curve(role)?.bez), `#2046: ${brand}: previewing Light, the traced ${role} transition draws the exported light curve ${JSON.stringify(light.curve(role)?.bez)} (draws ${JSON.stringify(tl?.bez)})`);
    easingTrips++;
  }
  // Picking Light's own curve in Dark is Auto (the legacy table never offered the self-map): it clears the override.
  await chooseMode(page, 'dark');
  const lightCurve = (tree && motionOracle(tree, 'light').curve(role)?.name) ?? 'expressive';
  await pickEasing(page, role, lightCurve);
  const b2 = await persistedBrand(page);
  ok(b2?.modeLevers?.dark?.easings?.[role] === undefined,
    `Q22: ${brand}: previewing Dark, picking Light's own curve (${lightCurve}) for ${role} returns it to Auto (dark ${JSON.stringify(b2?.modeLevers?.dark ?? null)})`);
  const label = await page.evaluate((r) => document.querySelector(`[data-p3="easing-pick"][data-role="${r}"] .p3-btn-label`)?.textContent ?? null, role);
  ok(label === `Auto: follows Light (${lightCurve})`, `Q22: ${brand}: under Auto, the ${role} row says "Auto: follows Light (${lightCurve})" (says ${JSON.stringify(label)})`);
  const errs = drain();
  ok(errs.length === 0, `${brand} / easing: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}
{
  // A one-mode brand: Start blank makes a Light-only brand.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await hooks.watch(page);
  const drain = watchErrors(page);
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
  await hooks.click(page.locator('[data-p3="start-blank"]'));
  await hooks.need(page, '[data-p3="frame"]');
  await gotoDepth(page);
  const modes = await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode));
  ok(JSON.stringify(modes) === '["light"]', `#2046: Start blank makes a one-mode brand (modes ${JSON.stringify(modes)})`);
  const role = 'enter', curve = 'calm';
  await pickEasing(page, role, curve);
  const b = await persistedBrand(page);
  ok(b?.motionPersonality?.easingRoles?.[role] === curve, `#2046: a one-mode brand picks ${curve} for ${role}: it writes motionPersonality.easingRoles.${role} (persisted ${JSON.stringify(b?.motionPersonality ?? null)})`);
  const tree = await exportTree(page, 'one-mode brand');
  if (tree) {
    const o = motionOracle(tree, 'light');
    ok(o.curve(role)?.name === curve, `#2046: a one-mode brand's export carries motion.easing-role.${role} → ${curve} (exports ${o.curve(role)?.name})`);
    const t = await tracedCurve(page, role);
    ok(!!t && sameBez(t.bez, o.curve(role)?.bez), `#2046: a one-mode brand's traced ${role} transition draws the exported curve ${JSON.stringify(o.curve(role)?.bez)} (draws ${JSON.stringify(t?.bez)})`);
    easingTrips++;
  }
  const errs = drain();
  ok(errs.length === 0, `one-mode brand / easing: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}
ok(easingTrips === 2, `both easing round trips reached the export (${easingTrips} of 2)`);

// =============================================================================================
// 3d. Lever chips on Shape — the new markup (UI redesign S7)
// =============================================================================================
// Density and Control shape left the legacy Size & radius page's radio chips (#1675, section 3b) for the levers kit's
// chips, held as 3c holds Interactive's: the manifest's options and labels (oracle: the committed
// `schema/lever-manifest.json`), exactly one checked and it is the brand's stored value (read from the persisted brand,
// a store the chip does not paint), each choice writes its value, ArrowRight writes the next, each chip a >= 24px target.
console.log(`\nLever chips on Shape (S7)\n${'='.repeat(78)}`);
const SHAPE_CHIPS = [
  { key: 'density', group: '[data-p3="lever-density"]' },
  { key: 'controlShape', group: '[data-p3="lever-control-shape"]' },
];
let shapeChipGroups = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await gotoShape(page);
  for (const c of SHAPE_CHIPS) {
    const lever = leverOf(c.key);
    const where = `${brand} / Shape / ${c.key}`;
    const g = await page.evaluate(readNewChips, c.group);
    if (!g.found) { ok(false, `${where}: renders a chip group`); continue; }
    shapeChipGroups++;
    ok(g.found === 1 && g.tag === 'FIELDSET' && g.legend === lever.label && g.group === lever.label, `${where}: one fieldset whose legend and radio group name the lever ("${g.legend}", "${g.group}", want "${lever.label}")`);
    ok(JSON.stringify(g.values) === JSON.stringify(lever.options.map((o) => String(o.value))) && JSON.stringify(g.labels) === JSON.stringify(lever.options.map((o) => o.label)),
      `${where}: offers the manifest's ${lever.options.length} options with its labels (${g.labels.join(', ')})`);
    const stored = (await persistedAt(page, c.key)) ?? lever.default;
    ok(g.checked.length === 1 && g.checked[0] === String(stored), `${where}: exactly one chip is checked, the brand's value (${g.checked.join(', ') || 'none'}, stored ${stored})`);
    ok(g.small === 0, `${where}: every chip is a >= 24px hit target (${g.small} smaller)`);
    if (brand !== BRANDS[0]) continue;
    for (const o of lever.options) {
      const v = String(o.value);
      if ((await page.evaluate(readNewChips, c.group)).checked[0] === v) continue;
      await hooks.click(page.locator(`${c.group} button[role="radio"]`).filter({ hasText: o.label }).first());
      await page.waitForFunction(([s, w]) => document.querySelector(`${s} button[aria-checked="true"]`)?.dataset.value === w, [c.group, v], { timeout: 5000 }).catch(() => {});
      ok(String(await persistedAt(page, c.key)) === v, `${where}: choosing "${o.label}" writes ${v} to the brand (wrote ${await persistedAt(page, c.key)})`);
    }
    const before = await page.evaluate(readNewChips, c.group);
    const cur = before.checked[0];
    const next = before.values[(before.values.indexOf(cur) + 1) % before.values.length];
    await page.locator(`${c.group} button[role="radio"][data-value="${cur}"]`).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(([s, w]) => document.querySelector(`${s} button[aria-checked="true"]`)?.dataset.value === w, [c.group, next], { timeout: 5000 }).catch(() => {});
    ok(String(await persistedAt(page, c.key)) === next, `${where}: ArrowRight from ${cur} writes ${next} to the brand`);
    const foc = await page.evaluate((s) => document.activeElement?.closest(s) !== null && document.activeElement?.dataset.value, c.group);
    ok(foc === next, `${where}: after the arrow key, focus is on the chip it chose (${foc})`);
  }
  // The Auto-chip rule (#2078), on the first brand: previewing Dark on Auto, Light's density chip is the checked one;
  // choosing it writes nothing.
  if (brand === BRANDS[0]) {
    await chooseMode(page, 'dark');
    const lightDensity = String((await persistedAt(page, 'density')) ?? leverOf('density').default);
    const g = await page.evaluate(readNewChips, SHAPE_CHIPS[0].group);
    const onAuto = (await persistedBrand(page))?.modeLevers?.dark?.density === undefined && g.checked.length === 1 && g.checked[0] === lightDensity;
    const d = await autoChipWritesNothing(page, page.locator(`${SHAPE_CHIPS[0].group} button[role="radio"][data-value="${lightDensity}"]`));
    ok(onAuto && d.same, `Auto chip (#2078): ${brand}: previewing Dark on Auto, choosing the density chip Dark already follows (Light's ${lightDensity}) writes nothing — prism3:brandInput ${!onAuto ? `was not on Auto with Light's chip checked first (checked ${g.checked.join(', ') || 'none'})` : d.same ? 'byte-identical' : `changed, modeLevers.dark ${JSON.stringify(d.dark)}`}`);
    await chooseMode(page, 'light');
  }
  const errs = drain();
  ok(errs.length === 0, `${brand}: rendering and driving Shape's chips raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}
ok(shapeChipGroups >= SHAPE_CHIPS.length * 2, `${shapeChipGroups} Shape chip groups checked (floor ${SHAPE_CHIPS.length * 2}: both levers on at least two brands)`);

// =============================================================================================
// 3e. Components (UI redesign S8.2): the Button option chips, the specimen, the slider per step, and #2049's corner
// =============================================================================================
// S8.2 moved the Button options from the legacy Size & radius page (#1675's radio chips, section 3b, and S8.1's section
// on that page) to Components, as the levers kit's chips and slider, and drew the specimen in the Components preview.
// Held here, per corpus brand:
//   · the three chip levers, as 3d holds Shape's: the manifest's options and labels (oracle: the committed
//     `schema/lever-manifest.json`), exactly one checked and it is the brand's stored value, each choice writes its value
//     (the default included: written, not unset, the legacy bytes), ArrowRight writes the next, each chip >= 24px;
//   · the specimen is the shared module's: one `data-sg-section="button-layout"` in the Components preview, on the
//     specimen's own root, three sizes of three buttons;
//   · the minimum-width slider WRITES ON EVERY STEP (the legacy bytes): each `input` event, with no `change` after it,
//     leaves the dragged value in the persisted brand (literals on the lever's 0.25 grid);
//   · #2049 (owner decision G7 A): each button's corner, as drawn, is the one the ENGINE gives a button for each Control
//     shape in Light and in Dark: the radius size `applyControlShape` repoints `radius.md` to (typed here: rounded
//     keeps radius.md, pill takes radius.capsule, boxed radius.none, hairline radius.hairline — `test.ts` holds the
//     engine's map to the same literals), at that size's px IN THE MODE from the brand's committed emission, clamped to
//     half the button's height (its height in the mode, from the emission too): Pill is fully round.
// At 380 the chips wrap inside the levers panel.
//
// Mutations this fails by name: the corner read from radius.md again → `#2049: aurora / pill / light / Medium: the
// button's corner is 8px; the engine binds radius.capsule, 22px`; the slider committing on release → `prism3 / Button
// minimum width: dragging to 2.5 writes 2.5 on that step (wrote null)`; a chip unsetting its default → `… choosing
// "Attached to label" writes attached to the brand (wrote null)`.
console.log(`\nComponents — the Button options and the specimen (S8.2)\n${'='.repeat(78)}`);
const COMPONENT_CHIPS = [
  { key: 'buttonIcons', group: '[data-p3="lever-button-icons"]' },
  { key: 'buttonContentSize', group: '[data-p3="lever-button-content-size"]' },
  { key: 'buttonLabelWeight', group: '[data-p3="lever-button-label-weight"]' },
];
/** The radius size a button binds under each Control shape (the engine's `CONTROL_SHAPE_RUNG` over `radius.md`). Literal. */
const SHAPE_STEP = { rounded: 'md', pill: 'capsule', boxed: 'none', hairline: 'hairline' };
const SIZE_STEP = { Small: 'sm', Medium: 'md', Large: 'lg' };
/** A dimension leaf's px in a mode, from a committed emission: the mode's own value, else the base. */
const emittedPx = async (brand) => {
  const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
  const root = tree[Object.keys(tree).find((k) => !k.startsWith('$'))];
  const base = root.color?.interactive?.primary?.['on-fill']?.$extensions?.prism3?.figma?.modes?.[0] ?? 'light';
  const px = (leaf, mode) => (mode !== base ? leaf?.$extensions?.prism3?.modes?.[mode]?.px : undefined) ?? leaf?.$extensions?.prism3?.px;
  return { radius: (step, mode) => px(root.radius?.[step], mode), height: (step, mode) => px(root.size?.[step]?.height, mode) };
};
const gotoComponents = async (page) => {
  await hooks.click(page.locator('[data-p3="tab-components"]'));
  await hooks.need(page, '[data-p3="components-levers"]');
  await hooks.need(page, '[data-p3="components-style-guide"] [data-sg-section="button-layout"]');
  await page.evaluate(() => document.fonts.ready);
};
let componentChipGroups = 0, buttonSpecimens = 0, minWidthSteps = 0, cornersChecked = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await gotoComponents(page);
  const drive = brand === BRANDS[0];
  for (const c of COMPONENT_CHIPS) {
    const lever = leverOf(c.key);
    const where = `${brand} / Components / ${c.key}`;
    const g = await page.evaluate(readNewChips, c.group);
    if (!g.found) { ok(false, `${where}: renders a chip group`); continue; }
    componentChipGroups++;
    ok(g.found === 1 && g.tag === 'FIELDSET' && g.legend === lever.label && g.group === lever.label, `${where}: one fieldset whose legend and radio group name the lever ("${g.legend}", "${g.group}", want "${lever.label}")`);
    ok(JSON.stringify(g.values) === JSON.stringify(lever.options.map((o) => String(o.value))) && JSON.stringify(g.labels) === JSON.stringify(lever.options.map((o) => o.label)),
      `${where}: offers the manifest's ${lever.options.length} options with its labels (${g.labels.join(', ')})`);
    const stored = (await persistedAt(page, c.key)) ?? lever.default;
    ok(g.checked.length === 1 && g.checked[0] === String(stored), `${where}: exactly one chip is checked, the brand's value (${g.checked.join(', ') || 'none'}, stored ${stored})`);
    ok(g.small === 0, `${where}: every chip is a >= 24px hit target (${g.small} smaller)`);
    if (!drive) continue;
    // Every option, then back to the default: each choice writes, the default WRITTEN rather than unset.
    const order = [...lever.options.filter((o) => String(o.value) !== String(lever.default)), lever.options.find((o) => String(o.value) === String(lever.default))];
    for (const o of order) {
      const v = String(o.value);
      await hooks.click(page.locator(`${c.group} button[role="radio"]`).filter({ hasText: o.label }).first());
      await page.waitForFunction(([s, w]) => document.querySelector(`${s} button[aria-checked="true"]`)?.dataset.value === w, [c.group, v], { timeout: 5000 }).catch(() => {});
      const wrote = await persistedAt(page, c.key);
      ok(String(wrote) === v, `${where}: choosing "${o.label}" writes ${v} to the brand (wrote ${wrote})`);
    }
    const before = await page.evaluate(readNewChips, c.group);
    const cur = before.checked[0];
    const next = before.values[(before.values.indexOf(cur) + 1) % before.values.length];
    await page.locator(`${c.group} button[role="radio"][data-value="${cur}"]`).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(([s, w]) => document.querySelector(`${s} button[aria-checked="true"]`)?.dataset.value === w, [c.group, next], { timeout: 5000 }).catch(() => {});
    ok(String(await persistedAt(page, c.key)) === next, `${where}: ArrowRight from ${cur} writes ${next} to the brand`);
    await hooks.click(page.locator(`${c.group} button[role="radio"][data-value="${cur}"]`));
  }
  // The specimen: the shared module's, three sizes of three buttons.
  const where = `${brand} / Components`;
  const spec = await page.evaluate(() => {
    const pv = document.querySelector('[data-p3="components-style-guide"]');
    const marked = [...(pv?.querySelectorAll('[data-sg-section="button-layout"]') ?? [])];
    const root = marked[0];
    return { marked: marked.length, lists: pv?.querySelectorAll('.btnl-list').length ?? 0, rootIsList: !!root && root.classList.contains('btnl-list'),
      rows: root ? root.querySelectorAll(':scope > .btnl-row').length : 0, buttons: root ? root.querySelectorAll('.btnl-btn').length : 0 };
  });
  ok(spec.lists === 1 && spec.marked === 1 && spec.rootIsList && spec.rows === 3 && spec.buttons === 9,
    `${where}: the button specimen is the shared module's (data-sg-section="button-layout"), three sizes of three buttons — ${JSON.stringify(spec)}`);
  if (spec.marked === 1) buttonSpecimens++;
  if (drive) {
    const lever = leverOf('buttonMinWidthMultiplier');
    const sel = '[data-p3="button-min-width-slider"]';
    const r = await page.evaluate((x) => { const n = document.querySelector(x); return n ? [n.min, n.max, n.step] : null; }, sel);
    ok(JSON.stringify(r) === JSON.stringify([String(lever.min), String(lever.max), String(lever.step)]), `${where}: the Button minimum width slider spans the manifest's ${lever.min} to ${lever.max} by ${lever.step} (${JSON.stringify(r)})`);
    for (const v of [2.5, 2.75, 3, 1, 4, 2.25]) {
      await page.evaluate(([s, x]) => { const n = document.querySelector(s); n.value = String(x); n.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, v]);
      await page.waitForFunction(([k, x]) => { try { return JSON.parse(localStorage.getItem('prism3:brandInput'))?.input?.[k] === x; } catch { return false; } }, ['buttonMinWidthMultiplier', v], { timeout: 1500 }).catch(() => {});
      const wrote = await persistedAt(page, 'buttonMinWidthMultiplier');
      minWidthSteps++;
      ok(wrote === v, `${brand} / Button minimum width: dragging to ${v} writes ${v} on that step (wrote ${wrote})`);
    }
    const label = await page.evaluate(() => document.querySelector('[data-p3="components-style-guide"] [data-sg-section="button-layout"] .btnl-lab')?.textContent ?? '');
    ok(/^Small · \d+px high · at least \d+px wide$/.test(label), `${where}: the specimen repaints with the slider, its first row reading "‹Size› · ‹h›px high · at least ‹w›px wide" ("${label}")`);
  }
  // #2049: the corner as drawn, per Control shape, in Light and Dark, against the emission.
  const em = await emittedPx(brand);
  for (const [shape, step] of Object.entries(SHAPE_STEP)) {
    await gotoShape(page);
    await hooks.click(page.locator(`[data-p3="lever-control-shape"] button[role="radio"][data-value="${shape}"]`));
    await page.waitForFunction((v) => document.querySelector('[data-p3="lever-control-shape"] button[aria-checked="true"]')?.dataset.value === v, shape, { timeout: 5000 }).catch(() => {});
    await gotoComponents(page);
    for (const mode of ['light', 'dark']) {
      await chooseMode(page, mode);
      const drawn = await page.evaluate(() => [...document.querySelectorAll('[data-p3="components-style-guide"] .btnl-row')].map((row) => ({
        size: (row.querySelector('.btnl-lab')?.textContent ?? '').split(' · ')[0],
        corners: [...row.querySelectorAll('.btnl-btn')].map((b) => getComputedStyle(b).borderTopLeftRadius),
        h: row.querySelector('.btnl-btn')?.getBoundingClientRect().height ?? 0 })));
      if (shape === 'rounded') {
        // The preview's text, as drawn: the set list in the ground's inks at the chrome bar, and each button label at
        // the contract of the role pair it claims (interactive.primary.on-fill on fill.rest), from the emission.
        const lw = `${brand} / Components / ${mode}`;
        await settle(page, lw);
        const probe = await page.evaluate(LEGIBILITY_PROBE, '[data-p3="components-style-guide"]');
        assertParsed(lw, probe.unparsed);
        nodesMeasured += probe.text.length;
        const chromeRows = probe.text.filter((r) => !r.specimen);
        specimensMeasured += probe.text.length - chromeRows.length;
        ok(probe.rootFound && probe.text.length >= 26 * 3, `${lw}: the probe measured the Components preview (${probe.text.length} text nodes, floor ${26 * 3})`);
        const under = chromeRows.filter((r) => r.ratio < barOf(r));
        ok(under.length === 0, `${lw}: every chrome text node in the preview meets WCAG 1.4.3${under.length ? ` — ${under.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1`).join(' | ')}` : ''}`);
        const unmarked = probe.text.filter((r) => r.inlineInk && !r.specimen);
        ok(unmarked.length === 0, `${lw}: every node inked by an inline style is marked data-specimen${unmarked.length ? ` — ${unmarked.slice(0, 3).map((u) => `${u.cls} "${u.text}"`).join(' | ')}` : ''}`);
        // Each button label against the contract the emission declares for its pair: `interactive.primary.on-fill`, whose
        // `against` is the resting fill, at its own `min`.
        const emission = await loadEmission(brand);
        const onFill = emission?.role('interactive.primary.on-fill', mode);
        const labels = probe.text.filter((r) => r.specimen && r.cls === 'span.btnl-label');
        const low = labels.filter((r) => !(r.ratio >= Math.max(CONTRAST_FLOOR, onFill?.min ?? Infinity)));
        ok(onFill?.against === 'interactive.primary.fill.rest' && typeof onFill?.min === 'number' && labels.length === 9 && low.length === 0,
          `${lw}: every button label meets interactive.primary.on-fill's contract on ${onFill?.against} (min ${onFill?.min}:1; ${labels.length} of 9 read)${low.length ? ` — "${low[0].text}" at ${low[0].ratio}:1` : ''}`);
      }
      for (const d of drawn) {
        const sz = SIZE_STEP[d.size];
        const r = em.radius(step, mode), h = em.height(sz, mode);
        const want = r === undefined || h === undefined ? null : Math.min(r, h / 2);
        const got = d.corners.map((x) => parseFloat(x));
        cornersChecked++;
        ok(want !== null && Math.abs(d.h - h) < 0.5 && got.length === 3 && got.every((x) => Math.abs(x - want) < 0.01),
          `#2049: ${brand} / ${shape} / ${mode} / ${d.size}: the button's corner is ${[...new Set(got)].join('/')}px; the engine binds radius.${step}, ${want}px${Math.abs(d.h - h) >= 0.5 ? ` (drawn ${d.h}px high, the emission says ${h})` : ''}`);
      }
    }
    await chooseMode(page, 'light');
  }
  await gotoShape(page);
  await hooks.click(page.locator('[data-p3="control-shape-choice-rounded"]'));
  const errs = drain();
  ok(errs.length === 0, `${brand}: driving the Components page raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}
ok(componentChipGroups >= COMPONENT_CHIPS.length * 2 && buttonSpecimens === BRANDS.length && minWidthSteps >= 6 && cornersChecked >= BRANDS.length * 4 * 2 * 3,
  `the Components check met ${componentChipGroups} chip groups (floor ${COMPONENT_CHIPS.length * 2}), ${buttonSpecimens} specimens (one per brand), ${minWidthSteps} slider steps (floor 6) and ${cornersChecked} button sizes' corners (floor ${BRANDS.length * 4 * 2 * 3})`);
// Narrow panels: the chips wrap inside the levers panel at 380px, the plugin's narrow width (#1675's check, moved here).
{
  const { ctx, page } = await openBrand(BRANDS[0]);
  await gotoComponents(page);
  await page.setViewportSize({ width: 380, height: 900 });
  // The frame's width tier (`data-w`) is set by a ResizeObserver, which runs at the next rendering step, not when
  // `setViewportSize` resolves. Measured before it, the levers sit in the wide layout's 42% column at 380 (each group
  // about 90px wide) and all three groups overflow. Wait on the tier itself, a real condition, and name it below.
  await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.w === 'narrow', null, { timeout: 5000 }).catch(() => {});
  const { tier, groups, over } = await page.evaluate(() => {
    const gs = [...document.querySelectorAll('[data-p3="components-levers"] [role="radiogroup"]')];
    return { tier: document.querySelector('[data-p3="frame"]')?.dataset.w, groups: gs.length, over: gs.map((g) => g.scrollWidth - g.clientWidth).filter((x) => x > 1).length };
  });
  ok(tier === 'narrow' && groups === 3 && over === 0, `at 380px every Button option chip group fits the levers panel (${groups} groups, ${over} overflow, frame tier ${tier})`);
  await ctx.close();
}

// =============================================================================================
// 4. Overlay surfaces — the brand-menu popover (#1031)
// =============================================================================================
// WHY THIS SECTION EXISTS. #1031 shipped near-white ink in the brand menu's Name and Namespace
// inputs, and this suite — whose stated counterfactual for gating was "three broken cards ship and
// surface in a client Figma session as 'the style guide has invisible labels'" — was green. Two
// independent reasons, and both had to be fixed to make the report mean anything:
//
//   1. CORPUS. The sweep drives the rail and the mode bar. It never opens the brand menu, so no node
//      inside the popover was ever measured. A clean report over a corpus that excludes the defect is
//      docs/34 shape 9, and the suite could not have failed however bad the popover was.
//   2. INSTRUMENT. Even with the popover open, the text walk skips `<input>` — a field's value is not
//      a child text node. That is the second half, fixed in `LEGIBILITY_PROBE` above; this section is
//      what makes it non-vacuous by asserting the popover's own control count.
//
// BOTH SCHEMES, plus a direct assertion on the shell — and the split between those two is the honest
// part, established by mutation rather than by reasoning.
//
// #1031's mechanism has TWO necessary halves: the document opts into `color-scheme: light dark`, AND
// a control leaves its `color` to the UA while the author paints its background from a light token.
// Only then does the UA supply near-white ink over a light field. Until UI redesign S1.2 the studio
// declared no `color-scheme` at all, so the first half was false and the studio was structurally immune.
// S1.2 gave the chrome a real dark scheme: in a dark theme the document resolves dark, so the first half
// is now TRUE at the document, and the immunity moved onto every legacy surface, which is pinned light
// with `data-theme="light"`. That is why the direct assertion below reads the popover and its controls,
// not the document, and why this section's dark run is now the run that matters.
//
// MEASURED: adding `color-scheme: light dark` to the studio's shell and re-running this section
// still passes — because the fix for #1031 also gave every studio control an author `color`, so
// the second half is now false too. A ratio assertion under an emulated dark scheme therefore
// catches this class only in combination with a NEW control that omits `color`, which is a real but
// compound tripwire and not the one the comment above it originally claimed. So the first half gets
// its own assertion, on the resolved `color-scheme` of the popover and of each control in it — fails the
// moment the opt-in reaches a legacy field, and independent of how well the stylesheet happens to be
// inked that week. The
// emulated-dark pass stays for the compound case: a control added later without a `color` fails here
// and nowhere else.
//
// What none of this can cover is the artifact where the defect actually lived: `apps/plugin/dist/ui.html`,
// built by another workspace. Its shell is the one that WAS opted in, and #1031 turned that off (S1.2
// turned it back on, with the legacy surfaces pinned light). That bundle is measured by
// `apps/plugin/test-start-screen.mjs` §8 (#1041): the same direct `color-scheme` arm, the same bars, both emulated schemes crossed with Figma's stubbed light and dark themes, every rail
// page that host offers, and this popover — so a `light dark` opt-in coming back to the plugin shell
// fails there by name, and nothing in this file claims to see it.
console.log(`\nBrand-menu popover (#1031)\n${'='.repeat(78)}`);

let menuFields = 0;
for (const brand of BRANDS) {
  for (const scheme of ['light', 'dark']) {
    const { ctx, page, drain } = await openBrand(brand, scheme);
    // The popover, then the import box inside it — `.bm-ta` is the control the surface promises (S3 moved
    // Name and Namespace to Brand › Identity), and it only exists once the box is open.
    await hooks.click(page.locator('[data-p3="brand-switcher"]'));
    await hooks.need(page, '[data-p3="brand-menu"] [data-p3="brand-menu-import"]');
    await hooks.click(page.locator('[data-p3="brand-menu"] [data-p3="brand-menu-import"]'));
    await hooks.need(page, '[data-p3="brand-menu"] [data-p3="import-text"]');
    // TYPE INTO IT. An empty field renders no glyphs, so measuring a pristine input asserts a
    // computed pairing over ink that is not on screen; a value makes the row describe something drawn.
    await page.fill('[data-p3="brand-menu"] [data-p3="import-text"]', 'smoke-brand');

    const where = `${brand} / brand menu / ${scheme} scheme`;
    // #1031's FIRST HALF, asserted directly — on the POPOVER, since UI redesign S1.2. Until then the
    // whole document resolved light (the studio declared nothing) and that was the line held here. The
    // chrome now has a real dark scheme (the frame follows the device by default, so this arm's dark run
    // has a dark document), and the legacy surfaces still painted from light tokens are pinned light with
    // `data-theme="light"`. So the opt-in that matters is the popover's own, and each of its controls':
    // anything naming `dark` there hands the UA the field ink, the caret, autofill and native option lists
    // from a dark palette over a surface this stylesheet paints light, and the option list is not
    // something any in-page probe can measure, which is why the opt-in itself is the thing to hold.
    const schemes = await page.evaluate(() => {
      const menu = document.querySelector('[data-p3="brand-menu"]');
      return { menu: menu ? getComputedStyle(menu).colorScheme : 'unmounted',
        fields: [...(menu?.querySelectorAll('input, select, textarea') ?? [])].map((f) => [f.getAttribute('data-p3') ?? f.tagName, getComputedStyle(f).colorScheme]) };
    });
    ok(schemes.menu === 'normal' || schemes.menu === 'light',
      `${where}: the brand menu resolves a light-only color-scheme (resolved "${schemes.menu}") — it paints every surface from light tokens, so opting into dark hands the UA half of a pairing it cannot see`);
    const darkFields = schemes.fields.filter(([, cs]) => /\bdark\b/.test(cs));
    ok(schemes.fields.length > 0 && darkFields.length === 0,
      `${where}: every control in the brand menu resolves a light color-scheme (${schemes.fields.length} read${darkFields.length ? `; dark: ${darkFields.map(([h, cs]) => `${h} "${cs}"`).join(', ')}` : ''})`);
    await settle(page, where);
    const probe = await page.evaluate(LEGIBILITY_PROBE, '[data-p3="brand-menu"]');
    assertParsed(where, probe.unparsed);
    ok(probe.rootFound, `${where}: the popover is mounted and was measured`);
    // WHICH controls, not how many. A count passes the day the textarea stops rendering and some other
    // control appears in its place — CLAUDE.md's rule that a scope must assert each promised surface is
    // REPRESENTED. The count stays underneath as a non-empty floor, which is a different and weaker claim.
    const seenHooks = new Set(probe.fields.map((r) => r.hook));
    for (const want of BRANDMENU_CONTROLS) {
      ok(seenHooks.has(want), `${where}: the "${want}" control is mounted and was measured (saw ${probe.fields.map((r) => r.hook ?? r.cls).join(', ') || 'no controls at all'})`);
    }
    ok(probe.fields.length >= BRANDMENU_FIELD_FLOOR,
      `${where}: measured ${probe.fields.length} form control(s) inside the popover (floor ${BRANDMENU_FIELD_FLOOR})`);
    ok(probe.text.length >= BRANDMENU_TEXT_FLOOR,
      `${where}: measured ${probe.text.length} text node(s) inside the popover (floor ${BRANDMENU_TEXT_FLOOR})`);
    menuFields += probe.fields.length;

    // At the bars the sweep holds the same nodes to (#779) — the popover is chrome, and it was the one
    // surface still judged against the 2.0 "invisible" floor after the sweep's own split.
    const bad = [
      ...probe.fields.filter(fieldFails).map(describeField),
      ...probe.text.filter((r) => r.ratio < barOf(r)).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1 (${u.px}px/${u.weight}, op ${u.op}, needs ${barOf(u)}:1)`),
    ];
    // #1943 (owner decision, 2026-10-01): the brand menu offers NO mode control. Brand › Modes is the one place
    // modes are edited; the menu's Modes section followed different rules and went. #1770's locked-Light-row
    // check went with its subject: Brand › Modes' Light row is held to the chrome bar by `test:chrome` §1.
    // A mode control is anything that toggles or picks (a checkbox, radio, switch, pressed state or select) or
    // anything whose words name a mode, read from its own text, its accessible name and its title. The
    // proof is the menu itself: open, found by its hook, with text drawn in it, in this same state.
    const modeCtl = await page.evaluate(() => {
      const menu = document.querySelector('[data-p3="brand-menu"]');
      if (!menu) return { open: false, nodes: 0, found: [] };
      const MODE_WORDS = /\b(modes?|light|dark|high contrast|wireframe)\b/i;
      const own = (n) => [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' ').trim();
      const all = [...menu.querySelectorAll('*')];
      const found = all.filter((n) => n.matches('input[type="checkbox"], input[type="radio"], select, [role="checkbox"], [role="radio"], [role="switch"], [aria-checked], [aria-pressed]')
        || MODE_WORDS.test(own(n)) || MODE_WORDS.test(n.getAttribute('aria-label') ?? '') || MODE_WORDS.test(n.getAttribute('title') ?? ''))
        .map((n) => `${n.tagName.toLowerCase()}.${(n.getAttribute('class') ?? '').split(' ')[0]} "${(own(n) || n.getAttribute('aria-label') || n.getAttribute('title') || '').slice(0, 30)}"`);
      return { open: true, nodes: all.filter((n) => own(n)).length, found };
    });
    hooks.absent(ok, { seen: modeCtl.open && modeCtl.nodes > 0 && probe.rootFound, state: 'the brand menu open, found by its hook, with text drawn in it' },
      modeCtl.found.length === 0,
      `${where}: the brand menu offers no mode control; Brand › Modes is the one place modes are edited (#1943)${modeCtl.found.length ? ` — found ${modeCtl.found.slice(0, 4).join(' | ')}` : ''}`);
    for (const r of [...probe.fields, ...probe.text]) if (r.ratio < worstRatio) { worstRatio = r.ratio; worstWhere = `${where} — ${r.cls} ${r.text}`; }
    ok(bad.length === 0, `${where}: every one of ${probe.fields.length} control(s) and ${probe.text.length} text node(s) meets its bar — text ${CHROME_TEXT_MIN}:1 (${CHROME_LARGE_TEXT_MIN}:1 large), caret ${CHROME_CARET_MIN}:1, specimens ${CONTRAST_FLOOR}:1${
      bad.length ? ` — ${bad.slice(0, 4).join(' | ')}` : ''}`);
    // The field must show what was typed — a legible field that lost the value is the same report ("I
    // cannot read what I typed") from the other direction.
    ok(await page.inputValue('[data-p3="brand-menu"] [data-p3="import-text"]') === 'smoke-brand', `${where}: the import field holds what was typed`);
    const errs = drain();
    ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
    await ctx.close();
  }
}
ok(menuFields >= BRANDS.length * 2 * BRANDMENU_FIELD_FLOOR,
  `${menuFields} popover controls measured across ${BRANDS.length} brands × 2 color schemes`);
console.log(`  ${BRANDS.length} brands × 2 color schemes, ${menuFields} popover controls measured.`);

// =============================================================================================
// An ISOLATED identity change reaches emission + persistence (#1196)
//
// The Name/Namespace fields skip `rebuild()` to keep the text caret (#1073/#1075 lineage), and rebuild()
// was the ONLY refresher of `lastGoodInput` (→ persist / design.md export) and `theme.root` (→ the DTCG
// token export). So an identity change with NO lever edit after it never reached emission: the namespace
// shipped as the stale default (the silent-resolve class — wrong output, no error), the name persisted
// stale. This drives that exact path — change ONLY the identity fields, then export/read — so it FAILS on
// the pre-fix code and passes after. There is no gate one tier up; a human found this by exporting.
//
// UI redesign S3 moved both fields from the brand menu to Brand › Identity. The name still writes per
// keystroke through `syncIdentity`, with no rebuild; the namespace is now a draft until Rename namespace and
// its confirm (concept v6, T2/Q9), which rebuilds. The path held here is unchanged: an identity change and
// nothing else, then the persisted blob and the export.
console.log(`\nIsolated identity change reaches emission (#1196)\n${'='.repeat(78)}`);
{
  const NS = 'ttds';
  const NAME = 'ttds-brand';
  const brand = BRANDS[0];
  const { ctx, page, drain } = await openBrand(brand);
  // Open Brand and change ONLY the identity fields. `page.fill` dispatches an `input` event, so each field's
  // real handler (and the #1196 `syncIdentity`) runs — exactly a designer typing.
  await hooks.click(page.locator('[data-p3="tab-brand"]'));
  await hooks.need(page, '[data-p3="brand-namespace"]');
  await page.fill('[data-p3="brand-name"]', NAME);         // Name      → lastGoodInput.id (persisted blob)
  await page.fill('[data-p3="brand-namespace"]', NS);      // Namespace → a draft, until it is renamed
  await hooks.click(page.locator('[data-p3="namespace-rename"]'));
  await hooks.click(page.locator('[data-p3="namespace-confirm-go"]'));   // → brandState.root, rebuilt (emission)

  // (a) Both identity fields reach the persisted blob. Web persists the working brand to localStorage;
  // before the fix an isolated identity change never re-persisted, so a reopen read the stale values.
  // The blob is version-tagged `{ v, input: BrandInput }` under `prism3:brandInput` (persist-input.ts),
  // so read that key and unwrap `.input` — the same shape restoreInput() rehydrates the UI from on reopen.
  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem('prism3:brandInput');
    try { const o = JSON.parse(raw); return (o && typeof o === 'object' && o.input) ? o.input : null; } catch { return null; }
  });
  ok(persisted?.id === NAME, `#1196: an isolated Name change reaches the persisted blob (id="${persisted?.id}", want "${NAME}")`);
  ok(persisted?.root === NS, `#1196: an isolated Namespace change reaches the persisted blob (root="${persisted?.root}", want "${NS}")`);

  // (b) The namespace reaches the EMITTED DTCG output — the load-bearing half. Export the tokens (still no
  // lever change) and check the tree THREE ways: the custom root is present, the stale default root is
  // ABSENT, and — the assertion whose absence let a broken fix ship — ZERO residual `{prism.*}` alias refs
  // remain INSIDE the tree. `theme.root` and `theme.namespace` are separate fields: patching only the root
  // rooted the tree at `ttds` while ~976 colour refs still pointed at `{prism.core.palette.*}`, a root no
  // longer present — dangling aliases, the exact silent-resolve class this PR closes. `roots.includes(NS)`
  // alone cannot see that (it only reads the top-level key); the ref scan over the serialized tree can.
  await hooks.click(page.locator('[data-p3="export-open"]'));
  await hooks.need(page, '[data-p3="export-dialog"]');
  const pending = page.waitForEvent('download');
  await hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-confirm"]'));
  const dl = await pending;
  let raw = '';
  let roots = [];
  try { raw = await readFile(await dl.path(), 'utf8'); roots = Object.keys(JSON.parse(raw)); } catch { /* reported below */ }
  const staleRefs = (raw.match(/\{prism\./g) || []).length;   // alias syntax is `"{prism.core.palette…}"` — the brace anchors it to a ref, never prose
  const freshRefs = (raw.match(/\{ttds\./g) || []).length;
  ok(roots.includes(NS), `#1196: the exported DTCG tree is rooted at the custom namespace (roots: ${roots.join(', ') || 'none'})`);
  ok(!roots.includes('prism'), `#1196: the stale default root is ABSENT from the exported tree (roots: ${roots.join(', ') || 'none'})`);
  ok(freshRefs > 0, `#1196: the exported tree actually carries {${NS}.*} alias refs (found ${freshRefs}) — the ref scan below is not vacuous`);
  ok(staleRefs === 0, `#1196: ZERO residual {prism.*} alias refs inside the exported tree (found ${staleRefs}; ${freshRefs} correct {${NS}.*} refs)`);
  // slug() reads lastGoodInput.id, so the filename is the other reachable witness of the fix.
  ok(dl.suggestedFilename().startsWith(NAME), `#1196: the export filename uses the fresh name (${dl.suggestedFilename()})`);

  const errs = drain();
  ok(errs.length === 0, `#1196: 0 console errors across the identity change + export${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
// 5. The overwrite-confirm SENTENCE (#1033)
//
// The confirm names an origin twice, in two grammatical positions, and until now nothing read it. That
// is how #1033 shipped a regression into the position #722 already had right: generalizing `originLabel`
// to serve the arriving slot collapsed the at-risk slot to the same words, and the pair read "Replace
// the current brand with a new brand? Your edits to a new brand are not saved anywhere else." A human
// found it. Nothing else could have.
//
// The expected sentence below is AUTHORED HERE, not built from anything the app exports — the brand
// names are corpus data read off the start screen, but the template is a second, independent statement
// of what the copy should say (docs/34 shape 2: an oracle assembled from the subject's own template
// cannot disagree with it). Swapping the two slots, dropping one, or collapsing them again fails here.
//
// SCOPE, and the first version of this paragraph got it wrong in the direction that mattered. It said
// `new` becomes an origin only through the plugin branch of `+ New brand`, and routed the just-regressed
// case to #1041 as structurally out of reach. False: the START SCREEN hands `loadBrand` a `{ kind: 'new' }`
// origin from both "Create theme →" and "Start blank" (`main.ts` 8448/8458), with no host gate on either
// path, so `provenance.origin.kind === 'new'` is ordinary web-bundle state — and the AT-RISK slot, which
// is the slot #722 had right and #1033 broke, is reachable here. Scenario B below drives it.
//
// What is true is only the narrower claim: no studio artifact can produce the PAIR of `new` phrases,
// because the arriving side needs `stageLoad(NEW_BRAND(), { kind: 'new' })` and that call really is behind
// `PRISM3_HOST === 'figma'`. Generalizing from "the arriving slot is plugin-only" to "the `new` case is
// plugin-only" is the same move this section's own subject makes — reasoning from the new position and
// losing the old one — and per docs/34 a stated limit wider than the real one reports blindness as a
// boundary. The arriving `new` label stays held by hand measurement on the built plugin bundle.
console.log(`\nOverwrite confirm (#1033)\n${'='.repeat(78)}`);
// A — both slots naming examples, which is the shape most reachable from the start screen.
{
  const [atRisk, arriving] = BRANDS;                        // loaded first, then replaced by the second
  const { ctx, page, drain } = await openBrand(atRisk);
  // `openBrand` enters through a start-screen chip, which loads with `{ kind: 'example', id }` — so the
  // origin is already an example and only an EDIT is missing before the guard has something to protect.
  // The edit is a rename on Brand › Identity (S3 moved the Name field there from the menu).
  await hooks.click(page.locator('[data-p3="tab-brand"]'));
  await page.fill('[data-p3="brand-name"]', 'renamed-in-smoke');
  await hooks.click(page.locator('[data-p3="brand-switcher"]'));
  await hooks.need(page, '[data-p3="brand-menu"] [data-p3="brand-menu-example"]');
  await hooks.click(page.locator('[data-p3="brand-menu"] [data-p3="brand-menu-example"]').filter({ hasText: arriving }).first());
  await hooks.need(page, '[data-p3="brand-menu"] [data-p3="overwrite-confirm"]');

  const said = (await page.textContent('[data-p3="brand-menu"] [data-p3="overwrite-confirm"]')).trim();
  const want = `Replace the current brand with the ${arriving} example? Your edits to the ${atRisk} example are not saved anywhere else.`;
  ok(said === want, `the confirm names the arriving origin and the one at risk, in that order — got "${said}"`);
  ok(await page.locator('[data-p3="brand-menu"] [data-p3="overwrite-replace"]').count() === 1, 'the confirm offers one Replace button');
  ok(await page.locator('[data-p3="brand-menu"] [data-p3="overwrite-cancel"]').count() === 1, 'the confirm offers one Cancel button');

  // Cancel keeps the edit. A guard that loses what it was protecting is the failure it exists to stop.
  await hooks.click(page.locator('[data-p3="brand-menu"] [data-p3="overwrite-cancel"]'));
  await page.waitForSelector('[data-p3="brand-menu"] [data-p3="overwrite-confirm"]', { state: 'detached' });
  ok(await page.inputValue('[data-p3="brand-name"]') === 'renamed-in-smoke', 'Cancel leaves the edit in place');
  const errs = drain();
  ok(errs.length === 0, `overwrite confirm: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
  console.log(`  A "${said}"`);          // what RENDERED, so a red run's log is not the expectation
}

// B — the AT-RISK slot naming `new`. This is the case #1033 regressed and the case the first version of
// this section claimed no studio artifact could reach: enter through "Start blank" (origin `new`, no host
// gate), edit, then click an example. Same three steps as A, one different entry path.
{
  const arriving = BRANDS[0];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await ctx.newPage();
  await hooks.watch(page);
  const drain = watchErrors(page);
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
  // The "Start blank" button by its own hook: the file-upload label beside it shares its class, and only
  // the button carries the `new` origin.
  await hooks.click(page.locator('[data-p3="start-blank"]'));   // "Start blank" → loadBrand(NEW_BRAND(), { kind: 'new' })
  await hooks.need(page, '[data-p3="frame"]');   // the app view (Color › Palettes draws the two panes from S2)
  await hooks.click(page.locator('[data-p3="tab-brand"]'));
  await page.fill('[data-p3="brand-name"]', 'renamed-in-smoke');
  await hooks.click(page.locator('[data-p3="brand-switcher"]'));
  await hooks.need(page, '[data-p3="brand-menu"] [data-p3="brand-menu-example"]');
  await hooks.click(page.locator('[data-p3="brand-menu"] [data-p3="brand-menu-example"]').filter({ hasText: arriving }).first());
  await hooks.need(page, '[data-p3="brand-menu"] [data-p3="overwrite-confirm"]');

  const said = (await page.textContent('[data-p3="brand-menu"] [data-p3="overwrite-confirm"]')).trim();
  // "this new brand", not "a new brand": the at-risk brand IS on screen, so the phrase points at it.
  // Collapsing `originLabel`'s two positions back to one string fails HERE and nowhere else.
  const want = `Replace the current brand with the ${arriving} example? Your edits to this new brand are not saved anywhere else.`;
  ok(said === want, `the at-risk slot names a new brand deictically — got "${said}"`);
  const errs = drain();
  ok(errs.length === 0, `overwrite confirm (new at risk): 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
  console.log(`  B "${said}"`);
}

// C — RETIRED IN UI REDESIGN S3. It held the Examples `.cur` marker live while the menu's Name field was typed
// into (#1075): the field patched the bar without re-rendering the menu, so a render-time marker went stale in
// the open popover. S3 moved the Name field to Brand › Identity, so no field in the menu writes the name any
// more and the marker is computed when the menu renders, from the same `brandState.id` (#1073's question,
// still open, decides which key it compares). The case it held, a name changing UNDER an open menu, no longer
// exists; a rename on Brand reaches the bar's name through the store's `identity` topic, which `test:chrome`
// holds (section 16).

// =============================================================================================
// 5b. The style guide's Outline hover fill follows the preview ground (#1629)
//
// `test-outline-roles.ts` holds the KEY choice; this holds the WIRING — that the rendered Outline row
// actually paints what that helper picks. On the Inverse ground the row used to paint the PAGE wash, so
// the hovered button looked exactly as it did on the page: the same `rgba(...)` string on both grounds.
//
// Oracle, independent of the studio: the wash polarity comes from `OVERLAY_PAL` (parsed out of
// `modes.ts` in section 2), and the page and band sit on opposite sides of light/dark by construction,
// so their washes must have OPPOSITE polarity — one darkens, one lightens. The corpus brands run the
// default `overlay-neutral`; if one ever does not, the "translucent wash" arm fails naming it rather
// than the polarity arm passing blind.
// =============================================================================================
console.log(`\nStyle guide Outline hover on the inverse ground (#1629)\n${'='.repeat(78)}`);
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  // The Style guide is Brand's preview from UI redesign S3 (lent into `preview/brand.ts`).
  await hooks.click(page.locator('[data-p3="tab-brand"]'));
  await hooks.need(page, '[data-p3="brand-style-guide"] [data-p3="style-guide-ground"]');
  // The primary palette block's Outline row, hover and pressed cells, read by their visible labels.
  const readOutline = () => page.evaluate(() => {
    const block = document.querySelector('[data-p3="style-guide-palette"]');
    const row = block?.querySelector('[data-p3="style-guide-outline"]');
    const out = {};
    for (const col of row?.querySelectorAll('[data-p3="style-guide-state"]') ?? []) out[col.querySelector('[data-p3="style-guide-state-name"]')?.textContent?.trim()] = getComputedStyle(col.querySelector('[data-p3="style-guide-button"]')).backgroundColor;
    return out;
  });
  const onPage = await readOutline();
  await page.selectOption('[data-p3="style-guide-ground"]', 'inverse.background.primary');
  await page.waitForFunction(() => document.querySelector('[data-p3="style-guide-ground"]')?.value === 'inverse.background.primary');
  const onBand = await readOutline();
  const where = `#1629 / ${brand}`;
  // Polarity of an `rgba(r, g, b, a)` wash: > 0 lightens, < 0 darkens. Opaque or missing reads null.
  const polarity = (s) => {
    const m = /rgba\(([^)]+)\)/.exec(s ?? '');
    if (!m) return null;
    const [r, g, b] = m[1].split(',').map(Number);
    return (r + g + b) / 3 - 127.5;
  };
  for (const st of ['hover', 'pressed']) {
    const p = polarity(onPage[st]), b = polarity(onBand[st]);
    ok(p !== null && b !== null, `${where}/${st}: both grounds paint a translucent Outline wash — page ${onPage[st]}, band ${onBand[st]}`);
    ok(p !== null && b !== null && Math.sign(p) === -Math.sign(b) && p !== 0,
      `${where}/${st}: the band's Outline wash has the opposite polarity to the page's (${OVERLAY_PAL.light} vs ${OVERLAY_PAL.dark}) — page ${onPage[st]}, band ${onBand[st]}`);
  }
  const errs = drain();
  ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
  console.log(`  ${brand}: page hover ${onPage.hover} → band hover ${onBand.hover}`);
}

// =============================================================================================
// 6. The inverse band's pill is still readable as a DIFFERENT token from its twin (#1147)
//
// `.tpill` elides with `direction:rtl` (#289), so the ellipsis bites at the START and the TAIL is what
// survives — chosen because sibling paths share long prefixes, and the tail is the discriminating part.
// #1141 moved the inverse marker to a LEADING `inverse.` group, i.e. into the part that goes first, and
// every one of the engine's inverse roles has a non-inverse twin differing by nothing else. Elide far
// enough and two different tokens render as the same string.
//
// The remedy under test: an `inverse` badge rendered as a SIBLING of the pill, inside a `.tpill-wrap`.
// Not inside the pill — anything inside `.tpill` is elided by the same rule it exists to survive — and
// not as pill text, which would change what a copied path yields. Both of those are checked below, and
// the second is why this section also asserts the pill's own text is still exactly its path.
//
// WHY THE PROBE CAPS `.tpill` RATHER THAN NARROWING THE VIEWPORT, which is the honest part.
// A viewport-only check asserts this where it cannot be violated: at the design width almost no pill
// clips at all, and shrinking the VIEWPORT clips pills without ever colliding twins, because a pill's
// container does not shrink with the window. That is docs/34 shape 15 — the comparison right, the set
// excluding the only case that can fail it. Capping the pill itself puts every pill in the regime the
// issue is about, on every page at once.
//
// THE CAP WINDOW IS MEASURED, NOT PICKED, and it is the load-bearing constant here — a bound, not a
// corpus size, so it is stated as a window rather than a frozen per-run count (#1232). Twin pairs begin
// eliding to identical text at or below a ~200px cap; the first collision between two paths that are NOT
// twins appears only near ~90px — `color.background.primary` vs `color.foreground.primary`, and
// `interactive.{primary,neutral,destructive}.overlay.hover` — an ambiguity in the MIDDLE of the path
// that no inverse badge could fix, and which no real container reaches. So a probe width belongs in
// (90, 200]; both `PILL_CAPS` used here sit inside it, and each run PRINTS how many pairs actually elide
// and collide at each cap. If this section ever fails naming two paths that are not twins, that is not
// #1147's defect: the cap has been set narrower than the studio renders, and the fix is to widen it.
//
// WHAT THIS DOES NOT COVER, measured rather than assumed. The wrapper is a flex container, and a flex
// item does not shrink below its content width without `min-width: 0` — so `.tpill-wrap` is a new way
// for a pill to push out of the box that held it. Nothing here asserts it: dropping that declaration
// moves no number in this suite, at 1440px or at 380px, because no container the studio renders is
// narrow enough for the min-content floor to apply. An assertion would pass with the CSS deleted, which
// is a pass reporting blindness (docs/34 shape 9). The declaration and its comment carry the finding.
//
// ONE MODE, deliberately. A pill's label is its path, which does not vary by mode; what varies is
// color, and that is section 1's business across every mode already. Light is also the state with the
// MOST pills — a derived mode replaces the editors with the read-only `.genview` note, so it can only
// render a subset of these.
console.log(`\nThe inverse band's pill label (#1147)\n${'='.repeat(78)}`);

/** Every rendered token pill, and the characters ACTUALLY VISIBLE in it.
 *
 *  `textContent` is not what anyone reads once a pill elides, and there is no API for "the text the
 *  ellipsis left", so this measures it: one `Range` per character, kept when the character's own box
 *  lies within the pill's content box. The coarse reading was tried and is not enough —
 *  `scrollWidth > clientWidth` says only THAT something is hidden, never what, and it is over-eager
 *  by a sub-pixel: at 1440px it reports an aurora pill clipped whose every character is fully visible.
 *
 *  Style-guide pills WRAP instead of eliding (`.sg-pills .tpill`), and a wrapped pill hides nothing —
 *  so the walk is skipped for them, which is also what stops it dropping their second line. */
const PILL_PROBE = () => {
  const out = [];
  for (const p of document.querySelectorAll('[data-p3="token-pill"]')) {
    if (p.getClientRects().length === 0) continue;
    const cs = getComputedStyle(p);
    const box = p.getBoundingClientRect();
    const left = box.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
    const right = box.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
    const elides = cs.overflow !== 'visible' && cs.textOverflow === 'ellipsis' && cs.whiteSpace === 'nowrap';
    let visible = p.textContent;
    if (elides) {
      const kept = [];
      const walk = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        for (let i = 0; i < n.data.length; i++) {
          const r = document.createRange();
          r.setStart(n, i);
          r.setEnd(n, i + 1);
          const cr = r.getBoundingClientRect();
          if (cr.left >= left - 0.5 && cr.right <= right + 0.5) kept.push(n.data[i]);
        }
      }
      visible = kept.join('');
    }
    // Looked up in the WRAPPER FIRST and then inside the pill, so a badge in the wrong place reports as
    // misplaced rather than as missing. Both readings fail the same assertion, but only one of them
    // names the actual mistake, and "no badge" would have sent a reader looking for the wrong thing.
    const wrap = p.parentElement?.matches('[data-p3="token-pill-wrap"]') ? p.parentElement : null;
    const badge = wrap?.querySelector('[data-p3="token-pill-inverse"]') ?? p.querySelector('[data-p3="token-pill-inverse"]');
    const br = badge?.getBoundingClientRect() ?? null;
    out.push({
      path: p.title,
      text: p.textContent,
      visible,
      badge: badge?.textContent ?? '',
      // OUTSIDE the pill's content box is the whole point of the badge being a sibling, and it is the
      // one property the markup cannot show: a marker inside `.tpill` is elided by the same rule.
      badgeOutside: br ? (br.right <= left + 0.5 || br.left >= right - 0.5) : false,
      badgeWidth: br ? Math.round(br.width) : 0,
      badgeRendered: (badge?.getClientRects().length ?? 0) > 0,
    });
  }
  return out;
};

/** Cap every pill through ONE owned `<style>` element — upserted rather than appended, so a nine-page
 *  walk cannot accumulate nine stylesheets, and `!important` so the cap holds against any rule that
 *  sets `max-width` at higher specificity than `.tpill`. */
const capPills = (page, px) => page.evaluate((w) => {
  const ID = 'smoke-pill-cap';
  document.getElementById(ID)?.remove();
  if (w === null) return;
  const s = document.createElement('style');
  s.id = ID;
  s.textContent = `[data-p3="token-pill"]{max-width:${w}px !important}`;
  document.head.append(s);
}, px);

/** A path's twin: the same path with its single `inverse` group removed. Matched as a whole SEGMENT, so
 *  a role that merely contains the letters is not one. `null` when the path is not an inverse role. */
const twinOf = (path) => {
  const segs = path.split('.');
  const i = segs.indexOf('inverse');
  return i < 0 ? null : segs.filter((_, k) => k !== i).join('.');
};

/** Every rendered pairing of an inverse pill with a rendering of its twin. Over ROWS, not paths: the
 *  studio shows some roles on more than one page, and "somewhere on screen these two read alike" is
 *  the hazard — a pair of renderings, not a pair of names. */
const twinPairings = (rows) => {
  const byPath = new Map();
  for (const r of rows) {
    if (!byPath.has(r.path)) byPath.set(r.path, []);
    byPath.get(r.path).push(r);
  }
  const pairs = [];
  for (const [path, mine] of byPath) {
    const twin = twinOf(path);
    for (const a of mine) for (const b of (twin && byPath.get(twin)) || []) pairs.push([a, b]);
  }
  return pairs;
};

/** DISTINCT paths that render the same label — badge plus visible characters, which is everything a
 *  reader has. The same path rendered twice is not a collision; it is the same token. */
const labelCollisions = (rows) => {
  const first = new Map();
  const hits = [];
  for (const r of rows) {
    const key = `${r.badge} ${r.visible}`;
    const prev = first.get(key);
    if (!prev) first.set(key, r);
    else if (prev.path !== r.path) hits.push(`"${r.badge ? `${r.badge} · ` : ''}${r.visible}" ← ${prev.path} AND ${r.path}`);
  }
  return hits;
};

/** Coverage floors — "did it look?", never the oracle. The oracle is the two properties themselves:
 *  every inverse pill carries a rendered badge outside its clipping box, and no two distinct paths
 *  render the same label. Each floor sits below its live measured value (printed per brand at the end of
 *  this section) so a page's content can move without failing here, and above zero so an empty read
 *  fails naming itself. No measured corpus size is frozen into this comment: that literal drifts as the
 *  engine grows pills or inverse roles, and a count written beside a passing assertion reads as
 *  measured-now (#1232) — the live figures are in the console line below. */
const PILL_FLOOR = 250;
const INVERSE_PILL_FLOOR = 12;
const TWIN_PAIRING_FLOOR = 20;
const TWIN_HAZARD_FLOOR = 5;
const PILL_CAPS = [200, 130];

for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  // The legacy pages first, through the Pages menu, until S8.2 left the web none (section 1): the moved pages below.
  const pages = [];
  const natural = [];
  const capped = new Map(PILL_CAPS.map((w) => [w, []]));
  // The legacy pages, then Brand: its Style guide, the page with most of the inverse pills, left the Pages
  // menu in UI redesign S3 and is Brand's preview now.
  const walkPills = async () => {
    natural.push(...await page.evaluate(PILL_PROBE));
    for (const w of PILL_CAPS) {
      await capPills(page, w);
      capped.get(w).push(...await page.evaluate(PILL_PROBE));
    }
    await capPills(page, null);
  };
  await hooks.click(page.locator('[data-p3="tab-brand"]'));
  await hooks.need(page, '[data-p3="brand-style-guide"] [data-p3="token-pill"]');
  await walkPills();
  pages.push('Brand');
  // Color › Interactive (UI redesign S5.2): its Links section draws each family's twin on the inverse band.
  await gotoInteractive(page);
  await hooks.need(page, '[data-p3="interactive-style-guide"] [data-p3="token-pill"]');
  await walkPills();
  pages.push('Interactive');
  // Depth & motion (UI redesign S9.2): the shadow, duration, easing, transition and spring pills the legacy Elevation and
  // Motion pages drew, in its preview now.
  await gotoDepth(page);
  await hooks.need(page, '[data-p3="depth-style-guide"] [data-p3="token-pill"]');
  await walkPills();
  pages.push('Depth & motion');
  // Layout (UI redesign S10): the breakpoint, grid and container pills the legacy Layout page drew, in its preview now.
  await gotoLayout(page);
  await hooks.need(page, '[data-p3="layout-style-guide"] [data-p3="token-pill"]');
  await walkPills();
  pages.push('Layout');

  const where = `#1147 / ${brand}`;
  const sample = (rows, fmt) => rows.slice(0, 3).map(fmt).join(' | ');

  ok(natural.length >= PILL_FLOOR,
    `${where}: ${natural.length} pills rendered across ${pages.length} pages (floor ${PILL_FLOOR}) — everything below is vacuous without them`);

  // The section compares PATHS, and it reads them off `title`. If a pill's title ever stops being a
  // path — the shape `sgPill` records, where `title` was once overwritten with the resolution
  // (`neutral.100 · #ffffff · 4.5:1`) — every twin pairing below silently stops being found, and a gate
  // that finds nothing passes. So: a slug, and enough DOTTED ones to pair on.
  //
  // Single-segment titles are legitimate: a handful per brand, the short contextual labels `sgPill`
  // is passed explicitly (`opacity`, `on-fill`, `border`) where the row supplies the context.
  // Two rows can therefore carry the same short label, which is deliberate context-dependence and not
  // the elision ambiguity this section is about — and it is why `labelCollisions` counts only pills
  // whose titles DIFFER.
  const notASlug = natural.filter((r) => !/^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*$/.test(r.path));
  ok(notASlug.length === 0,
    `${where}: every pill's title is still a token slug, not a resolution (${notASlug.length} are not${notASlug.length ? `: ${sample(notASlug, (r) => JSON.stringify(r.path))}` : ''})`);
  const dotted = natural.filter((r) => r.path.includes('.'));
  ok(dotted.length >= PILL_FLOOR,
    `${where}: ${dotted.length} of them carry a full dotted path for this section to pair on (floor ${PILL_FLOOR})`);

  // The badge added no TEXT to the pill. Two earlier attempts at this marker did, and both regressed
  // copy-and-paste: `inline-flex` blockified the parts into "color\n.background.primary", and
  // `inline-block` + a `ch` width collapsed the head on 181 of 198 pills. `.sg-fx`'s `!` — the style
  // guide's own contrast-failure marker, appended inside the pill — is the one legitimate addition.
  const textDrift = natural.filter((r) => r.text.replace(/!$/, '') !== r.path);
  ok(textDrift.length === 0,
    `${where}: each pill's own text is still exactly its path, so a copy yields the path and not the badge (${textDrift.length} differ${textDrift.length ? `: ${sample(textDrift, (r) => `${r.path} → ${JSON.stringify(r.text)}`)}` : ''})`);

  const inverse = natural.filter((r) => twinOf(r.path));
  ok(inverse.length >= INVERSE_PILL_FLOOR,
    `${where}: ${inverse.length} of those pills name an inverse role (floor ${INVERSE_PILL_FLOOR})`);

  // THE LOAD-BEARING STRUCTURAL ASSERTION, and it does not depend on any width: the badge exists, it
  // renders, and it sits outside the box that elides. Removing the badge fails this once per pill.
  const unbadged = inverse.filter((r) => r.badge !== 'inverse' || !r.badgeRendered || r.badgeWidth < 6 || !r.badgeOutside);
  ok(unbadged.length === 0,
    `${where}: all ${inverse.length} inverse-band pills carry a rendered \`inverse\` badge OUTSIDE the pill's clipping box (${unbadged.length} do not${unbadged.length ? `: ${sample(unbadged, (r) => `${r.path} [badge ${JSON.stringify(r.badge)}, ${r.badgeWidth}px, rendered=${r.badgeRendered}, outside=${r.badgeOutside}]`)}` : ''})`);

  // And the other direction, which the count above cannot see: a badge on EVERY pill would satisfy it
  // and would be a different lie about the same tokens.
  const misbadged = natural.filter((r) => !twinOf(r.path) && r.badge);
  ok(misbadged.length === 0,
    `${where}: no pill outside the inverse band carries the badge (${misbadged.length} do${misbadged.length ? `: ${sample(misbadged, (r) => r.path)}` : ''})`);

  const pairings = twinPairings(natural);
  ok(pairings.length >= TWIN_PAIRING_FLOOR,
    `${where}: ${pairings.length} rendered inverse/twin pairing(s) to compare (floor ${TWIN_PAIRING_FLOOR}) — as many of #1141's name-level twins as the studio puts on screen at once`);

  // The brief's property, at the width the studio is designed for.
  const naturalHits = labelCollisions(natural);
  ok(naturalHits.length === 0,
    `${where}: at the design width no two distinct paths render the same pill label (${naturalHits.length}${naturalHits.length ? `: ${naturalHits.slice(0, 3).join(' | ')}` : ''})`);

  const capSummary = [];
  for (const w of PILL_CAPS) {
    const rows = capped.get(w);
    const hazard = twinPairings(rows).filter(([a, b]) => a.visible === b.visible);
    // Asserted BEFORE the collision check and separately from it: at a cap where nothing elides far
    // enough to be ambiguous, the check below passes on a badge that was never rendered.
    // UI redesign S5.2 retired the legacy Interactive page, whose one-line `tokenPill`s were the pills that
    // elided. The pills on screen now (the shared Style guide sections') break at their dots instead, so at a
    // cap they wrap and show the whole path. That is the other way the premise holds: either enough twins
    // elide to identical text for the check below to bite, or no capped pill in a twin pairing hides any of
    // its path (legacy pills elsewhere still elide, but none of them has an inverse twin).
    const capPairs = twinPairings(rows);
    const twinPills = capPairs.flat();
    const elided = twinPills.filter((r) => r.visible !== r.text);
    ok(capPairs.length >= TWIN_PAIRING_FLOOR && (hazard.length >= TWIN_HAZARD_FLOOR || elided.length === 0),
      `${where} @ ${w}px cap: ${hazard.length} twin pairing(s) elide to identical text, so the badge is the only thing telling them apart (floor ${TWIN_HAZARD_FLOOR}), or no pill of the ${twinPills.length} in a twin pairing elides (${elided.length} do)${
        hazard.length ? ` — e.g. "${hazard[0][0].visible}" for both ${hazard[0][0].path} and ${hazard[0][1].path}` : elided.length ? ` — e.g. ${elided[0].path} shows "${elided[0].visible}"` : ''}`);
    const hits = labelCollisions(rows);
    ok(hits.length === 0,
      `${where} @ ${w}px cap: every rendered label still names one token (${hits.length} collision(s)${hits.length ? `: ${hits.slice(0, 3).join(' | ')}` : ''})`);
    capSummary.push(`@${w}px ${hazard.length} ambiguous / ${hits.length} colliding`);
  }

  const errs = drain();
  ok(errs.length === 0, `${where}: 0 console errors across the pill walk${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  // The MEASUREMENTS, not the expectation — a red run's log has to read as a red run (the same reason
  // the overwrite-confirm section above logs what rendered rather than what it wanted).
  console.log(`  ${brand}: ${natural.length} pills, ${inverse.length} in the inverse band, ${pairings.length} twin pairings, `
    + `${naturalHits.length} colliding at the design width; ${capSummary.join(', ')}.`);
  await ctx.close();
}

// =============================================================================================
// 7. The outline EDGE is authorable, and it can leave the ink behind (#576)
// =============================================================================================
// #576's engine half landed in #1231: `interactive.<c>.border.{rest,hover,pressed}` and the inverse twin,
// derived from the text ink's own candidates so the edge follows the label by default. Color › Interactive
// (UI redesign S5.2) edits each as a row, its Hover and Pressed under it, and the preview's Outline row draws
// the edge per state.
//
// WHY THE PRESENCE OF THE ROWS IS NOT THE LOAD-BEARING ARM. A row that renders and offers steps can still be
// inert in the way that matters here: a specimen that paints the border AND the ink from one color keeps
// showing the ink whatever the row says. So the arm that carries the fix is the DIVERGENCE: override the
// border and the preview's edge must move while its ink holds still.
//
// THE PER-FAMILY EXPECTATION IS MEASURED FROM THE ENGINE, NOT FROM THE DOM (docs/34 shape 1). Across all
// six corpus themes, `primary` and `destructive` walk three distinct border steps while `neutral`'s three
// states land on ONE — its ink is already the far end of its ramp with nowhere further to walk, which is
// #576's decided outcome, not a regression. That split is asserted in both directions.
//
// ONE MODE, one page. Light is a mode with editors.
console.log(`\nThe outline edge (#576)\n${'='.repeat(78)}`);

// 3 families × 2 contexts, and no corpus brand ships an accent column — so this is the whole set (asserted
// against the rendered page after the loop, #1245).
const EDGE_FAMILIES = ['primary', 'neutral', 'destructive'];
// Which families' border states WALK. Read from the engine's behavior, restated here on purpose: this is
// the duplication that makes the assertion a comparison instead of a tautology.
const EDGE_WALKS = new Set(['primary', 'destructive']);

/** One Border row, read as a whole: its swatch, its label, and its nested Hover and Pressed rows. */
const readEdgeRow = (page, role) => page.evaluate((r) => {
  const row = document.querySelector(`[data-p3="levers-pane"] .p3-fillrow[data-role="${r}"]`);
  if (!row) return null;
  const group = row.closest('[data-p3="int-row-group"]');
  return {
    swatch: getComputedStyle(row.querySelector('.p3-fill-sw')).backgroundColor,
    label: row.querySelector('[data-p3="int-pick"] .p3-btn-label')?.textContent?.trim() ?? null,
    states: [...(group?.querySelectorAll('[data-p3="int-row-states"] .p3-fillrow') ?? [])].map((c) => ({
      role: c.dataset.role, name: c.querySelector('.p3-fill-label')?.textContent ?? '',
      swatch: getComputedStyle(c.querySelector('.p3-fill-sw')).backgroundColor, pick: !!c.querySelector('[data-p3="int-pick"]'),
    })),
  };
}, role);

for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await gotoInteractive(page);
  const notes = [];

  for (const fam of EDGE_FAMILIES) {
    for (const inverse of [false, true]) {
      const ROLE = `${inverse ? 'inverse.' : ''}interactive.${fam}.border.rest`;
      const where = `${brand} ${fam}${inverse ? ' · inverse' : ''}`;
      const r = await readEdgeRow(page, ROLE);
      ok(r !== null, `${where}: the ${ROLE} row is present — the border is authorable (#576)`);
      if (!r) continue;
      ok(/^Auto · /.test(r.label ?? ''), `${where}: its row starts on Auto ("${r.label}")`);
      ok(r.states.length === 2 && r.states[0].name === 'Hover' && r.states[1].name === 'Pressed' && r.states.every((s) => s.pick),
        `${where}: Hover and Pressed each get their own row under it, each with its picker (${r.states.map((s) => `${s.name}:${s.pick}`).join(', ') || 'none'})`);
      const walks = r.states.every((s) => s.swatch !== r.swatch);
      const holds = r.states.every((s) => s.swatch === r.swatch);
      ok(EDGE_WALKS.has(fam) ? walks : holds,
        `${where}: its border states ${EDGE_WALKS.has(fam) ? 'WALK away from rest' : 'all land on rest (#576, decided)'} `
        + `— rest ${r.swatch}, ${r.states.map((s) => `${s.name} ${s.swatch}`).join(', ')}`);
      notes.push(`${fam}${inverse ? '·inv' : ''} ${EDGE_WALKS.has(fam) ? 'walks' : 'holds'}`);
    }
  }

  // THE SET IS CLOSED, asserted rather than assumed (#1245): every Border row the page renders, by its role,
  // must be exactly EDGE_FAMILIES in both contexts.
  const rendered = await page.evaluate(() => [...document.querySelectorAll('[data-p3="levers-pane"] .p3-fillrow[data-role]')]
    .map((n) => /^(inverse\.)?interactive\.([a-z0-9-]+)\.border\.rest$/.exec(n.dataset.role)).filter(Boolean).map((m) => `${m[2]}${m[1] ? ' · inverse' : ''}`));
  const expectedEdges = EDGE_FAMILIES.flatMap((f) => [f, `${f} · inverse`]);
  const unvisited = [...new Set(rendered)].filter((k) => !expectedEdges.includes(k));
  const unrendered = expectedEdges.filter((k) => !rendered.includes(k));
  ok(unvisited.length === 0 && unrendered.length === 0 && rendered.length === expectedEdges.length,
    `${brand}: the page renders exactly ${expectedEdges.length} Border rows, one per EDGE_FAMILIES family × {page, inverse} `
    + `(rendered ${rendered.length}${unvisited.length ? `; NOT VISITED by this section: ${unvisited.join(', ')} — add the family to EDGE_FAMILIES` : ''}`
    + `${unrendered.length ? `; missing: ${unrendered.join(', ')}` : ''})`);

  // --- THE DIVERGENCE, driven on primary --------------------------------------------------------
  const ROLE = 'interactive.primary.border.rest';
  const INK = 'interactive.primary.text.rest';
  const outline = () => page.evaluate(READ_OUTLINE, 'Primary');
  const before = await readEdgeRow(page, ROLE);
  const inkBefore = (await readIRow(page, INK))?.swatch;
  const o0 = await outline();
  ok(o0.length === 3 && o0[0].edge === before?.swatch && o0[0].edge === o0[0].ink,
    `${brand}: with no override the preview's Outline edge is the Border row's color and the same as its ink (${o0[0]?.edge}, ink ${o0[0]?.ink}) — the border follows the ink by default (#1231)`);
  ok(o0[1]?.edge === before?.states[0]?.swatch && o0[2]?.edge === before?.states[1]?.swatch,
    `${brand}: the preview's Outline hover and pressed edges are the Hover and Pressed rows' colors (${o0[1]?.edge}, ${o0[2]?.edge})`);
  // The step has to be one that MOVES the resolved color.
  let steps = [];
  await withPicker(page, ROLE, async (pk) => { steps = await pk.locator('[data-p3="step-picker-step"]').evaluateAll((ns) => ns.map((n) => n.dataset.step)); });
  let pick = null, during = null;
  for (const step of steps) {
    await withPicker(page, ROLE, (pk) => hooks.click(pk.locator(`[data-p3="step-picker-step"][data-step="${step}"]`)));
    during = await readEdgeRow(page, ROLE);
    if (during?.swatch !== before?.swatch) { pick = step; break; }
  }
  ok(pick !== null, `${brand}: some step in the border picker moves the resolved color (picked '${pick}')`);
  const o1 = await outline();
  // THE LOAD-BEARING ASSERTION. Both halves matter: the edge followed the override, and the ink did not.
  ok(o1[0]?.edge === during?.swatch && o1[0]?.edge !== o0[0]?.edge,
    `${brand}: pinning the border moves the preview's Outline EDGE (${o0[0]?.edge} → ${o1[0]?.edge}, row ${during?.swatch}) (#576)`);
  ok(o1[0]?.ink === o0[0]?.ink, `${brand}: and leaves the Outline INK where it was (${o0[0]?.ink}) — the edge can now differ from the label it surrounds`);
  ok((await readIRow(page, INK))?.swatch === inkBefore, `${brand}: the Text · rest row is untouched by a border override (${inkBefore}) — the override is scoped to the one role`);
  await withPicker(page, ROLE, (pk) => hooks.click(pk.locator('[data-p3="step-picker-auto"]')));
  const back = await readEdgeRow(page, ROLE);
  ok(back?.swatch === before?.swatch && back?.label === before?.label && (await outline())[0]?.edge === o0[0]?.edge,
    `${brand}: Return to Auto returns the edge the Auto label named (${back?.swatch}, "${back?.label}")`);

  const errs = drain();
  ok(errs.length === 0, `${brand}: 0 console errors across the edge drive${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`  ${brand}: ${notes.length} border rows (${notes.join(', ')}); pinned primary to '${pick}' `
    + `— edge ${o0[0]?.edge} → ${o1[0]?.edge}, ink held at ${o0[0]?.ink}.`);
  await ctx.close();
}

// =============================================================================================
// 8. The Links section surfaces the global link role + its states (#1487)
// =============================================================================================
// The single global link role (#1486) — `text.link.*` / `icon.link.*` with their inverse twins — is drawn in
// Color › Interactive's preview (UI redesign S5.2: its Links section), every state of every family, and each
// family's resting link is a row in the levers.
//
// THE ORACLE IS THE ENGINE'S EMITTED TOKEN TREE, NOT THE STUDIO'S RENDER (docs/34 shape 1). Which link
// families exist, and which states each carries, is read from `packages/engine/out/aurora.tokens.json`, and
// the preview is then required to draw exactly that set. The link role SET is brand-independent (only the
// values differ per brand), so one emitted file is a valid oracle for whichever corpus brand is shown.
//
// TWO restated constants, each a deliberate duplication that turns an assertion into a comparison:
// FAMILY_ORDER (the preview's row order: the page, then the inverse band) and PRESENTATION_ORDER (default →
// hover → pressed → visited → focused). Both are the studio's OWN promise. And the values are checked
// behaviorally: the engaged states are four distinct colors, and `focused` equals `default` (#1486).
console.log(`\nThe Links section (#1487)\n${'='.repeat(78)}`);

const LINK_ORACLE_FILE = join(ROOT, '..', '..', 'packages', 'engine', 'out', 'aurora.tokens.json');
const emittedLinks = await (async () => {
  const tree = JSON.parse(await readFile(LINK_ORACLE_FILE, 'utf8'));
  const fams = {};
  const walk = (o, path) => {
    if (!o || typeof o !== 'object') return;
    if ('$value' in o) {
      const m = /\.color\.((?:inverse\.)?(?:text|icon))\.link\.([a-z]+)$/.exec(path);
      if (m) (fams[m[1]] ??= new Set()).add(m[2]);
      return;
    }
    for (const k of Object.keys(o)) walk(o[k], path ? `${path}.${k}` : k);
  };
  walk(tree, '');
  return fams;
})();
const ORACLE_FAMILIES = Object.keys(emittedLinks).sort();
ok(ORACLE_FAMILIES.length === 4,
  `the oracle read ${ORACLE_FAMILIES.length} link families from the engine's emission (${ORACLE_FAMILIES.join(', ') || 'NONE'})`);
ok(ORACLE_FAMILIES.every((f) => emittedLinks[f].size >= 5),
  `every emitted link family carries at least 5 states (${ORACLE_FAMILIES.map((f) => `${f}:${emittedLinks[f].size}`).join(', ')})`);
const FAMILY_ORDER = ['text', 'icon', 'inverse.text', 'inverse.icon'];
const PRESENTATION_ORDER = ['default', 'hover', 'pressed', 'visited', 'focused'];
ok(new Set(FAMILY_ORDER).size === new Set(ORACLE_FAMILIES).size && FAMILY_ORDER.every((f) => emittedLinks[f]),
  `the four drawn families are exactly the ones the engine emits (drawn ${FAMILY_ORDER.join(', ')}; emitted ${ORACLE_FAMILIES.join(', ')})`);
/** ACTUAL — the preview's Links section as drawn: each row's family and, per state, the role its specimen
 *  paints, the state's name and the ink. */
const READ_LINKS = () => {
  const sec = document.querySelector('[data-p3="interactive-style-guide"] .psec[data-sg-section="links"]');
  if (!sec) return null;
  return {
    rows: [...sec.querySelectorAll('[data-p3="style-guide-link-row"]')].map((row) => ({
      family: row.dataset.family,
      states: [...row.querySelectorAll('[data-p3="style-guide-state"]')].map((c) => {
        const spec = c.querySelector('[data-sg-role]');
        return { role: spec?.dataset.sgRole ?? null, name: c.querySelector('[data-p3="style-guide-state-name"]')?.textContent?.trim() ?? '', ink: spec ? getComputedStyle(spec).color : null };
      }),
    })),
    levers: [...document.querySelectorAll('[data-p3="link-rows"] .p3-fillrow')].map((n) => n.dataset.role),
  };
};

for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await gotoInteractive(page);
  const emission = await loadEmission(brand);
  const shown = await page.evaluate(READ_LINKS);
  ok(shown !== null, `${brand}: Color › Interactive's preview carries a Links section`);
  if (!shown) { await ctx.close(); continue; }
  ok(JSON.stringify(shown.rows.map((r) => r.family)) === JSON.stringify(FAMILY_ORDER), `${brand}: the Links section draws the families in order (${shown.rows.map((r) => r.family).join(', ')})`);
  ok(JSON.stringify(shown.levers) === JSON.stringify(['text.link.default', 'inverse.text.link.default', 'icon.link.default', 'inverse.icon.link.default']),
    `${brand}: the levers carry each family's resting link as a row (${shown.levers.join(', ')})`);
  for (const fam of FAMILY_ORDER) {
    const row = shown.rows.find((r) => r.family === fam);
    const where = `${brand} ${fam}`;
    if (!row) { ok(false, `${where}: the ${fam} link row is present`); continue; }
    const drawn = new Set(row.states.map((s) => s.role));
    for (const st of [...emittedLinks[fam]].sort()) ok(drawn.has(`${fam}.link.${st}`), `${where}: draws ${fam}.link.${st} (an emitted state must appear in the section)`);
    ok(row.states.length === emittedLinks[fam].size, `${where}: draws exactly the ${emittedLinks[fam].size} emitted states, no more (${row.states.length} cells)`);
    const order = row.states.map((s) => s.role?.split('.').pop());
    ok(order.join(',') === PRESENTATION_ORDER.join(','), `${where}: states are shown in depth order (${order.join(' → ')})`);
    ok(row.states.map((s) => s.name).join(',') === PRESENTATION_ORDER.join(','), `${where}: each cell's label names its state (${row.states.map((s) => s.name).join(', ')})`);
    const cell = Object.fromEntries(row.states.map((s) => [s.role?.split('.').pop(), s.ink]));
    for (const s of row.states) ok(rgbHex(s.ink) === emission?.role(s.role, 'light')?.hex, `${where}: ${s.role} is drawn in its emitted color (${rgbHex(s.ink)}, emitted ${emission?.role(s.role, 'light')?.hex})`);
    const engaged = ['default', 'hover', 'pressed', 'visited'].map((k) => cell[k]);
    ok(new Set(engaged).size === 4, `${where}: default/hover/pressed/visited are four distinct colors (${engaged.join(', ')}) (#1486)`);
    ok(cell.focused === cell.default, `${where}: focused resolves to the same color as default — the ring carries focus, not the ink (${cell.focused}) (#1486)`);
  }
  const errs = drain();
  ok(errs.length === 0, `${brand}: reading the Links section raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`  ${brand}: ${shown.rows.length} link rows, ${shown.rows.reduce((n, r) => n + r.states.length, 0)} state cells drawn.`);
  await ctx.close();
}

// =============================================================================================
// 8b. The link palette lever (#1496) — decouple links + the WCAG 1.4.1 warning
// =============================================================================================
// #1496 gives links their OWN palette, independent of the action palette. This drives Color › Interactive's
// Link palette: choosing `neutral` (a target the action palette never offers, #1811) must (a) MOVE the link
// ink the preview draws onto a different ramp, and (b) surface the WCAG 1.4.1 (Use of Color) underline
// warning on the lever — warn, never force, never block. A colour-distinct palette (primary) shows NO
// warning, and Auto (owner decision Q36) follows the action palette again. The studio reads the engine's OWN
// decision (theme.notes) to fire the warning, so this asserts the studio SURFACES the engine's flag.
console.log(`\nThe link palette lever (#1496)\n${'='.repeat(78)}`);
{
  const brand = BRANDS[0];
  const { ctx, page, drain } = await openBrand(brand);
  await gotoInteractive(page);
  const sel = page.locator('[data-p3="link-palette-select"]');
  ok((await sel.count()) === 1, `${brand}: Color › Interactive carries a Link palette select`);
  const options = await sel.evaluate((s) => [...s.options].map((o) => o.value));
  ok(options[0] === '' && options.includes('neutral') && options.includes('primary'), `${brand}: the Link palette offers Auto first, then 'neutral' and 'primary' (${options.join(', ')})`);
  const read = () => page.evaluate(() => ({
    warn: /1\.4\.1/.test(document.querySelector('[data-p3="link-palette-warning"]')?.textContent ?? ''),
    ink: (() => { const n = document.querySelector('[data-p3="interactive-style-guide"] [data-sg-role="text.link.default"]'); return n ? getComputedStyle(n).color : null; })(),
  }));
  const before = await read();
  await sel.selectOption('neutral');
  await page.waitForFunction(() => /1\.4\.1/.test(document.querySelector('[data-p3="link-palette-warning"]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
  const neu = await read();
  ok(neu.warn === true, `${brand}: selecting a neutral link palette surfaces the WCAG 1.4.1 underline warning on the lever (warn, not force)`);
  const warnSeen = { seen: neu.warn === true, state: 'the WCAG 1.4.1 warning on the Link palette lever, after selecting neutral' };
  hooks.absent(ok, warnSeen, before.warn === false, `${brand}: no WCAG 1.4.1 warning before a non-distinct link palette is chosen`);
  ok(neu.ink && neu.ink !== before.ink, `${brand}: the resting link the preview draws moves when links are repointed to neutral (${before.ink} → ${neu.ink})`);
  await sel.selectOption('primary');
  await page.waitForFunction(() => !document.querySelector('[data-p3="link-palette-warning"]'), null, { timeout: 5000 }).catch(() => {});
  hooks.absent(ok, warnSeen, (await read()).warn === false, `${brand}: a colour-distinct (primary) link palette shows no warning`);
  await sel.selectOption('');
  await page.waitForFunction(() => document.querySelector('[data-p3="link-palette-select"]')?.value === '', null, { timeout: 5000 }).catch(() => {});
  const auto = await read();
  ok(auto.ink === before.ink && (await persistedAt(page, 'linkPalette')) === null, `${brand}: Auto follows the action palette again and unsets the key (ink ${auto.ink}, persisted ${JSON.stringify(await persistedAt(page, 'linkPalette'))})`);
  const errs = drain();
  ok(errs.length === 0, `${brand}: driving the Link palette lever raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`  ${brand}: link palette lever drives neutral→warn, primary→clear, Auto→follows.`);
  await ctx.close();
}

// =============================================================================================
// N. Per-breakpoint grid readout + editable column overrides (#1532)
// =============================================================================================
// WHAT THIS GATES. The Layout page surfaces the RESOLVED per-breakpoint columns (a readout) and lets
// the author OVERRIDE a breakpoint's column count. Both must agree with what the engine EMITS as the
// Figma grid styles (#1480) — the readout reads `theme.layout.grid`, the same data `buildFigmaGridStyles`
// ships from, so it cannot drift. This drives the built dist and proves it end to end. Since UI redesign S10
// the readout is the Layout preview's Grid section (`preview/sections/grid.ts`, each breakpoint's Columns value,
// `data-bpcol`) and the override is the levers' per-breakpoint Columns value picker (`bp-cols-pick`); the scenario,
// its oracle and both mutations moved with them unchanged.
//
// INDEPENDENCE (docs/34 shape 1). EXPECTED is the ENGINE'S OWN EMITTED artifact —
// `packages/engine/out/figma/aurora/grid-styles.json`, the grid styles a brand actually ships — NOT a
// re-derivation in this file and NOT read back off the same DOM. A gate whose oracle is the subject
// cannot see the subject break. aurora is the emitted studio brand (6 floors, base 12 → xs 4 / sm 8 /
// md·lg·xl·2xl 12), so its grid-styles.json is the truth the readout must match.
//
// MUTATION REGISTER (docs/34: a gate that cannot see its subject cannot fail). Applied to the SUBJECT,
// re-run, the named assertion confirmed among the failures, then reverted:
//   M1 (readout-vs-emission tie) `gridSection`'s `String(g.columns)` → `String(ly.baseColumns)`
//      (re-derive the readout in the UI from the base instead of the resolved grid). xs shows 12, not the
//      emitted 4, so the READOUT arm diverges from the emitted grid value BY NAME.
//   M2 (override application) `buildLayout`'s `resolveColumns(overrides[b.name], cols(i))` → `cols(i)`
//      (ignore the override). Setting md's override no longer moves md's readout off the ladder value, so
//      the OVERRIDE arm fails BY NAME while the untouched breakpoints stay green.
if (BRANDS.includes('aurora')) {
  console.log(`\nPer-breakpoint grid readout + column overrides (#1532)\n${'='.repeat(78)}`);
  // The oracle: the engine's own emitted Figma grid styles for aurora — { bp: columns }.
  const gridStylesRaw = await readFile(join(ROOT, '..', '..', 'packages', 'engine', 'out', 'figma', 'aurora', 'grid-styles.json'), 'utf8');
  const EMITTED = Object.fromEntries(JSON.parse(gridStylesRaw).styles.map((s) => [s.name.replace('Grid / ', ''), s.layoutGrids[0].count]));
  ok(Object.keys(EMITTED).length >= 5, `#1532: the aurora grid-styles oracle carries ${Object.keys(EMITTED).length} breakpoints (from the emitted artifact, not a re-derivation)`);

  const { ctx, page, drain } = await openBrand('aurora');
  await gotoLayout(page);
  // ACTUAL — the resolved columns the readout shows, keyed by breakpoint (from the `data-bpcol` cells).
  const readout = () => page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('[data-bpcol]')].map((c) => [c.dataset.bpcol, Number(c.textContent)])));

  // (a) READOUT === EMITTED. Every emitted breakpoint's column count appears in the readout, by name.
  const shown = await readout();
  const mismatch = Object.entries(EMITTED).filter(([bp, c]) => shown[bp] !== c);
  ok(mismatch.length === 0,
    `#1532: the per-breakpoint readout equals the engine's EMITTED grid columns [${Object.entries(EMITTED).map(([b, c]) => `${b}:${c}`).join(' ')}]`
      + (mismatch.length ? ` — DIVERGED: ${mismatch.map(([b, c]) => `${b} shows ${shown[b] ?? '(absent)'}, emits ${c}`).join('; ')}` : ''));

  // (b) OVERRIDE moves exactly one breakpoint. md's ladder value is 12; pin it to 6 (a curated, distinct
  // count) and confirm md's readout becomes 6 while every OTHER breakpoint keeps its emitted ladder value.
  await hooks.click(page.locator('[data-p3="bp-cols-pick"][data-bp="md"]'));
  await hooks.click(page.locator('[data-p3="value-picker-value"][data-value="6"]'));
  // The pick rebuilds and repaints by subscription; the bounded, non-throwing wait lets a slow
  // repaint land WITHOUT hanging the suite if the override is broken — so a regression fails cleanly by
  // name at the ok() below rather than as a wait timeout.
  await page.waitForFunction(() => document.querySelector('[data-bpcol="md"]')?.textContent === '6', undefined, { timeout: 4000 }).catch(() => {});
  const after = await readout();
  ok(after.md === 6, `#1532: overriding md to 6 moves md's emitted column count off the ladder (was ${EMITTED.md}, now ${after.md})`);
  const others = Object.keys(EMITTED).filter((bp) => bp !== 'md');
  const moved = others.filter((bp) => after[bp] !== EMITTED[bp]);
  ok(moved.length === 0,
    `#1532: an override on md leaves every OTHER breakpoint on its emitted ladder value`
      + (moved.length ? ` — MOVED: ${moved.map((bp) => `${bp} ${after[bp]}≠${EMITTED[bp]}`).join(', ')}` : ''));

  const errs = drain();
  ok(errs.length === 0, `#1532: reading + editing the per-breakpoint grid raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);

  await ctx.close();
}

// The facePin control (#1467) — a typed style cut reaches brand input AND the emitted DTCG
//
// #1368 gave the engine `facePin`: a VERBATIM Figma family+style baked onto one (category, weight-role)
// slot's Text Style — the only way to reach a WIDTH cut like "Light Condensed", because Figma's
// fontStyle is a STRING and a numeric weight axis can never name a width. #1467 exposes it in the
// studio as a free-text style input (owner-decided shape). The load-bearing behaviour, and the
// by-name mutation target (docs/34): the control must write faces.<cat>.<role> = { family, style } into
// the brand input, with `family` FIXED to the slot's already-bound face (else the engine drops the pin,
// theme.ts ~:1315) and `style` the verbatim text typed. The oracle is authored here — the bound face is
// read from the row the control SHOWS, and the style is the string this test types — so a write that
// stored the wrong family (empty / the style / a different face) or the wrong style fails BY NAME.
console.log(`\nfacePin — Pin a cut control (#1467)\n${'='.repeat(78)}`);
{
  const STYLE = 'Light Condensed';   // a WIDTH cut — precisely the case a numeric weight cannot reach, which is why facePin exists
  const brand = BRANDS[0];
  const { ctx, page, drain } = await openBrand(brand);
  await gotoType(page);
  await hooks.need(page, '[data-p3="pin-cut-table"]');

  // FLOOR: the control is present and reachable for a slot that supports a pin. A studio that dropped
  // the section, or offered no pinnable slot, fails HERE — before any write is attempted.
  const slotCount = await page.locator('[data-p3="pin-cut-row"]').count();
  ok(slotCount > 0, `${brand}: the Pin-a-cut section offers at least one pinnable slot (found ${slotCount})`);
  const inputCount = await page.locator('[data-p3="pin-cut-input"]').count();
  ok(inputCount === slotCount, `${brand}: every pinnable slot carries a free-text style input (${inputCount} inputs for ${slotCount} slots)`);
  // #1296 — the engine refuses ANY pin in an italic-default category, so the control must not offer one.
  // Oracle: the committed emission (a category whose every composite is italic under its bare name).
  {
    const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
    const typeNode = tree[Object.keys(tree)[0]].type ?? {};
    const leavesOf = (n, out = []) => { for (const [k, v] of Object.entries(n)) { if (k.startsWith('$')) continue; if (v && v.$type === 'typography') out.push([k, v]); else if (v && typeof v === 'object') leavesOf(v, out); } return out; };
    const italicCats = Object.entries(typeNode).filter(([, n]) => { const l = leavesOf(n); return l.length > 0 && l.every(([k, v]) => v.$value?.fontStyle === 'italic' && !/-italic/.test(k)); }).map(([c]) => c);
    const offered = await page.locator('[data-p3="pin-cut-row"]').evaluateAll((rows) => rows.map((r) => r.getAttribute('data-cat')));
    const wrong = offered.filter((c) => italicCats.includes(c));
    ok(wrong.length === 0, `${brand}: Pin a cut offers no slot in an italic-default category [${italicCats.join(', ') || 'none'}] (offered ${wrong.length ? wrong.join(', ') : 'none of them'})`);
  }

  // Pick the first slot and read its identity + BOUND FACE from the DOM. The bound face the row shows is
  // the oracle for the write's family — restating it from the brand would make the family assertion a
  // tautology (docs/34 shape 3).
  const row = page.locator('[data-p3="pin-cut-row"]').first();
  const cat = await row.getAttribute('data-cat');
  const role = await row.getAttribute('data-role');
  const boundFace = (await row.locator('[data-p3="pin-cut-face"]').textContent())?.trim();
  ok(!!cat && !!role && !!boundFace, `${brand}: the first slot names its category/role and shows a bound face (${cat} · ${role} — ${boundFace})`);

  // Type the STYLE and commit (change fires on blur — the caret-preserving wiring, not per keystroke).
  const input = row.locator('[data-p3="pin-cut-input"]');
  await input.fill(STYLE);
  await input.evaluate((el) => el.blur());

  // WRITE: read the pin back out of the PERSISTED blob (the same localStorage key #1196 reads), not any
  // in-page mirror — this is the value that reaches emission and a reopened session.
  const pin = await page.waitForFunction(({ c, r }) => {
    try { const o = JSON.parse(localStorage.getItem('prism3:brandInput')); return o?.input?.typography?.faces?.[c]?.[r] ?? null; } catch { return null; }
  }, { c: cat, r: role }, { timeout: 5000 }).then((h) => h.jsonValue(), () => null);
  ok(pin?.style === STYLE, `${brand}: setting the style writes faces.${cat}.${role}.style = "${STYLE}" verbatim (got "${pin?.style ?? 'nothing'}")`);
  ok(pin?.family === boundFace, `${brand}: the pin's family is fixed to the slot's BOUND face "${boundFace}", not author-typed (got "${pin?.family ?? 'nothing'}")`);

  // A valid pin (family == bound face) is ACCEPTED, not refused — the engine throw path stays quiet.
  const err = await page.evaluate(() => {
    const e = document.querySelector('[data-p3="error-bar"]');
    return { present: !!e, shown: !!e && getComputedStyle(e).display !== 'none', text: e?.textContent?.trim() ?? '' };
  });
  // An ABSENCE check: a quiet error surface means something only when the surface is mounted (#1831).
  hooks.absent(ok, { seen: err.present, state: 'the error surface mounted on this page' },
    !err.shown, `${brand}: a pin whose family matches the bound face is accepted, no error surfaced${err.shown ? ` — "${err.text.slice(0, 80)}"` : ''}`);

  // EMISSION: the pin reaches the emitted DTCG verbatim. Export the tokens (default shape) and find the
  // composite leaves carrying $extensions.prism3.facePin — the engine bakes the Figma Text Style's
  // fontStyle from exactly this (emit-figma-font.ts). Oracle: the same STYLE + bound face typed above.
  await hooks.click(page.locator('[data-p3="export-open"]'));
  await hooks.need(page, '[data-p3="export-dialog"]');
  const pending = page.waitForEvent('download');
  await hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-confirm"]'));
  const dl = await pending;
  let emitted = null;
  try {
    const tree = JSON.parse(await readFile(await dl.path(), 'utf8'));
    const found = [];
    const walk = (n) => { if (n && typeof n === 'object') { const p = n.$extensions?.prism3?.facePin; if (p) found.push(p); for (const k of Object.keys(n)) walk(n[k]); } };
    walk(tree);
    emitted = found;
  } catch { /* reported by the assertions below */ }
  ok(Array.isArray(emitted) && emitted.length > 0, `${brand}: the exported DTCG carries the pinned cut in $extensions.prism3.facePin (${emitted?.length ?? 0} leaves)`);
  ok(Array.isArray(emitted) && emitted.length > 0 && emitted.every((p) => p.style === STYLE), `${brand}: every emitted facePin bakes fontStyle = "${STYLE}" verbatim`);
  ok(Array.isArray(emitted) && emitted.length > 0 && emitted.every((p) => p.family === boundFace), `${brand}: every emitted facePin binds the bound face "${boundFace}"`);

  // CLEARING deletes the key — a blank input must not leave `{ role: undefined }`, which the engine
  // refuses as a present-but-empty pin. Same slot, emptied.
  await input.fill('');
  await input.evaluate((el) => el.blur());
  const cleared = await page.waitForFunction(({ c, r }) => {
    try { const o = JSON.parse(localStorage.getItem('prism3:brandInput')); return (o?.input?.typography?.faces?.[c]?.[r] ?? null) === null; } catch { return false; }
  }, { c: cat, r: role }, { timeout: 5000 }).then(() => true, () => false);
  ok(cleared, `${brand}: clearing the style input deletes faces.${cat}.${role} (no stranded empty pin)`);

  const errs = drain();
  ok(errs.length === 0, `${brand}: driving the Pin-a-cut control raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`  ${brand}: pinned ${cat} · ${role} → "${STYLE}" (face ${boundFace}), verified in brand input + ${emitted?.length ?? 0} emitted leaves, then cleared.`);
  await ctx.close();
}

// The italic chips (UI redesign S6.3, owner decision Q6): each chip, round-tripped through the EXPORTED DTCG.
//
// Each of Type's italic chips writes the brand through `setItalicStyle`; the oracle is the emission the studio
// exports after the click, read for the text type's `type.<text type>.*` leaves and their `$value.fontStyle`, with
// the rule typed here from the engine's contract (#1296): "Upright" ships no italic leaf; "Upright + italic" ships
// an `-italic` twin for each upright style, italic, and keeps the upright ones upright; "Italic only" ships no
// `-italic` twin and every leaf italic. A chip mapped to the wrong write fails by name.
console.log(`\nItalic chips, through the exported DTCG (S6.3)\n${'='.repeat(78)}`);
{
  const brand = BRANDS[0];
  const G = 'caption';
  const { ctx, page, drain } = await openBrand(brand);
  await gotoType(page);
  const exported = async () => {
    await hooks.click(page.locator('[data-p3="export-open"]'));
    await hooks.need(page, '[data-p3="export-dialog"]');
    const pending = page.waitForEvent('download');
    await hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-confirm"]'));
    const dl = await pending;
    try {
      const tree = JSON.parse(await readFile(await dl.path(), 'utf8'));
      const root = tree[Object.keys(tree).find((k) => !k.startsWith('$'))];
      const out = [];
      const walk = (n, path) => { for (const [k, v] of Object.entries(n ?? {})) { if (k.startsWith('$') || !v || typeof v !== 'object') continue; if (v.$type === 'typography') out.push({ key: `${path}.${k}`, italic: v.$value?.fontStyle === 'italic' }); else walk(v, `${path}.${k}`); } };
      walk(root?.type?.[G], `type.${G}`);
      return out;
    } catch { return null; }
  };
  const RULE = {
    upright: (ls) => ls.length > 0 && ls.every((l) => !l.italic && !/-italic/.test(l.key)),
    both: (ls) => ls.some((l) => /-italic/.test(l.key)) && ls.every((l) => (/-italic/.test(l.key) ? l.italic : !l.italic)),
    only: (ls) => ls.length > 0 && ls.every((l) => l.italic && !/-italic/.test(l.key)),
  };
  const WORDS = { upright: 'Upright', both: 'Upright + italic', only: 'Italic only' };
  const SAYS = { upright: 'no italic style', both: 'an italic twin for each upright style', only: 'fontStyle italic with no upright style' };
  const CHIP = { both: '[data-p3="italic-choice-both"]', only: '[data-p3="italic-choice-only"]', upright: '[data-p3="italic-choice-upright"]' };
  for (const chip of ['both', 'only', 'upright']) {
    const sel = `[data-p3="italic-row"][data-group="${G}"] ${CHIP[chip]}`;
    await hooks.click(page.locator(sel));
    await page.waitForFunction((x) => document.querySelector(x)?.getAttribute('aria-checked') === 'true', sel, { timeout: 5000 }).catch(() => {});
    const ls = await exported();
    ok(!!ls && RULE[chip](ls), `italics chip "${WORDS[chip]}" on ${G} exports ${SAYS[chip]} (${ls ? ls.map((l) => `${l.key.split('.').slice(2).join('.')}${l.italic ? '*' : ''}`).join(' ') : 'no export'})`);
  }
  const errs = drain();
  ok(errs.length === 0, `${brand}: driving the italic chips raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
// 9. A saved brand the engine refuses boots to a usable studio, and says so (#1989)
// =============================================================================================
// `bootBrand` validated the stored brand with `brandTheme` alone, which accepts a ground override; the
// engine refuses it later, in `resolvePreview`, and that throw had no catch. So the page stayed blank on
// an uncaught error, and stayed blank on every reload, because the brand stayed stored.
//
// THREE CASES: a ground override on a tier (#1972) and on the page (#956), both refused in resolution, and
// a mode list `brandTheme` itself rejects, which the old guard caught but fell back on silently.
//
// The stored brand is made BY THE STUDIO, not restated here: an example is chosen, the studio persists it,
// and the case's edit is applied to that blob. So the persist format and its version are the app's own,
// and only the edit is this test's. EXPECTED is what the edit names (`mention`), the words on screen and
// the storage key; ACTUAL is the page, its errors, the download and `localStorage`.
//
// TWO PATHS per case. First the designer chooses an example without clearing: the notice must go with the
// choice, because its Clear would otherwise delete the brand just chosen (review of #1997). Then the save
// is put back and Clear is used.
//
// MUTATIONS, each failing here by name:
//   · `bootBrand` back to `brandTheme(restored)` alone → `#1989 <case>: the page boots with no uncaught error`
//     and `… boots to a usable studio` for the two override cases (and the notice arms, since nothing renders).
//   · the notice not mounted → `#1989 <case>: the notice says the saved brand didn't open …` and the button arms.
//   · the notice left mounted after a brand loads → `#1989 <case>: choosing an example removes the notice …`.
//   · Clear not clearing storage → `#1989 <case>: Clear saved brand removes it from storage …`.
console.log(`\nA refused saved brand (#1989)\n${'='.repeat(78)}`);
const REFUSED_CASES = [
  { label: 'background.secondary', mention: "'background.secondary'", edit: { overrides: { light: { 'background.secondary': { palette: 'neutral', step: '200' } } } } },
  { label: 'background.primary', mention: "'background.primary'", edit: { overrides: { light: { 'background.primary': { palette: 'neutral', step: '200' } } } } },
  { label: 'modes bogus', mention: "'bogus'", edit: { modes: ['light', 'bogus'] } },
];
const storedRaw = (page) => page.evaluate(() => { try { return localStorage.getItem('prism3:brandInput'); } catch { return 'unreadable'; } });
const readNotice = (page) => page.evaluate(() => {
  const n = document.querySelector('[data-p3="refused-brand"]');
  return { text: n && n.checkVisibility() ? n.textContent : null, inDom: !!n, clear: document.querySelectorAll('[data-p3="refused-brand-clear"]').length };
});
for (const c of REFUSED_CASES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await hooks.watch(page);
  const drain = watchErrors(page);
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
  await hooks.click(page.locator('[data-p3="start-example"]').first());
  await hooks.need(page, '[data-p3="frame"]');
  await page.waitForFunction(() => { try { return !!localStorage.getItem('prism3:brandInput'); } catch { return false; } }, null, { timeout: 5000 }).catch(() => {});
  const seededRaw = await page.evaluate((edit) => {
    const o = JSON.parse(localStorage.getItem('prism3:brandInput') ?? 'null');
    if (!o?.input) return null;
    Object.assign(o.input, edit);
    const raw = JSON.stringify(o);
    localStorage.setItem('prism3:brandInput', raw);
    return raw;
  }, c.edit);
  ok(!!seededRaw, `#1989 ${c.label}: the studio persisted a brand this test could edit`);
  drain();
  await page.reload({ waitUntil: 'networkidle' });

  // ── boot, before any click ──
  const uncaught = drain().filter((e) => e.startsWith('uncaught'));
  ok(uncaught.length === 0, `#1989 ${c.label}: the page boots with no uncaught error${uncaught.length ? ` — ${uncaught[0].slice(0, 160)}` : ''}`);
  const usable = await page.locator('[data-p3="start-example"]').count();
  ok(usable > 0, `#1989 ${c.label}: the page boots to a usable studio — the start screen offers ${usable} example(s)`);
  const atBoot = await storedRaw(page);
  ok(!!seededRaw && atBoot === seededRaw,
    `#1989 ${c.label}: right after boot, before any click, the saved brand is still in storage, unchanged — ${atBoot === seededRaw ? 'same blob' : `now ${JSON.stringify(atBoot)?.slice(0, 60)}`}`);
  const notice = await readNotice(page);
  ok((notice.text ?? '').includes("The saved brand didn't open") && (notice.text ?? '').includes(c.mention),
    `#1989 ${c.label}: the notice says the saved brand didn't open, with the engine's reason naming ${c.mention} — read ${JSON.stringify((notice.text ?? '').slice(0, 140))}`);

  // ── Export: a design.md that still carries what was refused, so the designer keeps their brand ──
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
    hooks.click(page.locator('[data-p3="refused-brand-export"]'), { timeout: 4000 }).catch(() => {}),
  ]);
  const md = dl ? await readFile(await dl.path(), 'utf8').catch(() => '') : '';
  const kept = c.mention.replace(/'/g, '');
  ok(!!dl && dl.suggestedFilename().endsWith('.design.md') && md.includes(kept),
    `#1989 ${c.label}: Export saved brand downloads a design.md that keeps what was refused — file ${JSON.stringify(dl?.suggestedFilename() ?? null)}, mentions ${kept}: ${md.includes(kept)}`);

  // ── path 1: choose an example without clearing — the notice goes with the choice ──
  await hooks.click(page.locator('[data-p3="start-example"]').first(), { timeout: 5000 }).catch(() => {});
  await hooks.need(page, '[data-p3="frame"]', { timeout: 5000 }).catch(() => {});
  const chose = await readNotice(page);
  hooks.absent(ok, { seen: notice.inDom, state: 'the refused-brand notice at boot' }, !chose.inDom && chose.clear === 0,
    `#1989 ${c.label}: choosing an example removes the notice, so its Clear cannot reach the chosen brand — notice in DOM ${chose.inDom}, Clear buttons ${chose.clear}`);
  const afterChoice = await storedRaw(page);
  ok(!!afterChoice && afterChoice !== seededRaw,
    `#1989 ${c.label}: the chosen brand is what is now saved — ${afterChoice === seededRaw ? 'still the refused blob' : 'replaced'}`);

  // ── path 2: the save put back, then Clear ──
  await page.evaluate((raw) => localStorage.setItem('prism3:brandInput', raw), seededRaw ?? '');
  await page.reload({ waitUntil: 'networkidle' });
  await hooks.need(page, '[data-p3="refused-brand"]', { timeout: 5000 }).catch(() => {});
  await hooks.click(page.locator('[data-p3="refused-brand-clear"]'), { timeout: 4000 }).catch(() => {});
  const after = await page.evaluate(() => ({
    stored: (() => { try { return localStorage.getItem('prism3:brandInput'); } catch { return 'unreadable'; } })(),
    notice: !!document.querySelector('[data-p3="refused-brand"]'),
  }));
  ok(after.stored === null && !after.notice,
    `#1989 ${c.label}: Clear saved brand removes it from storage and dismisses the notice — stored ${JSON.stringify(after.stored)?.slice(0, 40)}, notice ${after.notice}`);
  await page.reload({ waitUntil: 'networkidle' });
  const again = await page.evaluate(() => !!document.querySelector('[data-p3="refused-brand"]'));
  hooks.absent(ok, { seen: notice.inDom, state: 'the refused-brand notice at boot' }, !again,
    `#1989 ${c.label}: after Clear, a reload shows no notice`);
  // Caught, not awaited bare: on a blank page this click is what fails, and a throw here would end the run
  // before the next case and the summary, naming no gate.
  await hooks.click(page.locator('[data-p3="start-example"]').first(), { timeout: 5000 }).catch(() => {});
  await hooks.need(page, '[data-p3="frame"]', { timeout: 5000 }).catch(() => {});
  const frameUp = await page.locator('[data-p3="frame"]').count();
  ok(frameUp > 0, `#1989 ${c.label}: after Clear, choosing an example opens the studio`);
  const errs = drain();
  ok(errs.length === 0, `#1989 ${c.label}: 0 console errors after the boot${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// ---- #2080: keyboard focus survives the mode control's repaint ------------------------------------------------
// The preview header's mode control repaints on every mode AND every brand (verdict) update: one `paint`, subscribed
// to both (`shell/preview.ts`). A paint changes a button's `data-sig` and replaces its CHILDREN, but keeps the button
// itself, so a keyboard user's focus stays put. Driven by the path a person uses, Arrow Right on the radio group,
// which focuses the next option and selects it, so that paint redraws the newly focused button. EXPECTED: that same
// node still holds focus after the paint, and the paint reached it (its `data-sig` changed, so the arm is not
// vacuous). BY-NAME MUTATION: make `paint` rebuild the radios every call → the same-node arm fails.
{
  const { ctx, page, drain } = await openBrand(BRANDS[0]);
  await hooks.need(page, '[data-p3="mode-control"]');
  const first = page.locator('[data-p3="mode-control"] [data-p3="mode-option"][aria-checked="true"]');
  await hooks.need(page, first);
  await first.focus();
  const before = await page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a.getAttribute('data-p3') !== 'mode-option') return null;
    window.__p3focusProbe = a;
    const next = a.nextElementSibling;
    return { mode: a.dataset.mode, next: next?.dataset.mode ?? null, nextSig: next?.dataset.sig ?? null };
  });
  ok(!!before?.next, `#2080 focus setup: a mode option is focused and has a next option (${JSON.stringify(before)})`);
  if (before?.next) {
    await page.keyboard.press('ArrowRight');
    const moved = await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true', before.next, { timeout: SETTLE_CLICK_MS }).then(() => true, () => false);
    const after = await page.evaluate((m) => {
      const n = document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`);
      return { focusedIsIt: !!n && document.activeElement === n, sameNodeAsBefore: n === window.__p3focusProbe?.nextElementSibling || false,
        connectedBefore: window.__p3focusProbe?.isConnected ?? false, sig: n?.dataset.sig ?? null };
    }, before.next);
    ok(moved && after.sig !== before.nextSig, `#2080 the repaint reached the newly focused option: ${before.next} is checked and its data-sig moved (${before.nextSig} → ${after.sig})`);
    ok(after.focusedIsIt && after.sameNodeAsBefore && after.connectedBefore,
      `#2080 keyboard focus survives the mode control's repaint: the ${before.next} option keeps focus and is the same node (${JSON.stringify(after)})`);
  }
  const errs = drain();
  ok(errs.length === 0, `#2080 0 console errors in the focus check${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
await browser.close();
server.close();

console.log(`\nStable test hooks (F1)\n${'='.repeat(78)}`);
hooks.report(ok);

if (failed) {
  console.error(`\n❌ ${failed} FAILED of ${executed} assertions:`);
  for (const f of failures) console.error(`   ✗ ${f}`);
} else {
  console.log(`\n✅ ALL PASS — ${executed} assertions executed`);
}

/**
 * The run-page summary — written on every run, and the reason #775's flip could be decided on
 * evidence rather than on the calendar.
 *
 * MEASURED, not assumed: with `continue-on-error: true`, GitHub reported the STEP'S OWN `conclusion`
 * as `success` when the command exited non-zero, not only the job's. So while this suite was
 * advisory a red run was invisible to every status check and to anything reading the API; the only
 * evidence was `##[error]` buried in the step log. A week of not-blocking was meant to buy a week of
 * EVIDENCE, and without this it would have bought a week of nothing.
 *
 * PAST TENSE ABOVE, PRESENT TENSE BELOW — the flag is gone (#775, flipped 2026-08-20) and this code
 * is not, deliberately. The success line below is exactly what the flip was decided on: three runs
 * spread across the window were confirmed green by reading it out of their step logs, the figures
 * identical five days apart. The argument in the next paragraph never depended on
 * `continue-on-error` and survives it unchanged.
 *
 * WHY IT ALSO WRITES ON SUCCESS, which is the part worth defending. A summary that appears only on
 * failure makes ABSENCE ambiguous: "no summary" reads identically as "the suite passed" and as "the
 * write is broken / the step never ran". That is the exact shape this repo keeps catching (`ci.yml`'s
 * own "a gate that silently stops running is worse than no gate, because green starts meaning nothing
 * ran"). One line on success costs a line and makes silence mean one thing only: this did not run.
 *
 * The failing list is capped — a whole-sweep regression is hundreds of rows and the summary has a
 * size limit — with the count kept honest and the log named as the full record.
 */
const SUMMARY_ROWS = 25;
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const stats = `${statesVisited} page × mode × brand states · ${nodesMeasured} text nodes · ${fieldsMeasured} form controls · `
    + `lowest rendered contrast ${worstRatio}:1 against a ${CONTRAST_FLOOR.toFixed(1)}:1 floor, lowest chrome text ${worstChrome}:1 against WCAG `
    + `(smoke floors — conformance is \`lint:contrast\`)`;
  const md = failed
    ? [
        `### ❌ Studio smoke suite — ${failed} of ${executed} assertions failed`,
        '',
        '**This step gates — the job has failed** (#775). The detail is repeated here so a red run',
        'is readable from the run page without opening the log, which is how the advisory week was',
        'audited before this step was allowed to block.',
        '',
        stats,
        '',
        '| # | Failing assertion |',
        '|---|---|',
        ...failures.slice(0, SUMMARY_ROWS).map((f, i) => `| ${i + 1} | ${f.replace(/\|/g, '\\|')} |`),
        ...(failures.length > SUMMARY_ROWS
          ? ['', `_…and ${failures.length - SUMMARY_ROWS} more. The step log has the full list._`]
          : []),
        '',
      ]
    : [
        `### ✅ Studio smoke suite — ${executed} assertions, all pass`,
        '',
        stats,
        '',
        '_Written on success too, deliberately: if this line is missing, the step did not run — which_',
        '_is a different problem from the suite failing, and one an absent summary would otherwise hide._',
        '',
      ];
  const text = `${md.join('\n')}\n`;
  // Never let the reporting kill the report. If the append fails the exit code below is still the
  // truth, and a summary that took the process down with it would be worse than no summary.
  //
  // AND SAY SO IN THE LOG, either way. A file append is invisible: a write that silently stopped
  // firing would leave the run page bare, which is precisely the ambiguity the success case above
  // exists to remove — one level down. So the log carries the outcome and the headline that was
  // published, which makes the write verifiable from the one channel every tool can read.
  await appendFile(summaryPath, text).then(
    () => console.log(`  → wrote ${text.length} bytes to GITHUB_STEP_SUMMARY: ${md[0]}`),
    (e) => console.error(`  → could NOT write GITHUB_STEP_SUMMARY (${e.message}) — the run page will be bare`),
  );
}

process.exit(failed === 0 ? 0 : 1);
