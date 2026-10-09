/**
 * Plan renderer for the #2428 proposal — THROWAWAY, the method #2388 / #2414 used: each projected plan
 * drawn as HTML, with variables resolved from the prism3 brand's committed Figma export. It approximates:
 * a system font, the focus ring drawn as an outline, nested instances drawn from their own plans.
 * Sample digits and the label / message copy are the renderer's, not the def's (the def projects no
 * per-cell TEXT property yet; see the proposal).
 *
 *   npx tsx docs/proposals/code-input/render.ts <out-dir>
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { figmaAnatomySet, planComponentName } from '../../../packages/engine/anatomy-figma';
import { componentDefs } from '../../../packages/engine/components/index';
import { codeInput } from './code-input.draft';

const OUT = process.argv[2] ?? '/tmp/code-input-renders';
mkdirSync(OUT, { recursive: true });
const FIG = join(dirname(fileURLToPath(import.meta.url)), '../../../packages/engine/out/figma/prism3');
const SAMPLE = '48291375';

type Vars = Map<string, unknown>;
const load = (mode: 'light' | 'dark'): Vars => {
  const m: Vars = new Map();
  for (const f of readdirSync(FIG)) {
    if (!f.endsWith('.json') || f.includes('styles') || f.startsWith('layout.') || f.includes('mobile')) continue;
    if (f.startsWith('color.') && f !== `color.${mode}.json`) continue;
    const j = JSON.parse(readFileSync(join(FIG, f), 'utf8'));
    for (const v of j.variables ?? []) m.set(v.name.replace(/^pds3\//, ''), v.value);
  }
  return m;
};
const styles = new Map<string, any>(JSON.parse(readFileSync(join(FIG, 'text-styles.json'), 'utf8')).styles.map((s: any) => [s.name, s]));

const css = (c: any): string => (c && typeof c === 'object' && 'r' in c)
  ? `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a ?? 1})` : 'transparent';

const plansOf = new Map<string, any[]>();
const nestedPlan = (id: string, variant: Record<string, string>): any => {
  if (!plansOf.has(id)) plansOf.set(id, figmaAnatomySet(componentDefs.find((d) => d.id === id)!));
  const ps = plansOf.get(id)!;
  return ps.find((p) => Object.entries(variant).every(([k, v]) => (k === 'size' ? p.size === v : p.coord?.[k] === v)))
    ?? ps.find((p) => Object.entries(variant).every(([k, v]) => k === 'size' || p.coord?.[k] === v)) ?? ps[0];
};

interface Ctx { vars: Vars; copy: Record<string, string>; ring?: string; show?: Record<string, boolean>; text?: string }
const px = (ctx: Ctx, ref?: string): number | undefined => (ref ? Number(ctx.vars.get(ref)) : undefined);

const node = (n: any, ctx: Ctx, parentRow: boolean): string => {
  const visible = ctx.show && n.name in ctx.show ? ctx.show[n.name] : n.visible !== false;
  if (!visible) return '';
  const b = n.bound ?? {};
  const s: string[] = [];
  if (n.type === 'NESTED_INSTANCE') {
    if (n.nestTarget === 'focus-ring') {
      return `<div style="position:absolute;inset:${-(px(ctx, b.absoluteInset ?? n.absoluteInset) ?? 0)}px;border:${px(ctx, n.absoluteStrokeInset) ?? 2}px solid ${ctx.ring};border-radius:4px;pointer-events:none"></div>`;
    }
    const p = nestedPlan(n.nestTarget, n.nestVariant ?? {});
    const stretch = n.layoutAlign === 'STRETCH' ? 'align-self:stretch;' : '';
    return `<div style="${stretch}display:flex">${node(p.root, { ...ctx, text: ctx.copy[n.nestTarget] }, false)}</div>`;
  }
  if (n.type === 'INSTANCE_SWAP') {
    const w = px(ctx, b.width) ?? 16;
    return `<div style="width:${w}px;height:${w}px;flex:none;display:flex;align-items:center;justify-content:center"><div style="width:${w * 0.8}px;height:${w * 0.8}px;border-radius:50%;background:${css(ctx.vars.get(n.descendantFills))}"></div></div>`;
  }
  if (n.type === 'TEXT') {
    const st = styles.get(n.textStyle) ?? {};
    const pr = st.properties ?? {};
    const size = pr.fontSize?.bound ? Number(ctx.vars.get(pr.fontSize.variable.replace(/^pds3\//, ''))) : pr.fontSize?.value;
    const lh = pr.lineHeight?.value?.unit === 'PERCENT' ? pr.lineHeight.value.value / 100 : 1.4;
    const digit = /^digit(\d)$/.exec(n.name);
    const text = digit ? SAMPLE[Number(digit[1]) - 1] : (ctx.text ?? n.characters ?? '');
    s.push(`font-size:${size || 16}px`, `line-height:${lh}`, `font-weight:${pr.fontWeight?.value ?? 400}`, `color:${css(ctx.vars.get(n.paints?.fills))}`, 'white-space:nowrap');
    if (digit) s.push('font-variant-numeric:tabular-nums');
    return `<span style="${s.join(';')}">${text}</span>`;
  }
  // FRAME
  const row = n.layoutMode === 'HORIZONTAL';
  s.push('display:flex', `flex-direction:${row ? 'row' : 'column'}`, 'position:relative', 'box-sizing:border-box');
  const al = (v: string) => ({ MIN: 'flex-start', MAX: 'flex-end', CENTER: 'center', SPACE_BETWEEN: 'space-between' } as any)[v] ?? 'flex-start';
  s.push(`justify-content:${al(n.primaryAxisAlignItems)}`, `align-items:${al(n.counterAxisAlignItems)}`);
  if (b.itemSpacing) s.push(`gap:${px(ctx, b.itemSpacing)}px`);
  for (const side of ['Top', 'Bottom', 'Left', 'Right']) if (b[`padding${side}`]) s.push(`padding-${side.toLowerCase()}:${px(ctx, b[`padding${side}`])}px`);
  if (b.width) s.push(`width:${px(ctx, b.width)}px`, 'flex:none');
  if (b.height) s.push(`height:${px(ctx, b.height)}px`);
  if (n.placementWidth) s.push(`width:${n.placementWidth}px`);
  if (n.minWidth) s.push(`min-width:${n.minWidth}px`);
  if (b.topLeftRadius) s.push(`border-radius:${px(ctx, b.topLeftRadius)}px`);
  if (n.paints?.fills) s.push(`background:${css(ctx.vars.get(n.paints.fills))}`);
  if (n.paints?.strokes) s.push(`box-shadow:inset 0 0 0 ${px(ctx, b.strokeWeight) ?? 1}px ${css(ctx.vars.get(n.paints.strokes))}`);
  if (n.layoutAlign === 'STRETCH') s.push('align-self:stretch');
  if (n.layoutGrow) s.push('flex:1');
  void parentRow;
  return `<div data-n="${n.name}" style="${s.join(';')}">${(n.children ?? []).map((c: any) => node(c, ctx, row)).join('')}</div>`;
};

const plans = figmaAnatomySet(codeInput);
const COPY_DEFAULT: Record<string, string> = { label: 'Verification code', text: 'Sent by text message.' };
const COPY_ERROR: Record<string, string> = { label: 'Verification code', text: 'Enter every digit of the code.' };

const copyFor = (status: string): Record<string, string> => {
  const base = status === 'error' ? COPY_ERROR : COPY_DEFAULT;
  return { 'field-label': base.label, 'field-message': base.text };
};

const page = (mode: 'light' | 'dark', body: string): string => {
  const v = load(mode);
  return `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:${css(v.get('color/background/primary'))};color:${css(v.get('color/text/secondary'))};font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
h2{font-size:13px;font-weight:600;margin:0 0 12px;color:${css(v.get('color/text/primary'))}}
.cap{font-size:11px;letter-spacing:.02em;margin-bottom:8px}
.grid{display:grid;gap:28px 40px;align-items:start;margin-bottom:36px}
</style><body>${body}</body>`;
};

const cell = (p: any, mode: 'light' | 'dark', show?: Record<string, boolean>, cap?: string): string => {
  const vars = load(mode);
  const ring = css(nestedPlanRing(vars));
  const ctx: Ctx = { vars, copy: copyFor(p.coord.status), ring, show };
  return `<div><div class="cap">${cap ?? `${p.coord.state} · ${p.coord.status}`}</div>${node(p.root, ctx, false)}</div>`;
};
const nestedPlanRing = (vars: Vars): unknown => {
  const r = nestedPlan('focus-ring', { surface: 'default' }).root;
  return vars.get(r.paints?.strokes ?? 'color/border/focus');
};

const STATES = ['rest', 'hover', 'focus-visible', 'focus-visible-filled', 'filled', 'disabled'];
const LABEL: Record<string, string> = { rest: 'rest (empty)', hover: 'hover', 'focus-visible': 'focus-visible (empty, cell 1 active)', 'focus-visible-filled': 'focus-visible-filled (partial, cell 4 active)', filled: 'filled (complete)', disabled: 'disabled' };

for (const mode of ['light', 'dark'] as const) {
  // 1. The state × status matrix at medium, six cells (the default instance).
  let body = `<h2>CodeInput — plan render, not Figma · prism3 brand, ${mode} · size=medium, six cells (default)</h2><div class="grid" style="grid-template-columns:repeat(2,max-content)">`;
  for (const st of STATES) for (const status of ['default', 'error']) {
    const p = plans.find((x: any) => x.size === 'medium' && x.coord.state === st && x.coord.status === status);
    body += cell(p, mode, undefined, `${LABEL[st]} · status=${status}`);
  }
  body += '</div>';
  writeFileSync(join(OUT, `states-${mode}.html`), page(mode, body));

  // 2. Length: the Figma-only cell booleans at 4, 6 and 8, filled, medium.
  const filled = plans.find((x: any) => x.size === 'medium' && x.coord.state === 'filled' && x.coord.status === 'default');
  let lb = `<h2>Length — cells 5–8 behind Figma-only booleans · plan render, ${mode} · size=medium, filled</h2><div class="grid">`;
  for (const n of [4, 6, 8]) lb += cell(filled, mode, Object.fromEntries([5, 6, 7, 8].map((i) => [`cell${i}`, i <= n])), `length ${n}`);
  lb += '</div>';
  // 3. Sizes, partial, six cells.
  lb += `<h2>Sizes · focus-visible-filled (partial)</h2><div class="grid">`;
  for (const size of ['small', 'medium', 'large']) {
    const p = plans.find((x: any) => x.size === size && x.coord.state === 'focus-visible-filled' && x.coord.status === 'default');
    lb += cell(p, mode, undefined, `size=${size}`);
  }
  lb += '</div>';
  writeFileSync(join(OUT, `length-and-size-${mode}.html`), page(mode, lb));
}
console.log(`${plans.length} members; wrote ${OUT}`, plans.slice(0, 2).map(planComponentName));
