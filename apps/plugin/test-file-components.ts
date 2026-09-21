/**
 * FILE-COMPONENTS structural gate (#1563) — the coverage that was missing when `buildFileComponents`
 * shipped and diverged from the owner's Specs-2 JSON (white fills, a hardcoded 100px height, and
 * backwards auto-layout sizing on the HORIZONTAL `_Headings`).
 *
 *   npx tsx apps/plugin/test-file-components.ts
 *
 * It stubs `FileComponentsApi` with an in-memory NODE RECORDER (the component-shim posture — a shim cannot
 * render or lay out, so it records the property writes and lets the test read them back) and builds BOTH
 * assets, then asserts the STRUCTURE that #1563 got wrong:
 *   - root fills: EMPTY for `_Section-header` (transparent per the JSON), the variant `backgroundColor`
 *     for each `_Headings` member;
 *   - the Text CONTAINER fills are EMPTY in both (the white-behind-the-text bug);
 *   - axis-explicit sizing: `layoutSizingVertical === 'HUG'` (NOT a fixed 100) and
 *     `layoutSizingHorizontal === 'FIXED'` at the right widths (2517 / 663 / 320);
 *   - per-variant Title/Description font sizes;
 *   - the `Description` boolean property is declared and wired to the Description node's visibility.
 *
 * INDEPENDENCE (docs/34): every expected number below is transcribed BY HAND from the #1554 JSON, never
 * imported from `file-components.ts`'s own `SECTION_SIZES` / `HEADINGS` tables — a gate that read its
 * expectations off the subject would be checking the file against itself and could not fail.
 *
 * BY-NAME MUTATION (proven, then restored — see docs/00-progress.md 2026-09-21):
 *   - reintroduce a white Text fill (`textBox.fills = solid('#FFFFFF')`) → the two
 *     "Text container fill is empty" arms fail BY NAME;
 *   - reintroduce the fixed height (drop the `layoutSizingVertical = 'HUG'` line, or set it to `'FIXED'`)
 *     → the "root HUGs its height (not a fixed 100)" arms fail BY NAME.
 */
import { buildFileComponents } from './src/file-components';
import type { FileComponentsApi, FNode } from './src/file-components';

let failures = 0;
const ok = (cond: boolean, label: string): void => {
  if (!cond) { failures++; console.error(`  ✗ ${label}`); }
  else console.log(`  ✓ ${label}`);
};

// ── The node recorder ──────────────────────────────────────────────────────────────────────────────
// Each factory returns a plain object that records everything written to it. `resize` stores the width so
// the fixed-width assertions can read it; `appendChild` builds the tree so the test can walk root → Text →
// Title/Description/Note by name; `combineAsVariants` records the boolean property declaration.
interface RecNode extends FNode {
  kind: string;
  children: RecNode[];
  width?: number;
  height?: number;
  props?: { name: string; type: string; def: string | boolean; id: string }[];
}
const makeNode = (kind: string): RecNode => {
  const n = {
    kind,
    children: [] as RecNode[],
    resize(w: number, h: number) { n.width = w; n.height = h; },
    appendChild(c: unknown) { n.children.push(c as RecNode); },
  } as RecNode;
  return n;
};

const makeApi = (): { api: FileComponentsApi; sets: RecNode[] } => {
  const sets: RecNode[] = [];
  let seq = 0;
  const api: FileComponentsApi = {
    createComponent() { return makeNode('COMPONENT'); },
    createText() { return makeNode('TEXT'); },
    createFrame() { return makeNode('FRAME'); },
    async loadFontAsync() { /* every requested face resolves in the shim */ },
    combineAsVariants(nodes, _parent) {
      const set = makeNode('COMPONENT_SET');
      set.children = [...nodes] as RecNode[];
      sets.push(set);
      const withProp = set as RecNode & { addComponentProperty(name: string, type: string, def: string | boolean): string };
      withProp.addComponentProperty = (name, type, def) => {
        const id = `${name}:${++seq}`;
        (set.props ??= []).push({ name, type, def, id });
        return id;
      };
      return withProp;
    },
  };
  return { api, sets };
};

const childNamed = (parent: RecNode, name: string): RecNode | undefined =>
  parent.children.find((c) => c.name === name);

const fillsEmpty = (n: RecNode): boolean => Array.isArray(n.fills) && (n.fills as unknown[]).length === 0;
const rgb = (hex: string): { r: number; g: number; b: number } => {
  const v = parseInt(hex.replace('#', ''), 16);
  return { r: ((v >> 16) & 0xff) / 255, g: ((v >> 8) & 0xff) / 255, b: (v & 0xff) / 255 };
};
const isSolid = (n: RecNode, hex: string): boolean => {
  const f = n.fills as { type?: string; color?: { r: number; g: number; b: number } }[] | undefined;
  if (!Array.isArray(f) || f.length !== 1 || f[0].type !== 'SOLID' || !f[0].color) return false;
  const want = rgb(hex);
  const c = f[0].color;
  const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
  return near(c.r, want.r) && near(c.g, want.g) && near(c.b, want.b);
};

// Build both assets once, then interrogate the recorded trees.
const { api, sets } = makeApi();
const page = { appendChild() { /* placement is file-setup's; irrelevant here */ } };
const result = await buildFileComponents(api, page);
const setsByName = new Map<string, RecNode>();
for (const s of sets) if (typeof s.name === 'string') setsByName.set(s.name, s);

ok(result.built.includes('_Section-header') && result.built.includes('_Headings'), `both sets reported built (${JSON.stringify(result.built)})`);
ok(result.fontMisses.length === 0, `no font misses in the shim (all faces resolve) (${JSON.stringify(result.fontMisses)})`);

// ── _Section-header ────────────────────────────────────────────────────────────────────────────────
// Expected transcribed from #1554 _Section-header.json (default XL, then Large/Medium/Small variants).
console.log('_Section-header');
{
  const set = setsByName.get('_Section-header');
  ok(!!set, 'the _Section-header set exists');
  const EXPECT = [
    { size: 'XL', titleSize: 144, descSize: 44 },
    { size: 'Large', titleSize: 96, descSize: 24 },
    { size: 'Medium', titleSize: 72, descSize: 24 },
    { size: 'Small', titleSize: 48, descSize: 19 },
  ];
  ok(set!.children.length === EXPECT.length, `has ${EXPECT.length} Size members (got ${set!.children.length})`);
  const descPropId = set!.props?.find((p) => p.name === 'Description');
  ok(descPropId?.type === 'BOOLEAN' && descPropId?.def === true, 'declares a Description BOOLEAN property defaulting true');

  for (const exp of EXPECT) {
    const root = set!.children.find((r) => r.name === `Size=${exp.size}`);
    ok(!!root, `Size=${exp.size}: member present`);
    if (!root) continue;
    ok(fillsEmpty(root), `Size=${exp.size}: root fill is EMPTY (transparent per the JSON)`);
    ok(root.layoutSizingVertical === 'HUG', `Size=${exp.size}: root HUGs its height (not a fixed 100)`);
    ok(root.layoutSizingHorizontal === 'FIXED', `Size=${exp.size}: root width is FIXED`);
    ok(root.width === 2517, `Size=${exp.size}: root width is 2517 (got ${root.width})`);

    const textBox = childNamed(root, 'Text');
    ok(!!textBox, `Size=${exp.size}: Text container present`);
    ok(!!textBox && fillsEmpty(textBox), `Size=${exp.size}: Text container fill is empty`);

    const title = textBox && childNamed(textBox, 'Title');
    const desc = textBox && childNamed(textBox, 'Description');
    ok(title?.fontSize === exp.titleSize, `Size=${exp.size}: Title fontSize ${exp.titleSize} (got ${title?.fontSize})`);
    ok(desc?.fontSize === exp.descSize, `Size=${exp.size}: Description fontSize ${exp.descSize} (got ${desc?.fontSize})`);
    // The Description node's visibility is bound to the boolean property.
    const ref = desc?.componentPropertyReferences as { visible?: string } | undefined;
    ok(!!descPropId && ref?.visible === descPropId.id, `Size=${exp.size}: Description visibility wired to the boolean prop`);
  }
}

// ── _Headings ──────────────────────────────────────────────────────────────────────────────────────
// Expected transcribed from #1554 _Headings.json. Large shows Title(44)/Description(16, JSON-unspecified →
// the module's maintained default); Small swaps to Note(14) and hides the Text box. Light inverts the bg.
console.log('_Headings');
{
  const set = setsByName.get('_Headings');
  ok(!!set, 'the _Headings set exists');
  const EXPECT = [
    { name: 'Type=Large, Light=false', bg: '#181717', width: 663, showText: true },
    { name: 'Type=Large, Light=true', bg: '#F7F7F7', width: 663, showText: true },
    { name: 'Type=Small, Light=false', bg: '#000000', width: 320, showText: false },
    { name: 'Type=Small, Light=true', bg: '#F7F7F7', width: 320, showText: false },
  ];
  ok(set!.children.length === EXPECT.length, `has ${EXPECT.length} Type×Light members (got ${set!.children.length})`);
  const descPropId = set!.props?.find((p) => p.name === 'Description');
  ok(descPropId?.type === 'BOOLEAN' && descPropId?.def === true, 'declares a Description BOOLEAN property defaulting true');

  for (const exp of EXPECT) {
    const root = set!.children.find((r) => r.name === exp.name);
    ok(!!root, `${exp.name}: member present`);
    if (!root) continue;
    ok(isSolid(root, exp.bg), `${exp.name}: root fill is ${exp.bg}`);
    ok(root.layoutSizingVertical === 'HUG', `${exp.name}: root HUGs its height (not a fixed 100)`);
    ok(root.layoutSizingHorizontal === 'FIXED', `${exp.name}: root width is FIXED`);
    ok(root.width === exp.width, `${exp.name}: root width is ${exp.width} (got ${root.width})`);
    ok(root.cornerRadius === 12, `${exp.name}: root cornerRadius 12`);

    const textBox = childNamed(root, 'Text');
    ok(!!textBox, `${exp.name}: Text container present`);
    ok(!!textBox && fillsEmpty(textBox), `${exp.name}: Text container fill is empty`);
    ok(textBox?.visible === exp.showText, `${exp.name}: Text container visible=${exp.showText}`);

    const note = childNamed(root, 'Note');
    ok(note?.visible === !exp.showText, `${exp.name}: Note visible=${!exp.showText}`);

    if (exp.showText) {
      const title = textBox && childNamed(textBox, 'Title');
      const desc = textBox && childNamed(textBox, 'Description');
      ok(title?.fontSize === 44, `${exp.name}: Title fontSize 44 (got ${title?.fontSize})`);
      ok(desc?.fontSize === 16, `${exp.name}: Description fontSize 16 (got ${desc?.fontSize})`);
      const ref = desc?.componentPropertyReferences as { visible?: string } | undefined;
      ok(!!descPropId && ref?.visible === descPropId.id, `${exp.name}: Description visibility wired to the boolean prop`);
    } else {
      ok(note?.fontSize === 14, `${exp.name}: Note fontSize 14 (got ${note?.fontSize})`);
    }
  }
}

console.log(failures === 0 ? '\nfile-components: all assertions pass' : `\nfile-components: ${failures} FAILED`);
if (failures > 0) process.exit(1);
