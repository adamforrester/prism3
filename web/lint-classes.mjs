/**
 * Class-collision gate (#515).
 *
 * Four defects in one session had the same shape: a name that meant one thing in one place and
 * something else in another, invisible at the definition site and only found by looking at a render.
 *
 *   - `.pfield.slider` picked up `.slider{margin-top:16px}`, a standalone rule 70 lines away. The
 *     16px WAS the palette row's label misalignment, in full; three successive alignment fixes could
 *     not touch it because it was never an alignment problem (#464).
 *   - `.psl-range` lost to `.range{margin-top:10px}` on source order at equal specificity, inflating
 *     a grid row from 33px to 44px (#464).
 *   - The token list's `icon` category minted a section titled `Icon`, colliding with the Style
 *     guide's `'Icon'` key in a title-indexed map and painting one stray badge (#473).
 *   - The `.seg` track added chrome the `select` beside it had no equivalent of (#484).
 *
 * WHAT THIS CATCHES, precisely: an element minted with two or more classes that EACH own a top-level
 * single-class rule. That is the `pfield slider` and `range psl-range` shape — a component class
 * used as a modifier, silently dragging its own rule along.
 *
 * WHAT IT DOES NOT: it flags the PAIRING, not which of the two is the offender, and it cannot see the
 * title-map collision at all (that needs the runtime section titles, which is what
 * `mode-audit.mjs --check-badges` covers). It is not a proof of correctness — it is a forcing
 * function. A new pairing fails until someone adds it to ALLOWED, and adding it means looking at
 * whether the second class carries a rule you did not intend. `pfield slider` would have been that
 * moment.
 *
 * The allowlist is the design, not a workaround — the same shape as the US-English gate's
 * `NOT_EN_GB`. Two mechanical exemptions keep it from being unmaintainable, and both are narrow:
 * UTILITIES are classes meant to be composed onto anything, and a modifier sharing its base's prefix
 * (`sg-card sg-mid`) is the ordinary base+modifier convention, which cannot collide across surfaces
 * because the prefix scopes it. Everything else is listed by hand.
 *
 * Run: `npm run -w @prism3/web lint:classes`
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

/** Composable by design — these carry no layout of their own that a host class could fight. */
const UTILITIES = new Set(['mono', 'faint']);

/** Reviewed pairings. Each is a component class used alongside another that owns a rule, where the
 *  combination was checked and is intended. Add to this ONLY after confirming the second class's
 *  standalone rule is one you want applied here. */
const ALLOWED = new Set([
  'brandmenu exportmenu',      // menu variants — exportmenu/navmenu re-skin the shared popover
  'brandmenu navmenu',
  'ctable mo-ramp',            // the motion ramp IS a contract table; mo-ramp adds the ms column
  'mtbl-scroll sl-tall',       // sl-tall raises the scroll cap for the taller mode table
  'mtbl-spec-t tf-prev',       // typeface preview inside a mode-table specimen cell
  'mtbl-spec-t tpw-samp',      // type-pairing sample, same cell
  'pvseg tok-seg',             // #466 — tok-seg is the L3 (nested) modifier of the view segment
  'sf-ex sf-ex-fill', 'sf-ex sf-ex-surface', 'sf-ex sf-ex-text',
  'sg-card sg-bcard', 'sg-card sg-icard', 'sg-card sg-mid', 'sg-card sg-scrimcard',
  'sg-tc sg-t sg-tcrow',
  'start-alt start-upload', 'start-card start-hero', 'start-card start-row2',
  'tf-in tf-addin',
  'cs-ctl-val mono', 'cs-name mono', 'fr-v mono', 'fz-clamp mono',
  'fz-name mono', 'fz-pair mono', 'lab-hex mono', 'lab-step mono', 'ly-cont-val mono',
  'ly-tick-px mono', 'mo-ez-bez mono', 'mo-meta mono', 'mo-ms-val mono', 'mo-playnote mono',
  'mo-ramp-ms mono', 'mo-spring-nums mono', 'mono tok-alias', 'mono tok-hexv', 'mtbl-name mono',
  'mtbl-offval mono', 'mtbl-selfval mono', 'mtbl-worth mono', 'mval mono', 'pair mono',
  'pair-path mono', 'panchor mono', 'phex mono', 'pname-input mono', 'psl-val mono',
  'rad-lab mono', 'range-tglab mono', 'sh-lab mono', 'shape-nums mono', 'sp-px mono',
  'sz-lab mono', 'tpill mono', 'tr-attr mono', 'tr-band-c mono',
]);

const src = await readFile(resolve(root, 'src/main.ts'), 'utf8');

// Classes with their own top-level single-class rule. Anchored at line start so a nested or
// compound selector (`.pfield.slider`, `.sg-pills .tpill`) is not mistaken for one.
const owns = new Set([...src.matchAll(/^\.([a-z][a-z0-9-]*)\s*\{/gm)].map((m) => m[1]));
if (owns.size === 0) {
  console.error('lint:classes FAILED — no top-level CSS rules found in src/main.ts.');
  console.error('  The stylesheet literal moved or changed shape; this must follow it rather than');
  console.error('  pass over a file it can no longer read (the #502 lesson: prove you looked).');
  process.exit(1);
}

const mints = [];
for (const re of [/el\(\s*'[a-z]+'\s*,\s*'([^'$]+)'/g, /className:\s*'([^'$]+)'/g])
  for (const m of src.matchAll(re)) mints.push(m[1].trim().split(/\s+/).filter(Boolean));
if (mints.length === 0) {
  console.error('lint:classes FAILED — no class mints matched. The el()/className shapes changed.');
  process.exit(1);
}

const stem = (c) => c.split('-')[0];
const flagged = new Map();
for (const cls of mints) {
  if (cls.length < 2) continue;
  const rule = cls.filter((c) => owns.has(c) && !UTILITIES.has(c));
  if (rule.length < 2) continue;
  // A modifier sharing its base's stem is the ordinary convention and cannot collide across surfaces.
  if (rule.every((c) => stem(c) === stem(rule[0]))) continue;
  const key = cls.join(' ');
  if (!ALLOWED.has(key)) flagged.set(key, rule);
}

// A stale allowlist entry is a coverage hole in the other direction: it silences a pairing that no
// longer exists, so the name is free to come back meaning something else with the gate still quiet.
const live = new Set(mints.filter((c) => c.length > 1).map((c) => c.join(' ')));
const stale = [...ALLOWED].filter((k) => !live.has(k));

console.log(`Class collisions — ${mints.length} mints scanned against ${owns.size} top-level rules.`);
if (flagged.size) {
  console.error(`\n✗ ${flagged.size} unreviewed pairing(s): two or more classes that each own a rule.`);
  for (const [k, rule] of flagged) console.error(`   ${k}      (own rules: ${rule.join(', ')})`);
  console.error('\n  Check what each class\'s standalone rule declares before allowlisting the pairing.');
  console.error('  `.pfield slider` looked exactly like this, and `.slider{margin-top:16px}` was the bug.');
  process.exit(1);
}
if (stale.length) {
  console.error(`\n✗ ${stale.length} allowlist entr(y/ies) no longer minted anywhere — remove them:`);
  for (const k of stale) console.error(`   ${k}`);
  process.exit(1);
}
console.log(`✓ clean — every multi-rule pairing is on the reviewed list (${ALLOWED.size} entries).`);
