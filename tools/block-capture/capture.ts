/**
 * Block capture — structural records for the block-layout-axes corpus (#693, docs/37).
 *
 * Visits each variant URL in a real browser and records WHAT SHAPE the section is, not what it
 * says or how it is built. One JSON row per variant, plus a screenshot for the visual read.
 *
 * THE RECORD IS DELIBERATELY STRUCTURE-ONLY, AND THAT IS A PROPERTY OF THE TOOL RATHER THAN A
 * RULE SOMEONE HAS TO REMEMBER. It captures element counts, geometry, landmark shape and heading
 * LEVELS. It never extracts body copy and never serializes markup, so its output cannot become a
 * copy of a licensed component library. Two of these libraries are paid products; the taxonomy we
 * derive from observing them is ours, their source is not. If you extend this file, keep that
 * line: measurements in, no innerHTML or textContent out.
 *
 * Why a browser at all, when WebFetch reads the open libraries fine: the gated ones render
 * client-side, so an anonymous fetch lands on an error state (docs/37 §4). And only a live DOM
 * answers the two halves a screenshot cannot — landmark structure and the slot inventory that
 * approximates a content model.
 *
 *   npx tsx tools/block-capture/capture.ts targets.json
 *   npx tsx tools/block-capture/capture.ts targets.json --out /tmp/cap --viewports desktop,mobile
 *   npx tsx tools/block-capture/capture.ts targets.json --headed        # when a site blocks headless
 *
 * playwright is NOT a repo dependency — this repo is dependency-free and buildless. Install it
 * where you run this: `npm i -D playwright && npx playwright install chromium`.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

type Variant = { slug: string; url: string; selector?: string };
type Targets = { library: string; family: string; selector?: string; variants: Variant[] };

const VIEWPORTS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1440, height: 1200 },
  mobile: { width: 390, height: 1400 },
};

const argv = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const targetsPath = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);
if (!targetsPath && !argv.includes('--self-check')) {
  console.error('usage: npx tsx tools/block-capture/capture.ts <targets.json> [--out DIR] [--viewports desktop,mobile] [--headed]');
  process.exit(2);
}
const outDir = resolve(flag('out', join(process.cwd(), 'tools/block-capture/out'))!);
const viewportNames = (flag('viewports', 'desktop')!).split(',').map((s) => s.trim()).filter(Boolean);
const headed = argv.includes('--headed');

/**
 * SELF-CHECK — two fixtures with hand-known shapes, asserted field by field.
 *
 * This exists because the probe's failure mode is not a crash, it is a plausible number about the
 * wrong thing, and a corpus built from that is worse than no corpus. It has already earned itself:
 * its first run caught the section under test being excluded from its own landmark count (0 for a
 * named `<section>`, in the field whose entire purpose is the don't-over-landmark contract) and
 * every transparent action being counted as filled. Neither is visible by reading the output.
 *
 * The fixtures are deliberately OURS, not captured pages — a captured page has no independent
 * answer for what it *should* classify as, so checking against one would compare the probe with
 * itself. Add a fixture whenever you add a measurement.
 */
const SELF_CHECK: { file: string; expect: Record<string, unknown> }[] = [
  { file: 'beside-light.html',    expect: { isDark: false, textAlign: 'start',  media: ['trailing'], bgMedia: false, actions: 2, filled: 1, lists: 1, named: true,  landmarks: 1 } },
  { file: 'background-dark.html', expect: { isDark: true,  textAlign: 'center', media: ['leading'],  bgMedia: true,  actions: 1, filled: 1, lists: 0, named: false, landmarks: 1 } },
];

const targets: Targets = argv.includes('--self-check')
  ? {
      library: 'self-check',
      family: 'fixtures',
      variants: SELF_CHECK.map((c) => ({
        slug: c.file.replace('.html', ''),
        url: `file://${resolve(import.meta.dirname, 'fixtures', c.file)}`,
      })),
    }
  : JSON.parse(readFileSync(targetsPath, 'utf8'));
mkdirSync(join(outDir, 'shots'), { recursive: true });

let chromium: any;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright is not installed here — it is deliberately not a repo dependency.');
  console.error('  npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

/**
 * Runs inside the page. Everything it returns is a number, a boolean or a tag/role name —
 * see the header note on why. `sel` picks the section under test; when a target does not name
 * one we take the largest <section>/<main> child, which is the section-preview shape these
 * libraries use.
 */
function probe(sel: string | null) {
  const vw = window.innerWidth;
  const root: Element =
    (sel && document.querySelector(sel)) ||
    [...document.querySelectorAll('main section, main > div, body section')]
      .sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0] ||
    document.body;

  const r = root.getBoundingClientRect();
  const box = (e: Element) => {
    const b = e.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  };
  const visible = (e: Element) => {
    const b = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return b.width > 8 && b.height > 8 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
  };
  // Alpha matters: `rgba(0, 0, 0, 0)` parses to three zeros, and reading that as black made every
  // transparent (ghost) action register as a filled one. Caught by fixture, not by inspection.
  const lum = (c: string) => {
    const m = c.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return null;
    if (m.length >= 4 && Number(m[3]) < 0.1) return null;
    const [r0, g0, b0] = m.slice(0, 3).map(Number).map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0;
  };

  // Surface: walk up until an element paints a background, so a transparent section reports the
  // color actually behind it rather than "none".
  let bgEl: Element | null = root;
  let bg = 'rgba(0, 0, 0, 0)';
  while (bgEl) {
    const c = getComputedStyle(bgEl).backgroundColor;
    if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = c; break; }
    bgEl = bgEl.parentElement;
  }
  const L = lum(bg);

  const media = [...root.querySelectorAll('img, video, svg, canvas, picture, iframe, pre')]
    .filter(visible)
    .filter((e) => {
      const b = e.getBoundingClientRect();
      return b.width * b.height > 6000;          // drop icons and inline glyphs
    })
    .map((e) => ({
      kind: e.tagName.toLowerCase() === 'pre' ? 'code' : e.tagName.toLowerCase(),
      ...box(e),
    }));

  const headings = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((h) => ({
    level: Number(h.tagName[1]),
    ...box(h),
  }));
  const h1 = headings.find((h) => h.level === 1) ?? headings[0];

  const actions = [...root.querySelectorAll('a[href], button, [role=button]')].filter(visible).filter((e) => {
    const b = e.getBoundingClientRect();
    return b.height >= 24 && b.width >= 40;      // exclude nav links and icon-only affordances
  });
  const filled = actions.filter((e) => {
    const c = getComputedStyle(e).backgroundColor;
    const l = lum(c);
    return l !== null && L !== null && Math.abs(l - L) > 0.15;
  });

  // Background media: something large enough to sit behind the heading, or a painted background-image.
  const bgImage = /url\(/.test(getComputedStyle(root).backgroundImage || '');
  const behindText = h1
    ? media.some((m) => m.w > r.width * 0.85 && m.h > r.height * 0.6 && m.y <= h1.y && m.y + m.h >= h1.y + h1.h)
    : false;

  return {
    viewportWidth: vw,
    section: { ...box(root), fullBleed: r.width >= vw - 2 },
    surface: { backgroundColor: bg, luminance: L, isDark: L !== null ? L < 0.25 : null },
    headings: headings.map((h) => h.level),
    headingCount: headings.length,
    // The don't-over-landmark contract (KB components/section.md): a named region is one a11y
    // landmark. Counted per section here; a page of N of these multiplies it.
    // root FIRST and by construction: querySelectorAll never returns the element it is called on,
    // so scanning only descendants excluded the section under test — the one that actually carries
    // the landmark — and reported 0 for a named <section>. The whole point of this field is the
    // don't-over-landmark contract, so undercounting by exactly one per section is the worst
    // possible error here.
    landmarks: [root, ...root.querySelectorAll('section,[role=region],aside,nav,header,footer,main')]
      .filter((e) => /^(section|aside|nav|header|footer|main)$/.test(e.tagName.toLowerCase()) || e.getAttribute('role') === 'region')
      .filter(visible)
      .map((e) => ({
        tag: e.tagName.toLowerCase(),
        role: e.getAttribute('role'),
        named: !!(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')),
      })),
    media: media.map((m) => ({
      kind: m.kind,
      widthRatio: +(m.w / Math.max(r.width, 1)).toFixed(3),
      // Where the media sits relative to the primary heading — the placement axis, measured.
      relToHeading: !h1 ? null : m.y + m.h <= h1.y + 4 ? 'above' : m.y >= h1.y + h1.h - 4 ? 'below' : m.x > h1.x ? 'trailing' : 'leading',
    })),
    background: { paintedImage: bgImage, mediaBehindText: behindText },
    actions: { total: actions.length, filled: filled.length },
    lists: [...root.querySelectorAll('ul,ol')].filter(visible).filter((l) => l.children.length >= 2).length,
    textAlign: h1 ? (Math.abs(h1.x + h1.w / 2 - (r.x + r.width / 2)) < r.width * 0.06 ? 'center' : 'start') : null,
  };
}

const browser = await chromium.launch({
  headless: !headed,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
  ...(process.env.PW_PROXY ? { proxy: { server: process.env.PW_PROXY } } : {}),
});
// storageState is optional: at time of writing only Tailwind Plus needs a session, and Relume
// renders anonymously in a real browser even though an anonymous fetch does not. Try without first.
const context = await browser.newContext({
  ...(process.env.PW_STORAGE ? { storageState: process.env.PW_STORAGE } : {}),
  viewport: VIEWPORTS[viewportNames[0]] ?? VIEWPORTS.desktop,
});
// tsx compiles with esbuild's keep-names on, which wraps functions in a `__name` helper. That
// helper does not exist inside the browser, so a probe sent through page.evaluate dies with
// `ReferenceError: __name is not defined` — a confusing error that looks like a page problem
// rather than a build one. Defined here as a raw string so tsx never compiles this line either.
await context.addInitScript({ content: 'globalThis.__name = globalThis.__name || ((f) => f);' });
const page = await context.newPage();

const rows: any[] = [];
let failed = 0;
for (const v of targets.variants) {
  const row: any = { library: targets.library, family: targets.family, slug: v.slug, url: v.url, byViewport: {} };
  try {
    await page.goto(v.url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1200);
    for (const vp of viewportNames) {
      await page.setViewportSize(VIEWPORTS[vp] ?? VIEWPORTS.desktop);
      await page.waitForTimeout(600);
      row.byViewport[vp] = await page.evaluate(probe, v.selector ?? targets.selector ?? null);
      const shot = join(outDir, 'shots', `${targets.library}-${targets.family}-${v.slug}-${vp}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      row.byViewport[vp].screenshot = shot;
    }
    console.log(`  ok   ${v.slug}`);
  } catch (e: any) {
    row.error = String(e?.message ?? e).split('\n')[0];
    failed++;
    console.log(`  FAIL ${v.slug} — ${row.error}`);
  }
  rows.push(row);
}

await browser.close();
const outFile = join(outDir, `${targets.library}-${targets.family}.json`);
writeFileSync(outFile, JSON.stringify({ capturedAt: new Date().toISOString(), targets: targetsPath, rows }, null, 2));

if (argv.includes('--self-check')) {
  let bad = 0;
  for (const [i, c] of SELF_CHECK.entries()) {
    const v = rows[i]?.byViewport?.desktop;
    if (!v) { console.error(`❌ ${c.file} did not capture`); bad++; continue; }
    const got: Record<string, unknown> = {
      isDark: v.surface.isDark,
      textAlign: v.textAlign,
      media: v.media.map((m: any) => m.relToHeading),
      bgMedia: v.background.mediaBehindText,
      actions: v.actions.total,
      filled: v.actions.filled,
      lists: v.lists,
      named: v.landmarks.some((l: any) => l.named),
      landmarks: v.landmarks.length,
    };
    for (const [k, want] of Object.entries(c.expect)) {
      if (JSON.stringify(got[k]) !== JSON.stringify(want)) {
        console.error(`❌ ${c.file} ${k}: got ${JSON.stringify(got[k])}, expected ${JSON.stringify(want)}`);
        bad++;
      }
    }
  }
  if (bad) { console.error(`\n${bad} self-check failure(s) — the probe misreads shapes it should get right. Do not run a capture on this.`); process.exit(1); }
  console.log(`\n✓ self-check clean — ${SELF_CHECK.length} fixtures classified correctly.`);
  process.exit(0);
}

// A partial capture that reports success is the failure mode worth guarding: say the count.
console.log(`\n${rows.length - failed}/${rows.length} captured → ${outFile}`);
if (failed) {
  const errs = [...new Set(rows.filter((r) => r.error).map((r) => r.error))];
  console.log(`${failed} failed:`);
  for (const e of errs) console.log(`  - ${e}`);
  // Distinguish the two whole-run failures that look alike from the outside.
  if (failed === rows.length) {
    console.log(errs.some((e) => /timeout|net::|ERR_/i.test(e))
      ? '\nEvery row failed on navigation — the site is blocking this browser, or it cannot reach the network. Try --headed.'
      : '\nEvery row failed after navigation — the probe is broken, not the site. Fix that before re-running fifty URLs.');
  }
  process.exit(1);
}
