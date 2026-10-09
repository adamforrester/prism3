// Run from the repo root: npx tsx docs/proposals/tabs/render.mts <out-dir>
// Plan renders for the #2416 Tabs proposal: each projected plan drawn as HTML, variables resolved from a
// brand's committed Figma export (packages/engine/out/figma/<brand>). Approximate: system-ish font, focus
// ring as an outline, icon slot as a plain square glyph.
import { componentDefs } from '../../../packages/engine/components/index';
import { figmaAnatomySet } from '../../../packages/engine/anatomy-figma';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import pw from 'playwright';
const { chromium } = pw as any;

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const FIG = '../../../packages/engine/out/figma';

type Vars = Map<string, any>;
const loadVars = (brand: string, mode: 'light' | 'dark'): { vars: Vars; styles: Map<string, any> } => {
  const vars: Vars = new Map();
  for (const f of readdirSync(`${FIG}/${brand}`)) {
    if (!f.endsWith('.json')) continue;
    if (/^color\./.test(f) && f !== `color.${mode}.json`) continue;
    if (/^layout\./.test(f) && f !== 'layout.md.json') continue;
    if (/^type-sets\./.test(f) && f !== 'type-sets.desktop.json') continue;
    const d = JSON.parse(readFileSync(`${FIG}/${brand}/${f}`, 'utf8'));
    for (const v of d.variables ?? []) vars.set(v.name.replace(/^[a-z0-9]+\//, ''), v.value);
  }
  const ts = JSON.parse(readFileSync(`${FIG}/${brand}/text-styles.json`, 'utf8'));
  const styles = new Map<string, any>();
  for (const s of ts.styles ?? ts) styles.set(s.name, s.properties);
  return { vars, styles };
};

const rgba = (c: any) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a ?? 1})`;
const JUST: Record<string, string> = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between', BASELINE: 'baseline' };

const plansOf = new Map<string, any[]>();
const plans = (id: string) => {
  if (!plansOf.has(id)) plansOf.set(id, figmaAnatomySet(componentDefs.find((d) => d.id === id)!) as any[]);
  return plansOf.get(id)!;
};
const findPlan = (id: string, want: Record<string, string>) =>
  plans(id).find((p) => Object.entries(want).every(([k, v]) => (k === 'size' ? p.size === undefined || p.size === v : p.coord[k] === undefined || p.coord[k] === v)));

type Ctx = { vars: Vars; styles: Map<string, any>; text?: string; icon?: boolean; count?: boolean };

const node = (n: any, c: Ctx, extra = ''): string => {
  if (n.visible === false && !(n.visibleProp === 'leading icon' && c.icon) && !(n.visibleProp === 'count' && c.count)) return '';
  const v = (k: string) => (n.bound?.[k] !== undefined ? c.vars.get(n.bound[k]) : undefined);
  const css: string[] = [];
  if (n.layoutGrow) css.push('flex:1 1 auto');
  if (n.layoutAlign === 'STRETCH') css.push('align-self:stretch');
  if (n.type === 'TEXT') {
    const st = c.styles.get(n.textStyle) ?? {};
    const size = st.fontSize?.bound ? c.vars.get(st.fontSize.variable.replace(/^[a-z0-9]+\//, '')) : st.fontSize?.value;
    const lh = st.lineHeight?.value;
    css.push(`font-size:${size}px`, `font-weight:${st.fontWeight?.value ?? 400}`, `line-height:${lh?.unit === 'PERCENT' ? lh.value / 100 : 1.2}`, 'white-space:nowrap');
    if (n.paints?.fills) css.push(`color:${rgba(c.vars.get(n.paints.fills))}`);
    return `<span style="${css.join(';')}">${(n.propertyRef?.prop === 'label' && c.text) || n.characters || ''}</span>`;
  }
  if (n.type === 'INSTANCE_SWAP') {
    const s = v('width') ?? 20;
    const col = n.descendantFills ? rgba(c.vars.get(n.descendantFills)) : '#888';
    return `<span style="display:inline-block;width:${s}px;height:${s}px;flex:none;${css.join(';')}"><svg viewBox="0 0 24 24" width="${s}" height="${s}"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="${col}" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="${col}"/></svg></span>`;
  }
  if (n.type === 'NESTED_INSTANCE') {
    if (n.absoluteInset) {
      const ring = findPlan(n.nestTarget, n.nestVariant);
      const col = ring?.root?.paints?.strokes ? rgba(c.vars.get(ring.root.paints.strokes)) : rgba(c.vars.get('color/border/focus'));
      const off = c.vars.get(n.absoluteInset) ?? 2, w = c.vars.get(n.absoluteStrokeInset) ?? 2;
      return `<span style="position:absolute;inset:${-(off + w)}px;border:${w}px solid ${col};border-radius:${(c.vars.get('radius/md') ?? 4) + off}px;pointer-events:none"></span>`;
    }
    const p = findPlan(n.nestTarget, n.nestVariant);
    if (!p) return `<span>[${n.nestTarget}?]</span>`;
    return node(p.root, { ...c, text: n.nestTarget === 'tab' ? c.text : undefined }, css.join(';'));
  }
  // FRAME
  css.push('display:flex', 'position:relative', 'box-sizing:border-box', `flex-direction:${n.layoutMode === 'VERTICAL' ? 'column' : 'row'}`);
  if (n.primaryAxisAlignItems) css.push(`justify-content:${JUST[n.primaryAxisAlignItems]}`);
  if (n.counterAxisAlignItems) css.push(`align-items:${JUST[n.counterAxisAlignItems]}`);
  const px = (k: string, prop: string) => { const x = v(k); if (x !== undefined) css.push(`${prop}:${x}px`); };
  px('itemSpacing', 'gap'); px('paddingTop', 'padding-top'); px('paddingBottom', 'padding-bottom'); px('paddingLeft', 'padding-left'); px('paddingRight', 'padding-right');
  px('width', 'width'); px('height', 'height'); px('minWidth', 'min-width'); px('minHeight', 'min-height');
  px('topLeftRadius', 'border-top-left-radius'); px('topRightRadius', 'border-top-right-radius'); px('bottomLeftRadius', 'border-bottom-left-radius'); px('bottomRightRadius', 'border-bottom-right-radius');
  if (v('height') !== undefined || n.counterAxisSizingMode === 'FIXED' || n.primaryAxisSizingMode === 'FIXED') css.push('flex-shrink:0');
  const fills: string[] = [];
  const f = n.paints?.fills; if (f && c.vars.get(f)) fills.push(rgba(c.vars.get(f)));
  for (const o of n.overlays ?? n.paints?.overlays ?? []) if (c.vars.get(o)) fills.push(rgba(c.vars.get(o)));
  if (fills.length) css.push(`background:${fills.map((x) => `linear-gradient(${x},${x})`).join(',')}`);
  if (n.paints?.strokes) css.push(`box-shadow:inset 0 0 0 ${v('strokeWeight') ?? 1}px ${rgba(c.vars.get(n.paints.strokes))}`);
  if (extra) css.push(extra);
  return `<div data-part="${n.name}" style="${css.join(';')}">${n.children.map((ch: any) => node(ch, c)).join('')}</div>`;
};

const page = (title: string, body: string, bg: string, ink: string) => `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:${bg};color:${ink};font-family:Inter,"Helvetica Neue",Arial,sans-serif}
h1{font-size:15px;margin:0 0 4px} p.n{font-size:11px;opacity:.7;margin:0 0 18px}
table{border-collapse:separate;border-spacing:20px 14px} th{font-size:11px;font-weight:500;text-align:left;opacity:.75}
.cap{font-size:11px;opacity:.75;margin:22px 0 8px}
</style></head><body><h1>${title}</h1><p class="n">Plan render, not Figma: each projected plan drawn as HTML with variables resolved from the brand's committed Figma export. Approximate: system font fallback, focus ring as an outline, the icon slot as a placeholder square.</p>${body}</body></html>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' } as any).catch(() => chromium.launch());
const shot = async (file: string, html: string) => {
  writeFileSync(`${OUT}/${file}.html`, html);
  const pg = await browser.newPage({ viewport: { width: 1100, height: 400 }, deviceScaleFactor: 2 });
  await pg.setContent(html);
  await pg.screenshot({ path: `${OUT}/${file}.png`, fullPage: true });
  await pg.close();
};

const STATES = ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'];
for (const [brand, mode] of [['prism3', 'light'], ['prism3', 'dark'], ['aurora', 'light']] as const) {
  const { vars, styles } = loadVars(brand, mode);
  const c: Ctx = { vars, styles };
  const bg = rgba(vars.get('color/background/primary')), ink = rgba(vars.get('color/text/primary'));
  // 1. Tab members: medium, both selections × five states; then the three sizes at rest.
  let h = '<table><tr><th></th>' + STATES.map((s) => `<th>${s}</th>`).join('') + '</tr>';
  for (const sel of ['unselected', 'selected'])
    h += `<tr><th>${sel}</th>` + STATES.map((st) => `<td>${node(findPlan('tab', { selection: sel, size: 'medium', state: st }).root, { ...c, text: 'Reviews' })}</td>`).join('') + '</tr>';
  h += '</table><div class="cap">Sizes at rest (small, medium, large), selected then unselected</div><table><tr>';
  for (const size of ['small', 'medium', 'large'])
    h += `<td>${node(findPlan('tab', { selection: 'selected', size, state: 'rest' }).root, { ...c, text: 'Reviews' })}</td><td>${node(findPlan('tab', { selection: 'unselected', size, state: 'rest' }).root, { ...c, text: 'Reviews' })}</td>`;
  h += '</tr></table><div class="cap">With the leading icon and the count switched on (medium)</div><table><tr>';
  for (const sel of ['selected', 'unselected'])
    h += `<td>${node(findPlan('tab', { selection: sel, size: 'medium', state: 'rest' }).root, { ...c, text: 'Reviews', icon: true, count: true })}</td>`;
  h += '</tr></table>';
  await shot(`tab-members-${brand}-${mode}`, page(`Tab — draft members (${brand}, ${mode})`, h, bg, ink));

  // 2. Tabs list at each size, with labels substituted per tab.
  const labels = ['Overview', 'Specifications', 'Reviews', 'Shipping', 'Returns', 'Q&amp;A'];
  let t = '';
  for (const size of ['small', 'medium', 'large']) {
    const p = findPlan('tabs', { size });
    let i = 0;
    const walk = (n: any): string => {
      if (n.type === 'NESTED_INSTANCE' && n.nestTarget === 'tab') {
        if (n.visible === false) return '';
        const tp = findPlan('tab', n.nestVariant);
        return node(tp.root, { ...c, text: labels[i++] });
      }
      return '';
    };
    const listNode = p.root.children[0];
    const base = p.root.children[1];
    const baseCol = base.paints?.fills ? rgba(vars.get(base.paints.fills)) : '#ccc';
    const baseH = vars.get(base.bound.height);
    t += `<div class="cap">size=${size} (three tabs; tabs 4–6 off by default)</div><div style="display:inline-flex;flex-direction:column"><div style="display:flex;align-items:flex-end">${listNode.children.map(walk).join('')}</div><div style="height:${baseH}px;background:${baseCol}"></div></div>`;
  }
  await shot(`tabs-list-${brand}-${mode}`, page(`Tabs — draft list (${brand}, ${mode})`, t, bg, ink));
}
await browser.close();
console.log('ok');
