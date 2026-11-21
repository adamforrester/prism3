/**
 * Prism3 — EVERY SHADCN `oklch()` IS THE EMITTED COLOR, THROUGH THE BROWSER (#2997 gate 2).
 *
 *   npx tsx packages/engine/lint-shadcn-roundtrip.ts
 *
 * The projector writes `oklch()` (Q2997.14 A), converted from the emitted hex with `color.ts`. This gate proves each one
 * lands back on the brand's own 8-bit color, in every brand, mode and variable, so the format change loses nothing.
 * It reads two files per brand: `shadcn/<brand>.css` (`emit-shadcn.ts`) and `tailwind/<brand>.theme.css`
 * (`emit-tailwind.ts`, #2997 PR 3), whose `:root` and `.dark` carry the same variables. Gate 5 (`check:shadcn`)
 * proves a Tailwind utility reads each variable; this gate proves the variable holds the brand's color in that mode.
 *
 * INDEPENDENCE (docs/34). Both sides avoid the projector's code:
 *   · ACTUAL — Chromium parses the emitted `oklch()` and paints it on a canvas (`shadcn-browser.ts`); alpha is read
 *     from the raw paint, the color from the same value forced opaque, so premultiplication cannot blur a channel.
 *   · EXPECTED — the role's value in `<brand>.tokens.json`, the full tree with its per-mode `$extensions`, resolved
 *     by this file's own alias walk and color parser. The projector reads the handoff (`base` + `dark.overlay`)
 *     instead, so the two read different files by different code.
 * The role for each variable is the map's claim; gate 4 holds that claim, and this gate holds the value.
 *
 * MUTATIONS: round L to two places in `emit-shadcn.ts` and this fails `prism3 light popover: #e9e9e9 → #eaeaea` (or a
 * neighbor) by name. Swap the modes in `emit-tailwind.ts` (light variables in `.dark`) and this fails
 * `prism3 tailwind light background: …` by name.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitShadcn, handoffBrands } from './emit-shadcn.ts';
import { emitTailwind } from './emit-tailwind.ts';
import { SHADCN_COLOR_VARS } from './projections/shadcn.ts';
import { openShadcnPage } from './shadcn-browser.ts';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, 'out');

type Node = { $value?: unknown; $extensions?: { prism3?: { modes?: Record<string, { $value?: unknown }> } } };

/** The role's emitted value in `mode`, from the full tree, aliases followed. */
export const expectedValue = (root: string, tree: Record<string, unknown>, role: string, mode: 'light' | 'dark'): string => {
  const at = (path: string): Node | undefined => {
    let n: unknown = tree;
    for (const k of path.split('.')) n = n && typeof n === 'object' ? (n as Record<string, unknown>)[k] : undefined;
    return n as Node | undefined;
  };
  const first = at(role);
  if (!first) throw new Error(`${role} is not in the tree`);
  let v: unknown = mode === 'dark' ? (first.$extensions?.prism3?.modes?.dark?.$value ?? first.$value) : first.$value;
  for (let hop = 0; hop < 16; hop++) {
    const m = typeof v === 'string' ? /^\{([^}]+)\}$/.exec(v) : null;
    if (!m) return String(v);
    const path = m[1]!.startsWith(`${root}.`) ? m[1]!.slice(root.length + 1) : m[1]!;
    v = at(path)?.$value;
  }
  throw new Error(`${role}: alias chain too deep`);
};

/** `#rrggbb[aa]` or `rgb[a](…)` as [r, g, b, alpha byte]. */
export const expectedRgba = (value: string): [number, number, number, number] => {
  const hx = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(value.trim());
  if (hx) return [parseInt(hx[1]!, 16), parseInt(hx[2]!, 16), parseInt(hx[3]!, 16), hx[4] ? parseInt(hx[4], 16) : 255];
  const fn = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)$/.exec(value.trim());
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3]), fn[4] === undefined ? 255 : Math.round(Number(fn[4]) * 255)];
  throw new Error(`unreadable emitted color ${value}`);
};

const hex = (c: readonly number[]): string => `#${c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('')}`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tmp = mkdtempSync(join(tmpdir(), 'prism3-shadcn-'));
  process.on('exit', () => rmSync(tmp, { recursive: true, force: true }));
  emitShadcn(tmp);
  emitTailwind(tmp);
  const failures: string[] = [];
  let checked = 0, withAlpha = 0, files = 0;
  const vars = Object.entries(SHADCN_COLOR_VARS);
  const brands = handoffBrands();
  for (const brand of brands) {
    const full = JSON.parse(readFileSync(join(OUT, `${brand}.tokens.json`), 'utf8')) as Record<string, Record<string, unknown>>;
    const root = Object.keys(full)[0]!;
    // The shadcn file first, under the brand's bare name, then the Tailwind theme, labeled `<brand> tailwind`.
    for (const [label, file] of [[brand, join(tmp, 'shadcn', `${brand}.css`)], [`${brand} tailwind`, join(tmp, 'tailwind', `${brand}.theme.css`)]] as const) {
      files++;
      const page = await openShadcnPage(readFileSync(file, 'utf8'));
      try {
        for (const mode of ['light', 'dark'] as const) {
          const opaque = await page.read(mode, vars.map(([k]) => `oklch(from var(--${k}) l c h / 1)`));
          const raw = await page.read(mode, vars.map(([k]) => `var(--${k})`));
          vars.forEach(([k, role], i) => {
            const want = expectedRgba(expectedValue(root, full[root]!, role, mode));
            const got = opaque[i]!, gotAlpha = raw[i]![3];
            checked++;
            if (want[3] !== 255) withAlpha++;
            if (got[3] !== 255) failures.push(`${label} ${mode} ${k}: did not paint (unparsed value?)`);
            else if (got[0] !== want[0] || got[1] !== want[1] || got[2] !== want[2]) failures.push(`${label} ${mode} ${k}: ${hex(want)} → ${hex(got)}`);
            if (gotAlpha !== want[3]) failures.push(`${label} ${mode} ${k}: alpha ${want[3]} → ${gotAlpha}`);
          });
        }
      } finally { await page.close(); }
    }
  }
  // Both files per brand must have been read: a scope that silently dropped the Tailwind theme would pass on half.
  if (files !== brands.length * 2) failures.push(`read ${files} files, expected ${brands.length * 2} (shadcn + tailwind per brand)`);
  if (failures.length) {
    console.error(`✗ shadcn round trip: ${failures.length} of ${checked} values do not land on their emitted color`);
    for (const f of failures) console.error(`    ${f}`);
    console.error('\n  Fix: a `<brand>` line is emit-shadcn.ts losing a channel (raise toOklchCss precision); a `<brand> tailwind` line is\n' +
      '  emit-tailwind.ts writing a value that is not the brand\'s color in that mode (check which mode block it writes).');
    process.exit(1);
  }
  console.log(`✓ shadcn round trip — ${checked} values over ${brands.length} brands × 2 files (shadcn, tailwind) × 2 modes × ` +
    `${vars.length} variables, each parsed by Chromium back to its emitted 8-bit color (${withAlpha} with alpha).`);
}
