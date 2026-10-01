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
 * generally, and this repo's gate discipline is worth more than this suite is. `mode-audit.mjs` uses
 * `waitForTimeout` throughout; it is an ad-hoc audit a human reads, and the tradeoff is different for
 * something CI runs on every push.
 *
 * PORT. This serves on an EPHEMERAL port (`listen(0)`) rather than a fixed one, as `mode-audit.mjs` now
 * does too (#1898): two harnesses on one port collide as `EADDRINUSE`, which reads exactly like a test
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

const ROOT = dirname(fileURLToPath(import.meta.url));
// Every element this suite LOCATES is found by its `data-p3` hook (F1), minted by `hook()` in
// `src/main.ts` — not by a class name, and not by a section title. A restyle or a rename therefore does
// not move what the suite reads. Visible copy is still asserted where the copy is the thing under test.
// Two things still read classes on purpose: the shared STATE tokens (`.on`, `.active`, `.cur`,
// `.is-pressed`), which carry state rather than identity, and the probe's `cls` labels, which only name
// a node in a failure message. The guard (`test-hooks.mjs`) fails any hook this file names that never
// rendered, by name.
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

// ---- the static server -----------------------------------------------------------------------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.map': 'application/json' };
// Read BEFORE writing the header — the trap `mode-audit.mjs` records at #565: a missing file threw
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
    fields.push({
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
  return { text, fields, unparsed, rootFound: true };
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
 * that happens to sit under it. The render site names the pair (`specimenPair` in `main.ts`), and this
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
 *  - `SWEEP_NODE_FLOOR` (8000) — well below a healthy full sweep's total (printed every run) and well
 *    above what a sweep of nothing-but-chrome states totals, so it catches every state rendering only
 *    its chrome — which the per-state floor clears once per state and structurally cannot catch in
 *    aggregate.
 *  - `SWEEP_STATE_FLOOR` (28) — the product of the three per-axis minimums already asserted below
 *    (≥ 2 brands × ≥ 2 modes × ≥ 7 pages; the Preview page left the Pages menu in UI redesign S3), so it raises no new bar. What it adds is a NAMED failure
 *    for a sweep that visits nothing: at zero states the loop body never runs, so contrast, console
 *    errors and mode agreement are all ABSENT rather than failing, and absence is what this file
 *    keeps having to convert into a failure.
 */
const STATE_NODE_FLOOR = 12;
const SWEEP_NODE_FLOOR = 8000;
const SWEEP_STATE_FLOOR = 28;
/** The same "did it look?" floor for the form-control walk added by #1031, and the reason it is a
 *  SWEEP total and not a per-state one is recorded at the assertion: zero fields is legitimate in a
 *  derived mode, where the read-only note replaces every editor, so the per-state range starts at 0 and
 *  the total is the only place this can be asserted. The floor sits well below what a full editor sweep
 *  renders (the live count is printed every run) and above zero, so a walk that comes back empty fails
 *  by name. No measured corpus size is written in here: that literal drifts as the studio grows or
 *  retires controls — this is the site #1232 fixed, the count belongs in the live output, not frozen in
 *  a comment beside a passing assertion. */
const SWEEP_FIELD_FLOOR = 250;
/** The brand menu's own minimum, asserted per open (#1031). The popover carried Name and Namespace until UI
 *  redesign S3 moved them to Brand › Identity (chrome, measured by `test:chrome` in both themes, and by the
 *  Brand section below); what it still carries is `.bm-ta` once the import box is open, so one control is
 *  what the surface promises, and this is the count that turns "the sweep was clean" into "the sweep looked
 *  here". Text rows are floored separately at a deliberately loose 6: the menu renders captions, the mode
 *  rows and the example rows, and a floor near the real number would fail on wording. */
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

/** The Pages menu (UI redesign S1.2): the old rail, moved into the top bar's Pages menu with its hooks. The
 *  tab row navigates too, but the sweep walks every LEGACY page, and only the menu lists them all by their
 *  old names. Opened when it is closed; closed again by its own button. */
const openPages = async (page) => {
  if (await page.locator('[data-p3="pages-menu-list"]').count() === 0) await hooks.click(page.locator('[data-p3="pages-menu"]'));
  await hooks.need(page, '[data-p3="pages-menu-list"]');
};
const closePages = async (page) => {
  if (await page.locator('[data-p3="pages-menu-list"]').count() > 0) await hooks.click(page.locator('[data-p3="pages-menu"]'));
};
/** The rail's own labels, read from the `b` that carries them — the `small` beside it is the subtitle, and
 *  taking the button's whole textContent would glue the two together. Read from the open menu. */
const railLabels = async (page) => {
  await openPages(page);
  const labels = (await page.locator('[data-p3^="rail-page-"] [data-p3="rail-item-label"]').allTextContents()).map((s) => s.trim());
  await closePages(page);
  return labels;
};
/** WAIT FOR THE LEGACY FRAME TO SHOW THE PAGE — not for a duration. The frame states the legacy page it
 *  shows (`data-legacy-page`, the rail hook's suffix). If navigation ever stops landing, this hangs and
 *  then fails loudly, which is the correct outcome; a sleep would measure the previous page and call it a
 *  pass. */
const legacyShows = (page, slug) =>
  page.waitForFunction((s) => document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage === s, slug);
/** Click a Pages menu destination by its label, and wait for the frame to show it. */
const gotoPage = async (page, label) => {
  await openPages(page);
  const item = page.locator('[data-p3^="rail-page-"]').filter({ has: page.locator('[data-p3="rail-item-label"]', { hasText: label }) }).first();
  await hooks.need(page, item);
  const slug = (await item.getAttribute('data-p3')).slice('rail-page-'.length);
  await hooks.click(item);
  await legacyShows(page, slug);
  await page.evaluate(() => document.fonts.ready);
};
/** The same wait, for a destination named by its rail hook rather than by its label — for the sections
 *  that drive one particular page. The sweep keeps `gotoPage`, because it reads its labels off the menu. */
const gotoRail = async (page, selector) => {
  await openPages(page);
  await hooks.click(page.locator(selector));
  await legacyShows(page, hooks.role(selector).slice('rail-page-'.length));
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

/** Same contract for the mode bar: the wait is "the bar says this mode is selected". */
const selectMode = async (page, label) => {
  await hooks.click(page.locator('[data-p3="mode-tab"]').filter({ hasText: label }).first());
  await page.waitForFunction((m) => document.querySelector('[data-p3="mode-tab"].on [data-p3="mode-tab-name"]')?.textContent === m, label);
  await page.evaluate(() => document.fonts.ready);
};

/** Open the app on `brand`, from the first-run start screen, in its own storage context.
 *
 *  `scheme` emulates the OS light/dark preference (#1031). Defaults to Playwright's own default so
 *  every existing caller is unchanged; only section 4 passes it, and what it is there to measure is
 *  that the answer does NOT depend on it. */
const openBrand = async (brand, scheme) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true, ...(scheme ? { colorScheme: scheme } : {}) });
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
// per-mode knob cannot pass silently.
const PER_MODE_DENSITY_SENTENCE = 'Spacing follows the brand’s density, not the mode’s: a mode’s density changes control heights only.';
let perModeDensityKnobs = 0;
const perModeDensityMissing = [];
/** Paired specimens by class (#1652), and the brand × mode cells that previewed an exempt one. */
const pairedByClass = { contracted: 0, exempt: 0, unmapped: 0 };
const exemptCells = new Set();
const modeCells = new Set();
let worstExempt = Infinity;
let worstExemptWhere = '';

for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  const boot = drain();
  ok(boot.length === 0, `${brand}: boots clean — 0 console errors${boot.length ? ` (${boot[0]})` : ''}`);
  const emission = await loadEmission(brand);
  ok(emission !== null && emission.modes.length >= 2,
    `${brand}: its committed emission (packages/engine/out/${brand.toLowerCase()}.tokens.json) loads with its modes — the oracle paired specimens are checked against (#1652)`);

  const pages = await railLabels(page);
  ok(pages.length >= 7, `${brand}: the Pages menu offers ${pages.length} destinations (S3 took Preview out: its Style guide is Brand's preview)`);

  // MODE IS THE OUTER AXIS, and that is load-bearing rather than a loop-order preference.
  //
  // Three of the nine pages render no mode bar at all (#268: the bar appears only where a
  // mode-varying control exists), but `currentMode` is module state that survives navigation — so
  // those pages still render THROUGH the selected mode, and a page-outer loop would only ever visit
  // them in whatever mode the previous page happened to leave behind. Measured: Typography and Layout
  // reached from a derived mode drop their editors entirely for the read-only note, which a
  // page-outer sweep sees as an unexplained blank page (it did, on the first run of this file).
  //
  // So: pick the mode on a page that HAS the bar, then walk every page carrying it. That is also the
  // sequence a user performs, and it is what makes "every page in every mode" true rather than
  // "every page that offers a mode bar".
  const barPage = await (async () => {
    for (const label of pages) {
      await gotoPage(page, label);
      if (await page.locator('[data-p3="mode-tab"]').count() > 0) return label;
    }
    return null;
  })();
  ok(barPage !== null, `${brand}: at least one page carries the mode bar (found ${barPage})`);
  await gotoPage(page, barPage);
  const modes = (await page.locator('[data-p3="mode-tab"] [data-p3="mode-tab-name"]').allTextContents()).map((m) => m.trim());
  ok(modes.length >= 2, `${brand}: the mode bar offers ${modes.length} modes (${modes.join(', ')})`);

  for (const mode of modes) {
    await gotoPage(page, barPage);
    await selectMode(page, mode);
    for (const label of pages) {
      await gotoPage(page, label);
      const hasBar = await page.locator('[data-p3="mode-tab"]').count() > 0;
      const where = `${brand} / ${label} / ${mode}`;
      statesVisited++;
      const densityKnobs = await page.evaluate(() => [...document.querySelectorAll('[data-p3="per-mode-density"]')]
        .map((k) => k.querySelector('[data-p3="control-description"]')?.textContent ?? ''));
      perModeDensityKnobs += densityKnobs.length;
      for (const d of densityKnobs) if (!d.includes(PER_MODE_DENSITY_SENTENCE)) perModeDensityMissing.push(`${where}: ${d.slice(0, 80)}`);

      // --- zero console errors -----------------------------------------------------------------
      const errs = drain();
      ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);

      // --- key DOM assertions ------------------------------------------------------------------
      const dom = await page.evaluate(() => {
        const err = document.querySelector('[data-p3="error-bar"]');
        // The page-chrome floor (#772), read from what the app DECLARES rather than from a list
        // restated here. `mountView` publishes the keys the current root view promises to carry onto
        // `<html data-chrome>`; every one of them must resolve to a mounted `[data-chrome]` node. A
        // surface added to `CHROME_SURFACES` is therefore covered by this the day it lands — the same
        // reason `BRANDS` above is read from the start screen instead of being typed out.
        const roster = (document.documentElement.dataset.chromeRoster ?? '').split(' ').filter(Boolean);
        return {
          heroTitle: document.querySelector('[data-p3="page-title"]')?.textContent?.trim() ?? '',
          controls: document.querySelectorAll('[data-p3="workspace"] input, [data-p3="workspace"] select, [data-p3="workspace"] button').length,
          roster,
          chromeMissing: roster.filter((k) => !document.querySelector(`[data-chrome="${k}"]`)),
          errorBarShown: !!err && getComputedStyle(err).display !== 'none',
          errorBarMounted: !!err,
          errorBarText: err?.textContent?.trim() ?? '',
          // A derived mode (HC light / HC dark / Wireframe) is auto-generated and never hand-tuned, so
          // its editors are replaced by a read-only explanation. That is a legitimate way to have no
          // controls — and the ONLY one.
          readOnlyNote: document.querySelectorAll('[data-p3="derived-note"]').length,
          modeOn: [...document.querySelectorAll('[data-p3="mode-tab"].on [data-p3="mode-tab-name"]')].map((n) => n.textContent),
          // A page wider than the viewport is a layout regression the eye catches instantly and no
          // static check ever will. +1 for sub-pixel rounding; anything real overshoots by much more.
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      ok(dom.heroTitle.length > 0, `${where}: renders a hero title ("${dom.heroTitle}")`);
      // "Not blank" stated as the disjunction the app actually promises: either something to edit, or
      // a note saying why there is nothing. Asserting `controls > 0` alone fails on the read-only
      // derived modes — which is the app being right — and asserting nothing at all would pass on a
      // page that rendered its hero and then threw.
      ok(dom.controls > 0 || dom.readOnlyNote > 0,
        `${where}: renders ${dom.controls} control(s), or a read-only note when the mode is derived`);
      // THE FLOOR, IN BOTH DIRECTIONS. The roster must be non-empty first: `chromeMissing` over an
      // empty roster is an empty array, so the check below would pass vacuously on a build that
      // published nothing — the shape #779 records one assertion along, and not one worth repeating.
      ok(dom.roster.length >= 3, `${where}: the view publishes its chrome roster (${dom.roster.join(', ') || 'EMPTY'})`);
      ok(dom.roster.includes('error'),
        `${where}: the roster names the engine-error surface — #388's defect was one page rendering it and the rest not`);
      ok(dom.chromeMissing.length === 0,
        `${where}: every declared chrome surface is mounted${dom.chromeMissing.length ? ` — missing ${dom.chromeMissing.join(', ')}` : ''}`);
      // Now non-vacuous: an ABSENT `.errbar-global` used to read as "hidden" and pass this line, which
      // is the same defect as showing nothing. The roster assertions above are what make it mean
      // "mounted, and with nothing to say" rather than "not there".
      //
      // The roster proves the surface by its `data-chrome` key, which is not the hook this lookup reads, so
      // the bar's own hook is proven here too (#1831): dropped, it read as "hidden" and passed — measured.
      hooks.absent(ok, { seen: dom.errorBarMounted, state: 'the global error bar mounted, found by its hook' },
        !dom.errorBarShown, `${where}: the global error bar is hidden${dom.errorBarShown ? ` — "${dom.errorBarText}"` : ''}`);
      ok(dom.overflowX <= 1, `${where}: no horizontal overflow (${dom.overflowX}px past the viewport)`);
      if (hasBar) {
        // The bar must AGREE with the mode this state was set to. A mode switch that silently no-ops,
        // or a page that resets the mode on entry, leaves the wrong one marked — and then every
        // assertion in this state is measuring a mode nobody asked for.
        ok(dom.modeOn.length === 1 && dom.modeOn[0] === mode,
          `${where}: the mode bar still marks exactly this mode (marks ${JSON.stringify(dom.modeOn)})`);
      }

      // --- rendered contrast -------------------------------------------------------------------
      // Settled first (#1069): the probe measures what stays on screen, not a frame of a transition.
      await settle(page, where);
      const probe = await page.evaluate(LEGIBILITY_PROBE);
      const rows = probe.text;
      assertParsed(where, probe.unparsed);
      nodesMeasured += rows.length;
      fieldsMeasured += probe.fields.length;
      // The non-empty floor, asserted BEFORE the ratios and separately from them, so an empty state
      // fails naming itself rather than passing as "every one of 0 text nodes clears 2:1".
      ok(rows.length >= STATE_NODE_FLOOR,
        `${where}: the contrast probe measured ${rows.length} text nodes (floor ${STATE_NODE_FLOOR})${
          rows.length < STATE_NODE_FLOOR
            ? ' — this state rendered almost no text, or the probe stopped matching; the ratio assertion below is vacuous here'
            : ''}`);
      const under = rows.filter((r) => r.ratio < CONTRAST_FLOOR);
      for (const r of rows) if (r.ratio < worstRatio) { worstRatio = r.ratio; worstWhere = `${where} — ${r.cls} "${r.text}"`; }
      ok(under.length === 0, `${where}: every one of ${rows.length} text nodes clears ${CONTRAST_FLOOR}:1${
        under.length ? ` — ${under.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1 (op ${u.op})`).join(' | ')}` : ''}`);
      // Chrome at its real bar (#779). Reported per node with the bar it missed, so a large-text pass
      // and a normal-text failure are never read as the same thing.
      const chrome = rows.filter((r) => !r.specimen);
      specimensMeasured += rows.length - chrome.length;
      for (const r of chrome) if (r.ratio < worstChrome) { worstChrome = r.ratio; worstChromeWhere = `${where} — ${r.cls} "${r.text}"`; }
      const chromeUnder = chrome.filter((r) => r.ratio < barOf(r));
      ok(chromeUnder.length === 0, `${where}: every one of ${chrome.length} chrome text nodes meets WCAG 1.4.3 (${CHROME_TEXT_MIN}:1, ${CHROME_LARGE_TEXT_MIN}:1 large)${
        chromeUnder.length ? ` — ${chromeUnder.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1 (${u.px}px/${u.weight}, op ${u.op}, needs ${barOf(u)}:1)`).join(' | ')}` : ''}`);
      const unmarked = rows.filter((r) => r.inlineInk && !r.specimen);
      ok(unmarked.length === 0, `${where}: every node inked by an inline style is marked data-specimen at its render site${
        unmarked.length ? ` — ${unmarked.slice(0, 3).map((u) => `${u.cls} "${u.text}"`).join(' | ')}: wrap it in specimen() where it is painted, or it is held to the chrome bar as if the studio chose that color` : ''}`);

      // --- paired specimens, held to the contract of the pair they preview (#1652) --------------
      // The mode id is the bar's label in the emission's own spelling ("HC light" → `hc-light`), checked
      // against the emission's mode list rather than a label table restated here.
      const paired = rows.filter((r) => r.pair);
      if (paired.length && emission) {
        const modeId = mode.toLowerCase().replace(/\s+/g, '-');
        modeCells.add(`${brand}/${mode}`);
        ok(emission.modes.includes(modeId), `${where}: the mode "${mode}" is one the emission carries (${emission.modes.join(', ')})`);
        const judged = paired.map((r) => ({ r, c: classifyPair(r.pair, emission, modeId) }));
        const bad = judged.filter(({ c }) => c.problem);
        ok(bad.length === 0, `${where}: every one of ${paired.length} paired specimens renders exactly the engine role pair it claims${
          bad.length ? ` — ${bad.slice(0, 3).map(({ r, c }) => `"${r.pair.state}" ${c.problem}`).join(' | ')}` : ''}`);
        const held = judged.filter(({ c }) => !c.problem);
        for (const { c } of held) pairedByClass[c.cls]++;
        const pairUnder = held.filter(({ r, c }) => r.ratio < c.bar);
        ok(pairUnder.length === 0, `${where}: every paired specimen meets the contract of the pair it previews${
          pairUnder.length ? ` — ${pairUnder.slice(0, 3).map(({ r, c }) => `${r.pair.claim} at ${r.ratio}:1 (${c.contract}, needs ${c.bar}:1)`).join(' | ')}` : ''}`);
        // What the exemption still OWES (#1281): a pressed fill distinct from its own row's rest fill.
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
      // NO PER-STATE FLOOR HERE, deliberately: a derived mode replaces the whole editor with the
      // read-only note, so zero fields is a legitimate state and a floor would fail on the app being
      // right. "Did it look?" is asserted once over the sweep total below, and named per-surface in
      // the overlay section — where a count IS the coverage claim.
      const fieldsUnder = probe.fields.filter(fieldFails);
      for (const f of probe.fields) if (f.ratio < worstRatio) { worstRatio = f.ratio; worstWhere = `${where} — ${f.cls} ${f.text}`; }
      for (const f of probe.fields) if (!f.specimen && f.ratio < worstField) { worstField = f.ratio; worstFieldWhere = `${where} — ${f.cls} ${f.text}`; }
      ok(fieldsUnder.length === 0, `${where}: every one of ${probe.fields.length} form control(s) inks its value at its text bar (${CHROME_TEXT_MIN}:1, ${CHROME_LARGE_TEXT_MIN}:1 large) and its caret at ${CHROME_CARET_MIN}:1${
        fieldsUnder.length ? ` — ${fieldsUnder.slice(0, 3).map(describeField).join(' | ')}` : ''}`);
    }
  }
  console.log(`  ${brand}: ${pages.length} pages × ${modes.length} modes swept (${pages.join(', ')})`);
  await ctx.close();
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
    const fieldsUnder = probe.fields.filter(fieldFails);
    ok(fieldsUnder.length === 0, `${where}: every one of ${probe.fields.length} form control(s) inks its value at its text bar and its caret at ${CHROME_CARET_MIN}:1${fieldsUnder.length ? ` — ${fieldsUnder.slice(0, 3).map(describeField).join(' | ')}` : ''}`);
    // Each Style guide ground on the page: the brand's own background.primary for this mode, from its emission.
    const grounds = await page.evaluate(() => {
      const hex = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); return m ? `#${m[1].split(/[,\s/]+/).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}` : s; };
      return [...document.querySelectorAll('[data-p3="preview-body"] [data-p3="specimen"]')].map((n) => hex(getComputedStyle(n).backgroundColor));
    });
    const page0 = emission?.role('background.primary', mode)?.hex;
    const offGround = grounds.filter((g) => g !== page0);
    ok(!!page0 && grounds.length >= 6 && offGround.length === 0, `${where}: all ${grounds.length} Style guide grounds sit on the emission's background.primary ${page0}${offGround.length ? ` — ${offGround.slice(0, 3).join(', ')}` : ''}`);
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
ok(perModeDensityKnobs > 0 && perModeDensityMissing.length === 0,
  `per-mode density: every per-mode Density knob (${perModeDensityKnobs} met) says "${PER_MODE_DENSITY_SENTENCE}"${perModeDensityMissing.length ? ` — MISSING: ${perModeDensityMissing.slice(0, 3).join(' | ')}` : ''}`);
ok(statesVisited >= SWEEP_STATE_FLOOR,
  `the sweep visited ${statesVisited} page × mode × brand states (floor ${SWEEP_STATE_FLOOR} = 2 brands × 2 modes × 7 pages)`);
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
let palettesStates = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await hooks.need(page, '[data-p3="palettes-levers"]');
  const tree = JSON.parse(await readFile(join(OUT_DIR, `${brand.toLowerCase()}.tokens.json`), 'utf8'));
  const emitted = tree[Object.keys(tree)[0]].core.palette;
  const want = Object.fromEntries(Object.entries(emitted).filter(([k]) => !NOT_RAMPS.includes(k))
    .map(([k, steps]) => [k, Object.fromEntries(Object.entries(steps).filter(([s]) => !s.startsWith('$')).map(([s, v]) => [s, String(v.$value).toLowerCase()]))]));
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
    const shown = await page.evaluate(() => {
      const hex = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); return m ? `#${m[1].split(/[,\s/]+/).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}` : s; };
      const ramps = {};
      for (const b of document.querySelectorAll('[data-p3="preview-body"] [data-p3="palette"]:not(.p3-pal-reuse)')) {
        ramps[b.dataset.palette] = Object.fromEntries([...b.querySelectorAll('.p3-sqk-item')].map((li) => [li.querySelector('.p3-sqk-step').textContent.trim(), `#${li.querySelector('.p3-sqk-hex').textContent.trim()}`]));
      }
      return {
        ramps,
        grounds: [...document.querySelectorAll('[data-p3="preview-body"] [data-p3="specimen"]')].map((n) => hex(getComputedStyle(n).backgroundColor)),
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        errorBar: (() => { const e = document.querySelector('[data-p3="error-bar"]'); return { mounted: !!e, shown: !!e && getComputedStyle(e).display !== 'none' }; })(),
      };
    });
    const missing = Object.keys(want).filter((k) => !shown.ramps[k]);
    const extra = Object.keys(shown.ramps).filter((k) => !want[k]);
    ok(missing.length === 0 && extra.length === 0, `${where}: the preview draws exactly the emission's ${Object.keys(want).length} ramps${missing.length ? ` — missing ${missing.join(', ')}` : ''}${extra.length ? ` — not emitted ${extra.join(', ')}` : ''}`);
    const off = [];
    for (const [k, steps] of Object.entries(want)) for (const [st, hx] of Object.entries(steps)) if (shown.ramps[k] && shown.ramps[k][st] !== hx) off.push(`${k} ${st} shows ${shown.ramps[k][st]} (emitted ${hx})`);
    ok(off.length === 0, `${where}: every step of every ramp shows its emitted hex${off.length ? ` — ${off.slice(0, 3).join(' | ')}` : ''}`);
    const page0 = emission?.role('background.primary', mode)?.hex;
    const badGround = shown.grounds.filter((g) => g !== page0);
    ok(!!page0 && shown.grounds.length >= 8 && badGround.length === 0, `${where}: all ${shown.grounds.length} specimen strips sit on the emission's background.primary ${page0}${badGround.length ? ` — ${badGround.slice(0, 3).join(', ')}` : ''}`);
    hooks.absent(ok, { seen: shown.errorBar.mounted, state: 'the global error bar mounted, found by its hook' }, !shown.errorBar.shown, `${where}: the global error bar is hidden`);
    ok(shown.overflowX <= 1, `${where}: no horizontal overflow (${shown.overflowX}px past the viewport)`);
  }
  await ctx.close();
}
ok(palettesStates >= BRANDS.length * 2, `the Palettes sweep visited ${palettesStates} brand × mode states (floor ${BRANDS.length * 2})`);

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
 * Every overlay-wash row as it RENDERS: its Source read-out, its swatch, and its two state cells.
 *
 * Found by the token pill the row already prints, like #330's row above — an index would silently
 * start measuring a different row the day one is inserted, and a class would not distinguish the wash
 * row from the opaque `subtle-fill` row beside it.
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
  const readout = (host) => {
    const n = host?.querySelector('[data-p3="source-readout"]');
    return { text: n?.textContent?.trim() ?? null, selects: host?.querySelectorAll('select').length ?? 0 };
  };
  const out = [];
  for (const row of document.querySelectorAll('[data-p3="role-row"]')) {
    const pill = [...row.querySelectorAll('[data-p3="token-pill"]')]
      .map((p) => p.textContent.trim())
      .find((t) => /^color\.interactive\.[a-z0-9-]+\.overlay\.hover$/.test(t));
    if (!pill) continue;
    out.push({
      pill,
      source: readout(row.querySelector('[data-p3="role-source"]')),
      swatch: readSwatch(row.querySelector('[data-p3="role-swatch"]')),
      // The example box's ground is computed by `exGround`, a different expression from the one the
      // swatch's underlay comes from — so agreeing is a real check, not one value read twice.
      exboxBg: getComputedStyle(row.querySelector('[data-p3="example-ground"]')).backgroundColor,
      // The specimen AS DRAWN (#812): the button's ink, the wash it sits on, and the receipt beside it.
      example: (() => {
        const b = row.querySelector('[data-p3="example-ground"] [data-p3="example-button"]');
        const cs = b ? getComputedStyle(b) : null;
        return { ink: cs?.color ?? null, wash: cs?.backgroundColor ?? null, badge: row.querySelector('[data-p3="role-example"] [data-p3="contrast-ratio"]')?.textContent ?? null };
      })(),
      states: [...row.querySelectorAll('[data-p3="role-state"]')].map((c) => ({
        name: c.querySelector('[data-p3="role-state-name"]')?.textContent?.trim() ?? '',
        swatch: readSwatch(c.querySelector('[data-p3="role-state-swatch"]')),
        ...readout(c),
      })),
    });
  }
  return out;
};

/** The wash rows this suite actually judged, and in how many polarities. Floored after the loop: the
 *  polarity flip is the reason the underlay is derived rather than pinned, so a run that only ever saw
 *  one mode has not checked the thing that decision was made for. */
let washRowsSeen = 0;
let washPolarities = new Set();

for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);

  // --- 2a. the override picker: does its "Auto" label tell the truth? (#330) --------------------
  //
  // #330's repro, exactly: pick a step, re-read the Auto option, pick Auto again. The defect was that
  // `autoStep` came from the LIVE resolved role — which already reflects the override — so the Auto
  // label mirrored your own manual pick back at you and then reverted to a different value when
  // clicked. A control whose label lies about its own behavior.
  //
  // The row is found by its TOKEN PILL, not by index: `color.interactive.primary.text.rest` is the
  // role, and an index would silently start testing a different row the day one is inserted above it.
  await gotoRail(page, '[data-p3="rail-page-interactive"]');
  const ROLE = 'color.interactive.primary.text.rest';
  const row = page.locator('[data-p3="role-row"]').filter({ hasText: ROLE }).first();
  ok(await row.count() > 0, `${brand}: the ${ROLE} row is present`);

  const readRow = () => row.evaluate((el) => {
    const sel = el.querySelector('[data-p3="role-source"] select');
    return {
      auto: sel?.options[0]?.text ?? null,
      value: sel?.value ?? null,
      steps: [...(sel?.options ?? [])].slice(1).map((o) => o.value),
      swatch: getComputedStyle(el.querySelector('[data-p3="role-swatch"]')).backgroundColor,
    };
  });

  const before = await readRow();
  ok(/^Auto · /.test(before.auto ?? ''), `${brand}: the picker's first option is the Auto option ("${before.auto}")`);
  ok(before.value === '', `${brand}: the row starts on Auto (no override)`);

  // The step to pick has to be one that MOVES the resolved color — an override that happens to land
  // on the baseline would leave every reading below identical and pass this whole section on a defect.
  // Found by driving, not by parsing the Auto label for its step name: that parse would silently pick
  // the wrong step the day the label's punctuation changes, and this section would go quietly weak.
  let pick = null;
  let during = null;
  for (const step of before.steps) {
    await row.locator('[data-p3="role-source"] select').selectOption(step);
    await page.waitForFunction(
      ([r, p]) => [...document.querySelectorAll('[data-p3="role-row"]')].find((el) => el.textContent.includes(r))
        ?.querySelector('[data-p3="role-source"] select')?.value === p, [ROLE, step]);
    during = await readRow();
    if (during.swatch !== before.swatch) { pick = step; break; }
  }
  ok(pick !== null, `${brand}: some step in the picker moves the resolved color (picked '${pick}')`);
  ok(during?.value === pick, `${brand}: picking '${pick}' sets the override`);
  // THE #330 ASSERTION. The Auto option names the engine's baseline; an override must not move it.
  ok(during?.auto === before.auto,
    `${brand}: the Auto label still names the true baseline with an override active `
    + `— was "${before.auto}", now "${during.auto}" (#330)`);

  // And the other half of #330, which is the half that made it a lie rather than a cosmetic slip:
  // selecting Auto must produce the value its own label promised.
  await row.locator('[data-p3="role-source"] select').selectOption('');
  await page.waitForFunction(
    (r) => [...document.querySelectorAll('[data-p3="role-row"]')].find((el) => el.textContent.includes(r))
      ?.querySelector('[data-p3="role-source"] select')?.value === '', ROLE);
  const after = await readRow();
  ok(after.swatch === before.swatch,
    `${brand}: selecting Auto returns the color the Auto label named (was ${before.swatch}, now ${after.swatch}) (#330)`);
  ok(after.auto === before.auto, `${brand}: the Auto label is unchanged after the round trip (#330)`);

  // --- 2a-ii. the overlay wash is presented as a wash, not as a ramp step (#1210) ---------------
  //
  // #1210 part 2 was two untruths in the same row, and both came from the row treating a TRANSLUCENT
  // role as an opaque one:
  //
  //   (a) the Source picker bound the wash to the NEUTRAL RAMP and labelled it "Auto · neutral 10".
  //       The primitive is `<ns>.black-alpha.10` — the neutral ramp has no step 10 to be. Worse than
  //       cosmetic: picking from that list wrote `{palette: neutral, step}`, which `modes.ts` applies
  //       by spreading over the existing role, so `alpha` survived and the role came out naming an
  //       opaque ramp step while still rendering at 10%.
  //   (b) the swatch painted the `rgba()` with no underlay, so it composited over whatever studio
  //       chrome sat behind it and a 10% black wash read near-opaque; the two state cells were worse
  //       still, painting `r.hex` — the wash's OPAQUE BASE — as solid black.
  //
  // BOTH MODES ARE DRIVEN, and that is the assertion, not thoroughness. The wash flips polarity with
  // the page: `black-alpha` on a light page, `white-alpha` on a dark one. So the underlay CANNOT be a
  // pinned light colour — a white underlay would render Dark's white wash on white, invisible, which
  // is #555 in this file exactly (`.exbox.dark` pinned `#0d0d10`, wrong in a Dark mode, where
  // "inverse" resolves LIGHT). The fix derives the underlay from the role's own declared `against`;
  // `deltaLum` in both polarities is what holds it to that.
  //
  // The derived modes are skipped because they have no editor at all — their whole workspace is the
  // read-only note — so the customizable pair is the population, not a sample of it.
  await gotoRail(page, '[data-p3="rail-page-interactive"]');
  const washModes = (await page.locator('[data-p3="mode-tab"] [data-p3="mode-tab-name"]').allTextContents())
    .map((m) => m.trim()).filter((m) => /^(light|dark)$/i.test(m));
  ok(washModes.length === 2, `${brand}: the Interactive page offers both customizable modes (${washModes.join(', ')})`);
  const washEmission = await loadEmission(brand);
  for (const mode of washModes) {
    await selectMode(page, mode);
    const dark = /dark/i.test(mode);
    const expectPal = dark ? OVERLAY_PAL.dark : OVERLAY_PAL.light;
    const rows = await page.evaluate(READ_OVERLAY_ROWS);
    // Named, not counted: three built-in action palettes each carry an overlay row under
    // `overlay-neutral`. A brand on another `outlineInteraction` renders none, and this would then be
    // asserting nothing — so the floor fails by name rather than passing on an empty list.
    ok(rows.length >= 3,
      `${brand} / ${mode}: the Interactive page renders ${rows.length} overlay-wash row(s) to judge (floor 3)`);
    for (const row of rows) {
      const where = `${brand} / ${mode} / ${row.pill}`;
      // (a) — the Source slot names the primitive and offers no ramp.
      // Two ABSENCE checks, so each needs the Source slot itself found by this probe first (#1831): a slot
      // that did not render reads as zero pickers and no ramp step, and would pass both.
      const sourceSeen = { seen: row.source.text !== null, state: "this row's Source readout" };
      hooks.absent(ok, sourceSeen, row.source.selects === 0,
        `${where}: the Source slot offers no ramp-step picker — a step of the neutral ramp is opaque and would replace the wash, not retint it (#1210a)`);
      ok(row.source.text === `${expectPal} ${OVERLAY_STEPS.hover}`,
        `${where}: the Source reads "${expectPal} ${OVERLAY_STEPS.hover}", the primitive the engine minted — got "${row.source.text}" (#1210a)`);
      hooks.absent(ok, sourceSeen, !/\bneutral\s+\d+\b/.test(row.source.text ?? ''),
        `${where}: the Source does not present the wash as a step of the neutral ramp — got "${row.source.text}" (#1210a)`);
      // (b) — the swatch composites over an opaque ground, and the result is a visible tint.
      ok(row.swatch?.hasWashLayer === true,
        `${where}: the swatch paints the wash as a translucent LAYER (alpha ${row.swatch?.washAlpha}) rather than as its opaque base (#1210b)`);
      ok(row.swatch?.underOpaque === true,
        `${where}: the swatch layer sits on an opaque underlay (${row.swatch?.underColor}) instead of on whatever chrome is behind it (#1210b)`);
      ok(row.swatch?.underColor === row.exboxBg,
        `${where}: the swatch's underlay is the same ground the example composites the wash over — swatch ${row.swatch?.underColor}, example ${row.exboxBg}`);
      ok((row.swatch?.deltaLum ?? 0) > 0.005,
        `${where}: the composited wash is visible against that ground (Δluminance ${row.swatch?.deltaLum?.toFixed(4)}) — a wash pinned to the wrong polarity's ground would read 0`);
      // The states strip: same two claims, at three times the count. Fixing only the row's own swatch
      // would have left the identical untruth two rows down.
      ok(row.states.length === 2, `${where}: the states strip carries Hover and Pressed (${row.states.map((s) => s.name).join(', ')})`);
      for (const st of row.states) {
        const stepKey = st.name.toLowerCase();
        hooks.absent(ok, { seen: st.text !== null, state: `the ${st.name} state's Source readout` },
          st.selects === 0, `${where} / ${st.name}: the state's Source offers no ramp-step picker (#1210a)`);
        ok(st.text === `${expectPal} ${OVERLAY_STEPS[stepKey] ?? '?'}`,
          `${where} / ${st.name}: the state reads "${expectPal} ${OVERLAY_STEPS[stepKey]}" — got "${st.text}" (#1210a)`);
        ok(st.swatch?.hasWashLayer === true,
          `${where} / ${st.name}: the state swatch paints the wash as a layer, not as its opaque base (#1210b)`);
        ok(st.swatch?.underOpaque === true,
          `${where} / ${st.name}: the state swatch layer sits on an opaque underlay (${st.swatch?.underColor}) (#1210b)`);
        ok((st.swatch?.deltaLum ?? 0) > 0.005,
          `${where} / ${st.name}: the composited state wash is visible against that ground (Δluminance ${st.swatch?.deltaLum?.toFixed(4)})`);
      }
      // (c) — the specimen previews the pair a component DRAWS on this wash, and carries a receipt for it
      // (#812). ORACLE: the committed emission's `interactive.<c>.text.hover` — the ink the Button binds as
      // `outline.label.hover` over `outline.overlay.hover` — and that role's own `min`; never the studio's
      // resolution. ACTUAL: the ink and the wash the specimen renders, composited in Node over the example's
      // ground, and the ratio the badge prints. The row painted `text.rest` here until #812, a pair no
      // component renders (aurora Dark primary 3.83:1), with no receipt at all.
      const fam = /^color\.interactive\.([a-z0-9-]+)\.overlay\.hover$/.exec(row.pill)?.[1];
      const want = fam && washEmission ? washEmission.role(`interactive.${fam}.text.hover`, mode.toLowerCase()) : null;
      const ink = parseRgb(row.example.ink), wash = parseRgb(row.example.wash), ground = parseRgb(row.exboxBg);
      const drawn = ink && wash && ground ? wcag(ink, over(wash, ground)) : null;
      const printed = row.example.badge ? parseFloat(row.example.badge) : null;
      ok(want !== null && hexOf(ink) === want.hex,
        `${where}: the specimen inks the Button's hover pair — ${hexOf(ink)}, emitted interactive.${fam}.text.hover ${want?.hex ?? 'unresolved'} (#812)`);
      ok(drawn !== null && printed !== null && Math.abs(drawn - printed) < 0.011,
        `${where}: the specimen carries a contrast receipt for the pair on screen — badge ${printed ?? 'ABSENT'}:1, rendered ${drawn?.toFixed(2)}:1 (#812)`);
      ok(drawn !== null && typeof want?.min === 'number' && drawn >= want.min,
        `${where}: the hover pair clears text.hover's own contract — ${drawn?.toFixed(2)}:1 against ${want?.min}:1 (#812)`);
      washRowsSeen++;
      washPolarities.add(expectPal);
    }
  }

  // --- 2b. a select must not jump the page while scrolled (#485) --------------------------------
  //
  // `applyFull()` → `renderWorkspace()` does `workspace.innerHTML = ''`, which resets scroll as a side
  // effect; #485 fixed it once for every current AND future caller by saving/restoring around the
  // teardown. Driven on Surfaces, which is where it was reported.
  await gotoRail(page, '[data-p3="rail-page-surfaces"]');
  const surfSel = page.locator('[data-p3="section-backgrounds"] select').first();
  const opts = await surfSel.evaluate((s) => [...s.options].map((o) => o.value));
  const cur = await surfSel.inputValue();
  const target = opts.find((o) => o !== cur);
  const height = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  ok(height > 400, `${brand}: the Surfaces page is scrollable (${height}px of travel) — the jump is observable`);
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForFunction(() => window.scrollY === 400);
  await surfSel.selectOption(target);
  // Wait on the EDIT having landed IN THE REBUILT SECTION — `applyFull()` replaces the whole
  // workspace, so this condition is only true once the new DOM exists. Not a timer, and not a read of
  // the pre-rebuild element, which would already hold the new value and prove nothing.
  await page.waitForFunction((t) => document.querySelector('[data-p3="section-backgrounds"] select')?.value === t, target);
  const scrollY = await page.evaluate(() => window.scrollY);
  ok(Math.abs(scrollY - 400) <= 2, `${brand}: changing a surface select holds the scroll position (400 → ${scrollY}) (#485)`);

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
  // THE REPRO: `typeScale: 'compact'` plus `titleFloor: 16` is a real engine refusal (compact already
  // shifts title.xs to 16px, so the floor would duplicate a rung). The ORDER is load-bearing and is
  // the reason this is a drive rather than a state injection: the shape CARDS trial-build before they
  // enable, so with the floor already on, Compact is correctly disabled and no throw is reachable. The
  // toggle does not trial-build. So: floor off, pins released, shape to Compact, then floor on — which
  // is the sequence a designer performs, and the only one that reaches the engine's refusal.
  //
  // Brand-agnostic on purpose. The two corpus brands start on opposite sides of this (aurora ships the
  // floor on and pinned sizes; harbor does not), so a fixed click list would exercise one and silently
  // no-op on the other.
  await gotoRail(page, '[data-p3="rail-page-typography"]');
  await hooks.click(page.locator('[data-p3="type-tab-styles"]'));
  await hooks.need(page, '[data-p3="heading-shapes"]');
  const floorToggle = () => page.locator('[data-p3="heading-title-floor"] input[type=checkbox]');
  const floorOn = () => page.evaluate(() => document.querySelector('[data-p3="heading-title-floor"] input[type=checkbox]')?.checked ?? null);
  if (await floorOn()) {
    await hooks.click(floorToggle());
    await page.waitForFunction(() => document.querySelector('[data-p3="heading-title-floor"] input[type=checkbox]')?.checked === false);
  }
  const release = page.locator('[data-p3="heading-shape-release"]');
  if (await release.count()) { await hooks.click(release); await hooks.need(page, '[data-p3="heading-shapes"]'); }
  const compact = page.locator('[data-p3="heading-shape-compact"]');
  ok(!(await compact.isDisabled()), `${brand}: with the title floor released, the Compact shape is selectable`);
  await hooks.click(compact);
  await page.waitForFunction(() => document.querySelector('[data-p3="heading-shape-compact"]')?.getAttribute('aria-pressed') === 'true');

  const errState = () => page.evaluate(() => {
    const e = document.querySelector('[data-p3="error-bar"]');
    return { present: !!e, shown: !!e && getComputedStyle(e).display !== 'none', text: e?.textContent?.trim() ?? '' };
  });
  const clean = await errState();
  ok(clean.present && !clean.shown, `${brand}: the error surface is mounted and quiet before the refused edit`);

  await hooks.click(floorToggle());
  // Wait on the BAR, not on a timer — this condition is the assertion's subject, so a hang here fails
  // loudly as the defect it is rather than passing on a measurement taken too early.
  const surfaced = await page.waitForFunction(() => {
    const e = document.querySelector('[data-p3="error-bar"]');
    return !!e && getComputedStyle(e).display !== 'none';
  }, null, { timeout: 5000 }).then(() => true, () => false);
  ok(surfaced, `${brand}: an engine throw raised on Typography SURFACES (#388's defect path)`);
  const raised = await errState();
  ok(/titleFloor/.test(raised.text), `${brand}: the bar names what the engine refused — "${raised.text.slice(0, 90)}"`);

  // THE GENERALIZATION, not just the instance: the surface belongs to the view, so navigating to a
  // third page must not lose it. A page-local bar would vanish here, which is the state #388 described
  // from the other end — the error existing with nothing rendering it.
  await gotoRail(page, '[data-p3="rail-page-motion"]');
  const afterNav = await errState();
  ok(afterNav.shown, `${brand}: the error is still shown after navigating to Motion — it belongs to the chrome, not to a page`);

  // Put it back, and check the bar CLEARS. A surface that only ever appears is half a surface, and the
  // rest of this context (and the console-error drain below) needs a resolved theme.
  await gotoRail(page, '[data-p3="rail-page-typography"]');
  await hooks.click(page.locator('[data-p3="type-tab-styles"]'));
  await hooks.need(page, '[data-p3="heading-shapes"]');
  await hooks.click(floorToggle());
  const cleared = await page.waitForFunction(() => {
    const e = document.querySelector('[data-p3="error-bar"]');
    return !!e && getComputedStyle(e).display === 'none';
  }, null, { timeout: 5000 }).then(() => true, () => false);
  ok(cleared, `${brand}: undoing the refused edit clears the bar`);

  // --- 2e. the weight checkboxes refuse what the engine refuses (#1639, #1681) ----------------------
  // The engine refuses a category with no weight, and a label without `emphasis`. The studio's
  // category table must not offer either untick: the box is disabled, with the reason on hover. The
  // required pair (label → emphasis) is authored here, not read from the engine (docs/34). A swap the
  // owner allowed is driven too: tick a second eyebrow weight, then clear the first, with no error.
  const weightRow = (cat) => page.evaluate((c) => {
    const table = document.querySelector('[data-p3="category-table"]');
    const heads = [...table.querySelectorAll('[data-p3="category-col"]')].map((t) => t.textContent.trim().toLowerCase());
    const roles = heads.slice(0, heads.length - 5);   // then Leading, Tracking, Italic default, Italic, Link (#1296)
    const row = [...table.querySelectorAll('tr')].find((tr) => tr.querySelector('[data-p3="category-name"]')?.textContent === c);
    const boxes = row ? [...row.querySelectorAll('[data-p3="category-cell"] input[type=checkbox]')].slice(0, roles.length) : [];
    return roles.map((role, i) => ({ role, checked: !!boxes[i]?.checked, disabled: !!boxes[i]?.disabled, title: boxes[i]?.title ?? '' }));
  }, cat);
  // The row's style count is re-derived from the rebuilt theme, so it moves only once the table has
  // re-rendered: the wait is on the ENGINE's answer painting, not on the click. Read before clicking.
  const countOf = (cat) => page.evaluate((c) => [...document.querySelectorAll('[data-p3="category-table"] tr')]
    .find((tr) => tr.querySelector('[data-p3="category-name"]')?.textContent === c)?.querySelector('[data-p3="category-count"]')?.textContent, cat);
  const repainted = (cat, before) => page.waitForFunction(({ c, b }) => [...document.querySelectorAll('[data-p3="category-table"] tr')]
    .find((tr) => tr.querySelector('[data-p3="category-name"]')?.textContent === c)?.querySelector('[data-p3="category-count"]')?.textContent !== b, { c: cat, b: before });
  const boxIn = (cat, row0, role) => page.locator('[data-p3="category-table"] tr').filter({ has: page.locator('[data-p3="category-name"]', { hasText: new RegExp(`^${cat}$`) }) })
    .locator('[data-p3="category-cell"] input[type=checkbox]').nth(row0.findIndex((b) => b.role === role));
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
    const shown = await page.evaluate(() => {
      const table = document.querySelector('[data-p3="category-table"]');
      const heads = [...table.querySelectorAll('[data-p3="category-col"]')].map((t) => t.textContent.trim().toLowerCase());
      const idIdx = heads.indexOf('italic default'), iIdx = heads.indexOf('italic');
      return [...table.querySelectorAll('tr')].filter((tr) => tr.querySelector('[data-p3="category-name"]')).map((tr) => {
        const boxes = [...tr.querySelectorAll('[data-p3="category-cell"]')].map((td) => td.querySelector('input[type=checkbox]'));
        return { cat: tr.querySelector('[data-p3="category-name"]').textContent, idOn: !!boxes[idIdx]?.checked, iDisabled: !!boxes[iIdx]?.disabled, found: idIdx >= 0 && iIdx >= 0 };
      });
    });
    const shownOn = shown.filter((r) => r.idOn).map((r) => r.cat).sort();
    ok(shown.length > 0 && shown.every((r) => r.found) && JSON.stringify(shownOn) === JSON.stringify(expected),
      `${brand}: the Italic default column ticks exactly the categories the emission sets italic [${expected.join(', ') || 'none'}] (shows [${shownOn.join(', ') || 'none'}])`);
    ok(shown.filter((r) => r.idOn).every((r) => r.iDisabled),
      `${brand}: an italic-default category's Italic box is disabled — the engine refuses both (${shown.filter((r) => r.idOn).map((r) => `${r.cat}:${r.iDisabled ? 'disabled' : 'LIVE'}`).join(', ') || 'none to check'})`);
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

/** ACTUAL — the Duration ramp as a reader sees it. Rows keyed by the token path already printed in
 *  them, so nothing is added to the DOM to identify them. */
const READ_DURATION_RAMP = () => {
  const sec = document.querySelector('[data-p3="section-duration-ramp"]');
  if (!sec) return null;
  const label = /at tempo '([a-z]+)'/.exec(sec.querySelector('[data-p3="section-description"]')?.textContent ?? '')?.[1] ?? null;
  const rows = {};
  for (const tr of sec.querySelectorAll('table tr')) {
    const cells = [...tr.children];
    if (cells.length < 2) continue;
    const pill = [...cells[0].querySelectorAll('*')]
      .find((n) => /^motion\.duration\.[a-z]+$/.test(n.textContent.trim()));
    if (!pill) continue;
    rows[pill.textContent.trim().split('.').pop()] = cells[1].textContent.trim();
  }
  return { label, rows };
};

/** Wait for the chip `want` to be the checked one in the group at `sel`, as a condition with a bound
 *  rather than a hang: a chip whose write went to another option is re-rendered with THAT option
 *  checked, and the caller reports it by name instead of timing out (#1675). */
const waitChecked = (page, sel, want) => page.waitForFunction(([s, w]) => document.querySelector(`${s} input:checked`)?.value === w, [sel, want], { timeout: 5000 })
  .then(() => true, () => false);

let rampChecks = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await gotoRail(page, '[data-p3="rail-page-motion"]');
  // The base-mode tempo control is a chip group (#1675): a radio per tempo, driven by checking one.
  const tempoGroup = page.locator('[data-p3="section-tempo"] [data-p3="lever-motion-personality-tempo"]').first();
  const options = await tempoGroup.locator('input[type=radio]').evaluateAll((os) => os.map((o) => o.value));
  ok(options.length >= 2, `${brand}: the Tempo control offers ${options.length} tempi`);

  // NO NAVIGATION INSIDE THIS LOOP. Leaving the page and coming back re-renders it and would cure
  // the very staleness being asserted — the defect is only visible between commits.
  for (const tempo of options) {
    await hooks.click(page.locator(`[data-p3="section-tempo"] [data-p3="lever-motion-personality-tempo"] input[value="${tempo}"]`));
    const held = await waitChecked(page, '[data-p3="section-tempo"] [data-p3="lever-motion-personality-tempo"]', tempo);
    ok(held, `${brand}/${tempo}: the tempo chip clicked is the one checked once the page has repainted`);
    if (!held) continue;
    const shown = await page.evaluate(READ_DURATION_RAMP);
    if (!shown) { ok(false, `${brand}/${tempo}: the Duration ramp section is on the page`); continue; }
    const want = expectedRamp(tempo);
    ok(shown.label === tempo, `${brand}: the ramp says tempo '${shown.label}' and the control says '${tempo}'`);
    const wrong = Object.entries(want).filter(([k, v]) => shown.rows[k] !== v);
    ok(Object.keys(shown.rows).length === Object.keys(want).length,
      `${brand}/${tempo}: the ramp shows ${Object.keys(shown.rows).length} of ${Object.keys(want).length} semantic durations`);
    ok(wrong.length === 0, `${brand}/${tempo}: every displayed duration equals the resolved theme's${
      wrong.length ? ` — ${wrong.map(([k, v]) => `${k} shows ${shown.rows[k] ?? '(absent)'}, resolves to ${v}`).join('; ')}` : ''}`);
    rampChecks += Object.keys(want).length;
  }

  const errs = drain();
  ok(errs.length === 0, `${brand}: driving the tempo raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}
// The "did it look?" floor, same discipline as SWEEP_NODE_FLOOR above: a comparison over an empty
// set is true, and would print as coverage.
ok(rampChecks >= 2 * 3 * 6, `${rampChecks} displayed durations compared against the resolved theme`);

// =============================================================================================
// 3b. Lever chips — the 2-4-option enum levers as native radio groups (#1675)
// =============================================================================================
// WHAT THIS HOLDS. #1675 turns every enum lever with 2-4 options and no Auto entry from a select into a
// row of chips. The descriptor rule is unit-tested in Node (`test-lever-controls.ts`); this section holds
// what only a render can show: each group is a `fieldset` whose `legend` names the lever, it offers the
// manifest's options and no others, exactly one is checked, checking one WRITES that value (read back
// from the persisted blob, not from the radio the click just checked), an arrow key moves the value and
// the page repaints, the chips meet the chrome contrast bars, and each chip is a >= 24px hit target.
//
// docs/34: the expected labels and option lists come from the committed `schema/lever-manifest.json`,
// not from the studio bundle, and the value written is read from `localStorage`, a store the chip does
// not paint. A chip whose write went to the wrong option still shows the option the user checked until
// something re-renders it, so the DOM alone could not catch that.
console.log(`\nLever chips (#1675)\n${'='.repeat(78)}`);

const LEVER_MANIFEST = JSON.parse(await readFile(join(ROOT, '..', '..', 'packages', 'engine', 'schema', 'lever-manifest.json'), 'utf8'));
const leverOf = (key) => LEVER_MANIFEST.levers.find((l) => l.key === key);
/** The converted levers, each located by its own literal hook, on the page it lives on. */
const CHIP_LEVERS = [
  { key: 'density', rail: '[data-p3="rail-page-size-radius"]', group: '[data-p3="lever-density"]' },
  { key: 'controlShape', rail: '[data-p3="rail-page-size-radius"]', group: '[data-p3="lever-control-shape"]' },
  { key: 'buttonIcons', rail: '[data-p3="rail-page-size-radius"]', group: '[data-p3="lever-button-icons"]' },
  { key: 'buttonContentSize', rail: '[data-p3="rail-page-size-radius"]', group: '[data-p3="lever-button-content-size"]' },
  { key: 'buttonLabelWeight', rail: '[data-p3="rail-page-size-radius"]', group: '[data-p3="lever-button-label-weight"]' },
  { key: 'motionPersonality.tempo', rail: '[data-p3="rail-page-motion"]', group: '[data-p3="lever-motion-personality-tempo"]' },
  { key: 'iconContrast', rail: '[data-p3="rail-page-interactive"]', group: '[data-p3="lever-icon-contrast"]' },
  { key: 'disabledStrategy', rail: '[data-p3="rail-page-interactive"]', group: '[data-p3="lever-disabled-strategy"]' },
  { key: 'outlineInteraction', rail: '[data-p3="rail-page-interactive"]', group: '[data-p3="lever-outline-interaction"]' },
  { key: 'neutralEmphasis', rail: '[data-p3="rail-page-interactive"]', group: '[data-p3="lever-neutral-emphasis"]' },
];
ok(CHIP_LEVERS.every((c) => leverOf(c.key)?.options?.length >= 2), `every converted lever is an enum in schema/lever-manifest.json (${CHIP_LEVERS.length} levers)`);

/** The group as rendered: its element, legend, radios, and what each chip draws. */
const readChipGroup = (sel) => {
  const all = document.querySelectorAll(sel);
  const fs = all[0];
  if (!fs) return { found: 0 };
  const first = fs.firstElementChild;
  const radios = [...fs.querySelectorAll('input[type=radio]')];
  const groundOf = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\([^)]*,\s*0\)$/.test(bg) && bg !== 'transparent') return bg;
    }
    return 'rgb(255, 255, 255)';
  };
  return {
    found: all.length,
    tag: fs.tagName,
    legend: first?.tagName === 'LEGEND' ? first.textContent.trim() : null,
    values: radios.map((r) => r.value),
    labels: radios.map((r) => r.closest('label')?.textContent.trim() ?? ''),
    names: [...new Set(radios.map((r) => r.name))],
    // Radios sharing a name form one group across the whole document, whatever fieldset they sit in.
    sameName: radios[0] ? document.querySelectorAll(`input[type=radio][name="${CSS.escape(radios[0].name)}"]`).length : 0,
    checked: radios.filter((r) => r.checked).map((r) => r.value),
    chips: radios.map((r) => {
      const face = r.nextElementSibling;
      const box = r.closest('label').getBoundingClientRect();
      const hit = r.getBoundingClientRect();
      const cs = getComputedStyle(face);
      return {
        value: r.value, checked: r.checked,
        w: box.width, h: box.height, hitW: hit.width, hitH: hit.height,
        weight: Number(cs.fontWeight), mark: getComputedStyle(face, '::before').content,
        edge: cs.borderTopColor, ground: groundOf(face), outline: cs.outlineStyle,
      };
    }),
  };
};
const persistedAt = (page, key) => page.evaluate((k) => {
  try { const o = JSON.parse(localStorage.getItem('prism3:brandInput')); return k.split('.').reduce((n, s) => n?.[s], o?.input) ?? null; } catch { return null; }
}, key);

let chipGroupsChecked = 0;
for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  const drive = brand === BRANDS[0];
  for (const rail of [...new Set(CHIP_LEVERS.map((c) => c.rail))]) {
    await gotoRail(page, rail);
    for (const c of CHIP_LEVERS.filter((x) => x.rail === rail)) {
      const lever = leverOf(c.key);
      const where = `${brand} / ${c.key}`;
      const g = await page.evaluate(readChipGroup, c.group);
      if (!g.found) { ok(false, `${where}: renders a chip group`); continue; }
      chipGroupsChecked++;
      ok(g.found === 1, `${where}: renders exactly one chip group (${g.found})`);
      ok(g.tag === 'FIELDSET', `${where}: the chip group is a fieldset (a ${g.tag})`);
      ok(g.legend === lever.label, `${where}: the group's legend names the lever ("${g.legend}", want "${lever.label}")`);
      ok(JSON.stringify(g.values) === JSON.stringify(lever.options.map((o) => String(o.value))),
        `${where}: offers the manifest's ${lever.options.length} options as radios (${g.values.join(', ')})`);
      ok(JSON.stringify(g.labels) === JSON.stringify(lever.options.map((o) => o.label)), `${where}: each chip reads the manifest's option label`);
      ok(g.names.length === 1 && g.sameName === g.values.length, `${where}: its radios form one group of their own (name ${g.names.join(', ')}, ${g.sameName} in the document)`);
      const stored = (await persistedAt(page, c.key)) ?? lever.default;
      ok(g.checked.length === 1 && g.checked[0] === String(stored), `${where}: exactly one chip is checked, the brand's value (${g.checked.join(', ') || 'none'}, stored ${stored})`);
      // Selected is not signaled by color alone: the checked chip is heavier and check-marked.
      const on = g.chips.find((x) => x.checked), off = g.chips.filter((x) => !x.checked);
      ok(on && /✓/.test(on.mark) && off.every((x) => !/✓/.test(x.mark)) && off.every((x) => x.weight < on.weight),
        `${where}: the checked chip carries a check mark and a heavier weight, the others neither (${on?.weight} vs ${off.map((x) => x.weight).join('/')})`);
      // WCAG 2.5.8: each chip, and the radio that takes its clicks, is at least 24 x 24.
      const small = g.chips.filter((x) => x.h < 24 || x.w < 24 || x.hitH < 24 || x.hitW < 24);
      ok(small.length === 0, `${where}: every chip is a >= 24px hit target${small.length ? ` — ${small.map((x) => `${x.value} ${x.w.toFixed(1)}x${x.h.toFixed(1)}`).join(' | ')}` : ''}`);
      // WCAG 1.4.11: an unchecked chip's edge against the ground it sits on.
      const edges = off.map((x) => ({ v: x.value, r: wcag(parseRgb(x.edge), parseRgb(x.ground)) }));
      const faint = edges.filter((e) => !(e.r >= 3));
      ok(faint.length === 0, `${where}: every unchecked chip's edge clears 3:1 against its ground (${edges.map((e) => e.r.toFixed(2)).join(', ')})`);
      // The chips' text through the rendered-legibility probe, at the chrome bars.
      await settle(page, where);
      const probe = await page.evaluate(LEGIBILITY_PROBE, c.group);
      assertParsed(where, probe.unparsed);
      ok(probe.rootFound && probe.text.length >= lever.options.length + 1, `${where}: the probe measured the legend and every chip (${probe.text.length} text nodes)`);
      const under = probe.text.filter((r) => r.specimen || r.ratio < barOf(r));
      ok(under.length === 0, `${where}: every chip and the legend meet the chrome text bar${under.length ? ` — ${under.map((u) => `"${u.text}" ${u.ratio}:1${u.specimen ? ' (marked specimen)' : ''}`).join(' | ')}` : ''}`);
      console.log(`  ${where}: ${g.values.length} chips; text ${Math.min(...probe.text.map((r) => r.ratio))}:1 min; edge ${Math.min(...edges.map((e) => e.r)).toFixed(2)}:1 min; ${Math.min(...g.chips.map((x) => x.h)).toFixed(1)}px min height`);
      if (!drive) continue;

      // DRIVE BY POINTER: check each unchecked option, and read what was WRITTEN.
      for (const o of lever.options) {
        const v = String(o.value);
        if ((await page.evaluate(readChipGroup, c.group)).checked[0] === v) continue;
        await hooks.click(page.locator(`${c.group} label`).filter({ hasText: o.label }).first());
        await waitChecked(page, c.group, v);   // bounded; the two assertions below say what went wrong
        const wrote = await persistedAt(page, c.key);
        ok(String(wrote) === v, `${where}: checking "${o.label}" writes ${v} to the brand (wrote ${wrote})`);
        const after = await page.evaluate(readChipGroup, c.group);
        ok(after.checked.length === 1 && after.checked[0] === v, `${where}: after "${o.label}", exactly that chip is checked (${after.checked.join(', ')})`);
      }
      // DRIVE BY KEYBOARD: an arrow key moves the value within the group, and the page repaints.
      const before = await page.evaluate(readChipGroup, c.group);
      const cur = before.checked[0];
      const next = before.values[(before.values.indexOf(cur) + 1) % before.values.length];
      const ws = () => page.evaluate(() => document.querySelector('[data-p3="workspace"]')?.innerHTML ?? '');
      const wsBefore = await ws();
      await page.locator(`${c.group} input[value="${cur}"]`).focus();
      await page.keyboard.press('ArrowRight');
      await waitChecked(page, c.group, next);
      ok(String(await persistedAt(page, c.key)) === next, `${where}: ArrowRight from ${cur} writes ${next} to the brand`);
      await settle(page, where);
      ok((await ws()) !== wsBefore, `${where}: the page repaints after the arrow key (the workspace differs from before)`);
      // Focus is an outline, and it is not the selected look: after the arrow key the focused chip has a
      // ring, and a checked chip without focus does not.
      const focusRing = await page.evaluate((sel) => {
        const f = document.querySelector(`${sel} input:focus-visible`);
        return f ? getComputedStyle(f.nextElementSibling).outlineStyle : 'no focused chip';
      }, c.group);
      ok(focusRing !== 'no focused chip' && focusRing !== 'none', `${where}: after the arrow key, focus is still on a chip in the group and it draws a focus ring (${focusRing})`);
      // A SECOND arrow press moves again. When the commit swaps the region (an example or a warning line
      // changed), the focused radio is replaced; renderWorkspace refocuses the same chip in the new group,
      // or this press would land on <body> and do nothing.
      const next2 = before.values[(before.values.indexOf(next) + 1) % before.values.length];
      await page.keyboard.press('ArrowRight');
      await waitChecked(page, c.group, next2);
      ok(String(await persistedAt(page, c.key)) === next2, `${where}: a second ArrowRight writes ${next2}, so focus survived the repaint`);
      await settle(page, where);
      ok(on.outline === 'none', `${where}: the checked chip, unfocused, draws no ring, so focus and selection look different`);
    }
  }
  const errs = drain();
  ok(errs.length === 0, `${brand}: rendering and driving the lever chips raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}
ok(chipGroupsChecked >= CHIP_LEVERS.length * 2, `${chipGroupsChecked} chip groups checked (floor ${CHIP_LEVERS.length * 2}: every converted lever on at least two brands)`);

// Narrow panels: the chips wrap instead of overflowing (#1675). Measured at 380px, the plugin's narrow width.
{
  const { ctx, page } = await openBrand(BRANDS[0]);
  await gotoRail(page, '[data-p3="rail-page-interactive"]');
  await page.setViewportSize({ width: 380, height: 900 });
  const wrap = await page.evaluate(() => {
    const g = document.querySelector('[data-p3="lever-outline-interaction"]');
    const row = g?.querySelector('input')?.closest('label')?.parentElement;
    if (!row) return null;
    const tops = [...row.children].map((l) => Math.round(l.getBoundingClientRect().top));
    return { rows: new Set(tops).size, over: row.scrollWidth - row.clientWidth, doc: document.documentElement.scrollWidth - window.innerWidth };
  });
  ok(wrap && wrap.rows >= 2 && wrap.over <= 1, `at 380px the Outline hover chips wrap onto ${wrap?.rows} rows with no overflow (${wrap?.over}px)`);
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
    // #1770 — the locked Light row is locked by a GLYPH, not by a fade. It sat at 2.95:1 until then (a legal
    // `--faint` "always" through `opacity: .72`), so the row's own text must be among what was measured —
    // held to the bar above, not merely present — and the glyph must carry a name assistive tech can read.
    const locked = await page.evaluate(() => {
      const row = document.querySelector('[data-p3="brand-menu"] [data-p3="mode-base-row"]');
      const lock = row?.querySelector('[data-p3="mode-base-lock"]');
      return { row: !!row, lockName: lock?.getAttribute('role') === 'img' ? (lock.getAttribute('aria-label') ?? '') : '' };
    });
    ok(probe.text.some((r) => r.hook === hooks.role('[data-p3="mode-base-always"]')) && locked.row,
      `${where}: the locked Light row is mounted and its "always" label was measured at the chrome bar (#1770)`);
    ok(locked.lockName.length > 0, `${where}: the locked row's lock glyph is an image with an accessible name ("${locked.lockName}") (#1770)`);
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
  const pages = await railLabels(page);
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
  for (const label of pages) {
    await gotoPage(page, label);
    await walkPills();
  }
  await hooks.click(page.locator('[data-p3="tab-brand"]'));
  await hooks.need(page, '[data-p3="brand-style-guide"] [data-p3="token-pill"]');
  await walkPills();
  pages.push('Brand');

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
    ok(hazard.length >= TWIN_HAZARD_FLOOR,
      `${where} @ ${w}px cap: ${hazard.length} twin pairing(s) elide to identical text, so the badge is the only thing telling them apart (floor ${TWIN_HAZARD_FLOOR})${
        hazard.length ? ` — e.g. "${hazard[0][0].visible}" for both ${hazard[0][0].path} and ${hazard[0][1].path}` : ''}`);
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
// derived from the text ink's own candidates so the edge follows the label by default. Nothing in the
// studio could author it — `renderPaletteSection` had a Source row for fill, text, overlay, subtle-fill
// and on-fill, and none for the border — so the one role added for a designer to tune was the one role
// they could not reach.
//
// WHY THE PRESENCE OF THE ROWS IS NOT THE LOAD-BEARING ARM. A row that renders, carries a pill and offers
// a step list can still be inert in the way that matters here: `exOutline` painted the border AND the ink
// from a single `edge` argument, read off `text.rest`. Add the row on top of that and the specimen keeps
// showing the ink no matter what the picker says — the swatch moves, the example does not, and the control
// reads as broken while every presence check passes. So the arm that carries the fix is the DIVERGENCE:
// override the border and the specimen's edge must move while its ink holds still.
//
// AND THE STATES ARE DRIVEN, NOT INFERRED FROM A CUSTOM PROPERTY. The edge used to be an inline `border`
// shorthand, which beats `.ibtn:hover` — so a stateful edge was unreachable no matter what the engine
// resolved. Reading `--ibtn-hbd` back would assert only that the value was written down. Hovering the
// specimen and re-reading the RENDERED border color is what fails if that CSS refactor is reverted.
//
// THE PER-FAMILY EXPECTATION IS MEASURED FROM THE ENGINE, NOT FROM THE DOM (docs/34 shape 1). Across all
// six corpus themes, `primary` and `destructive` walk three distinct border steps while `neutral`'s three
// states land on ONE — its ink is already the far end of its ramp with nowhere further to walk, which is
// #576's decided outcome, not a regression. That split is asserted in both directions: a walking family
// whose hover edge stops moving fails, and so does a neutral whose states start diverging.
//
// ONE MODE, one page. The role set and the wiring do not vary by mode; the colors do, and section 1
// already sweeps those. Light is the mode with editors rather than the read-only `.genview` note.
console.log(`\nThe outline edge (#576)\n${'='.repeat(78)}`);

// 3 families × 2 contexts, and no corpus brand ships an accent column — so this is the whole set (asserted
// against the rendered page after the loop, #1245), and
// asserting each by name beats a count that a brand with an extra palette would inflate into a pass.
const EDGE_FAMILIES = ['primary', 'neutral', 'destructive'];
// Which families' border states WALK. Read from the engine's behavior, restated here on purpose: this is
// the duplication that makes the assertion a comparison instead of a tautology.
const EDGE_WALKS = new Set(['primary', 'destructive']);

/** One Border row, read as a whole: the row's own swatch, and what the specimen actually paints. */
const readEdgeRow = (row) => row.evaluate((el) => {
  const btn = el.querySelector('[data-p3="role-example"] [data-p3="example-button"]');
  const cs = btn && getComputedStyle(btn);
  const sel = el.querySelector('[data-p3="role-source"] select');
  return {
    swatch: getComputedStyle(el.querySelector('[data-p3="role-swatch"]')).backgroundColor,
    edge: cs ? cs.borderTopColor : null,
    width: cs ? cs.borderTopWidth : null,
    ink: cs ? cs.color : null,
    auto: sel?.options[0]?.text ?? null,
    value: sel?.value ?? null,
    steps: [...(sel?.options ?? [])].slice(1).map((o) => o.value),
    // The two state cells, in order — each its own swatch and its own override select.
    states: [...el.querySelectorAll('[data-p3="role-states"] [data-p3="role-state"]')].map((c) => ({
      name: c.querySelector('[data-p3="role-state-name"]')?.textContent ?? '',
      swatch: getComputedStyle(c.querySelector('[data-p3="role-state-swatch"]')).backgroundColor,
      options: c.querySelector('select')?.options.length ?? 0,
    })),
  };
});

for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await gotoRail(page, '[data-p3="rail-page-interactive"]');
  const notes = [];

  for (const fam of EDGE_FAMILIES) {
    for (const inverse of [false, true]) {
      // The `color.` head is what disambiguates the two: `color.inverse.interactive.…` does not contain
      // `color.interactive.…`, so each pill matches exactly one row.
      const ROLE = `color.${inverse ? 'inverse.' : ''}interactive.${fam}.border.rest`;
      const where = `${brand} ${fam}${inverse ? ' · inverse' : ''}`;
      const row = page.locator('[data-p3="role-row"]').filter({ hasText: ROLE }).first();
      ok(await row.count() > 0, `${where}: the ${ROLE} row is present — the border is authorable (#576)`);
      if (!(await row.count())) continue;

      const r = await readEdgeRow(row);
      ok(/^Auto · /.test(r.auto ?? '') && r.value === '' && r.steps.length > 0,
        `${where}: its Source select starts on Auto and offers ${r.steps.length} step(s) of this family's own ramp`);

      // The specimen paints the BORDER role, not the ink. Two independently written paint sites — the
      // row's swatch comes from the resolved role, the example from `exOutline` — so they agreeing is a
      // real comparison, and the version of this row that painted the edge from `text.rest` fails it the
      // moment an override lands below.
      // A VISIBLE edge, not the authored figure. `exOutline` asks for 1.5px and Chromium rounds a
      // fractional border to a device pixel, so the used value reads 1px at DPR 1 — asserting 1.5 would
      // be asserting the string this file's subject wrote down. That the edge comes from the STYLESHEET
      // rather than an inline shorthand is proven below, by hovering it.
      ok(r.edge !== null && parseFloat(r.width) > 0,
        `${where}: the example draws a visible edge (border-top-width ${r.width})`);
      ok(r.edge === r.swatch,
        `${where}: the example's edge is the color the row's swatch names (swatch ${r.swatch}, edge ${r.edge})`);

      // Both states, per family, with their own pickers.
      ok(r.states.length === 2 && r.states[0].name === 'Hover' && r.states[1].name === 'Pressed',
        `${where}: Hover and Pressed each get their own Source select (${r.states.map((s) => `${s.name}:${s.options}`).join(', ') || 'none'})`);
      const walks = r.states.every((s) => s.swatch !== r.swatch);
      const holds = r.states.every((s) => s.swatch === r.swatch);
      ok(EDGE_WALKS.has(fam) ? walks : holds,
        `${where}: its border states ${EDGE_WALKS.has(fam) ? 'WALK away from rest' : 'all land on rest (#576, decided)'} `
        + `— rest ${r.swatch}, ${r.states.map((s) => `${s.name} ${s.swatch}`).join(', ')}`);
      notes.push(`${fam}${inverse ? '·inv' : ''} ${EDGE_WALKS.has(fam) ? 'walks' : 'holds'}`);
    }
  }

  // THE SET IS CLOSED, asserted rather than assumed (#1245). The loop above visits only the families it
  // was handed, so a fourth interactive column would render two Border rows this section never reads —
  // zero coverage and a green run. Enumerate every Border row the PAGE renders, from its token pill, and
  // require the families found to be exactly EDGE_FAMILIES, each in both contexts. The page and the
  // authored list are the two sides; deriving the list from the page would compare it with itself.
  const rendered = await page.evaluate(() => [...document.querySelectorAll('[data-p3="role-row"] [data-p3="token-pill"]')]
    .map((t) => /(?:^|\.)color\.(inverse\.)?interactive\.([a-z0-9-]+)\.border\.rest$/.exec(t.getAttribute('title') ?? t.textContent ?? ''))
    .filter(Boolean).map((m) => `${m[2]}${m[1] ? ' · inverse' : ''}`));
  const expectedEdges = EDGE_FAMILIES.flatMap((f) => [f, `${f} · inverse`]);
  const unvisited = [...new Set(rendered)].filter((k) => !expectedEdges.includes(k));
  const unrendered = expectedEdges.filter((k) => !rendered.includes(k));
  ok(unvisited.length === 0 && unrendered.length === 0 && rendered.length === expectedEdges.length,
    `${brand}: the page renders exactly ${expectedEdges.length} Border rows, one per EDGE_FAMILIES family × {page, inverse} `
    + `(rendered ${rendered.length}${unvisited.length ? `; NOT VISITED by this section: ${unvisited.join(', ')} — add the family to EDGE_FAMILIES` : ''}`
    + `${unrendered.length ? `; missing: ${unrendered.join(', ')}` : ''})`);

  // The other direction of the CSS change, which none of the assertions above can see: `--ibtn-bw` is set
  // --- THE DIVERGENCE, driven on primary --------------------------------------------------------
  const ROLE = 'color.interactive.primary.border.rest';
  const INK = 'color.interactive.primary.text.rest';
  const FILL = 'color.interactive.primary.fill.rest';
  const bRow = page.locator('[data-p3="role-row"]').filter({ hasText: ROLE }).first();
  const tRow = page.locator('[data-p3="role-row"]').filter({ hasText: INK }).first();
  const fRow = page.locator('[data-p3="role-row"]').filter({ hasText: FILL }).first();
  const inkSwatch = () => tRow.evaluate((el) => getComputedStyle(el.querySelector('[data-p3="role-swatch"]')).backgroundColor);

  // A missing row has to report as a FAILED ASSERTION, not as an uncaught locator timeout. Measured while
  // mutation-testing this section: with the border rows removed, the six presence checks above failed by
  // name and then the first `evaluate` below threw after 30s and took the process down — before the tally
  // and before the `GITHUB_STEP_SUMMARY` write, which makes a red run read on the run page exactly like a
  // step that never executed. The exit code was still 1, so it gated; the evidence is what was lost.
  const driveable = (await bRow.count()) > 0 && (await tRow.count()) > 0 && (await fRow.count()) > 0;
  ok(driveable, `${brand}: the border, ink and fill rows are all on the page to drive against`);
  if (!driveable) {
    const missing = drain();
    ok(missing.length === 0, `${brand}: 0 console errors before the skipped edge drive${missing.length ? ` — ${missing.slice(0, 3).join(' | ')}` : ''}`);
    await ctx.close();
    continue;
  }

  // The other direction of the CSS change, which none of the assertions above can see: `--ibtn-bw` is set
  // by `exOutline` alone, so every other specimen falls back to 0 and stays borderless. A `border:1.5px`
  // that landed on `.ibtn` itself would satisfy this whole section and quietly add 3px to every filled
  // button specimen in the studio.
  const fillEdge = await fRow.locator('[data-p3="role-example"] [data-p3="example-button"]').first().evaluate((el) => getComputedStyle(el).borderTopWidth);
  ok(parseFloat(fillEdge) === 0,
    `${brand}: a FILLED specimen still has no border (border-top-width ${fillEdge}) — the outline example is the only one that sets \`--ibtn-bw\``);

  const before = await readEdgeRow(bRow);
  const inkBefore = await inkSwatch();
  ok(before.edge === before.ink,
    `${brand}: with no override the edge and the ink are the same color (${before.edge}) — the border follows the ink by default (#1231)`);

  // The step has to be one that MOVES the resolved color; an override landing on the baseline would leave
  // every reading below identical and pass this whole drive on a defect.
  let pick = null;
  let during = null;
  for (const step of before.steps) {
    await bRow.locator('[data-p3="role-source"] select').selectOption(step);
    await page.waitForFunction(
      ([r, p]) => [...document.querySelectorAll('[data-p3="role-row"]')].find((el) => el.textContent.includes(r))
        ?.querySelector('[data-p3="role-source"] select')?.value === p, [ROLE, step]);
    during = await readEdgeRow(bRow);
    if (during.swatch !== before.swatch) { pick = step; break; }
  }
  ok(pick !== null, `${brand}: some step in the border picker moves the resolved color (picked '${pick}')`);

  // THE LOAD-BEARING ASSERTION. Both halves matter: the edge followed the override, and the ink did not.
  ok(during?.edge === during?.swatch && during?.edge !== before.edge,
    `${brand}: pinning the border moves the example's EDGE (${before.edge} → ${during?.edge}, swatch ${during?.swatch}) (#576)`);
  ok(during?.ink === before.ink,
    `${brand}: and leaves the example's INK where it was (${before.ink}) — the edge can now differ from the label it surrounds`);
  ok((await inkSwatch()) === inkBefore,
    `${brand}: the Text · rest row is untouched by a border override (${inkBefore}) — the override is scoped to the one role`);
  ok(/^Auto · /.test(during?.auto ?? '') && during?.auto === before.auto,
    `${brand}: the border row's Auto label still names the engine's baseline with an override active `
    + `— was "${before.auto}", now "${during?.auto}" (#330)`);

  // --- THE RENDERED STATES, which the inline shorthand made unreachable -------------------------
  await bRow.locator('[data-p3="role-source"] select').selectOption('');
  await page.waitForFunction(
    (r) => [...document.querySelectorAll('[data-p3="role-row"]')].find((el) => el.textContent.includes(r))
      ?.querySelector('[data-p3="role-source"] select')?.value === '', ROLE);
  const back = await readEdgeRow(bRow);
  ok(back.edge === before.edge && back.swatch === before.swatch,
    `${brand}: selecting Auto returns the edge the Auto label named (${back.edge})`);

  const btn = bRow.locator('[data-p3="role-example"] [data-p3="example-button"]');
  const edgeNow = () => btn.evaluate((el) => getComputedStyle(el).borderTopColor);
  await btn.hover();
  // Waits on the CONDITION, not a timer, and reads it through `:hover` so a mouse that landed on the
  // wrong element reports as "the edge never moved" rather than passing on a stale read. A timeout is a
  // failed assertion below, not a thrown wait.
  const hoverLanded = await page.waitForFunction((rest) => {
    const el = document.querySelector('[data-p3="role-row"] [data-p3="role-example"] [data-p3="example-button"]:hover');
    return !!el && getComputedStyle(el).borderTopColor !== rest;
  }, back.edge, { timeout: 3000 }).then(() => true, () => false);
  const hovered = await edgeNow();
  ok(hoverLanded && hovered === back.states[0].swatch,
    `${brand}: hovering the specimen paints the HOVER edge (rest ${back.edge} → ${hovered}, Hover swatch ${back.states[0].swatch}) `
    + `— an inline \`border\` shorthand could not be overridden by \`:hover\` at all`);

  // Pressed is click-to-pin (#291), and the border row is pinnable BECAUSE its edge has a pressed value —
  // its wash never changes, so an affordance keyed off the wash alone would have left this unreachable.
  await hooks.click(btn);
  // Same reason the hover wait is guarded: a specimen that is not pinnable at all never gets the class, and
  // an unguarded wait would take the process down instead of reporting which assertion noticed.
  const pinned = await page.waitForFunction(
    () => !!document.querySelector('[data-p3="role-row"] [data-p3="role-example"] [data-p3="example-button"].is-pressed'), null, { timeout: 3000 },
  ).then(() => true, () => false);
  const pressed = await edgeNow();
  ok(pinned && pressed === back.states[1].swatch && pressed !== hovered,
    `${brand}: pinning the specimen paints the PRESSED edge (pinnable=${pinned}, ${pressed}, Pressed swatch ${back.states[1].swatch})`);
  await hooks.click(btn);

  const errs = drain();
  ok(errs.length === 0, `${brand}: 0 console errors across the edge drive${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`  ${brand}: ${notes.length} border rows (${notes.join(', ')}); pinned primary to '${pick}' `
    + `— edge ${before.edge} → ${during?.edge}, ink held at ${before.ink}.`);
  await ctx.close();
}

// =============================================================================================
// 8. The Links section surfaces the global link role + its states (#1487)
// =============================================================================================
// #1487's studio-surface work: the single global link role (#1486) — `text.link.*` / `icon.link.*`
// with their inverse twins — is now surfaced read-only on the Interactive page, in the same role-block
// vocabulary the palette sections use. The gap it closes is that a designer had no way to SEE the link
// role or its states in the studio at all; the role has no lever, so this is a preview, not an editor.
//
// THE ORACLE IS THE ENGINE'S EMITTED TOKEN TREE, NOT THE STUDIO'S RENDER (docs/34 shape 1). Which link
// families exist, and which states each carries, is read from `packages/engine/out/aurora.tokens.json`
// — the engine's own committed emission — and the studio DOM is then required to surface exactly that
// set. Reading the expected set from the thing being checked (the Links section itself) would pass on a
// section that dropped `pressed` or misspelled a role, which is the whole class of defect here. The link
// role SET is brand-independent (only the values differ per brand), so one emitted file is a valid
// oracle for whichever corpus brand the DOM happens to show.
//
// TWO restated constants, each a deliberate duplication that turns an assertion into a comparison:
// FAMILY_ORDER (the studio's row order) and PRESENTATION_ORDER (default → hover → pressed → visited →
// focused, the studio's chosen state order — distinct from the engine's emit order). Both are the
// studio's OWN promise, not an engine fact, so they live here; a mutation that reorders or drops a row
// or a state cell fails BY NAME against them. FAMILY_ORDER is tied back to the oracle by a set-equality
// check, so the engine growing a link family fails the test until the studio (and this list) grow too.
//
// AND THE VALUES ARE CHECKED BEHAVIORALLY, not by hardcoded hex: #1486's decided contract — the engaged
// states (hover, pressed, visited) are each distinct from default and from each other, while `focused`
// is a color no-op equal to default — is asserted on the rendered swatches. That holds across the whole
// corpus in light mode (verified on all four emitted brands), so it is a real promise, not a sample.
console.log(`\nThe Links section (#1487)\n${'='.repeat(78)}`);

// The engine's emitted link surface, read from its own committed output. Throws if it parses to nothing
// — an oracle that quietly finds no link roles would assert nothing and pass on a blanked section.
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

// The studio's own promises: the four rows in order, and the five states in depth order. Restated here
// so a reorder or a dropped row/state fails by name; FAMILY_ORDER is set-checked against the oracle below.
const FAMILY_ORDER = ['text', 'inverse.text', 'icon', 'inverse.icon'];
const PRESENTATION_ORDER = ['default', 'hover', 'pressed', 'visited', 'focused'];
const STATE_LABEL = { default: 'Default', hover: 'Hover', pressed: 'Pressed', visited: 'Visited', focused: 'Focused' };
ok(new Set(FAMILY_ORDER).size === new Set(ORACLE_FAMILIES).size
  && FAMILY_ORDER.every((f) => emittedLinks[f]),
  `the four surfaced families are exactly the ones the engine emits (surfaced ${FAMILY_ORDER.join(', ')}; emitted ${ORACLE_FAMILIES.join(', ')})`);

/** ACTUAL — the Links section as a reader sees it. Rows keyed by the `default` token pill the renderer
 *  already prints, so nothing is added to the DOM to identify them. */
const READ_LINKS = () => {
  const sec = document.querySelector('[data-p3="section-links"]');
  if (!sec) return null;
  return {
    // Family rows only. The lead control row (#1496 Link-palette picker) carries its own hook, not
    // `role-row` — it has no swatch and is not a link family.
    rows: [...sec.querySelectorAll('[data-p3="role-row"]')].map((row) => ({
      pill: row.querySelector('[data-p3="role-body"] [data-p3="token-pill"]')?.textContent?.trim() ?? null,
      swatch: getComputedStyle(row.querySelector('[data-p3="role-swatch"]')).backgroundColor,
      states: [...row.querySelectorAll('[data-p3="role-states"] [data-p3="role-state"]')].map((c) => ({
        name: c.querySelector('[data-p3="role-state-name"]')?.textContent?.trim() ?? '',
        pill: c.querySelector('[data-p3="token-pill"]')?.textContent?.trim() ?? null,
        swatch: getComputedStyle(c.querySelector('[data-p3="role-state-swatch"]')).backgroundColor,
      })),
    })),
  };
};

for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  await gotoRail(page, '[data-p3="rail-page-interactive"]');

  const shown = await page.evaluate(READ_LINKS);
  ok(shown !== null, `${brand}: the Interactive page carries a Links section`);
  if (!shown) { await ctx.close(); continue; }

  ok(shown.rows.length === FAMILY_ORDER.length,
    `${brand}: the Links section shows ${shown.rows.length} rows (expected ${FAMILY_ORDER.length}: one per emitted link family)`);

  for (let i = 0; i < FAMILY_ORDER.length; i++) {
    const fam = FAMILY_ORDER[i];
    const row = shown.rows[i];
    const where = `${brand} ${fam}`;
    if (!row) { ok(false, `${where}: the ${fam} link row is present`); continue; }

    // Row identity: the default pill names this exact family — a mislabeled or reordered row fails here.
    ok(row.pill === `color.${fam}.link.default`,
      `${where}: the row is identified by its default token pill (got "${row.pill}")`);

    // Every state the ENGINE emits for this family is surfaced, by name — the oracle drives this, so a
    // dropped `pressed` cell (or any missing state) fails naming the role the studio failed to show.
    const surfaced = new Set(row.states.map((s) => s.pill));
    for (const st of [...emittedLinks[fam]].sort()) {
      ok(surfaced.has(`color.${fam}.link.${st}`),
        `${where}: surfaces color.${fam}.link.${st} (an emitted state must appear in the section)`);
    }
    // ...and no extra state the engine does NOT emit (a stray cell is as wrong as a missing one).
    ok(row.states.length === emittedLinks[fam].size,
      `${where}: surfaces exactly the ${emittedLinks[fam].size} emitted states, no more (${row.states.length} cells)`);

    // The studio's OWN order promise, restated: depth order, default → hover → pressed → visited → focused.
    const order = row.states.map((s) => s.pill?.split('.').pop());
    ok(order.join(',') === PRESENTATION_ORDER.join(','),
      `${where}: states are shown in depth order (${order.join(' → ')})`);
    ok(row.states.map((s) => s.name).join(',') === PRESENTATION_ORDER.map((st) => STATE_LABEL[st]).join(','),
      `${where}: each cell's label matches its state (${row.states.map((s) => s.name).join(', ')})`);

    // The big swatch is the default state's color — the row's headline agrees with its own default cell.
    const cell = Object.fromEntries(row.states.map((s) => [s.pill?.split('.').pop(), s.swatch]));
    ok(row.swatch === cell.default,
      `${where}: the row swatch is the default state's color (row ${row.swatch}, default cell ${cell.default})`);

    // #1486's decided contract, on the RENDERED swatches (not hardcoded hex): the engaged states are
    // each distinct from default and from one another, and focused is a color no-op equal to default.
    const engaged = ['default', 'hover', 'pressed', 'visited'].map((k) => cell[k]);
    ok(new Set(engaged).size === 4,
      `${where}: default/hover/pressed/visited are four distinct colors (${engaged.join(', ')}) (#1486)`);
    ok(cell.focused === cell.default,
      `${where}: focused resolves to the same color as default — the ring carries focus, not the ink (${cell.focused}) (#1486)`);
  }

  const errs = drain();
  ok(errs.length === 0, `${brand}: reading the Links section raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`  ${brand}: ${shown.rows.length} link rows, ${shown.rows.reduce((n, r) => n + r.states.length, 0)} state cells surfaced.`);
  await ctx.close();
}

// =============================================================================================
// 8b. The link palette lever (#1496) — decouple links + the WCAG 1.4.1 warning
// =============================================================================================
// #1496 gives links their OWN palette, independent of the action palette. This drives the studio's
// Link-palette lead select: choosing `neutral` (a target the actionPalette picker never offered) must
// (a) MOVE the emitted link swatches onto a different ramp, and (b) surface the WCAG 1.4.1 (Use of
// Color) underline warning inline — warn, never force, never block. A colour-distinct palette (primary)
// shows NO warning. The studio reads the engine's OWN decision (theme.notes) to fire the warning, so
// this asserts the studio SURFACES the engine's flag rather than inventing its own copy of the rule.
console.log(`\nThe link palette lever (#1496)\n${'='.repeat(78)}`);
{
  const brand = BRANDS[0];
  const { ctx, page, drain } = await openBrand(brand);
  await gotoRail(page, '[data-p3="rail-page-interactive"]');

  const lead = page.locator('[data-p3="link-palette"]');
  ok((await lead.count()) > 0, `${brand}: the Links section carries a Link palette lead control`);
  const sel = lead.locator('[data-p3="role-source"] select');
  const options = await sel.evaluate((s) => [...s.options].map((o) => o.value));
  ok(options.includes('neutral'), `${brand}: the Link palette picker offers 'neutral' as a target (${options.join(', ')})`);
  ok(options.includes('primary'), `${brand}: the Link palette picker offers 'primary'`);

  // ACTUAL — the Links section's warning presence + the resting text-link swatch, as a reader sees them.
  const readLinks = () => page.evaluate(() => {
    const sec = document.querySelector('[data-p3="section-links"]');
    const warn = [...sec.querySelectorAll('[data-p3="order-warning"]')].some((p) => /1\.4\.1/.test(p.textContent || ''));
    const textRow = [...sec.querySelectorAll('[data-p3="role-row"]')].find((r) => r.querySelector('[data-p3="role-body"] [data-p3="token-pill"]')?.textContent?.trim() === 'color.text.link.default');
    return { warn, swatch: textRow ? getComputedStyle(textRow.querySelector('[data-p3="role-swatch"]')).backgroundColor : null };
  });
  const warnFires = () => page.evaluate(() => {
    const sec = document.querySelector('[data-p3="section-links"]');
    return [...sec.querySelectorAll('[data-p3="order-warning"]')].some((p) => /1\.4\.1/.test(p.textContent || ''));
  });

  const before = await readLinks();

  // Drive → neutral: links move to the neutral ramp AND the underline warning fires inline.
  await sel.selectOption('neutral');
  await page.waitForFunction(() => {
    const sec = document.querySelector('[data-p3="section-links"]');
    return [...sec.querySelectorAll('[data-p3="order-warning"]')].some((p) => /1\.4\.1/.test(p.textContent || ''));
  });
  const neu = await readLinks();
  ok(neu.warn === true, `${brand}: selecting a neutral link palette surfaces the WCAG 1.4.1 underline warning inline (warn, not force)`);
  // The two "no warning" checks are ABSENCE checks, so both are judged against the warning this same probe
  // has now been shown in the Links section (#1831) — not against a lookup that could simply find nothing.
  const warnSeen = { seen: neu.warn === true, state: 'the WCAG 1.4.1 warning in the Links section, after selecting neutral' };
  hooks.absent(ok, warnSeen, before.warn === false, `${brand}: no WCAG 1.4.1 warning before a non-distinct link palette is chosen`);
  ok(neu.swatch && neu.swatch !== before.swatch,
    `${brand}: the resting link swatch moves when links are repointed to neutral (${before.swatch} → ${neu.swatch})`);

  // Drive → primary (colour-distinct): the warning clears — the flag tracks the palette choice.
  await sel.selectOption('primary');
  await page.waitForFunction(() => {
    const sec = document.querySelector('[data-p3="section-links"]');
    return ![...sec.querySelectorAll('[data-p3="order-warning"]')].some((p) => /1\.4\.1/.test(p.textContent || ''));
  });
  hooks.absent(ok, warnSeen, (await warnFires()) === false, `${brand}: a colour-distinct (primary) link palette shows no warning`);

  const errs = drain();
  ok(errs.length === 0, `${brand}: driving the Link palette lever raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`  ${brand}: link palette lever drives neutral→warn, primary→clear.`);
  await ctx.close();
}

// =============================================================================================
// N. Per-breakpoint grid readout + editable column overrides (#1532)
// =============================================================================================
// WHAT THIS GATES. The Layout page surfaces the RESOLVED per-breakpoint columns (a readout) and lets
// the author OVERRIDE a breakpoint's column count. Both must agree with what the engine EMITS as the
// Figma grid styles (#1480) — the readout reads `theme.layout.grid`, the same data `buildFigmaGridStyles`
// ships from, so it cannot drift. This drives the built dist and proves it end to end.
//
// INDEPENDENCE (docs/34 shape 1). EXPECTED is the ENGINE'S OWN EMITTED artifact —
// `packages/engine/out/figma/aurora/grid-styles.json`, the grid styles a brand actually ships — NOT a
// re-derivation in this file and NOT read back off the same DOM. A gate whose oracle is the subject
// cannot see the subject break. aurora is the emitted studio brand (6 floors, base 12 → xs 4 / sm 8 /
// md·lg·xl·2xl 12), so its grid-styles.json is the truth the readout must match.
//
// MUTATION REGISTER (docs/34: a gate that cannot see its subject cannot fail). Applied to the SUBJECT,
// re-run, the named assertion confirmed among the failures, then reverted:
//   M1 (readout-vs-emission tie) `paintPerBreakpointGrid`'s `String(g.columns)` → `String(ly.baseColumns)`
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
  await gotoRail(page, '[data-p3="rail-page-layout"]');
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
  await page.locator('[data-bpsel="md"]').selectOption('6');
  // apply() repaints synchronously on the select's change; the bounded, non-throwing wait lets a slow
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
  await gotoRail(page, '[data-p3="rail-page-typography"]');
  await hooks.click(page.locator('[data-p3="type-tab-styles"]'));
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
