/**
 * Prism3 engine — CONTROL SHAPE REACHES WHAT ITS DESCRIPTION SAYS, AND NOTHING ELSE (#3765).
 *
 *   npx tsx packages/engine/lint-control-shape-reach.ts
 *
 * WHY. The `controlShape` lever's description (`levers.ts`) says it sets "the corner shape of buttons, fields and
 * checkboxes". For weeks it reached only the pill-able controls, and no gate noticed: the description and the reach
 * lived in different files, and nothing compared them (#3765). The owner decided the description is right (Q-CS1 A):
 * fields and checkboxes follow Control shape. This gate holds the two together from a third place.
 *
 * WHAT IT ASSERTS, each failure prefixed by the name a mutation must produce:
 *   REACH      a def in a claimed family does not take the corner the claim gives it, for one shape × field style.
 *              Reported by def, member, part, the corner it binds and the corner claimed.
 *   OUTSIDE    a def classified outside every claimed family moves its corner under some shape: the lever reaches
 *              past what the description says.
 *   HELD       a def held on an open question (`HELD`) moved. Whoever answered the question moves it into its family.
 *   UNCLASSIFIED  a def binds a corner and is in no table here, so nobody has said whether Control shape reaches it.
 *   OVERCLAIM  the description states a claim the typed expectation does not hold: a family it names that is not
 *              claimed, or a shape × family it gives a corner the expectation does not.
 *   UNSTATED   the typed expectation holds a claim the description no longer states.
 *   PARSE      a clause of the description names a family but no corner, so it cannot be read as a claim.
 *   REPRESENTED  a family is empty, a typed id is not a registered def, a table names a def twice, or a shape the
 *              lever offers has no claim.
 *   SELF-CHECK the description reader, run on the planted prose typed below, does not read exactly what is planted.
 *
 * INDEPENDENCE (docs/34). Two SUBJECTS: the description string in `leverManifest`, and what the production
 * materializer (`brandMaterializer`, the export's chain) projects for each def under each Control shape × Field style.
 * The REFERENCE is typed here and read from neither: which def is a button, a field or a checkbox (`FAMILIES`), which
 * corner each shape gives each family (`CLAIM`), and the defs deliberately outside (`OUTSIDE_REASON`). Nothing here
 * reads `ComponentDef.levers`, the table the reach is built from: a gate that read it would agree with any reach.
 *
 * "OWN" means the def's corner under Rounded, the identity: Rounded follows radius softness, so the corner a def binds
 * at rest is its own. An INTRINSIC corner (`radius/round`, `radius/capsule`, `radius/none`) is a shape the def is, not
 * a softness rung, so no shape moves it: the circular icon button stays a circle (#1353).
 *
 * WHAT IT DOES NOT ASSERT. Pixel values (the rungs are tokens; `lint-ramp-values.ts` holds their values) or anything
 * Control shape does not move. Field style's own reach is `test.ts`'s.
 */
import { componentDefs } from './components/index';
import { figmaAnatomySet, planComponentName, type FigmaNodePlan } from './anatomy-figma';
import { brandMaterializer } from './component-defs-export';
import { leverManifest } from './levers';
import { MINIMAL_BRAND } from './token-contract';
import type { BrandInput } from './theme';
import type { ComponentDef } from './component-schema';

type Shape = 'rounded' | 'pill' | 'boxed' | 'hairline';
type Family = 'buttons' | 'fields' | 'checkboxes';
/** A corner a claim gives: a rung's Figma variable, or `own` (the def's corner under Rounded). */
type Corner = 'own' | 'radius/none' | 'radius/hairline' | 'radius/capsule';

const SHAPES: readonly Shape[] = ['rounded', 'pill', 'boxed', 'hairline'];
const FIELD_STYLES = ['outline', 'underline'] as const;

/** The defs in each claimed family, typed here. A def nested inside another (a row's checkbox, a field's label) is
 *  reached through the def it nests, so only the def that draws the corner is listed. */
const FAMILIES: Record<Family, readonly string[]> = {
  buttons: ['button', 'button-destructive', 'button-neutral', 'icon-button', 'icon-button-destructive', 'icon-button-neutral'],
  fields: ['text-field', 'textarea', 'select', 'search-field', 'card-number-field', 'code-input-cell'],
  checkboxes: ['checkbox-control'],
};

/** What the description claims, per shape and family (owner Q139, Q333 option A, Q-CS1 A). */
const CLAIM: Record<Shape, Record<Family, Corner>> = {
  rounded: { buttons: 'own', fields: 'own', checkboxes: 'own' },
  pill: { buttons: 'radius/capsule', fields: 'own', checkboxes: 'own' },
  boxed: { buttons: 'radius/none', fields: 'radius/none', checkboxes: 'radius/none' },
  hairline: { buttons: 'radius/hairline', fields: 'radius/hairline', checkboxes: 'radius/hairline' },
};
/** "An underline field has no corners": under Underline every field binds this, whatever the shape. */
const UNDERLINE_FIELD_CORNER = 'radius/none';

/** Defs a claimed noun could cover, held on an open question. Each must stay as it is until the question is answered. */
const HELD: Record<string, { family: Family; question: string }> = {
  'password-field': { family: 'fields', question: '#3784, fixed on its own branch' },
  'wallet-button': { family: 'buttons', question: 'Q-CS3 on the #3765 PR: do the provider buttons follow Control shape?' },
  'sign-in-button': { family: 'buttons', question: 'Q-CS3 on the #3765 PR: do the provider buttons follow Control shape?' },
  'counter': { family: 'fields', question: 'Q-CS4 on the #3765 PR: is the outline Counter a field for Control shape?' },
};

/** Defs that bind a corner Control shape must not move, each with why. */
const OUTSIDE_REASON: Record<string, string> = {
  'provider-logo': 'a mark, not a control',
  'flush-icon-button': 'no box at rest: its square shape is radius.none and its circle intrinsic',
  'flush-icon-button-destructive': 'no box at rest: its square shape is radius.none and its circle intrinsic',
  'flush-icon-button-neutral': 'no box at rest: its square shape is radius.none and its circle intrinsic',
  'radio-control': 'intrinsically round',
  'switch-control': 'intrinsically round',
  'badge': 'a status label, not a control; its radius.sm must not follow a field setting',
  'tag': 'Tag style owns its shape',
  'list-item': 'a round bullet',
  'segmented-control-segment': 'not a button, field or checkbox',
  'segmented-control': 'not a button, field or checkbox',
  'dialog': 'a surface',
  'toast': 'a surface',
  'banner': 'a surface',
  'pagination-item': 'a pagination cell, not a button',
  'progress': 'an indicator',
  '_slider-thumb': 'intrinsically round',
  'slider': 'an intrinsically round track',
};

// ── the description reader ──────────────────────────────────────────────────────────────────────────────────

/** Family nouns, singular and plural. Any other control noun in the description is an over-claim. */
const FAMILY_NOUN: Record<string, Family> = { button: 'buttons', buttons: 'buttons', field: 'fields', fields: 'fields', checkbox: 'checkboxes', checkboxes: 'checkboxes' };
const OTHER_NOUNS = ['tag', 'tags', 'switch', 'switches', 'radio', 'radios', 'badge', 'badges', 'tab', 'tabs', 'chip', 'chips', 'slider', 'sliders', 'toggle', 'toggles', 'card', 'cards', 'dialog', 'dialogs', 'banner', 'banners', 'toast', 'toasts', 'counter', 'counters', 'segment', 'segments', 'input', 'inputs', 'control', 'controls', 'menu', 'menus'];
const SHAPE_WORD: Record<string, Shape> = { hairline: 'hairline', boxed: 'boxed', rounded: 'rounded', pill: 'pill' };
/** Corner phrases, tried in order (the Pill clause names softness only to set it aside). */
const CORNER_PHRASE: readonly [RegExp, Corner][] = [
  [/\b1px\b/, 'radius/hairline'], [/\b0px\b|\bsharp\b/, 'radius/none'], [/\bfully\b/, 'radius/capsule'],
  [/\btheir own corner\b|\bits own corner\b/, 'own'], [/\bno corners?\b/, 'radius/none'], [/\bsoftness\b/, 'own'],
];

type Read = { scope: Family[]; claims: Map<string, Corner>; underline: Map<Family, Corner>; overclaim: string[]; parse: string[] };

/** Reads the description into claims: `shape:family` → corner, the families in its opening scope, and the underline
 *  clause. A clause inherits the shape of the clause before it in the same sentence, and "them" its families. */
export const readDescription = (text: string): Read => {
  const out: Read = { scope: [], claims: new Map(), underline: new Map(), overclaim: [], parse: [] };
  const sentences = text.split(/(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean);
  sentences.forEach((sentence, si) => {
    let shapes: Shape[] = [];
    let families: Family[] = [];
    for (const clause of sentence.split(/;|, and /)) {
      const words = clause.toLowerCase().match(/[a-z0-9]+/g) ?? [];
      const named = [...new Set(words.filter((w) => SHAPE_WORD[w]).map((w) => SHAPE_WORD[w]))];
      if (named.length) shapes = named;
      const fams = [...new Set(words.filter((w) => FAMILY_NOUN[w]).map((w) => FAMILY_NOUN[w]))];
      for (const w of words) if (OTHER_NOUNS.includes(w)) out.overclaim.push(`OVERCLAIM: the description names '${w}', which no claimed family covers ("${clause.trim()}")`);
      if (fams.length) families = fams;
      else if (!words.includes('them')) families = [];
      if (!fams.length && !words.includes('them')) continue;
      const lower = clause.toLowerCase();
      if (si === 0 && !named.length && /\bcorner shape of\b/.test(lower)) { out.scope = fams; continue; }
      const corner = CORNER_PHRASE.find(([re]) => re.test(lower))?.[1];
      if (!corner) { out.parse.push(`PARSE: "${clause.trim()}" names ${families.join(', ')} but no corner`); continue; }
      if (/\bunderline\b/.test(lower)) { for (const f of families) out.underline.set(f, corner); continue; }
      if (!shapes.length) { out.parse.push(`PARSE: "${clause.trim()}" gives a corner but names no shape`); continue; }
      for (const s of shapes) for (const f of families) out.claims.set(`${s}:${f}`, corner);
    }
    // A sentence naming one shape and no family ("Rounded follows radius softness") claims every scoped family.
    const words = sentence.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    const named = [...new Set(words.filter((w) => SHAPE_WORD[w]).map((w) => SHAPE_WORD[w]))];
    if (named.length === 1 && !words.some((w) => FAMILY_NOUN[w] || w === 'them')) {
      const corner = CORNER_PHRASE.find(([re]) => re.test(sentence.toLowerCase()))?.[1];
      if (!corner) out.parse.push(`PARSE: "${sentence}" names ${named[0]} but no corner`);
      else for (const f of out.scope) out.claims.set(`${named[0]}:${f}`, corner);
    }
  });
  return out;
};

// ── the projection ───────────────────────────────────────────────────────────────────────────────────────────

const cornersOf = (n: FigmaNodePlan, path: string, out: Map<string, string>): void => {
  const here = path ? `${path}/${n.name}` : n.name;
  for (const [k, v] of Object.entries(n.bound ?? {})) if (/radius/i.test(k)) out.set(`${here}.${k}`, v as string);
  for (const c of n.children ?? []) cornersOf(c as FigmaNodePlan, here, out);
};

/** Every corner binding of `def`'s set, keyed `member › part.property`, under one brand. */
const corners = (def: ComponentDef, shape: Shape, fieldStyle: 'outline' | 'underline'): Map<string, string> => {
  const input = { ...MINIMAL_BRAND, controlShape: shape, fieldStyle } as BrandInput;
  const out = new Map<string, string>();
  for (const plan of figmaAnatomySet(brandMaterializer(input)(def))) {
    const m = new Map<string, string>();
    cornersOf(plan.root, '', m);
    for (const [k, v] of m) out.set(`${planComponentName(plan)} › ${k}`, v);
  }
  return out;
};

const INTRINSIC = new Set(['radius/round', 'radius/capsule', 'radius/none']);

// ── the gate ─────────────────────────────────────────────────────────────────────────────────────────────────

export const run = (description: string): { errors: string[]; counts: Record<string, number> } => {
  const errors: string[] = [];
  const byId = new Map(componentDefs.map((d) => [d.id, d] as const));
  const classified = new Map<string, string>();
  const note = (id: string, where: string): void => {
    if (!byId.has(id)) errors.push(`REPRESENTED: ${where} names '${id}', which is not a registered def`);
    if (classified.has(id)) errors.push(`REPRESENTED: '${id}' is in ${classified.get(id)} and ${where}`);
    classified.set(id, where);
  };
  for (const [f, ids] of Object.entries(FAMILIES)) {
    if (!ids.length) errors.push(`REPRESENTED: the ${f} family is empty`);
    for (const id of ids) note(id, `FAMILIES.${f}`);
  }
  for (const id of Object.keys(HELD)) note(id, 'HELD');
  for (const id of Object.keys(OUTSIDE_REASON)) note(id, 'OUTSIDE_REASON');
  const offered = leverManifest.find((l) => l.key === 'controlShape')?.options?.map((o) => String(o.value)) ?? [];
  for (const v of offered) if (!(SHAPES as readonly string[]).includes(v)) errors.push(`REPRESENTED: Control shape offers '${v}', which has no claim here`);
  if (!offered.length) errors.push('REPRESENTED: the controlShape lever offers no values');

  // The description against the typed claim.
  const read = readDescription(description);
  errors.push(...read.overclaim, ...read.parse);
  const claimed = Object.keys(FAMILIES) as Family[];
  for (const f of read.scope) if (!claimed.includes(f)) errors.push(`OVERCLAIM: the description's scope names ${f}`);
  for (const f of claimed) if (!read.scope.includes(f)) errors.push(`UNSTATED: the description's scope no longer names ${f}`);
  for (const [k, c] of read.claims) {
    const [s, f] = k.split(':') as [Shape, Family];
    const want = CLAIM[s]?.[f];
    if (want === undefined) errors.push(`OVERCLAIM: the description gives ${s} × ${f} a corner (${c}); no claim holds ${f}`);
    else if (want !== c) errors.push(`OVERCLAIM: the description gives ${s} × ${f} ${c}; the claim is ${want}`);
  }
  for (const s of SHAPES) for (const f of claimed) {
    // `own` under Rounded and Pill's fields and checkboxes may go unsaid only where the description says it; it must.
    if (!read.claims.has(`${s}:${f}`)) errors.push(`UNSTATED: the description no longer states ${s} × ${f} (the claim is ${CLAIM[s][f]})`);
  }
  if (read.underline.get('fields') !== UNDERLINE_FIELD_CORNER) errors.push(`UNSTATED: the description no longer says an underline field has no corners`);
  for (const [f, c] of read.underline) if (f !== 'fields' || c !== UNDERLINE_FIELD_CORNER) errors.push(`OVERCLAIM: the description gives underline ${f} ${c}`);

  // The projection against the typed claim.
  const counts = { defs: 0, families: 0, held: 0, outside: 0, bindings: 0 };
  const familyOf = new Map<string, Family>(Object.entries(FAMILIES).flatMap(([f, ids]) => ids.map((id) => [id, f as Family] as const)));
  for (const def of componentDefs) {
    const own = corners(def, 'rounded', 'outline');
    const ownUnder = corners(def, 'rounded', 'underline');
    const fam = familyOf.get(def.id);
    if (!own.size && !fam) continue;
    counts.defs++;
    if (!classified.has(def.id)) { errors.push(`UNCLASSIFIED: ${def.id} binds a corner (${[...new Set(own.values())].join(', ')}) and no table here says whether Control shape reaches it`); continue; }
    if (fam && !own.size) { errors.push(`REPRESENTED: ${def.id} (${fam}) binds no corner`); continue; }
    if (fam) counts.families++; else if (HELD[def.id]) counts.held++; else counts.outside++;
    for (const fs of FIELD_STYLES) for (const s of SHAPES) {
      const got = corners(def, s, fs);
      const base = fs === 'outline' ? own : ownUnder;
      // One line per part × wrong corner, naming the first member and how many more: a set has hundreds of members.
      const wrong = new Map<string, { first: string; n: number }>();
      for (const [k, at] of base) {
        const g = got.get(k);
        counts.bindings++;
        let want = at;
        if (fam && !INTRINSIC.has(at)) want = CLAIM[s][fam] === 'own' ? at : CLAIM[s][fam];
        if (g === want) continue;
        const [member, part] = k.split(' › ');
        const key = `${part.replace(/\.(topLeft|topRight|bottomLeft|bottomRight|corner)Radius$/, '')} binds ${g ?? 'nothing'}|${want}`;
        const w = wrong.get(key);
        if (w) w.n++; else wrong.set(key, { first: member, n: 1 });
      }
      for (const [key, { first, n }] of wrong) {
        const [what, want] = key.split('|');
        const tag = fam ? 'REACH' : HELD[def.id] ? 'HELD' : 'OUTSIDE';
        const why = fam ? `claimed ${want}` : HELD[def.id] ? `held at ${want} on ${HELD[def.id].question}` : `outside (${OUTSIDE_REASON[def.id]}), so it stays ${want}`;
        errors.push(`${tag}: ${def.id}${fam ? ` (${fam})` : ''} under ${s} × ${fs}: ${what}, ${why} (${n} corner binding${n === 1 ? '' : 's'}, first at ${first})`);
      }
    }
    // "An underline field has no corners": every field, held ones included, binds none under Underline.
    if (fam === 'fields') for (const [k, v] of ownUnder) if (v !== UNDERLINE_FIELD_CORNER) errors.push(`REACH: ${def.id} (fields) under underline: ${k} binds ${v}, claimed ${UNDERLINE_FIELD_CORNER}`);
  }
  return { errors, counts };
};

// ── self-check: the reader reads planted prose exactly ──────────────────────────────────────────────────────

const selfCheck = (): string[] => {
  const errs: string[] = [];
  const planted = readDescription('The corner shape of buttons and checkboxes. Boxed gives buttons a 0px corner, and Hairline gives them a 1px corner. Pill rounds buttons fully; checkboxes keep their own corner. Rounded follows radius softness. Tags stay round.');
  const want: Record<string, Corner> = {
    'boxed:buttons': 'radius/none', 'hairline:buttons': 'radius/hairline', 'pill:buttons': 'radius/capsule',
    'pill:checkboxes': 'own', 'rounded:buttons': 'own', 'rounded:checkboxes': 'own',
  };
  const got = Object.fromEntries(planted.claims);
  if (JSON.stringify(Object.keys(got).sort()) !== JSON.stringify(Object.keys(want).sort()) || Object.entries(want).some(([k, v]) => got[k] !== v))
    errs.push(`SELF-CHECK: the reader read ${JSON.stringify(got)}, planted ${JSON.stringify(want)}`);
  if (JSON.stringify(planted.scope) !== '["buttons","checkboxes"]') errs.push(`SELF-CHECK: the reader read scope ${JSON.stringify(planted.scope)}, planted ["buttons","checkboxes"]`);
  if (planted.overclaim.length !== 1 || !planted.overclaim[0].includes("'tags'")) errs.push(`SELF-CHECK: the reader flagged ${JSON.stringify(planted.overclaim)}, planted one over-claim ('tags')`);
  const noCorner = readDescription('Boxed reaches fields.');
  if (noCorner.parse.length !== 1) errs.push(`SELF-CHECK: a clause naming a family and no corner was not refused (${JSON.stringify(noCorner.parse)})`);
  return errs;
};

const main = (): void => {
  const description = leverManifest.find((l) => l.key === 'controlShape')?.description ?? '';
  const errors = [...selfCheck()];
  if (!description) errors.push('REPRESENTED: the controlShape lever has no description');
  const { errors: e, counts } = run(description);
  errors.push(...e);
  if (counts.families < Object.values(FAMILIES).flat().length) errors.push(`REPRESENTED: ${counts.families} family defs projected, ${Object.values(FAMILIES).flat().length} typed`);
  if (errors.length) {
    console.error(`✗ lint-control-shape-reach: ${errors.length} problem(s)`);
    for (const e2 of errors) console.error(`  ${e2}`);
    process.exit(1);
  }
  console.log(`✓ lint-control-shape-reach: the description's ${Object.values(FAMILIES).length} families × ${SHAPES.length} shapes × ${FIELD_STYLES.length} field styles hold on ${counts.families} family defs; ${counts.held} held, ${counts.outside} outside and unmoved; ${counts.bindings} corner bindings compared; the reader's self-check reads its planted prose exactly.`);
};

main();
