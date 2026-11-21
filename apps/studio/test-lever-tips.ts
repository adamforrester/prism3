/**
 * The Studio tooltips that carry a lever's own description say it word for word (#2089).
 *
 *   npx tsx apps/studio/test-lever-tips.ts
 *
 * #2070 corrected two engine lever descriptions (Type scale: the owner's 2026-10-04 wording; Breakpoints: "six run
 * xs to 2xl", where the old text said six or seven ran xs to 3xl). The Studio's own tooltips kept the old words
 * until #2089. This holds each tooltip to its lever's description so the two can't drift apart again.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The tooltips are string literals in `domains/type.ts` and
 * `domains/layout.ts`. The oracle is `packages/engine/schema/lever-manifest.json`, the committed manifest
 * `regen.ts` emits from `levers.ts`, read from disk here at test time. Neither side imports the other. If a
 * tooltip were ever rewritten to import the lever text, this test would compare a value with itself, so the
 * tooltips stay literals (a comment beside each one says so).
 *
 * Mutations this fails by name: one word changed in `S63.scaleTip` ("one step" → "two steps") →
 * `Type scale tooltip is typography.typeScale's description, word for word`; one word changed in
 * `LAYOUT_DRAFT.breakpointsTip` ("six run xs to 2xl" → "six run xs to 3xl") →
 * `Breakpoints tooltip is layout.breakpoints's description, word for word`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { S63 } from './src/domains/type';
import { LAYOUT_DRAFT } from './src/domains/layout';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string, detail = ''): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
};

const manifestPath = fileURLToPath(new URL('../../packages/engine/schema/lever-manifest.json', import.meta.url));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { levers: { key: string; description?: string; tip?: string }[] };
// #4193 decision 1: the line a lever shows in the UI is its `tip` where it has one, else its description.
const described = (key: string): string | undefined => { const l = manifest.levers.find((x) => x.key === key); return l?.tip ?? l?.description; };

const PAIRS: [label: string, key: string, tip: string][] = [
  ['Type scale', 'typography.typeScale', S63.scaleTip],
  ['Breakpoints', 'layout.breakpoints', LAYOUT_DRAFT.breakpointsTip],
];

for (const [label, key, tip] of PAIRS) {
  const want = described(key);
  // A missing lever is a failure, never a skip: a renamed key would otherwise pass by comparing nothing.
  ok(typeof want === 'string' && want.length > 0, `lever-manifest.json describes ${key}`);
  ok(tip === want, `${label} tooltip is ${key}'s description, word for word`,
    `tooltip:  ${JSON.stringify(tip)}\n      manifest: ${JSON.stringify(want)}`);
}

// #4193 decision 1: every ⓘ line Studio writes itself (a `…Tip:` or `info:` literal in `src/domains`) is at most 90
// characters, the voice standard's §4 length for a description. Read from the source, so a new long tip fails by name.
{
  const { readdirSync } = await import('node:fs');
  const dir = fileURLToPath(new URL('./src/domains/', import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
  const long: string[] = [];
  let seen = 0;
  // Single-quoted, double-quoted and template literals alike, so a tip quoted another way can't slip past the 90.
  for (const f of files) for (const m of readFileSync(dir + f, 'utf8').matchAll(/\b(\w*Tip|info)\s*:\s*(['"`])((?:(?!\2)[^\\]|\\.)*)\2/g)) {
    seen++;
    const text = m[3].replace(/\\(.)/g, '$1');
    if (text.length > 90) long.push(`${f} ${m[1]} (${text.length})`);
  }
  ok(seen > 20 && long.length === 0, `#4193 every Studio ⓘ line is at most 90 characters (${seen} read; over: ${long.join(', ') || 'none'})`);
}

if (executed !== PAIRS.length * 2 + 1) { failed++; console.error(`  ✗ ran ${executed} checks, expected ${PAIRS.length * 2 + 1}`); }
console.log(failed ? `\n${failed} of ${executed} failed` : `\nlever tips: ${executed}/${executed} pass`);
process.exit(failed ? 1 : 0);
