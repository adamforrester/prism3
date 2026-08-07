/**
 * Studio-chrome contrast gate (#514).
 *
 * The dashboard enforces contrast contracts on every brand it GENERATES and, until this file, none
 * on the chrome it renders those contracts in. #355 fixed a real failure there by hand (`--faint`
 * 2.31:1, `--muted` 4.36:1 — the studio failing the bar it polices) and left the values parked ON the
 * AA floor, which is a correct decision with no memory: nothing stopped the next edit from lightening
 * a token, and nothing counted the margin as it was spent.
 *
 * It got spent. #504 stripped the card off the control bars, moving `.pfk` and `.tok-hexv` from
 * `--panel` onto `--paper` — legal, and pre-authorized by #355's own wording ("the lightest legal
 * value on this paper", stated against "the WORSE of the two surfaces"), but it took `--faint` from
 * 5.135:1 to 4.628:1. The surviving margin is 0.128 on 9.5px uppercase text. That is the number this
 * gate exists to keep visible: the next token moved onto `--paper` has nothing left to spend.
 *
 * STATIC on purpose. Measuring what actually renders needs a browser, and this repo deliberately does
 * not depend on Playwright (#333) — so `mode-audit.mjs` cannot run in CI and a runtime check would be
 * a gate nobody runs. The token VALUES are where the budget lives: a pairing can only fail if either
 * the ink or the ground moved, and both are declared right here. Usage is checked by eye and by the
 * audit; the values are checked every push.
 *
 * Run: `npm run -w @prism3/studio lint:contrast`
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const srgb = (h) => {
  const v = h.length === 4
    ? [1, 2, 3].map((i) => parseInt(h[i] + h[i], 16) / 255)
    : [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return v.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
};
const lum = (h) => { const [r, g, b] = srgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Every pairing the studio chrome actually relies on, with the floor it is held to and the decision
 *  that set it. AA text is 4.5:1 — none of these tiers is large text: #355 established that all ~130
 *  uses of --faint are 9–15px, which is exactly why it had to move rather than be re-scoped. */
const PAIRS = [
  // #355 — the ink tiers, against BOTH surfaces they are drawn on. --paper is the worse one.
  ['--ink', '--paper', 4.5], ['--ink', '--panel', 4.5],
  ['--ink2', '--paper', 4.5], ['--ink2', '--panel', 4.5],
  ['--muted', '--paper', 4.5], ['--muted', '--panel', 4.5],
  ['--faint', '--paper', 4.5], ['--faint', '--panel', 4.5],
  // #285 — the status set. Three greens and three reds existed as scattered literals, which is how
  // two greens, one red and the amber all shipped under AA with nothing holding them to a shared bar.
  ['--ok', '--paper', 4.5], ['--ok', '--panel', 4.5],
  ['--warn', '--paper', 4.5], ['--warn', '--panel', 4.5],
  ['--danger', '--paper', 4.5], ['--danger', '--panel', 4.5],
  // #446 — the verdict badges sit on a tint of their own status color. On --paper a tint of --ok
  // fails at EVERY percentage (--ok on --paper is 4.53, at the floor, so any darkening goes under);
  // both badges in fact sit inside a --panel, where 6% clears. 6% is a CEILING, not a preference.
  ['--ok', '--ok-tint', 4.5],
  ['--danger', '--danger-tint', 4.5],
];

const src = await readFile(resolve(root, 'src/main.ts'), 'utf8');
const block = src.match(/^:root\{([\s\S]*?)^\}/m);
if (!block) {
  console.error('lint:contrast FAILED — no :root{} block found in src/main.ts.');
  console.error('  The gate reads token values straight from the stylesheet; if that literal moved,');
  console.error('  this must follow it rather than silently pass over a file it cannot parse.');
  process.exit(1);
}
const TOKENS = Object.fromEntries(
  [...block[1].matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g)].map((m) => [m[1], m[2]]),
);

const rows = [];
const missing = [];
for (const [ink, ground, floor] of PAIRS) {
  if (!TOKENS[ink] || !TOKENS[ground]) { missing.push(`${ink} on ${ground}`); continue; }
  const r = ratio(TOKENS[ink], TOKENS[ground]);
  rows.push({ ink, ground, floor, r, margin: r - floor, hex: TOKENS[ink], gh: TOKENS[ground] });
}

// A pairing that cannot be resolved is a FAILURE, not a skip. A renamed token would otherwise drop
// silently out of coverage and the gate would keep printing a pass for a contract it stopped checking
// — the exact shape #502 had to close in the US-English gate.
if (missing.length) {
  console.error(`lint:contrast FAILED — ${missing.length} pairing(s) name a token that no longer exists:`);
  for (const m of missing) console.error(`   ${m}`);
  console.error('  Rename the pairing here, or restore the token. Do not delete the pairing to make this pass.');
  process.exit(1);
}

const bad = rows.filter((x) => x.margin < 0);
rows.sort((a, b) => a.margin - b.margin);
console.log(`Studio chrome contrast — ${rows.length} pairings checked against their stated floors.`);
for (const x of rows.slice(0, 5)) {
  console.log(`   ${x.margin < 0 ? 'FAIL' : '  ok'}  ${x.ink.padEnd(9)} ${x.hex} on ${x.ground.padEnd(14)} ${x.gh}` +
    `   ${x.r.toFixed(3)} / ${x.floor}   margin ${x.margin >= 0 ? '+' : ''}${x.margin.toFixed(3)}`);
}
if (rows.length > 5) console.log(`   … ${rows.length - 5} more, all with more margin than the above.`);

if (bad.length) {
  console.error(`\n✗ ${bad.length} pairing(s) under the floor. The studio does not get to fail the bar it enforces.`);
  process.exit(1);
}
const tight = rows[0];
console.log(`\n✓ all clear. Thinnest margin: ${tight.ink} on ${tight.ground} at +${tight.margin.toFixed(3)}.`);
if (tight.margin < 0.2) {
  console.log(`  Note: that is the whole remaining budget on that pairing. Moving another`);
  console.log(`  ${tight.ground} -grounded surface onto a lighter one, or lightening ${tight.ink}, will fail here.`);
}
