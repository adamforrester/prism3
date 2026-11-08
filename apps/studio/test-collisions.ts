/**
 * The collision choice's model (#1909, owner decision Q112 A), `src/state/collisions.ts`, plus the two seams it rides:
 * the wire validator (`toHostMessage`'s `apply-result`) and the session (`reduce`). In Node with no DOM.
 *
 *   npx tsx apps/studio/test-collisions.ts
 *
 * INDEPENDENCE (docs/34). The rows, keys and expected choices are literals typed here, read off the owner's decision
 * (Q112 A: Skip or Rename per collision, plus "apply to all"; refusal the default; nothing remembered), never computed
 * by the module under test.
 *
 * Mutations that fail here by name: `allChosen` true with a row unchosen → `Q112 default: Apply stays off …`;
 * `choicesToPost` posting before every row has a choice → `Q112 default: nothing is posted …`; `pickAll` covering the
 * first row only → `Q112 apply to all: …`; the validator keeping a malformed list → `wire: a list with one malformed …`;
 * `reduce` keeping the collisions after a clean apply → `session: a clean apply clears …`.
 */
import { allChosen, choicesToPost, pickAll, sharedPick } from './src/state/collisions';
import { toHostMessage, type CollisionView } from './src/write-adapter';
import { initialHostSession, reduce } from './src/state/host-session';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const ROWS: CollisionView[] = [
  { key: 'collection:color', kind: 'collection', name: 'color', detail: 'already in this file, not created by Prism3' },
  { key: 'variable:color:pds3/color/background/primary', kind: 'variable', name: 'pds3/color/background/primary', detail: 'is STRING in "color"; Prism3 writes COLOR' },
  { key: 'effect style:shadow/xs', kind: 'effect style', name: 'shadow/xs', detail: 'already in this file, not created by Prism3' },
];

console.log('collision choice (#1909, Q112 A) — the model, the wire and the session\n');

// ── refusal is the default ──
ok(!allChosen(ROWS, {}), 'Q112 default: Apply stays off while no row has a choice');
ok(!allChosen(ROWS, { 'collection:color': 'skip', 'effect style:shadow/xs': 'rename' }), 'Q112 default: Apply stays off while one row of three has no choice');
ok(choicesToPost(ROWS, { 'collection:color': 'skip' }) === null, 'Q112 default: nothing is posted until every row has a choice');
ok(!allChosen([], {}), 'Q112 default: an empty list never runs');

// ── each row its own choice ──
const mixed = { 'collection:color': 'skip', 'variable:color:pds3/color/background/primary': 'rename', 'effect style:shadow/xs': 'skip' } as const;
ok(allChosen(ROWS, mixed) && same(choicesToPost(ROWS, mixed), mixed), 'Q112 per collision: a choice for each row posts exactly those choices');
ok(same(choicesToPost(ROWS, { ...mixed, 'paint style:gradient/brand': 'rename' }), mixed), 'Q112 per collision: a key no row holds is never posted');
ok(sharedPick(ROWS, mixed) === null, 'Q112 per collision: mixed choices leave "Apply to all" showing none');

// ── apply to all ──
ok(same(pickAll(ROWS, 'rename'), { 'collection:color': 'rename', 'variable:color:pds3/color/background/primary': 'rename', 'effect style:shadow/xs': 'rename' }),
  'Q112 apply to all: one choice fills every row');
ok(sharedPick(ROWS, pickAll(ROWS, 'skip')) === 'skip', 'Q112 apply to all: it reads back the choice every row shares');

// ── the wire: the refusal's rows, validated at the boundary ──
const wire = (m: object) => toHostMessage({ pluginMessage: { type: 'apply-result', ok: false, headline: '✗ 3 conflicts', summary: 's', lines: ['s'], ...m } });
const got = wire({ collisions: ROWS });
ok(!!got && got.kind === 'apply-result' && same(got.collisions, ROWS), 'wire: a refused apply carries its collisions, each with its key');
const bad = wire({ collisions: [ROWS[0], { kind: 'collection', name: 'x', detail: 'y' }] });
ok(!!bad && bad.kind === 'apply-result' && bad.collisions === null, 'wire: a list with one malformed entry (no key) is dropped whole');
const clean = toHostMessage({ pluginMessage: { type: 'apply-result', ok: true, headline: '✓', summary: 's', lines: ['s'], collisions: ROWS } });
ok(!!clean && clean.kind === 'apply-result' && clean.collisions === null, 'wire: a clean apply carries none, whatever it sends');

// ── the session: the list opens on the refusal and is gone after it (nothing remembered) ──
const refused = reduce(initialHostSession(), got!);
ok(same(refused.collisions, ROWS), 'session: the refusal opens the list');
const after = reduce(refused, toHostMessage({ pluginMessage: { type: 'apply-result', ok: true, headline: '✓', summary: 's', lines: ['s'] } })!);
ok(after.collisions === null, 'session: a clean apply clears the list');
const plain = reduce(refused, toHostMessage({ pluginMessage: { type: 'apply-result', ok: false, headline: '✗', summary: 'The write failed.', lines: ['x'] } })!);
ok(plain.collisions === null, 'session: a failure with no collisions clears it too');

console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ collision choice: all checks passed');
process.exit(failed ? 1 : 0);
