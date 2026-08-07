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
 * UTILITIES are classes meant to be composed onto anything (an invariant this file checks — see
 * NON_BOX_PROP below — rather than just trusts, after #544), and a modifier that literally extends its
 * base's name with a further `-suffix` (`sg-card sg-mid` is NOT this — see extendsBase below) is the
 * ordinary base+modifier convention, which cannot collide across surfaces because the prefix scopes it.
 * Everything else is listed by hand.
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
 *  standalone rule is one you want applied here.
 *
 *  Entries that are pre-filtered by UTILITIES or by extendsBase() before ever reaching the ALLOWED
 *  check (e.g. every `X mono` pairing, `mono` being a UTILITIES member) are NOT listed here — that
 *  would document a check the code never performs. Keep this list to pairings that genuinely reach
 *  and pass the membership test below; #544 pruned ~40 entries that had drifted into that state. */
const ALLOWED = new Set([
  'adv-x hit-min',               // #559 — hit-min only adds position:relative plus an out-of-flow
                                 // ::before hit box; adv-x's own border/background/color/cursor/
                                 // font-size/line-height/padding are untouched, so the pairing widens
                                 // the click target without changing adv-x's painted box.
  'barbtn navbtn',              // hamburger nav toggle — barbtn's visual style, navbtn's display:none
                                 // gate flipped to flex only inside the narrow-width media query
  'brandmenu exportmenu',       // menu variants — exportmenu/navmenu re-skin the shared popover
  'brandmenu navmenu',
  'ctable mo-ramp',             // the motion ramp IS a contract table; mo-ramp adds the ms column
  'mtbl-scroll sl-tall',        // sl-tall raises the scroll cap for the taller mode table
  'mtbl-spec-t tf-prev',        // typeface preview inside a mode-table specimen cell
  'mtbl-spec-t tpw-samp',       // type-pairing sample, same cell
  'mtbl-spec-t tpw-samp wt-spec', // #422 — weight-roles specimen, one per MODE cell; wt-spec only adds
                                 // margin-top:4px to stack it as a second line under the stepper
  'pswatch ro ao-chk',          // read-only palette swatch on the alpha-checker background
  'pvseg tok-seg',              // #466 — tok-seg is the L3 (nested) modifier of the view segment
  'sg-card sg-bcard', 'sg-card sg-icard', 'sg-card sg-mid', 'sg-card sg-scrimcard',
  'sg-tc sg-t sg-tcrow', 'sg-tc sg-tchd', 'sg-tc sg-tcrow',   // tcHead/tcCell — template-literal
                                                               // mints (#544), sg-l/sg-r/sg-t vary
  'start-alt start-upload', 'start-card start-hero', 'start-card start-row2',
  'sw ao-chk',                  // shade swatch on the alpha-checker background
  'tf-in tf-addin',
]);

const src = await readFile(resolve(root, 'src/main.ts'), 'utf8');

// Classes with their own top-level rule. Anchored at line start so a nested or compound selector
// (`.pfield.slider`, `.sg-pills .tpill`) is not mistaken for one: the pattern only matches a run of
// whole `.class` selectors separated by top-level commas, immediately followed by `{` (allowing
// whitespace) — a `.` or other combinator right after a class name (no comma) breaks the match
// entirely rather than partially matching a prefix of it. A comma-separated group (`.zzz, .range{`)
// used to be invisible here — every selector in a CSS group owns the same rule body, so each one is
// captured (#544; found because `.brandsel,.barbtn{...}` already existed in this exact shape).
const owns = new Set();
for (const m of src.matchAll(/^((?:\.[a-z][a-z0-9-]*\s*,\s*)*\.[a-z][a-z0-9-]*)\s*\{/gm)) {
  for (const sel of m[1].split(',')) owns.add(sel.trim().slice(1));
}
if (owns.size === 0) {
  console.error('lint:classes FAILED — no top-level CSS rules found in src/main.ts.');
  console.error('  The stylesheet literal moved or changed shape; this must follow it rather than');
  console.error('  pass over a file it can no longer read (the #502 lesson: prove you looked).');
  process.exit(1);
}

// UTILITIES are exempted from the collision check on the claim that they "carry no layout of their
// own that a host class could fight" — until #544 that was a comment, not a check. Verify it: a
// UTILITIES class's own top-level rule may declare only non-box properties (font-*, color,
// letter-spacing, font-variant-*, and similar — nothing that could size, position, or space an
// element). A listed utility whose rule can't even be found fails closed rather than passing by
// default (same #502 lesson as above).
const NON_BOX_PROP = /^(font(-[a-z-]+)?|color|letter-spacing)$/;
for (const cls of UTILITIES) {
  const m = src.match(new RegExp(`^\\.${cls}\\{([^}]*)\\}`, 'm'));
  if (!m) {
    console.error(`lint:classes FAILED — UTILITIES class '.${cls}' has no top-level rule to verify.`);
    console.error('  A utility exempted from the collision check must have a rule to check in the');
    console.error('  first place; without one this exemption cannot be confirmed, so it is refused.');
    process.exit(1);
  }
  const boxy = m[1].split(';').map((d) => d.split(':')[0].trim()).filter(Boolean)
    .filter((p) => !NON_BOX_PROP.test(p));
  if (boxy.length) {
    console.error(`lint:classes FAILED — UTILITIES class '.${cls}' declares box propert${boxy.length > 1 ? 'ies' : 'y'}: ${boxy.join(', ')}`);
    console.error('  UTILITIES skip the collision check on the claim they carry no layout of their own');
    console.error('  a host class could fight. This one now does. Either remove the box propert' +
      (boxy.length > 1 ? 'ies' : 'y') + ` from .${cls}, or drop it from UTILITIES and let every`);
    console.error('  pairing it appears in go through the normal ALLOWED review.');
    process.exit(1);
  }
}

const mints = [];
for (const re of [
  /el\(\s*'[a-z]+'\s*,\s*'([^'$]+)'/g,
  /el\(\s*'[a-z]+'\s*,\s*`([^`]+)`/g,   // template-literal class arg (#544) — `${expr}` segments are
                                        // stripped below since only the static tokens around them can
                                        // be checked; a class name never lives entirely inside one.
  /className:\s*'([^'$]+)'/g,
])
  for (const m of src.matchAll(re)) {
    const literal = m[1].replace(/\$\{[^}]*\}/g, ' ').trim();
    if (literal) mints.push(literal.split(/\s+/).filter(Boolean));
  }
if (mints.length === 0) {
  console.error('lint:classes FAILED — no class mints matched. The el()/className shapes changed.');
  process.exit(1);
}

// A modifier "extends" a base if one class name is literally the other's dash-prefix (or they're
// equal) — the ordinary base+modifier convention, which cannot collide across surfaces because the
// prefix scopes it (`sf-ex` + `sf-ex-fill`). This is narrower than "shares a first dash-segment": that
// looser rule let `tok-hexv` (a token-value display class) and `tok-seg` (the view segment's own L3
// modifier, #466 — an unrelated surface that happens to share the `tok-` segment) exempt each other
// before ever reaching the ALLOWED check. Every pairing this repo actually relies on the loose rule
// for (`sg-card sg-mid` and siblings) was already hand-listed in ALLOWED regardless, so narrowing this
// costs nothing real — see #544.
const extendsBase = (a, b) => a === b || a.startsWith(b + '-') || b.startsWith(a + '-');

const flagged = new Map();
for (const cls of mints) {
  if (cls.length < 2) continue;
  const rule = cls.filter((c) => owns.has(c) && !UTILITIES.has(c));
  if (rule.length < 2) continue;
  if (rule.every((c) => extendsBase(c, rule[0]))) continue;
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
