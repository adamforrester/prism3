/**
 * Prism3 — THE SHADCN THEME HOLDS ITS CONTRAST, MEASURED ON THE EMITTED CSS (#2997 gate 1).
 *
 *   npx tsx packages/engine/lint-shadcn-contrast.ts
 *
 * Every ink-on-ground pair stock shadcn/ui draws from the theme must clear its floor in every brand and both modes,
 * measured on the CSS the projector emits, not assumed from the role map (#2997 Q3, CLAUDE.md principle 4).
 *
 * HOW IT MEASURES. The projector (`emit-shadcn.ts`) renders a fresh copy into a temp dir. Each brand's CSS is loaded
 * into headless Chromium; the ground is drawn opaque on a canvas and the ink composited over it, so `oklch()`, alpha and
 * the `.dark` switch are all the browser's work (`shadcn-browser.ts`). The ratio is WCAG 2's, written in that file.
 *
 * WHERE THE EXPECTATION COMES FROM (docs/34). `PAIRS` is typed here from shadcn's own usage (#2997 §5), never derived
 * from the map. The floor of each pair is the higher of its authored WCAG floor (4.5 text, 3 non-text) and the engine's
 * own `min` for the ink's mapped role in that mode, read from `<brand>.tokens.json`'s `$extensions.prism3`. So a remap to
 * a role with a stronger promise raises the bar, and a remap to a weaker role is still held to WCAG.
 *
 * KNOWN FAILURES. Owner decision Q2997.8 A: shadcn uses `destructive` and `primary` both as a fill and as text, and in
 * dark mode no one fill clears 4.5 against both white ink and the page. Those pairs are listed in `KNOWN`, per brand,
 * with the decision and the ratio accepted, and reported, not failed, while they hold that ratio; the engine question
 * is #4279. `KNOWN_PENDING` holds the regression fixture's pair the owner accepted on #4289 (owner decision 2026-11-19
 * A: a legacy fixture, not engine-derived). It is held the same way: to the ratio accepted, printed on every run, STALE
 * once it passes.
 *
 * MUTATION: map `muted-foreground` → `color.text.tertiary` and this fails `prism3 light: muted-foreground on muted 3.17 <
 * 4.5` by name. Emit prism3's dark `primary` as `oklch(0.25 0.1 266.7)` and it fails `prism3 dark: primary on background
 * 1.19 < 4.5 — BELOW ACCEPTED 4.24` by name: a known pair is held to the ratio the owner accepted, not muted at any ratio.
 * Darken nb's light `muted` and it fails `nb light: muted-foreground on muted … — BELOW ACCEPTED 3.77` by name.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitShadcn, handoffBrands } from './emit-shadcn.ts';
import { SHADCN_COLOR_VARS } from './projections/shadcn.ts';
import { floor2, openShadcnPage, wcagRatio } from './shadcn-browser.ts';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, 'out');

type Kind = 'text' | 'non-text';
/** [ink, ground, kind], typed from shadcn's usage (#2997 §5), never derived from the map. */
export const PAIRS: ReadonlyArray<readonly [string, string, Kind]> = [
  ['foreground', 'background', 'text'],
  ['card-foreground', 'card', 'text'],
  ['popover-foreground', 'popover', 'text'],
  ['primary-foreground', 'primary', 'text'],
  ['secondary-foreground', 'secondary', 'text'],
  ['muted-foreground', 'muted', 'text'],
  ['muted-foreground', 'background', 'text'],
  ['muted-foreground', 'card', 'text'],
  ['accent-foreground', 'accent', 'text'],
  ['destructive-foreground', 'destructive', 'text'],
  ['destructive', 'background', 'text'], // field error text, `text-destructive`
  ['destructive', 'card', 'text'],
  ['primary', 'background', 'text'], // the link button, `text-primary`
  ['sidebar-foreground', 'sidebar', 'text'],
  ['sidebar-primary-foreground', 'sidebar-primary', 'text'],
  ['sidebar-accent-foreground', 'sidebar-accent', 'text'],
  ['ring', 'background', 'non-text'],
  ['ring', 'card', 'non-text'],
  ['ring', 'muted', 'non-text'],
  ['ring', 'sidebar', 'non-text'],
  ['input', 'background', 'non-text'],
  ['input', 'card', 'non-text'],
  ...[1, 2, 3, 4, 5].flatMap((n): Array<readonly [string, string, Kind]> => [[`chart-${n}`, 'background', 'non-text'], [`chart-${n}`, 'card', 'non-text']]),
];
const WCAG: Record<Kind, number> = { 'text': 4.5, 'non-text': 3 };

/**
 * Q2997.8 A: the dual-use pairs, failing in dark on every corpus brand. Keyed `<brand> <mode>: <ink> on <ground>`, as
 * `KNOWN_PENDING` is, each with the ratio the owner accepted: the value measured when the decision was built, floored to
 * two places. A known pair that falls BELOW its accepted floor fails by name, so the entry mutes the pair the owner saw,
 * not any ratio on any brand forever (docs/34, a gate with no memory). An entry whose pair now passes, or whose brand is
 * gone, fails as STALE. The floors are written here by hand from that measurement, never read back from a run.
 */
export type Accepted = { floor: number; why: string };
export const KNOWN: Readonly<Record<string, Accepted>> = {
  'aurora dark: destructive on background': { floor: 4.25, why: 'Q2997.8 A — destructive is a fill under white ink; the engine question is #4279' },
  'aurora dark: destructive on card': { floor: 4.25, why: 'Q2997.8 A — card is background.primary (Q2997.1 B); #4279' },
  'aurora dark: primary on background': { floor: 4.25, why: 'Q2997.8 A — primary is a fill under white ink; #4279' },
  'harbor dark: destructive on background': { floor: 4.25, why: 'Q2997.8 A — destructive is a fill under white ink; the engine question is #4279' },
  'harbor dark: destructive on card': { floor: 4.25, why: 'Q2997.8 A — card is background.primary (Q2997.1 B); #4279' },
  'harbor dark: primary on background': { floor: 4.23, why: 'Q2997.8 A — primary is a fill under white ink; #4279' },
  'nb dark: destructive on background': { floor: 4.24, why: 'Q2997.8 A — destructive is a fill under white ink; the engine question is #4279' },
  'nb dark: destructive on card': { floor: 4.24, why: 'Q2997.8 A — card is background.primary (Q2997.1 B); #4279' },
  'nb dark: primary on background': { floor: 4.24, why: 'Q2997.8 A — primary is a fill under white ink; #4279' },
  'prism3 dark: destructive on background': { floor: 4.25, why: 'Q2997.8 A — destructive is a fill under white ink; the engine question is #4279' },
  'prism3 dark: destructive on card': { floor: 4.25, why: 'Q2997.8 A — card is background.primary (Q2997.1 B); #4279' },
  'prism3 dark: primary on background': { floor: 4.24, why: 'Q2997.8 A — primary is a fill under white ink; #4279' },
  'wendys dark: destructive on background': { floor: 4.22, why: 'Q2997.8 A — destructive is a fill under white ink; the engine question is #4279' },
  'wendys dark: destructive on card': { floor: 4.22, why: 'Q2997.8 A — card is background.primary (Q2997.1 B); #4279' },
  'wendys dark: primary on background': { floor: 4.04, why: 'Q2997.8 A — primary is a fill under white ink; #4279' },
};
/**
 * The regression fixture's pair, raised on #4289 and accepted there (owner decision 2026-11-19 A), kept here as the owner
 * said. Same key and shape as `KNOWN`; the floor is the 3.77 the owner saw, written by hand. Printed on every run.
 */
export const KNOWN_PENDING: Readonly<Record<string, Accepted>> = {
  'nb light: muted-foreground on muted': { floor: 3.77, why: 'Owner decision 2026-11-19 A — legacy fixture, not engine-derived' },
};

/**
 * How a pair under its floor is reported. `known` (a `KNOWN` entry) and `accepted` (a `KNOWN_PENDING` entry) print and
 * pass while the ratio holds its entry's floor; below that floor, or with no entry, the pair is `failing`. `listed` says
 * the key has an entry, which is what the STALE arms read.
 */
export const judgeBelowFloor = (key: string, r: number, known: Readonly<Record<string, Accepted>> = KNOWN,
  pending: Readonly<Record<string, Accepted>> = KNOWN_PENDING): { verdict: 'known' | 'accepted' | 'failing'; note: string; listed: boolean } => {
  const k = known[key], entry = k ?? pending[key];
  if (!entry) return { verdict: 'failing', note: '', listed: false };
  if (r < entry.floor) return { verdict: 'failing', note: ` — BELOW ACCEPTED ${entry.floor} (${entry.why})`, listed: true };
  return { verdict: k ? 'known' : 'accepted', note: k ? '' : ` — ${entry.why}`, listed: true };
};

type Ext = { min?: number; modes?: Record<string, { min?: number }> };
/** The engine's own floor for `role` in `mode`, from the brand's full tree. */
const engineMin = (tree: Record<string, unknown>, role: string, mode: 'light' | 'dark'): number => {
  let node: unknown = tree;
  for (const k of role.split('.')) node = node && typeof node === 'object' ? (node as Record<string, unknown>)[k] : undefined;
  const ext = ((node as { $extensions?: { prism3?: Ext } } | undefined)?.$extensions?.prism3) ?? {};
  const m = mode === 'light' ? ext.min : ext.modes?.dark?.min;
  return typeof m === 'number' ? m : 0;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tmp = mkdtempSync(join(tmpdir(), 'prism3-shadcn-'));
  process.on('exit', () => rmSync(tmp, { recursive: true, force: true }));
  emitShadcn(tmp);
  const failures: string[] = [], known: string[] = [], accepted: string[] = [];
  const seenPending = new Set<string>(), seenKnown = new Set<string>();
  let measured = 0;
  const brands = handoffBrands();
  for (const brand of brands) {
    const full = JSON.parse(readFileSync(join(OUT, `${brand}.tokens.json`), 'utf8')) as Record<string, Record<string, unknown>>;
    const tree = Object.values(full)[0]!;
    const page = await openShadcnPage(readFileSync(join(tmp, 'shadcn', `${brand}.css`), 'utf8'));
    try {
      for (const mode of ['light', 'dark'] as const) {
        const got = await page.over(mode, PAIRS.map(([ink, ground]) => [`var(--${ink})`, `var(--${ground})`] as const));
        PAIRS.forEach(([ink, ground, kind], i) => {
          const role = SHADCN_COLOR_VARS[ink];
          if (!role) { failures.push(`${brand} ${mode}: ${ink} is not a mapped color`); return; }
          const floor = Math.max(WCAG[kind], engineMin(tree, role, mode));
          const { ink: a, ground: b } = got[i]!;
          if (b[3] !== 255) { failures.push(`${brand} ${mode}: ${ground} did not paint opaque`); return; }
          const r = wcagRatio(a, b);
          measured++;
          if (r >= floor) return;
          const line = `${brand} ${mode}: ${ink} on ${ground} ${floor2(r)} < ${floor}`;
          const key = `${brand} ${mode}: ${ink} on ${ground}`;
          const { verdict, note, listed } = judgeBelowFloor(key, r);
          if (listed) (KNOWN[key] ? seenKnown : seenPending).add(key);
          (verdict === 'known' ? known : verdict === 'accepted' ? accepted : failures).push(line + note);
        });
      }
    } finally { await page.close(); }
  }
  for (const k of Object.keys(KNOWN)) if (!seenKnown.has(k)) failures.push(`STALE KNOWN ${k} — it passes now, or its brand is gone; take it out of KNOWN`);
  for (const k of Object.keys(KNOWN_PENDING)) if (!seenPending.has(k)) failures.push(`STALE PENDING ${k} — it passes now, or its brand is gone; take it out of KNOWN_PENDING`);
  for (const k of known) console.log(`  known  ${k}`);
  for (const p of accepted) console.log(`  accepted ${p}`);
  if (failures.length) {
    console.error(`✗ shadcn contrast: ${failures.length} failure(s)`);
    for (const f of failures) console.error(`    ${f}`);
    console.error('\n  Fix: remap the ink in projections/shadcn.ts to a role that clears the floor. A pair the owner accepts as a');
    console.error('  known failure goes in KNOWN with its decision and the ratio accepted; one below that ratio is a new failure.');
    process.exit(1);
  }
  console.log(`✓ shadcn contrast — ${measured} pairs measured in Chromium over ${brands.length} brands × 2 modes (${PAIRS.length} pairs each); ` +
    `${known.length} known (Q2997.8 A), ${accepted.length} accepted as a legacy fixture (owner decision 2026-11-19 A), 0 failing.`);
}
