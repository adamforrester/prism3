/**
 * THE @prism3/css GENERATOR (#3408 S2, owner decision Q96 A): writes `button.css` from the engine's emission.
 *
 *   npx tsx packages/css/generate.ts           write button.css
 *   npx tsx packages/css/generate.ts --check   exit 1 when the committed button.css is not what this writes
 *
 * WHAT IT READS, and why each source:
 *   - `packages/engine/out/components/specs.json` — the token names per part, size and state. Every color, every
 *     padding, gap, height and icon size, and every label style in `button.css` comes from a row here.
 *   - `packages/engine/out/components/component-defs.json` — the def's code API (`props`, defaults), so a prop's
 *     default value is the one the def states, never one this file picks.
 *   - `packages/engine/out/prism3.tokens.json` — one fact the token CSS loses: a label style's `textDecoration`.
 *     Stock Style Dictionary's `font` shorthand carries family, size, weight and line height, not decoration, so a
 *     text button's underline is read from the token's own value (`type.label.*.emphasis-link`, #3507).
 *   - The TypeScript defs (`@prism3/engine/components/index`), for what the emission does not carry yet: the
 *     container's radius and stroke width, the focus ring's width, style and offset, the pending spinner's
 *     replacement rule (`anatomy.parts.spinner`), and the spinner's motion token names. Each is read from the def's
 *     own field, never restated. Getting these into `specs.json` is an engine change, filed as #3506.
 *
 * WHAT IT DOES NOT DECIDE. The markup contract (the classes, the `data-prop-*` attributes, the state attributes) is
 * documented in this package's README, and the parity check (`check-parity.ts`) holds its own copy of it, written
 * separately, so the two can disagree and fail (`docs/34`). Literals here are layout mechanics (flex, position),
 * never a value a token carries; the documented exceptions are listed in `check-raw-values.ts`.
 *
 * THE PREFIX is `p3-` (Q97 A), the token names are stock Style Dictionary's `--pds3-…` (Q98 A), and every rule
 * sits in one named cascade layer, `p3`, so an author's unlayered CSS overrides it without a specificity fight.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { button, focusRing, spinner } from '@prism3/engine/components/index';
import { demoHtml } from './demo';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../engine/out');
export const CSS_FILE = resolve(HERE, 'button.css');
export const DEMO_FILE = resolve(HERE, 'demo.html');

const COMPONENT = 'button';
const PREFIX = 'p3';
const LAYER = 'p3';
const ROOT_CLASS = `.${PREFIX}-${COMPONENT}`;

// ------------------------------------------------------------------------------------------------ inputs
const specs = JSON.parse(readFileSync(resolve(OUT, 'components/specs.json'), 'utf8')).components;
const defs = JSON.parse(readFileSync(resolve(OUT, 'components/component-defs.json'), 'utf8')).components;
const tree = JSON.parse(readFileSync(resolve(OUT, 'prism3.tokens.json'), 'utf8'));
const TOKEN_ROOT = Object.keys(tree).filter((k) => !k.startsWith('$'))[0];

const spec = specs[COMPONENT];
const def = defs[COMPONENT].def;
if (!spec || !def) throw new Error(`no "${COMPONENT}" in the emission`);

/** A token path's CSS custom property, as stock Style Dictionary names it: the tree's root first, each `.` a `-`. */
const v = (token: string) => `var(--${TOKEN_ROOT}-${token.replace(/\./g, '-')})`;
const leaf = (token: string): any => token.split('.').reduce((n: any, k) => n?.[k], tree[TOKEN_ROOT]);
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

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

type Rule = { sel: string; decls: [string, string][]; note?: string };
const rules: Rule[] = [];
const add = (sel: string, decls: [string, string][], note?: string) => { if (decls.length) rules.push({ sel, decls, note }); };

// ------------------------------------------------------------------------------------------------ the base
const tok = button.tokens as Record<string, string>;
const need = (map: Record<string, string>, key: string, who: string) => {
  if (!map[key]) throw new Error(`${who} has no token "${key}"`);
  return map[key];
};
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
  ['border-width', v(need(tok, 'border-width', 'button'))],
  ['border-radius', v(need(tok, 'radius', 'button'))],
], 'base: the stroke is on every appearance, transparent where it paints nothing, so all three share one box');
for (const part of ['container/leadingVisual', 'container/trailingVisual']) {
  add(partSel(ROOT_CLASS, part), [['display', 'inline-flex'], ['flex', 'none']]);
  add(`${partSel(ROOT_CLASS, part)} > svg`, [['inline-size', '100%'], ['block-size', '100%']]);
}
add(`${ROOT_CLASS}[data-prop-fullwidth="true"]`, [['inline-size', '100%']], 'fullWidth');

// ------------------------------------------------------------------------------------------------ sizes (redlines)
const enumAxes = new Set(spec.axes.filter((a: any) => a.kind !== 'slot' && a.kind !== 'state').map((a: any) => a.name));
const slotPart: Record<string, string> = Object.fromEntries(
  (button.figmaProperties?.slotAxes ?? []).map((s: any) => [s.name, `container/${s.part}`]));
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
if (!ringNest || ringNest.component !== focusRing.id) throw new Error('the button no longer nests focus-ring at container/focusRing');
const ringTok = focusRing.tokens as Record<string, string>;
const ringColor = (surface: string) => {
  const r = specs[focusRing.id].colors.find((c: any) => c.where.surface === surface);
  const stroke = r?.parts.find((p: any) => p.part === 'ring')?.stroke;
  if (!stroke) throw new Error(`focus-ring has no ring stroke at surface=${surface}`);
  return stroke;
};
add(`${ROOT_CLASS}:focus-visible`, [
  ['outline-width', v(need(tok, 'ring-width', 'button'))],
  ['outline-style', v(need(ringTok, 'style', 'focus-ring'))],
  ['outline-offset', v(need(tok, 'ring-offset', 'button'))],
], 'the focus ring: an outline, so it takes no cell, survives forced colors and keeps through pending and inactive');
for (const surface of spec.axes.find((a: any) => a.name === 'surface').values) {
  if (!ringNest.follows.includes('surface')) throw new Error('the focus ring no longer follows surface');
  add(`${ROOT_CLASS}${propSel('surface', surface)}:focus-visible`, [['outline-color', v(ringColor(surface))]]);
}

// ------------------------------------------------------------------------------------------------ the hit target
// codeOnly `hit-target`: a flush text button keeps its height but its box is label-width, so an invisible ::before,
// centered, extends the target to 44×44 at medium and large and 24×24 at small. No token names a 24px target, so
// small reads space.300 (24px) — an owner decision recorded in the journal.
const HIT: Record<string, string> = { small: 'space.300', medium: 'size.md.min-height', large: 'size.md.min-height' };
for (const size of spec.axes.find((a: any) => a.name === 'size').values) {
  const t = v(HIT[size]);
  add(`${ROOT_CLASS}${propSel('inset', 'flush')}${propSel('size', size)}::before`, [
    ['content', '""'],
    ['position', 'absolute'],
    ['inset-block', `min(0%, calc((100% - ${t}) / 2))`],
    ['inset-inline', `min(0%, calc((100% - ${t}) / 2))`],
  ], size === 'small' ? 'hit target (codeOnly hit-target): 24×24 at small' : undefined);
}

// ------------------------------------------------------------------------------------------------ pending: the spinner
const sp = (button.anatomy.parts as any).spinner;
if (sp?.when !== 'pending' || sp.nests !== spinner.id) throw new Error('the button\'s spinner part moved');
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

// The spinner's own motion (its def's `motion` field names the tokens; this asserts each name is still there).
const motionText = `${spinner.motion?.enter ?? ''} ${spinner.motion?.reduceMotion ?? ''}`;
const motion = (token: string) => { if (!motionText.includes(`\`${token}\``)) throw new Error(`spinner.motion no longer names ${token}`); return v(token); };
add(`${ROOT_CLASS} > ${spin} > svg`, [
  ['inline-size', '100%'],
  ['block-size', '100%'],
  ['animation', `${PREFIX}-spin ${motion('motion.duration.spin')} linear infinite`],
], 'spinner: turns continuously, linear, never stopped');
add(`${busy} > ${spin}`, [['animation', `${PREFIX}-fade-in ${motion('motion.duration.fast')} ${motion('motion.easing-role.enter')} both`]], 'spinner: fades in on show');
const reduced: Rule[] = [
  { sel: `${ROOT_CLASS} > ${spin} > svg`, decls: [['animation-duration', motion('motion.duration-reduced.spin')]] },
  { sel: `${busy} > ${spin}`, decls: [['animation-duration', motion('motion.duration-reduced.fast')]] },
];

// ------------------------------------------------------------------------------------------------ write
const fmt = (r: Rule, indent: string) =>
  `${r.note ? `${indent}/* ${r.note} */\n` : ''}${indent}${r.sel} {\n${r.decls.map(([p, x]) => `${indent}  ${p}: ${x};`).join('\n')}\n${indent}}`;

export const generate = (): string => [
  `/* @prism3/css — ${def.name} (${COMPONENT}). GENERATED by packages/css/generate.ts from the engine's emission`,
  ` * (out/components/specs.json, component-defs.json) — do not edit; change the def and regenerate.`,
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputs: [string, string][] = [[CSS_FILE, generate()], [DEMO_FILE, demoHtml(spec.axes.find((a: any) => a.name === 'size').values)]];
  if (process.argv.includes('--check')) {
    const stale = outputs.filter(([f, text]) => { try { return readFileSync(f, 'utf8') !== text; } catch { return true; } });
    for (const [f] of stale) console.error(`FAIL @prism3/css: ${f.slice(HERE.length + 1)} is not what generate.ts writes from the emission. Run: npx tsx packages/css/generate.ts`);
    if (stale.length) process.exit(1);
    console.log(`OK @prism3/css: button.css (${rules.length + reduced.length} rules) and demo.html match the generator`);
  } else {
    for (const [f, text] of outputs) writeFileSync(f, text);
    console.log(`wrote button.css (${rules.length + reduced.length} rules) and demo.html`);
  }
}
