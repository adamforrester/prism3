/**
 * THE @prism3/css GENERATOR (#3408 S2, owner decision Q96 A): writes `button.css` from the engine's emission.
 *
 *   npx tsx packages/css/generate.ts           write button.css
 *   npx tsx packages/css/generate.ts --check   exit 1 when the committed button.css is not what this writes
 *
 * WHAT IT READS, and why each source:
 *   - `specs.json` — the token names per part, size and state. Every color, every
 *     padding, gap, height and icon size, and every label style in `button.css` comes from a row here.
 *   - `component-defs.json` — the def's code API (`props`, defaults), so a prop's
 *     default value is the one the def states, never one this file picks.
 *     Both are uncommitted exports (#3698 R3), generated fresh into a temp dir by `emission.ts`, never read from `out/`.
 *   - `packages/engine/out/prism3.tokens.json` — two facts the token CSS loses: a label style's `textDecoration` and
 *     its `letterSpacing` alias. Stock Style Dictionary's `font` shorthand carries family, size, weight and line
 *     height, not decoration or tracking, so a text button's underline is read from the token's own value
 *     (`type.label.*.emphasis-link`, #3507) and each label's tracking token from its style (Q143 A).
 *   - Since Q142 A (#3506, #3839) `specs.json` also carries the container's radius and stroke width (redlines), the
 *     focus ring's width, style and offset (`focusRing`) and the spinner's motion tokens (`motion`), so they are read
 *     there, never from the engine's TypeScript defs.
 *   - `residual.ts`, the two facts the emission does not carry yet: each size's hit-target floor and the pending
 *     spinner's replacement rule. It is the one file here that imports the engine's defs (journal, "Refresh 3").
 *
 * WHAT IT DOES NOT DECIDE. The markup contract (the classes, the `data-prop-*` attributes, the state attributes) is
 * documented in this package's README, and the parity check (`check-parity.ts`) holds its own copy of it, written
 * separately, so the two can disagree and fail (`docs/34`). Literals here are layout mechanics (flex, position),
 * never a value a token carries; the documented exceptions are listed in `check-raw-values.ts`.
 *
 * THE PREFIX is `p3-` (Q97 A), the token names are stock Style Dictionary's `--pds3-…` (Q98 A), and every rule
 * sits in one named cascade layer, `p3`, so an author's unlayered CSS overrides it without a specificity fight.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoHtml } from './demo';
import { motionBinding, readUncommitted, uniformRedline } from './emission';
import { hitTargetFloor, pendingReplacement } from './residual';
import { tree, TOKEN_ROOT, v, leaf, kebab, tracking, fmt, type Rule } from './tokens';
import { fieldLabelCss, fieldMessageCss, passwordFieldCss, textFieldCss } from './fields';

const HERE = dirname(fileURLToPath(import.meta.url));
export const CSS_FILE = resolve(HERE, 'button.css');
export const DEMO_FILE = resolve(HERE, 'demo.html');

const COMPONENT = 'button';
const PREFIX = 'p3';
const LAYER = 'p3';
const ROOT_CLASS = `.${PREFIX}-${COMPONENT}`;

// ------------------------------------------------------------------------------------------------ inputs
const specs = readUncommitted('specs.json').components;
const defs = readUncommitted('component-defs.json').components;

const spec = specs[COMPONENT];
const def = defs[COMPONENT].def;
if (!spec || !def) throw new Error(`no "${COMPONENT}" in the emission`);


// ------------------------------------------------------------------------------------------------ selectors
/** A prop's default, from the def. Absent and default select the same rule. */
const propDefault = (name: string): string => {
  const p = def.props.find((x: any) => x.name === name);
  if (!p) throw new Error(`${COMPONENT} has no prop "${name}"`);
  return String(p.default);
};
/** `data-prop-<prop>` (lowercase: HTML lowercases attribute names). The default also matches an absent attribute. */
const propSel = (prop: string, value: string): string => {
  const a = `data-prop-${prop.toLowerCase()}`;
  return value === propDefault(prop) ? `:is(:not([${a}]), [${a}="${value}"])` : `[${a}="${value}"]`;
};
const partClass = (part: string): string => {
  const seg = part.split('/').pop()!;
  return `${ROOT_CLASS}__${kebab(seg)}`;
};
const partSel = (base: string, part: string): string => (part === 'container' ? base : `${base} > ${partClass(part)}`);
const has = (part: string) => `:has(> ${partClass(part)})`;
const hasNot = (part: string) => `:not(${has(part)})`;

/** The state axis's values, as native and ARIA state. `focus-visible` paints its rest colors (asserted below). */
const NOT_INERT = ':not(:disabled, [aria-disabled="true"])';
const STATE_SEL: Record<string, string | null> = {
  rest: '',
  hover: `:hover${NOT_INERT}`,
  pressed: `:active${NOT_INERT}`,
  pending: '[aria-busy="true"]',
  'focus-visible': null,
  // native `disabled`, and `isInactive` (aria-disabled without aria-busy): the def's `inactive` takes the disabled
  // paint at the token tier (its codeOnly `not-projected` entry, docs/03 item 3).
  disabled: ':is(:disabled, [aria-disabled="true"]:not([aria-busy="true"]))',
};

// ------------------------------------------------------------------------------------------------ declarations
const PAINT_PROP: Record<string, string> = { fill: 'background-color', stroke: 'border-color', ink: 'color', icon: 'color' };
const SIZE_PROP: Record<string, string> = {
  paddingTop: 'padding-block-start',
  paddingBottom: 'padding-block-end',
  paddingLeft: 'padding-inline-start',
  paddingRight: 'padding-inline-end',
  gap: 'column-gap',
  width: 'inline-size',
  minWidth: 'min-inline-size',
};
/** The container's height is a floor, so a wrapped label grows the button (codeOnly `localization`). */
const heightProp = (part: string) => (part === 'container' ? 'min-block-size' : 'block-size');

const value = (val: any, where: string): string => {
  if (val.token) return v(val.token);
  if (typeof val.px === 'number' && val.source === 'derived') return `${val.px}px`;
  throw new Error(`${where}: a value with neither a token nor a derived px: ${JSON.stringify(val)}`);
};

const rules: Rule[] = [];
const add = (sel: string, decls: [string, string][], note?: string) => { if (decls.length) rules.push({ sel, decls, note }); };

// ------------------------------------------------------------------------------------------------ the base
// The corner and stroke are redlines (#3839), the same on every row, so the base rule carries them once.
const EDGE_KEYS = new Set(['radius', 'strokeWidth']);
const radius = uniformRedline(spec, 'container', 'radius');
const strokeWidth = uniformRedline(spec, 'container', 'strokeWidth');
add(ROOT_CLASS, [
  ['box-sizing', 'border-box'],
  ['position', 'relative'],
  ['display', 'inline-flex'],
  ['align-items', 'center'],
  ['justify-content', 'center'],
  ['vertical-align', 'middle'],
  ['margin', '0'],
  ['appearance', 'none'],
  ['text-align', 'center'],
  ['text-decoration', 'none'],
  ['background-color', 'transparent'],
  ['border-style', 'solid'],
  ['border-color', 'transparent'],
  ['border-width', v(strokeWidth)],
  ['border-radius', v(radius)],
], 'base: the stroke is on every appearance, transparent where it paints nothing, so all three share one box');
for (const part of ['container/leadingVisual', 'container/trailingVisual']) {
  add(partSel(ROOT_CLASS, part), [['display', 'inline-flex'], ['flex', 'none']]);
  add(`${partSel(ROOT_CLASS, part)} > svg`, [['inline-size', '100%'], ['block-size', '100%']]);
}
add(`${ROOT_CLASS}[data-prop-fullwidth="true"]`, [['inline-size', '100%']], 'fullWidth');

// ------------------------------------------------------------------------------------------------ sizes (redlines)
const enumAxes = new Set(spec.axes.filter((a: any) => a.kind !== 'slot' && a.kind !== 'state').map((a: any) => a.name));
/** A slot axis's part: the one swap part a redline row has exactly when the axis is `true`. */
const slotPart: Record<string, string> = Object.fromEntries(spec.axes.filter((a: any) => a.kind === 'slot').map((a: any) => {
  const swaps = spec.anatomy.filter((x: any) => x.kind === 'swap').map((x: any) => x.part);
  const parts = swaps.filter((part: string) => spec.redlines.every((r: any) => r.parts.some((p: any) => p.part === part) === (r.where[a.name] === 'true')));
  if (parts.length !== 1) throw new Error(`slot axis "${a.name}" matches ${parts.length} swap parts by the redlines`);
  return [a.name, parts[0]];
}));
const coordSel = (where: Record<string, string>, state?: string): string => {
  let s = ROOT_CLASS;
  for (const [axis, val] of Object.entries(where)) {
    if (axis === 'state') continue;
    if (enumAxes.has(axis)) s += propSel(axis, val);
    else if (slotPart[axis]) s += val === 'true' ? has(slotPart[axis]) : hasNot(slotPart[axis]);
    else throw new Error(`unknown axis "${axis}" in ${JSON.stringify(where)}`);
  }
  if (state !== undefined) {
    const st = STATE_SEL[state];
    if (st === undefined) throw new Error(`no state selector for "${state}"`);
    s += st;
  }
  return s;
};
for (const row of spec.redlines) {
  const sel = coordSel(row.where);
  for (const p of row.parts) {
    const decls: [string, string][] = [];
    for (const [k, val] of Object.entries<any>(p.values)) {
      if (p.part === 'container' && EDGE_KEYS.has(k)) continue; // on the base rule, asserted uniform above
      const prop = k === 'height' ? heightProp(p.part) : SIZE_PROP[k];
      if (!prop) throw new Error(`no CSS property for redline "${k}" on ${p.part}`);
      decls.push([prop, value(val, `${p.part}.${k}`)]);
    }
    add(partSel(sel, p.part), decls);
  }
}

// ------------------------------------------------------------------------------------------------ label styles
for (const row of spec.type) {
  const sel = coordSel(row.where);
  for (const p of row.parts) {
    const l = leaf(p.textStyle);
    if (!l || l.$type !== 'typography') throw new Error(`${p.textStyle} is not a typography token`);
    add(partSel(sel, p.part), [
      ['font', v(p.textStyle)],
      ['text-decoration-line', l.$value?.textDecoration ?? 'none'],
      ['letter-spacing', tracking(p.textStyle, l)],
    ]);
  }
}

// ------------------------------------------------------------------------------------------------ colors per state
const restOf = (row: any) => spec.colors.find((r: any) => Object.entries(row.where).every(([k, x]) => (k === 'state' ? r.where.state === 'rest' : r.where[k] === x)));
const paintsOf = (row: any) => JSON.stringify(row.parts);
for (const row of spec.colors) {
  const state = row.where.state;
  if (STATE_SEL[state] === null) {
    if (paintsOf(row) !== paintsOf(restOf(row))) throw new Error(`${JSON.stringify(row.where)} paints differ from rest, and its state has no selector`);
    continue;
  }
  const sel = coordSel(row.where, state);
  for (const p of row.parts) {
    const decls: [string, string][] = [];
    for (const [k, token] of Object.entries<any>(p)) {
      if (k === 'part') continue;
      if (!PAINT_PROP[k]) throw new Error(`no CSS property for paint "${k}" on ${p.part}`);
      decls.push([PAINT_PROP[k], v(token)]);
    }
    add(partSel(sel, p.part), decls);
  }
}

// ------------------------------------------------------------------------------------------------ the focus ring
const ringNest = spec.nesting.find((n: any) => n.part === 'container/focusRing');
if (!ringNest || ringNest.component !== 'focus-ring' || !specs[ringNest.component]) throw new Error('the button no longer nests focus-ring at container/focusRing');
const ring = (spec.focusRing ?? []).find((r: any) => r.part === ringNest.part);
if (!ring) throw new Error(`the emission has no focusRing row for ${ringNest.part}`);
const ringColor = (surface: string) => {
  const r = specs[ringNest.component].colors.find((c: any) => c.where.surface === surface);
  const stroke = r?.parts.find((p: any) => p.part === 'ring')?.stroke;
  if (!stroke) throw new Error(`focus-ring has no ring stroke at surface=${surface}`);
  return stroke;
};
add(`${ROOT_CLASS}:focus-visible`, [
  ['outline-width', v(ring.width)],
  ['outline-style', v(ring.style)],
  ['outline-offset', v(ring.offset)],
], 'the focus ring: an outline, so it takes no cell, survives forced colors and keeps through pending and inactive');
for (const surface of spec.axes.find((a: any) => a.name === 'surface').values) {
  if (!ringNest.follows.includes('surface')) throw new Error('the focus ring no longer follows surface');
  add(`${ROOT_CLASS}${propSel('surface', surface)}:focus-visible`, [['outline-color', v(ringColor(surface))]]);
}

// ------------------------------------------------------------------------------------------------ the hit target
// codeOnly `hit-target`: a flush text button keeps its height but its box is label-width, so an invisible ::before,
// centered, extends the target to each size's floor. The floor is the def's own `size.<size>.hit-target` binding
// (Q-HT1 A: `space.300` at small, `space.550` at medium and large), read through `residual.ts`, never restated: the
// emission does not carry it yet. `check-browser.ts` holds the rendered box to its own literal px per size.
const hitTok = hitTargetFloor;
for (const size of spec.axes.find((a: any) => a.name === 'size').values) {
  const t = v(hitTok(size));
  add(`${ROOT_CLASS}${propSel('inset', 'flush')}${propSel('size', size)}::before`, [
    ['content', '""'],
    ['position', 'absolute'],
    ['inset-block', `min(0%, calc((100% - ${t}) / 2))`],
    ['inset-inline', `min(0%, calc((100% - ${t}) / 2))`],
  ], size === 'small' ? `hit target (codeOnly hit-target): the def's size.small.hit-target, ${hitTok('small')}` : undefined);
}

// ------------------------------------------------------------------------------------------------ pending: the spinner
// The emission's anatomy and nesting say where and when; `residual.ts` says what it replaces.
const spAnat = spec.anatomy.find((a: any) => a.part === 'container/spinner');
const spNest = spec.nesting.find((n: any) => n.part === 'container/spinner');
const spinnerId = [...new Set<string>((spNest?.components ?? []).map((c: string) => c.split('/')[0]))];
if (spAnat?.when?.state?.join() !== 'pending' || spinnerId.length !== 1 || !specs[spinnerId[0]]) throw new Error('the button\'s spinner part moved');
const spinnerSpec = specs[spinnerId[0]];
const sp = pendingReplacement();
const busy = `${ROOT_CLASS}${STATE_SEL.pending}`;
const spin = partClass('container/spinner');
add(`${ROOT_CLASS} > ${spin}`, [['display', 'none'], ['flex', 'none']]);
add(`${busy} > ${spin}`, [['display', 'inline-flex']]);
// `replaces`, in order: the spinner takes the first visual cell there is, so the width does not move.
const replaces: string[] = sp.replaces.map((p: string) => `container/${p}`);
replaces.forEach((part, i) => {
  const earlier = replaces.slice(0, i).map(hasNot).join('');
  add(`${busy}${earlier}${has(part)} > ${partClass(part)}`, [['display', 'none']]);
  if (i > 0) add(`${busy}${earlier}${has(part)} > ${spin}`, [['order', '1']]);
});
// `overlaysWhenAbsent`: with no visual cell, the spinner centers over the label, which holds the width at zero opacity.
const none = replaces.map(hasNot).join('');
add(`${busy}${none} > ${spin}`, [['position', 'absolute'], ['inset', '0'], ['margin', 'auto']]);
add(`${busy}${none} > ${partClass(`container/${sp.overlaysWhenAbsent}`)}`, [['opacity', '0']]);

// The spinner's own motion: its def's motion bindings, from the emission (#3839).
const motion = (key: string) => v(motionBinding(spinnerSpec, key));
add(`${ROOT_CLASS} > ${spin} > svg`, [
  ['inline-size', '100%'],
  ['block-size', '100%'],
  ['animation', `${PREFIX}-spin ${motion('motion.turn')} linear infinite`],
], 'spinner: turns continuously, linear, never stopped');
add(`${busy} > ${spin}`, [['animation', `${PREFIX}-fade-in ${motion('motion.enter')} ${motion('motion.enter-easing')} both`]], 'spinner: fades in on show');
const reduced: Rule[] = [
  { sel: `${ROOT_CLASS} > ${spin} > svg`, decls: [['animation-duration', motion('motion.turn-reduced')]] },
  { sel: `${busy} > ${spin}`, decls: [['animation-duration', motion('motion.enter-reduced')]] },
];

// ------------------------------------------------------------------------------------------------ write
export const generate = (): string => [
  `/* @prism3/css — ${def.name} (${COMPONENT}). GENERATED by packages/css/generate.ts from the engine's emission`,
  ` * (specs.json, component-defs.json, generated by emit-component-docs.ts --uncommitted) — do not edit; change the def and regenerate.`,
  ` * Needs the token CSS from @prism3/tokens. Markup contract: packages/css/README.md. */`,
  `@layer ${LAYER} {`,
  rules.map((r) => fmt(r, '  ')).join('\n'),
  `  @media (prefers-reduced-motion: reduce) {`,
  reduced.map((r) => fmt(r, '    ')).join('\n'),
  `  }`,
  `  @keyframes ${PREFIX}-spin {\n    to { transform: rotate(1turn); }\n  }`,
  `  @keyframes ${PREFIX}-fade-in {\n    from { opacity: 0; }\n  }`,
  `}`,
  '',
].join('\n');

/** The demo's field grid: the text field's sizes and statuses, as `specs.json` orders them (the password field's are asserted equal). */
const fieldAxes = () => {
  const axis = (id: string, name: string) => specs[id].axes.find((a: any) => a.name === name).values as string[];
  for (const name of ['size', 'status']) if (axis('text-field', name).join() !== axis('password-field', name).join()) throw new Error(`the two fields' ${name} axes differ`);
  return { sizes: axis('text-field', 'size'), statuses: axis('text-field', 'status') };
};

/** Every file this package generates (S3 adds the fields), in the order a page links them. */
export const outputs = (): [string, string, number][] => {
  const f = (name: string, r: { css: string; rules: number }): [string, string, number] => [resolve(HERE, name), r.css, r.rules];
  return [
    [CSS_FILE, generate(), rules.length + reduced.length],
    f('field-label.css', fieldLabelCss()),
    f('field-message.css', fieldMessageCss()),
    f('text-field.css', textFieldCss()),
    f('password-field.css', passwordFieldCss()),
    [DEMO_FILE, demoHtml(spec.axes.find((a: any) => a.name === 'size').values, fieldAxes()), 0],
  ];
};

/**
 * Q142 A: this package reads emitted files, not the engine's code. Every script here is scanned for a module specifier
 * (`import … from`, `export … from`, a bare `import '…'`, `import(…)` and `require(…)`) that reaches the engine: the
 * `@prism3/engine` package by name, or any relative or absolute path that RESOLVES under `packages/engine/` outside
 * `out/`, however it is spelled (`../engine/x`, `../../packages/engine/x`, `./../engine/x`). Reading `../engine/out/`
 * files and running the emitter as a process are not imports. Only `residual.ts` may import it, and only the two facts
 * it names.
 */
const RESIDUAL = 'residual.ts';
const RESIDUAL_EXPORTS = ['hitTargetFloor', 'pendingReplacement'];
export const engineImports = (): string[] => {
  const bad: string[] = [];
  const SPECIFIER = /\b(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;
  const ENGINE = resolve(HERE, '../engine'), OUT = resolve(ENGINE, 'out');
  const under = (p: string, dir: string) => p === dir || p.startsWith(`${dir}${sep}`);
  const reachesEngine = (spec: string): boolean => {
    if (spec === '@prism3/engine' || spec.startsWith('@prism3/engine/')) return true;
    if (!spec.startsWith('.') && !isAbsolute(spec)) return false;
    const at = resolve(HERE, spec);
    return under(at, ENGINE) && !under(at, OUT);
  };
  for (const f of readdirSync(HERE).filter((x) => /\.(ts|js|mjs|cjs)$/.test(x)).sort()) {
    const text = readFileSync(resolve(HERE, f), 'utf8');
    for (const m of text.matchAll(SPECIFIER)) if (f !== RESIDUAL && reachesEngine(m[1])) bad.push(`${f} imports ${m[1]}; only ${RESIDUAL} may (Q142 A)`);
    if (f === RESIDUAL) {
      const exported = [...text.matchAll(/^export const (\w+)/gm)].map((m) => m[1]);
      if (exported.join() !== RESIDUAL_EXPORTS.join()) bad.push(`${RESIDUAL} exports ${exported.join(', ') || 'nothing'}; the residual is ${RESIDUAL_EXPORTS.join(', ')} only (Q142 A)`);
    }
  }
  return bad;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = outputs();
  const summary = out.filter(([, , n]) => n).map(([f, , n]) => `${f.slice(HERE.length + 1)} (${n} rules)`).join(', ');
  if (process.argv.includes('--check')) {
    const stale = out.filter(([f, text]) => { try { return readFileSync(f, 'utf8') !== text; } catch { return true; } });
    for (const [f] of stale) console.error(`FAIL @prism3/css: ${f.slice(HERE.length + 1)} is not what generate.ts writes from the emission. Run: npx tsx packages/css/generate.ts`);
    const imports = engineImports();
    for (const x of imports) console.error(`FAIL @prism3/css sources: ${x}`);
    if (stale.length || imports.length) process.exit(1);
    console.log(`OK @prism3/css: ${summary} and demo.html match the generator`);
  } else {
    for (const [f, text] of out) writeFileSync(f, text);
    console.log(`wrote ${summary} and demo.html`);
  }
}
