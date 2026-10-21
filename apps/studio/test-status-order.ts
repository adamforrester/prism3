/**
 * Status order — one order on every surface (#2833). Brand, success, warning, danger, info.
 *
 *   npx tsx apps/studio/test-status-order.ts
 *
 * The order is the engine's (`SEMANTICS` in `modes.ts`), and the emitted `foreground`, `text`, `icon` and `border` groups follow it
 * (`foreground` since #2836, resolved under #2860; the gate no longer records an exception).
 * The studio's levers and its preview had each drifted: the preview put danger second, the Foreground fills lever put
 * info before danger.
 *
 * docs/34 (gate independence): the order is a LITERAL typed below, and it is checked against the committed emission's
 * key order, which is a different thing from the studio's constants. The studio's rows and cards are then read as
 * built (the exported row lists, and `SEM` the preview sections draw from), never against themselves.
 * Every row pattern is represented: a pattern that stops being drawn fails by name, rather than passing empty.
 *
 * Mutations that fail here by name: `SEM` in `preview/sections/kit.ts` with danger second →
 * `preview: SEM lists the statuses in the canonical order`; `SEM` in `state/fills-input.ts` with info before danger →
 * `levers: foreground.* rows list the statuses in the canonical order`.
 */
import { readFileSync } from 'node:fs';
import { SEM } from './src/preview/sections/kit';
import { FILL_ROWS, TEXT_ROWS, BORDER_ROWS, ICON_ROWS } from './src/state/fills-input';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const CANON = ['brand', 'success', 'warning', 'danger', 'info'];
const STATUS = new RegExp(`(${CANON.join('|')})`);
/** Emitted groups held to the canon: every group that lists the statuses, default and inverse. */
const EMITTED = ['foreground', 'text', 'icon', 'border', 'inverse.foreground', 'inverse.text', 'inverse.icon', 'inverse.border'];

// ── the emission ────────────────────────────────────────────────────────────────────────────────
const tree = JSON.parse(readFileSync(new URL('../../packages/engine/out/aurora.tokens.json', import.meta.url), 'utf8'));
const color = tree[Object.keys(tree).find((k) => !k.startsWith('$'))!].color;
const group = (path: string): string[] => Object.keys(path.split('.').reduce((n: any, k) => n?.[k], color) ?? {});
const statusKeys = (path: string): string[] => group(path).filter((k) => CANON.includes(k));
for (const g of EMITTED) ok(statusKeys(g).length === CANON.length && same(statusKeys(g), CANON), `emission: color.${g} lists the statuses in the canonical order`);

// ── the preview ─────────────────────────────────────────────────────────────────────────────────
ok(same(SEM.map(([, s]) => s), CANON), 'preview: SEM lists the statuses in the canonical order');
ok(same(SEM.map(([n]) => n.toLowerCase()), CANON), 'preview: SEM labels list the statuses in the canonical order');

// ── the levers ──────────────────────────────────────────────────────────────────────────────────
/** Rows grouped by their role with the status taken out (`foreground.*-subtle`), each group's statuses in row order. */
const patterns = (rows: readonly { role: string }[]): Map<string, string[]> => {
  const m = new Map<string, string[]>();
  for (const { role } of rows) {
    const s = STATUS.exec(role.split('.').pop()!.replace(/^on-/, ''))?.[1];
    if (!s || !role.split('.').pop()!.replace(/^on-/, '').startsWith(s)) continue;
    const key = role.replace(s, '*');
    m.set(key, [...(m.get(key) ?? []), s]);
  }
  return m;
};
const MUST = [
  'foreground.*', 'foreground.*-subtle', 'inverse.foreground.*', 'inverse.foreground.*-subtle', 'text.on-*',
  'text.*', 'text.*-subtle', 'inverse.text.*', 'inverse.text.*-subtle', 'border.*', 'inverse.border.*', 'icon.*', 'icon.*-subtle', 'icon.on-*', 'inverse.icon.*', 'inverse.icon.*-subtle',
];
const all = patterns([...FILL_ROWS, ...TEXT_ROWS, ...BORDER_ROWS, ...ICON_ROWS]);
for (const key of MUST) {
  const got = all.get(key);
  ok(!!got && got.length === CANON.length, `levers: ${key} rows are present, one per status`);
  ok(same(got, CANON), `levers: ${key} rows list the statuses in the canonical order`);
}
ok(same([...all.keys()].filter((k) => !MUST.includes(k)), []), `levers: every status row pattern is one the gate names (unnamed: ${[...all.keys()].filter((k) => !MUST.includes(k)).join(', ') || 'none'})`);

console.log(`\n${executed - failed}/${executed} status-order assertions passed.`);
if (failed) process.exit(1);
