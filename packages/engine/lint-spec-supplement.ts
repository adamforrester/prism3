/**
 * SPEC SUPPLEMENT GATE (#2996, Q2996.4) — each Prism3 spec supplement lines up with what Spectacular writes for the same
 * component, and every code name it gives is a name the token contract guarantees.
 *
 *   npx tsx packages/engine/lint-spec-supplement.ts
 *
 * The supplement (`out/specs/<id>.supplement.yaml`, written by `emit-spec-supplement.ts`) is useful only if a reader can
 * lay it over Spectacular's `api.yaml` and `variants.yaml` key by key. Nothing in the engine knows what Spectacular
 * writes; the emitter keys by convention (the root part is `root`, a Figma name is camelCased, a `$token` is the
 * variable's collection then its name). A convention that drifts from Spectacular's real output writes a supplement whose
 * keys match nothing, and every other gate stays green.
 *
 * ── INDEPENDENCE (docs/34) ──────────────────────────────────────────────────────────────────────────────────────────
 *
 *   EXPECTED — `fixtures/spectacular/<id>.yaml`: Spectacular's own output for the template file's component (RESULT 83b on
 *              #2996), hand-copied and trimmed. Spectacular read the BUILT FILE through Figma's API and shares no code with
 *              the engine. The fixture is never generated, and never refreshed from the supplement.
 *            — `schema/token-contract.json`: the guaranteed name surface, which only `token-contract.ts --accept` writes.
 *            — the typed registers below (the supplements this gate expects, each one's code-only props, the house root).
 *   ACTUAL   — the committed `out/specs/<id>.supplement.yaml`, read off disk as text. `regen --check` holds that file to the
 *              emitter's output, so this reads what ships.
 *
 * This file imports nothing from the engine, and reads both YAML files with its own small reader (`readYaml`), not with
 * the emitter's writer, so a writer bug that a matching reader would hide shows here as a parse failure or a missing key.
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────────────────────────
 *
 *   [SCOPE]          `out/specs/` holds exactly the supplements `SUPPLEMENTS` names, each with its fixture. A supplement
 *                    with no fixture is unchecked, so it fails here rather than passing by absence.
 *   [TITLE]          the supplement's `title` is Spectacular's.
 *   [ANATOMY]        every supplement element names an element Spectacular emits, and every element Spectacular emits
 *                    has a supplement entry (none is exempt today: `NO_CONTRACT` is empty).
 *   [PROPS]          the same for props: every supplement prop is a Spectacular prop, and every Spectacular prop has an
 *                    entry; where Spectacular records the Figma name (`$extensions.com.figma.name`), the supplement's
 *                    `figmaName` is that name, and the supplement claims no Figma name Spectacular does not.
 *   [TOKENS]         every `$token` path Spectacular binds on an element is a key of that element's `tokens`, and each
 *                    key names its own token: the Figma path, read back, is the DTCG path the entry gives.
 *   [CODE NAMES]     every token entry anywhere in the supplement (`dtcg`, `css`) is a guaranteed or brand-dependent
 *                    contract name under the house root, and its CSS name is stock Style Dictionary's `name/kebab` of
 *                    it (`--pds3-` + the path with `-` for `.`), written out here as `check-package.mjs` writes it.
 *   [CODE ONLY]      the supplement's code-only props are exactly the typed register's, and its code-only states are
 *                    exactly the states it lists that Spectacular's `state` prop does not.
 *   [REPRESENTED]    the component block carries role, keyboard, focus, ARIA and WCAG; a hit target for every size
 *                    Spectacular's `size` prop lists; motion tokens; and an RTL rule on the root.
 *
 * ── WHAT THIS DOES NOT CHECK ────────────────────────────────────────────────────────────────────────────────────────
 *
 *  · That the PROSE is right (role, ARIA, motion): it is the def's, gated where the def is (`lint-description-claims.ts`,
 *    `lint-voice.ts`, `lint-us-english.ts`). This gate checks it is there.
 *  · That the fixture is current. It is one Spectacular run, on one day's template file. A def change that renames a part
 *    or a property fails here until a new run is copied in, which is the point: the supplement must match the file.
 *  · A token the supplement maps that Spectacular does not show (the icon colors on a nested instance, the hit target, the
 *    focus ring): [CODE NAMES] holds its names to the contract, and nothing holds its Figma path to a real file.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, 'out', 'specs');
const CONTRACT = resolve(here, 'schema', 'token-contract.json');
const EXT = 'com.prism3';
/** The house brand's root, as the owner decided it for the shipped CSS (Q98 A); `check-package.mjs` types it too. */
const ROOT = 'pds3';

/** The supplements this gate expects, each with Spectacular's output for the same component and its code-only props
 *  (every def prop with no Figma property), typed from the def's prop list as reviewed. */
const SUPPLEMENTS: { id: string; fixture: string; codeOnlyProps: string[]; NO_CONTRACT: { anatomy: string[]; props: string[] } }[] = [
  {
    id: 'button',
    fixture: 'fixtures/spectacular/button.yaml',
    codeOnlyProps: ['onClick', 'fullWidth', 'type', 'isPending', 'isInactive', 'disabled', 'href', 'aria-label'],
    NO_CONTRACT: { anatomy: [], props: [] },
  },
];

// ---- a small YAML reader: block maps and lists, plain and double-quoted scalars, comments ---------------------------

type Y = string | number | boolean | null | Y[] | { [k: string]: Y };
type Line = { n: number; indent: number; text: string };

const plain = (s: string): Y => {
  if (s.startsWith('"')) return JSON.parse(s) as string;
  if (s === 'null' || s === '~') return null;
  if (s === 'true' || s === 'false') return s === 'true';
  if (s === '[]') return [];
  if (s === '{}') return {};
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
};
const splitKey = (text: string, file: string, n: number): [string, string] => {
  if (text.startsWith('"')) {
    const end = text.indexOf('":', 1);
    if (end < 0) throw new Error(`${file}:${n}: unreadable key`);
    return [JSON.parse(text.slice(0, end + 1)) as string, text.slice(end + 2).trim()];
  }
  const i = text.indexOf(': ');
  if (i >= 0) return [text.slice(0, i), text.slice(i + 2).trim()];
  if (text.endsWith(':')) return [text.slice(0, -1), ''];
  throw new Error(`${file}:${n}: expected "key: value", got ${JSON.stringify(text)}`);
};

export const readYaml = (src: string, file: string): Y => {
  const lines: Line[] = [];
  src.split('\n').forEach((raw, i) => {
    if (!raw.trim() || raw.trimStart().startsWith('#')) return;
    lines.push({ n: i + 1, indent: raw.length - raw.trimStart().length, text: raw.trim() });
  });
  let at = 0;
  const block = (indent: number): Y => {
    if (lines[at].text.startsWith('- ') || lines[at].text === '-') {
      const list: Y[] = [];
      while (at < lines.length && lines[at].indent === indent && lines[at].text.startsWith('-')) {
        const rest = lines[at].text.slice(1).trim();
        if (/^("[^"]*"|[^"\s][^:]*):( |$)/.test(rest) && !rest.startsWith('"')) {
          lines[at] = { ...lines[at], indent: indent + 2, text: rest };   // `- key: v` opens a map one level in
          list.push(block(indent + 2));
        } else { list.push(plain(rest)); at++; }
      }
      return list;
    }
    const map: { [k: string]: Y } = {};
    while (at < lines.length && lines[at].indent === indent && !lines[at].text.startsWith('- ')) {
      const { n, text } = lines[at];
      const [k, v] = splitKey(text, file, n);
      if (k in map) throw new Error(`${file}:${n}: duplicate key "${k}"`);
      at++;
      if (v !== '') map[k] = plain(v);
      else if (at < lines.length && lines[at].indent > indent) map[k] = block(lines[at].indent);
      else if (at < lines.length && lines[at].indent === indent && lines[at].text.startsWith('- ')) map[k] = block(indent);
      else map[k] = null;
    }
    return map;
  };
  const v = block(lines[0]?.indent ?? 0);
  if (at !== lines.length) throw new Error(`${file}:${lines[at].n}: unexpected indentation`);
  return v;
};

// ---- the arms ---------------------------------------------------------------------------------------------------

const failures: string[] = [];
const passes: string[] = [];
const fail = (arm: string, id: string, msg: string) => failures.push(`✗ [${arm}] ${id}: ${msg}`);
const obj = (v: Y | undefined): { [k: string]: Y } => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const ext = (v: Y | undefined) => obj(obj(obj(v).$extensions)[EXT]);

const contract = JSON.parse(readFileSync(CONTRACT, 'utf8')) as { guaranteed: Record<string, string>; brandDependent: string[] };
const contractNames = new Set([...Object.keys(contract.guaranteed), ...contract.brandDependent]);

// [SCOPE]
const onDisk = existsSync(OUT) ? readdirSync(OUT).filter((f) => f.endsWith('.supplement.yaml')).sort() : [];
const expected = SUPPLEMENTS.map((s) => `${s.id}.supplement.yaml`).sort();
for (const f of onDisk.filter((f) => !expected.includes(f))) fail('SCOPE', f, 'a supplement this gate has no fixture for: add it to SUPPLEMENTS with a Spectacular fixture');
for (const f of expected.filter((f) => !onDisk.includes(f))) fail('SCOPE', f, 'expected in out/specs/ and not there: run regen');

let tokensChecked = 0;
let namesChecked = 0;
for (const s of SUPPLEMENTS) {
  const file = join(OUT, `${s.id}.supplement.yaml`);
  if (!existsSync(file)) continue;
  let sup: { [k: string]: Y };
  let spc: { [k: string]: Y };
  try {
    sup = obj(readYaml(readFileSync(file, 'utf8'), `out/specs/${s.id}.supplement.yaml`));
    spc = obj(readYaml(readFileSync(join(here, s.fixture), 'utf8'), s.fixture));
  } catch (e) { fail('READ', s.id, (e as Error).message); continue; }

  // [TITLE]
  if (sup.title !== spc.title) fail('TITLE', s.id, `the supplement's title is ${JSON.stringify(sup.title)}, Spectacular's is ${JSON.stringify(spc.title)}`);

  // [ANATOMY] and [PROPS]: both directions.
  for (const [arm, block, exempt] of [['ANATOMY', 'anatomy', s.NO_CONTRACT.anatomy], ['PROPS', 'props', s.NO_CONTRACT.props]] as const) {
    const ours = Object.keys(obj(sup[block]));
    const theirs = Object.keys(obj(spc[block]));
    if (!theirs.length) fail(arm, s.id, `the fixture has no ${block}: a gate over nothing passes`);
    for (const k of ours) if (!theirs.includes(k)) fail(arm, s.id, `"${k}" is not a name Spectacular emits under ${block} (it emits ${theirs.join(', ')})`);
    for (const k of theirs) if (!ours.includes(k) && !exempt.includes(k)) fail(arm, s.id, `Spectacular emits "${k}" under ${block} and the supplement has no entry for it`);
  }
  for (const [k, p] of Object.entries(obj(spc.props))) {
    const theirName = obj(obj(obj(p).$extensions)['com.figma']).name;
    const ourName = ext(obj(sup.props)[k]).figmaName;
    if (!(k in obj(sup.props))) continue;
    if ((theirName ?? null) !== (ourName ?? null)) fail('PROPS', s.id, `"${k}": Spectacular records the Figma name ${JSON.stringify(theirName ?? '(the key)')}, the supplement ${JSON.stringify(ourName ?? '(the key)')}`);
  }

  // [TOKENS]
  const byEl = obj(spc.tokensByElement);
  if (!Object.keys(byEl).length) fail('TOKENS', s.id, 'the fixture lists no $token paths: a gate over nothing passes');
  for (const [el, paths] of Object.entries(byEl)) {
    const tokens = obj(ext(obj(sup.anatomy)[el]).tokens);
    for (const path of (paths as Y[]).map(String)) {
      tokensChecked++;
      if (!(path in tokens)) { fail('TOKENS', s.id, `${el}: Spectacular binds $token ${path}, and the supplement maps no such path`); continue; }
      const dtcg = obj(tokens[path]).dtcg;
      const seg = path.split('/');
      const readBack = seg[1] === ROOT ? seg.slice(1).join('.') : `${ROOT}.type.${seg.join('.')}`;
      if (dtcg !== readBack) fail('TOKENS', s.id, `${el}: ${path} reads back as ${readBack}, and the supplement maps it to ${JSON.stringify(dtcg)}`);
    }
  }

  // [CODE NAMES]: every { dtcg, css } anywhere in the supplement.
  const walk = (v: Y, where: string): void => {
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${where}[${i}]`)); return; }
    if (!v || typeof v !== 'object') return;
    if (typeof v.dtcg === 'string' || typeof v.css === 'string') {
      namesChecked++;
      const dtcg = String(v.dtcg);
      if (!dtcg.startsWith(`${ROOT}.`) || !contractNames.has(dtcg.slice(ROOT.length + 1))) fail('CODE NAMES', s.id, `${where}: ${dtcg} is not a contract name under ${ROOT}`);
      const css = `--${dtcg.replace(/\./g, '-')}`;
      if (v.css !== css) fail('CODE NAMES', s.id, `${where}: the CSS name of ${dtcg} is ${css}, and the supplement gives ${JSON.stringify(v.css)}`);
    }
    for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
  };
  walk(sup, s.id);
  if (!namesChecked) fail('CODE NAMES', s.id, 'no token names found: a gate over nothing passes');

  // [CODE ONLY]
  const comp = ext(sup);
  const behavior = obj(comp.behavior);
  const ourCodeOnly = ((behavior.codeOnlyProps ?? []) as Y[]).map((p) => String(obj(p).name));
  for (const p of s.codeOnlyProps) if (!ourCodeOnly.includes(p)) fail('CODE ONLY', s.id, `the code-only prop "${p}" is missing from behavior.codeOnlyProps`);
  for (const p of ourCodeOnly) if (!s.codeOnlyProps.includes(p)) fail('CODE ONLY', s.id, `behavior.codeOnlyProps lists "${p}", which the register does not: a prop the file holds, or a register to update on review`);
  const fileStates = ((obj(obj(spc.props).state).enum ?? []) as Y[]).map(String);
  const states = ((behavior.states ?? []) as Y[]).map(String);
  const codeOnlyStates = ((behavior.codeOnlyStates ?? []) as Y[]).map(String);
  const wantStates = states.filter((x) => !fileStates.includes(x));
  if (!fileStates.length || !states.length) fail('CODE ONLY', s.id, 'no states to compare: a gate over nothing passes');
  if (JSON.stringify(wantStates) !== JSON.stringify(codeOnlyStates)) fail('CODE ONLY', s.id, `the states Spectacular's state prop lacks are ${JSON.stringify(wantStates)}, and behavior.codeOnlyStates is ${JSON.stringify(codeOnlyStates)}`);
  for (const x of fileStates) if (!states.includes(x)) fail('CODE ONLY', s.id, `Spectacular's state "${x}" is missing from behavior.states`);

  // [REPRESENTED]
  const a11y = obj(comp.accessibility);
  for (const k of ['role', 'keyboard', 'focus', 'aria']) if (typeof a11y[k] !== 'string' || !String(a11y[k]).trim()) fail('REPRESENTED', s.id, `accessibility.${k} is missing`);
  if (!Array.isArray(a11y.wcag) || !a11y.wcag.length) fail('REPRESENTED', s.id, 'accessibility.wcag is missing');
  for (const size of ((obj(obj(spc.props).size).enum ?? []) as Y[]).map(String)) {
    if (!obj(a11y.hitTarget)[size]) fail('REPRESENTED', s.id, `no accessibility.hitTarget for size "${size}", which Spectacular's size prop lists`);
  }
  if (!Object.keys(obj(obj(comp.motion).tokens)).length) fail('REPRESENTED', s.id, 'motion.tokens is missing');
  if (!ext(obj(sup.anatomy).root).rtl) fail('REPRESENTED', s.id, 'the root element has no rtl rule');

  passes.push(`${s.id}: ${Object.keys(obj(sup.anatomy)).length} elements and ${Object.keys(obj(sup.props)).length} props line up with Spectacular's; ${tokensChecked} $token paths mapped; ${namesChecked} code names in the contract`);
}

if (failures.length) {
  for (const f of failures) console.error(f);
  console.error(`\n✗ lint-spec-supplement: ${failures.length} failure(s)`);
  process.exit(1);
}
for (const p of passes) console.log(`  ✓ ${p}`);
console.log(`✓ lint-spec-supplement: clean — ${SUPPLEMENTS.length} supplement(s), each against Spectacular's own output`);
