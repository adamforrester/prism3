// Throwaway plan renderer for the #2418 proposal: draws each projected AnatomyPlan as HTML, with variables
// resolved from a brand's committed Figma export (packages/engine/out/figma/<brand>/). Approximate by design.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { figmaAnatomySet } from '/home/user/prism3/packages/engine/anatomy-figma';
import { componentDefs } from '/home/user/prism3/packages/engine/components/index';
import { segmentedControl, segmentedControlSegment } from '/home/user/prism3/packages/engine/components/segmented-control';

const ROOT = '/home/user/prism3/packages/engine/out/figma';
const defs = [...componentDefs, segmentedControl, segmentedControlSegment];
const plansOf = new Map<string, any[]>();
const plans = (id: string) => { if (!plansOf.has(id)) plansOf.set(id, figmaAnatomySet(defs.find(d => d.id === id)!)); return plansOf.get(id)!; };

type Vars = { v: Map<string, any>; styles: Map<string, any> };
const load = (brand: string, mode: string): Vars => {
  const v = new Map<string, any>(); const styles = new Map<string, any>();
  for (const f of readdirSync(`${ROOT}/${brand}`)) {
    const j = JSON.parse(readFileSync(`${ROOT}/${brand}/${f}`, 'utf8'));
    if (f.startsWith('color.') && f !== `color.${mode}.json`) continue;
    if (f.startsWith('layout.') && f !== 'layout.md.json') continue;
    if (f.startsWith('type-sets.') && f !== 'type-sets.desktop.json') continue;
    for (const x of j.variables ?? []) v.set(x.name.split('/').slice(1).join('/'), x.value);
    if (f === 'text-styles.json') for (const s of j.styles) styles.set(s.name, s.properties);
  }
  return { v, styles };
};
const rgba = (c: any) => c && typeof c === 'object' ? `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a ?? 1})` : 'transparent';
const JUST: any = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between', BASELINE: 'baseline' };

const pick = (id: string, coord: Record<string, string>) => {
  const ps = plans(id);
  const hit = ps.find(p => Object.entries(coord).every(([k, val]) => k === 'size' ? (p.size ?? val) === val : (p.coord as any)[k] === undefined || (p.coord as any)[k] === val));
  if (!hit) throw new Error(`${id}: no member at ${JSON.stringify(coord)}`);
  return hit;
};

const node = (n: any, V: Vars, texts: string[], parentDir?: string): string => {
  if (n.visible === false) return '';
  const b = (k: string) => n.bound?.[k] !== undefined ? V.v.get(n.bound[k]) : undefined;
  const st: string[] = [];
  if (n.layoutAlign === 'STRETCH') st.push('align-self:stretch');
  if (n.type === 'TEXT') {
    const s = V.styles.get(n.textStyle) ?? {};
    const size = s.fontSize?.bound ? V.v.get(s.fontSize.variable.split('/').slice(1).join('/')) : s.fontSize?.value;
    const lh = s.lineHeight?.value?.unit === 'PERCENT' ? s.lineHeight.value.value / 100 : 1.2;
    st.push(`font-size:${size}px`, `font-weight:${s.fontWeight?.value ?? 400}`, `line-height:${lh}`, `color:${rgba(V.v.get(n.paints?.fills))}`, 'white-space:nowrap');
    const t = texts.length ? texts.shift() : n.characters;
    return `<span style="${st.join(';')}">${t}</span>`;
  }
  if (n.type === 'INSTANCE_SWAP') {
    const w = b('width') ?? 24;
    return `<span style="display:inline-block;width:${w}px;height:${w}px;border-radius:50%;border:2px solid ${rgba(V.v.get(n.descendantFills))};box-sizing:border-box"></span>`;
  }
  if (n.type === 'NESTED_INSTANCE') {
    if (n.nestTarget === 'focus-ring') return '';
    const m = pick(n.nestTarget, n.nestVariant);
    return `<div style="${st.join(';')};display:flex">${node(m.root, V, texts)}</div>`;
  }
  // FRAME
  const dir = n.layoutMode === 'VERTICAL' ? 'column' : 'row';
  st.push('display:flex', `flex-direction:${dir}`, `justify-content:${JUST[n.primaryAxisAlignItems] ?? 'flex-start'}`, `align-items:${JUST[n.counterAxisAlignItems] ?? 'flex-start'}`, 'box-sizing:border-box', 'position:relative');
  for (const [k, css] of [['paddingTop', 'padding-top'], ['paddingBottom', 'padding-bottom'], ['paddingLeft', 'padding-left'], ['paddingRight', 'padding-right'], ['itemSpacing', 'gap'], ['height', 'height'], ['width', 'width'], ['minHeight', 'min-height']] as const) {
    const x = b(k); if (x !== undefined) st.push(`${css}:${x}px`);
  }
  if (n.placementWidth) st.push(`width:${n.placementWidth}px`);
  const r = b('topLeftRadius'); if (r !== undefined) st.push(`border-radius:${r}px`);
  const fill = n.paints?.fills ? V.v.get(n.paints.fills) : undefined;
  if (fill) st.push(`background:${rgba(fill)}`);
  const sw = b('strokeWeight') ?? 0;
  const stroke = n.paints?.strokes ? V.v.get(n.paints.strokes) : undefined;
  if (stroke && sw) st.push(`box-shadow:inset 0 0 0 ${sw}px ${rgba(stroke)}`);
  const ring = (n.children ?? []).find((c: any) => c.nestTarget === 'focus-ring' && c.visible !== false);
  if (ring) st.push(`outline:${V.v.get('focus/ring/width')}px solid ${rgba(V.v.get('color/border/focus'))}`, `outline-offset:${V.v.get('focus/ring/offset')}px`);
  return `<div style="${st.join(';')}">${(n.children ?? []).map((c: any) => node(c, V, texts, dir)).join('')}</div>`;
};

// A group member with per-segment overrides (the designer's instance overrides) and texts.
const group = (V: Vars, size: string, count: number, selected: number, texts: string[], opts: { showLabel?: boolean; focus?: number; hover?: number; disabled?: boolean } = {}) => {
  const m = structuredClone(pick('segmented-control', { size }));
  const track = m.root.children.find((c: any) => c.name === 'track');
  const label = m.root.children.find((c: any) => c.name === 'label');
  if (opts.showLabel === false) label.visible = false;
  track.children.forEach((s: any, i: number) => {
    s.visible = i < count;
    s.nestVariant = { ...s.nestVariant, size, selection: i === selected ? 'selected' : 'unselected', state: opts.disabled ? 'disabled' : i === opts.focus ? 'focus-visible' : i === opts.hover ? 'hover' : 'rest' };
  });
  if (opts.disabled) track.paints = { strokes: 'color/disabled/icon' };
  return node(m.root, V, [...texts]);
};

const MODES = ['light', 'dark', 'hc-light', 'hc-dark'];
const page = (brand: string) => {
  const out: string[] = [];
  for (const mode of MODES) {
    const V = load(brand, mode);
    const bg = rgba(V.v.get('color/background/primary')); const ink = rgba(V.v.get('color/text/primary') ?? V.v.get('color/interactive/neutral/text/rest'));
    const cell = (h: string, cap: string) => `<div style="display:flex;flex-direction:column;gap:6px"><div style="font:11px ui-monospace,monospace;opacity:.7">${cap}</div>${h}</div>`;
    const segs: string[] = [];
    for (const selection of ['unselected', 'selected'])
      for (const state of ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'])
        segs.push(cell(`<div style="display:flex">${node(pick('segmented-control-segment', { size: 'medium', selection, state }).root, V, [])}</div>`, `${selection} · ${state}`));
    const sizes = ['small', 'medium', 'large'].map(s => cell(group(V, s, 3, 0, ['View', 'List', 'Grid', 'Map']), `size=${s} · 3 segments`));
    const counts = [
      cell(group(V, 'medium', 2, 0, ['Delivery', 'Shipping', 'Store pickup']), '2 segments (Option 3 off)'),
      cell(group(V, 'medium', 4, 1, ['Time range', 'Day', 'Week', 'Month', 'Year']), '4 segments, 2nd selected'),
      cell(group(V, 'medium', 5, 2, ['Rating', '1', '2', '3', '4', '5'], { hover: 4 }), '5 segments, 3rd selected, 5th hovered'),
      cell(group(V, 'medium', 3, 0, ['View', 'List', 'Grid', 'Map'], { focus: 0 }), 'keyboard focus on the selected segment'),
      cell(group(V, 'medium', 3, 0, ['View', 'List', 'Grid', 'Map'], { showLabel: false }), 'Label off (accessible name only)'),
      cell(group(V, 'medium', 3, 0, ['View', 'List', 'Grid', 'Map'], { disabled: true }), 'disabled (every segment; track edge drawn by hand)'),
    ];
    out.push(`<section style="background:${bg};color:${ink};padding:24px;display:flex;flex-direction:column;gap:20px">
      <h2 style="margin:0;font:600 15px system-ui">${brand} · ${mode}</h2>
      <div style="font:600 12px system-ui;opacity:.8">SegmentedControl.Segment, medium (2 selection × 5 states shown; × 3 sizes = 30 members)</div>
      <div style="display:grid;grid-template-columns:repeat(5,max-content);gap:16px 20px">${segs.join('')}</div>
      <div style="font:600 12px system-ui;opacity:.8">SegmentedControl (size axis = 3 members; segment count and selection are instance properties)</div>
      <div style="display:flex;gap:28px;flex-wrap:wrap;align-items:flex-end">${sizes.join('')}</div>
      <div style="display:flex;gap:28px;flex-wrap:wrap">${counts.join('')}</div>
    </section>`);
  }
  return `<!doctype html><meta charset="utf-8"><body style="margin:0;font-family:Inter,system-ui,sans-serif">
  <div style="padding:12px 24px;font:12px system-ui;background:#fff;color:#333">Plan render, not Figma: each projected plan of the DRAFT segmented-control defs drawn as HTML, variables from the committed <b>${brand}</b> Figma export. A system font stands in for the brand font; leading-icon slots are circles; the focus ring is a CSS outline; the disabled track edge is not in the plan.</div>
  ${out.join('')}</body>`;
};

const dir = process.argv[2];
for (const brand of process.argv.slice(3)) writeFileSync(`${dir}/${brand}.html`, page(brand));
console.log('ok');
