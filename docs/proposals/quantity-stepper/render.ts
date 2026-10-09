/**
 * PLAN RENDERS for the quantity-stepper proposal (#2427). Not Figma, and not a gate.
 *
 * Takes the anatomy plans the engine projects for the DRAFT def (`figmaAnatomySet`, the same plans the plugin
 * builds from), resolves every bound variable and text style against the neutral `prism3` brand's light mode,
 * and draws each plan as HTML flexbox (Figma auto-layout's model: direction, alignment, hug/fixed sizing,
 * padding, gap). Nested instances render from their own def's plan at the nested variant. Then Playwright
 * screenshots the sheet.
 *
 *   npx tsx docs/proposals/quantity-stepper/render.ts
 *
 * What it does not draw: anything the plan does not carry (hover and pressed are code-only here), and Figma's
 * own text metrics; type is the browser's.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { figmaAnatomySet } from '../../../packages/engine/anatomy-figma';
import type { AnatomyPlan } from '../../../packages/engine/anatomy-figma';
import { componentDefs } from '../../../packages/engine/components/index';
import { quantityStepper } from '../../../packages/engine/components/quantity-stepper';

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(here, '../../../packages/engine/out/prism3.tokens.json'), 'utf8')).pds3;

// ── token resolution (light mode, aliases followed) ─────────────────────────────────────────────
const at = (path: string): any => path.split('.').reduce((o: any, k) => (o ? o[k] : undefined), tokens);
const deref = (v: any): any => {
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) {
    const t = at(v.slice(1, -1).replace(/^pds3\./, ''));
    if (!t) throw new Error(`unresolved ${v}`);
    return deref(t.$value);
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deref(x)]));
  return v;
};
const tok = (figmaName: string): any => {
  const t = at(figmaName.replace(/\//g, '.'));
  if (!t) throw new Error(`no token for ${figmaName}`);
  return deref(t.$value);
};
const toPx = (v: any): number => (typeof v === 'number' ? v : String(v).endsWith('rem') ? parseFloat(String(v)) * 16 : parseFloat(String(v)));
const px = (figmaName: string): number => toPx(tok(figmaName));
const color = (figmaName: string): string => {
  const v = tok(figmaName);
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'hex' in v) return v.alpha !== undefined && v.alpha < 1 ? `rgba(${v.components.map((c: number) => Math.round(c * 255)).join(',')},${v.alpha})` : v.hex;
  if (v && typeof v === 'object' && 'components' in v) return `rgba(${v.components.map((c: number) => Math.round(c * 255)).join(',')},${v.alpha ?? 1})`;
  return String(v);
};
const textStyle = (name: string): string => {
  const v = tok(`type/${name}`);
  const size = toPx(v.fontSize);
  const lhRaw = typeof v.lineHeight === 'number' ? v.lineHeight : parseFloat(String(v.lineHeight));
  const lh = lhRaw < 4 ? lhRaw * size : lhRaw > 20 && lhRaw < 400 && String(v.lineHeight).endsWith('%') ? (lhRaw / 100) * size : lhRaw;
  const fam = Array.isArray(v.fontFamily) ? v.fontFamily.join(', ') : String(v.fontFamily);
  return `font-family:${fam},system-ui,sans-serif;font-size:${size}px;font-weight:${v.fontWeight};line-height:${lh}px;`;
};

// ── plan → HTML ────────────────────────────────────────────────────────────────────────────────
type N = AnatomyPlan['root'];
const justify: Record<string, string> = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between' };
const align: Record<string, string> = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' };

type Overrides = { text?: Record<string, string>; visible?: Record<string, boolean> };

const nestedPlan = (id: string, variant: Record<string, string>): AnatomyPlan => {
  const def = componentDefs.find((d) => d.id === id);
  if (!def) throw new Error(`no def ${id}`);
  const plans = figmaAnatomySet(def, { swapTarget: 'FPO-default-icon' });
  const hit = plans.find((p) => Object.entries(variant).every(([k, v]) => (p.coord as any)[k] === v || (k === 'size' && p.size === v)));
  if (!hit) throw new Error(`no ${id} member at ${JSON.stringify(variant)}`);
  return hit;
};

const node = (n: N, o: Overrides, parentDir?: string, scope = ''): string => {
  const b = (n as any).bound ?? {};
  if ((n as any).visible === false && !o.visible?.[n.name]) return '';
  if (o.visible?.[n.name] === false) return '';
  const css: string[] = ['box-sizing:border-box', 'position:relative', 'flex-shrink:0'];
  const nn = n as any;
  if (nn.type === 'NESTED_INSTANCE') {
    if (nn.absoluteInset) {
      const inset = px(nn.absoluteInset) + px(nn.absoluteStrokeInset);
      const w = px('focus/ring/width');
      return `<div style="position:absolute;inset:-${inset}px;border:${w}px solid ${color('color/border/focus')};border-radius:${px('radius/sm') + inset}px;pointer-events:none"></div>`;
    }
    const sub = nestedPlan(nn.nestTarget, nn.nestVariant);
    return node(sub.root, o, parentDir, nn.nestTarget);
  }
  if (nn.type === 'TEXT') {
    const ink = nn.paints?.fills ? color(nn.paints.fills) : '#000';
    const chars = o.text?.[scope ? `${scope}.${n.name}` : n.name] ?? nn.characters ?? '';
    return `<div style="${textStyle(nn.textStyle)}color:${ink};white-space:nowrap">${chars}</div>`;
  }
  if (nn.type === 'GLYPH') {
    const w = b.width ? px(b.width) : 24;
    const ink = nn.descendantFills ? color(nn.descendantFills) : '#000';
    const svg = String(nn.glyphSvg).replace(/width="\d+"/, `width="${w}"`).replace(/height="\d+"/, `height="${w}"`);
    return `<div style="width:${w}px;height:${w}px;color:${ink};flex-shrink:0;display:flex">${svg}</div>`;
  }
  // FRAME
  const dir = nn.layoutMode === 'VERTICAL' ? 'column' : 'row';
  css.push('display:flex', `flex-direction:${dir}`);
  if (nn.primaryAxisAlignItems) css.push(`justify-content:${justify[nn.primaryAxisAlignItems]}`);
  if (nn.counterAxisAlignItems) css.push(`align-items:${align[nn.counterAxisAlignItems]}`);
  if (b.itemSpacing) css.push(`gap:${px(b.itemSpacing)}px`);
  for (const [k, side] of [['paddingTop', 'top'], ['paddingBottom', 'bottom'], ['paddingLeft', 'left'], ['paddingRight', 'right']] as const)
    if (b[k]) css.push(`padding-${side}:${px(b[k])}px`);
  if (b.width) css.push(`width:${px(b.width)}px`);
  if (b.height) css.push(`height:${px(b.height)}px`);
  if (nn.minWidth) css.push(`min-width:${nn.minWidth}px`);
  if (b.topLeftRadius) css.push(`border-radius:${px(b.topLeftRadius)}px`);
  if (nn.paints?.fills) css.push(`background:${color(nn.paints.fills)}`);
  if (nn.paints?.strokes) css.push(`box-shadow:inset 0 0 0 ${b.strokeWeight ? px(b.strokeWeight) : 1}px ${color(nn.paints.strokes)}`);
  const kids = (nn.children ?? []).map((c: N) => node(c, o, dir, scope)).join('');
  return `<div data-part="${n.name}" style="${css.join(';')}">${kids}</div>`;
};

// ── the sheet ──────────────────────────────────────────────────────────────────────────────────
const plans = figmaAnatomySet(quantityStepper, { swapTarget: 'FPO-default-icon' });
const find = (c: Record<string, string>): AnatomyPlan => {
  const p = plans.find((x) => x.size === c.size && Object.entries(c).every(([k, v]) => k === 'size' || (x.coord as any)[k] === v));
  if (!p) throw new Error(`no member ${JSON.stringify(c)}`);
  return p;
};
const LABEL = { text: { 'field-label.text': 'Quantity', 'field-label.label': 'Quantity' } } as Overrides;

const cell = (c: Record<string, string>, o: Overrides = LABEL): string =>
  `<div class="cell">${node(find(c).root, o)}</div>`;

const grid = (appearance: string): string => {
  const sizes = ['small', 'medium', 'large'];
  const values = ['in-range', 'at-min', 'at-max'];
  const states = ['rest', 'focus-visible', 'disabled'];
  const head = `<div class="h"></div>${states.map((s) => `<div class="h">state=${s}</div>`).join('')}`;
  const rows = sizes.flatMap((size) => values.map((value) =>
    `<div class="rh">size=${size}<br>value=${value}</div>${states.map((state) => cell({ appearance, size, value, state }, { ...LABEL, text: { ...LABEL.text, value: value === 'at-max' ? '10' : '1' } })).join('')}`));
  return `<section><h2>appearance=${appearance}</h2><div class="grid">${head}${rows.join('')}</div></section>`;
};

const css = `body{margin:0;padding:32px;background:${color('color/background/primary')};font:13px system-ui,sans-serif;color:#444}
h1{font-size:18px;margin:0 0 4px}p.sub{margin:0 0 24px;color:#666}h2{font-size:14px;margin:24px 0 12px}
.grid{display:grid;grid-template-columns:150px repeat(3,max-content);gap:20px 40px;align-items:center}
.h{font-weight:600;font-size:12px;color:#666}.rh{font-size:12px;color:#666}.cell{display:flex}
.demo{display:flex;gap:64px;margin-top:8px}.line{position:relative;padding:16px 0;border-left:1px dashed #e04;padding-left:0;width:260px}
.line .t{${textStyle('body/md/default')}color:${color('color/text/primary')};margin-bottom:8px}
.line .t2{${textStyle('body/sm/default')}color:${color('color/text/secondary')};margin-bottom:8px}`;

const html = (body: string): string => `<!doctype html><meta charset="utf-8"><style>${css}</style><body>${body}</body>`;

const flushDemo = (): string => {
  const ghost = node(find({ appearance: 'ghost', size: 'medium', value: 'at-min', state: 'rest' }).root, { text: { value: '1' }, visible: { label: false } });
  const outline = node(find({ appearance: 'outline', size: 'medium', value: 'at-min', state: 'rest' }).root, { text: { value: '1' }, visible: { label: false } });
  const msg = node(find({ appearance: 'outline', size: 'medium', value: 'at-max', state: 'rest' }).root, { text: { ...LABEL.text, value: '5', 'field-message.text': 'Limit 5 per order', 'field-message.message': 'Limit 5 per order', 'field-message.caption': 'Limit 5 per order' }, visible: { message: true } });
  return `<section><h2>In context — the dashed line is the content edge</h2><div class="demo">
  <div><div class="line"><div class="t">Trail runner</div><div class="t2">Size 9 · Blue</div>${ghost}</div><p>ghost, at the minimum: the − sits on the content edge</p></div>
  <div><div class="line"><div class="t">Trail runner</div><div class="t2">Size 9 · Blue</div>${outline}</div><p>outline, at the minimum</p></div>
  <div><div class="line">${msg}</div><p>outline, at the maximum, message on</p></div>
  </div></section>`;
};

const out = join(here);
writeFileSync(join(out, 'sheet-outline.html'), html(`<h1>QuantityStepper — plan render (DRAFT, not Figma)</h1><p class="sub">The engine's anatomy plans for the draft def, drawn in the neutral prism3 brand, light mode. 54 members: appearance × size × value × state.</p>${grid('outline')}`));
writeFileSync(join(out, 'sheet-ghost.html'), html(`<h1>QuantityStepper — plan render (DRAFT, not Figma)</h1><p class="sub">ghost appearance: no border; the glyphs sit on the outer edges.</p>${grid('ghost')}`));
writeFileSync(join(out, 'sheet-context.html'), html(`<h1>QuantityStepper — plan render (DRAFT, not Figma)</h1><p class="sub">Flush alignment against a content edge, and the limit message.</p>${flushDemo()}`));

const { chromium } = await import('playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1000, height: 800 } });
for (const name of ['sheet-outline', 'sheet-ghost', 'sheet-context']) {
  await page.goto(`file://${join(out, `${name}.html`)}`);
  await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
  console.log(`wrote ${name}.png`);
}
await browser.close();
