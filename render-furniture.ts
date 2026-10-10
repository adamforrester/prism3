/**
 * Plan renders of the three canvas-furniture pilot pages (#2406, #2188), for the PR's screenshot branch.
 * Each def is built by the real executor into the component shim, its furniture drawn by the real `drawFurniture`
 * against stand-in templates measured like the owner's `_Label` (Inter Medium 12 at ~7px a character, 8 gap, 14
 * bracket). Member boxes are the shim's measured boxes, drawn as plain outlines: the shim cannot render a button.
 * Run: npx tsx apps/plugin/.render-tmp/render-furniture.ts <out-dir>
 */
import { writeFileSync } from 'node:fs';
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { applyComponentPlan } from '../src/write-components';
import { SWAP_TARGET } from '../src/build-deps';
import { makeShim } from '../component-shim';
import { drawFurniture, furnitureLayout, type FurnitureApi } from '../src/canvas-furniture';

const out = process.argv[2] ?? '.';
type N = Record<string, any>;
const detach = (c: N) => { const p = c.parent; if (p?.children) { const i = p.children.indexOf(c); if (i >= 0) p.children.splice(i, 1); } };
const makePage = (name: string) => {
  const page: N = { id: `PAGE:${name}`, name, type: 'PAGE', children: [] as N[] };
  page.appendChild = (c: N) => { detach(c); c.parent = page; page.children.push(c); };
  page.insertChild = (i: number, c: N) => { detach(c); c.parent = page; page.children.splice(i, 0, c); };
  page.findOne = (p: (n: unknown) => boolean) => page.children.find(p) ?? null;
  return page;
};
const inst = (placement: 'Top' | 'Left'): N => {
  const data = new Map<string, string>();
  const text: N = { type: 'TEXT', name: 'text', characters: 'Label', fontName: { family: 'Inter', style: 'Medium' } };
  let w: number | null = null, h: number | null = null;
  const n: N = {
    type: 'INSTANCE', placement, x: 0, y: 0, children: [text],
    get width() { return w ?? (placement === 'Top' ? 7 * text.characters.length : 7 * text.characters.length + 22); },
    get height() { return h ?? (placement === 'Top' ? 37 : 16); },
    findOne: (p: (x: N) => boolean) => (p(text) ? text : null),
    resize(nw: number, nh: number) { if (n.layoutSizingHorizontal === 'FIXED') w = nw; if (n.layoutSizingVertical === 'FIXED') h = nh; },
    remove() { detach(n); },
    getSharedPluginData: (a: string, b: string) => data.get(`${a}/${b}`) ?? '',
    setSharedPluginData: (a: string, b: string, v: string) => { data.set(`${a}/${b}`, v); },
  };
  return n;
};
const backdrop = (): N => {
  const data = new Map<string, string>();
  let w = 320, h = 160;
  const n: N = { type: 'INSTANCE', kind: 'backdrop', x: 0, y: 0, get width() { return w; }, get height() { return h; },
    resize(a: number, b: number) { w = a; h = b; }, remove() { detach(n); },
    getSharedPluginData: (a: string, b: string) => data.get(`${a}/${b}`) ?? '', setSharedPluginData: (a: string, b: string, v: string) => { data.set(`${a}/${b}`, v); } };
  return n;
};
const api: FurnitureApi = {
  root: { findAllWithCriteria: () => [
    { type: 'COMPONENT_SET', name: '_Label', children: [
      { type: 'COMPONENT', name: 'Text=Top, surface=default', createInstance: () => inst('Top') },
      { type: 'COMPONENT', name: 'Text=Left, surface=default', createInstance: () => inst('Left') },
    ] },
    { type: 'COMPONENT', name: '_inverse-backdrop', fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { id: 'V' } } }], createInstance: backdrop },
  ] },
  loadFontAsync: async () => {},
};
const planComps = (n: N): string[] => [...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []), ...((n.children ?? []) as N[]).flatMap(planComps)];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

for (const [id, title] of [['button', 'Button'], ['tag', 'Tag'], ['text-field', 'Text field']] as const) {
  const plans = figmaAnatomySet(componentDefs.find((d) => d.id === id)!, { swapTarget: SWAP_TARGET });
  const page = makePage(id);
  const shim = makeShim({
    vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
    styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root as N))])],
    page: page as never, liveRoot: true, identities: true,
  }) as N;
  await applyComponentPlan(plans, shim as never, { targetPage: page as never });
  const set = page.children.find((c: N) => c.type === 'COMPONENT_SET');
  const o = await drawFurniture(api, set, furnitureLayout(plans), id);
  const furn = page.children.filter((c: N) => c.getSharedPluginData?.('prism3', 'furniture'));
  const boxes = [set, ...furn].map((n: N) => [n.x, n.y, n.x + n.width, n.y + n.height]);
  const M = 40;
  const minX = Math.min(...boxes.map((b) => b[0])) - M, minY = Math.min(...boxes.map((b) => b[1])) - M - 40;
  const W = Math.max(...boxes.map((b) => b[2])) + M - minX, H = Math.max(...boxes.map((b) => b[3])) + M - minY;
  const P = '#9747FF';
  const parts: string[] = [];
  parts.push(`<rect x="${minX}" y="${minY}" width="${W}" height="${H}" fill="#FFFFFF"/>`);
  parts.push(`<text x="${minX + M}" y="${minY + 32}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="#0E0D0D">${esc(title)} — plan render (#2406, #2188): labels ${o.columns} columns + ${o.rows} rows, ${o.backdrops} backdrop</text>`);
  for (const b of furn.filter((n: N) => n.kind === 'backdrop'))
    parts.push(`<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="8" fill="#181717"/>`);
  parts.push(`<rect x="${set.x}" y="${set.y}" width="${set.width}" height="${set.height}" rx="5" fill="none" stroke="${P}" stroke-dasharray="10 5"/>`);
  for (const m of set.children as N[]) {
    const inv = /surface=inverse/.test(m.name);
    parts.push(`<rect x="${set.x + m.x}" y="${set.y + m.y}" width="${m.width}" height="${m.height}" rx="4" fill="${inv ? '#2E2D2D' : '#F2F2F2'}" stroke="${inv ? '#5A5858' : '#C8C6C6'}"/>`);
  }
  for (const l of furn.filter((n: N) => n.placement)) {
    const t = esc(l.children[0].characters);
    if (l.placement === 'Top') {
      parts.push(`<text x="${l.x + l.width / 2}" y="${l.y + 14}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="500" fill="${P}">${t}</text>`);
      const y0 = l.y + 23, y1 = y0 + 14, x0 = l.x + 0.5, x1 = l.x + l.width - 0.5;
      parts.push(`<path d="M${x0} ${y1} V${y0 + 5} Q${x0} ${y0} ${x0 + 5} ${y0} H${x1 - 5} Q${x1} ${y0} ${x1} ${y0 + 5} V${y1}" fill="none" stroke="${P}"/>`);
    } else {
      const bx = l.x + l.width - 14;
      parts.push(`<text x="${bx - 8}" y="${l.y + l.height / 2 + 4}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="500" fill="${P}">${t}</text>`);
      const x0 = bx + 0.5, x1 = bx + 14, y0 = l.y + 0.5, y1 = l.y + l.height - 0.5;
      parts.push(`<path d="M${x1} ${y0} H${x0 + 5} Q${x0} ${y0} ${x0} ${y0 + 5} V${y1 - 5} Q${x0} ${y1} ${x0 + 5} ${y1} H${x1}" fill="none" stroke="${P}"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${W} ${H}" width="${W}" height="${H}">${parts.join('')}</svg>`;
  writeFileSync(`${out}/${id}.svg`, svg);
  console.log(id, `${Math.round(W)}x${Math.round(H)}`, o);
}
