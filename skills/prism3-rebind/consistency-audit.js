// Prism3 consistency audit for rebuilt spec pages (#2886). Read-only: it reads the file and writes nothing.
//
// HOW TO RUN. This file is the body of an async function, the shape the plugin's dev agent link runs. Send it as
// `run-code` with `args.code` set to an input line followed by this file's text:
//
//   const auditInput = { pageId: '12:34' };   // or { frameIds: ['1:2', '1:3'] }, plus any options below
//   <this file>
//
// Without an input line it audits the current page. It returns JSON: the frames it read and how it classified them,
// a findings list, the findings as a markdown table, and a row for the Runs table on #2886.
//
// INPUT (every field optional):
//   pageId        audit every top-level frame on this page (frames inside a top-level section count too).
//   frameIds      audit exactly these frames. Wins over pageId.
//   label         the page set's name for the Runs row. Defaults to the page name.
//   run           the run number for the Runs row. Defaults to '?'.
//   allow         { roles: [...], texts: [...] }: check 1 skips text whose role or text style name contains
//                 one of `roles` (default ['heading', 'title']), or whose text equals one of `texts`.
//   controls      a regular expression source, matched against a component's name (its set's name for a
//                 variant), that marks an instance as a control whose label check 1 reads.
//                 Default '\\b(button|link|tab|tag|chip)s?\\b'.
//   mobileMaxWidth  frames this wide or narrower are mobile when the name does not say. Default 767.
//   library       which variables and styles count as the library's in check 4:
//                 { local: true } (the default) when the library is materialized in this file;
//                 { collectionKeys: [...], styleKeys: [...] } when it is a published library;
//                 { collectionPattern: '...', stylePattern: '...' } to match collection and style names
//                 by a regular expression. Any match counts.
//
// THE DEFINITIONS THE CHECKS USE.
//   Breakpoint. A frame whose name has the word desktop, lg or xl is desktop; mobile, sm or xs is mobile. A name
//     with neither is classified by width (mobileMaxWidth). The output lists every frame with its class and why.
//   Page. Frames that share a name once the breakpoint words and separators are removed are one page, at two
//     breakpoints: 'Wishlist / Desktop' and 'Wishlist / Mobile' are the page 'wishlist'.
//   Element role. A node's layer name, normalized: lowercase, separators as spaces, a trailing 'copy' or
//     'copy 2' removed. A number is kept, so 'Heading 1' and 'Heading 2' are two roles. A layer with no role,
//     because Figma named it ('Frame 12', 'Rectangle 4', or a text layer still named after its own text),
//     is skipped by checks 2 and 3 and counted in the coverage block.
//   Anchor. The node's parent. The spacing is the parent's gap in auto layout (and its wrap gap), or, in a
//     frame without auto layout, the distance from the previous visible sibling (from the parent's top for
//     the first child).
//
// THE CHECKS.
//   1 control-label  loose text, outside any instance, that repeats the label of a control instance anywhere in
//                    the set. A control drawn as plain text on one page is the drift this finds.
//   2 pairing        for each role, the desktop text style → mobile text style pair is the same on every page.
//   3 page-to-page   at one breakpoint, each role has one text style, one component and variant, and one
//                    spacing to its anchor, across every frame.
//   4 binding        every variable and style a node uses is the library's, and no visible solid fill or
//                    stroke outside an instance is a raw color with no variable or style. Gradient and image
//                    paints are not read.

const input = (typeof auditInput === 'object' && auditInput) || {};
const started = Date.now();

// ---- reading helpers ------------------------------------------------------------------------------------------
const isMixed = (v) => typeof v === 'symbol';
const norm = (s) => String(s ?? '').toLowerCase().replace(/[\s_/\\|·•\-–—:]+/g, ' ').trim();
const DEFAULT_NAME = /^(frame|group|rectangle|ellipse|vector|line|polygon|star|section|text|image|boolean)( \d+)?$/;
const roleOf = (node) => {
  const name = String(node.name ?? '');
  if (node.type === 'TEXT' && norm(name) === norm(node.characters)) return null; // named by Figma after its text
  const r = norm(name).replace(/\s+copy(\s+\d+)?$/, '').trim();
  if (!r || DEFAULT_NAME.test(r)) return null; // Figma's default name for a new layer
  return r;
};
const labelOf = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
const visible = (n) => n.visible !== false;
const kids = (n) => ('children' in n && Array.isArray(n.children) ? n.children : []);

const styleCache = new Map();
const styleOf = async (id) => {
  if (!id || isMixed(id)) return null;
  if (!styleCache.has(id)) styleCache.set(id, await figma.getStyleByIdAsync(id).catch(() => null));
  return styleCache.get(id);
};
const varCache = new Map();
const collCache = new Map();
const variableOf = async (id) => {
  if (!varCache.has(id)) varCache.set(id, await figma.variables.getVariableByIdAsync(id).catch(() => null));
  return varCache.get(id);
};
const collectionOf = async (id) => {
  if (!collCache.has(id)) collCache.set(id, await figma.variables.getVariableCollectionByIdAsync(id).catch(() => null));
  return collCache.get(id);
};
const mainCache = new Map();
const mainOf = async (inst) => {
  if (!mainCache.has(inst.id)) mainCache.set(inst.id, await inst.getMainComponentAsync().catch(() => null));
  return mainCache.get(inst.id);
};

// ---- the frames ------------------------------------------------------------------------------------------------
let frames = [];
let scopeName = '';
if (Array.isArray(input.frameIds) && input.frameIds.length) {
  for (const id of input.frameIds) {
    const n = await figma.getNodeByIdAsync(id);
    if (!n) throw new Error(`consistency audit: no node ${id}`);
    let pg = n.parent;
    while (pg && pg.type !== 'PAGE') pg = pg.parent;
    if (pg && typeof pg.loadAsync === 'function') await pg.loadAsync();
    frames.push(n);
  }
  scopeName = `${frames.length} frames`;
} else {
  const page = input.pageId ? await figma.getNodeByIdAsync(input.pageId) : figma.currentPage;
  if (!page || page.type !== 'PAGE') throw new Error(`consistency audit: ${input.pageId} is not a page`);
  if (typeof page.loadAsync === 'function') await page.loadAsync();
  for (const c of kids(page)) {
    if (c.type === 'SECTION') frames.push(...kids(c).filter((k) => k.type === 'FRAME'));
    else if (c.type === 'FRAME') frames.push(c);
  }
  scopeName = page.name;
}
frames = frames.filter(visible);

const BP_WORDS = /\b(desktop|mobile|lg|xl|sm|xs)\b/gi;
const mobileMax = Number.isFinite(input.mobileMaxWidth) ? input.mobileMaxWidth : 767;
const classify = (f) => {
  const name = String(f.name ?? '').toLowerCase();
  if (/\b(desktop|lg|xl)\b/.test(name)) return { bp: 'desktop', by: 'name' };
  if (/\b(mobile|sm|xs)\b/.test(name)) return { bp: 'mobile', by: 'name' };
  return { bp: f.width <= mobileMax ? 'mobile' : 'desktop', by: `width ${f.width}` };
};
const frameInfo = frames.map((f) => {
  const c = classify(f);
  return { id: f.id, name: f.name, width: f.width, breakpoint: c.bp, classifiedBy: c.by, page: norm(String(f.name).replace(BP_WORDS, ' ')) || f.id };
});
const infoOf = new Map(frameInfo.map((i) => [i.id, i]));

// ---- one walk collects what every check reads --------------------------------------------------------------------
const controlRe = new RegExp(typeof input.controls === 'string' ? input.controls : '\\b(button|link|tab|tag|chip)s?\\b', 'i');
const texts = [];      // { node, frame, role, insideInstance, hidden }
const instances = [];  // { node, frame, role, component, variant, isControl, labels }
const placed = [];     // { node, frame, role } for spacing
const all = [];        // { node, frame, insideInstance, hidden } for check 4

const componentOf = async (inst) => {
  const main = await mainOf(inst);
  if (!main) return { component: '(missing main component)', variant: '', key: null };
  const set = main.parent && main.parent.type === 'COMPONENT_SET' ? main.parent : null;
  return { component: set ? set.name : main.name, variant: set ? main.name : '', key: main.key ?? null };
};

const walk = async (node, frame, insideInstance, hidden) => {
  const h = hidden || !visible(node);
  all.push({ node, frame, insideInstance, hidden: h });
  if (!h && !insideInstance) {
    const role = roleOf(node);
    if (node.type === 'TEXT') texts.push({ node, frame, role });
    if (role && node !== frame) placed.push({ node, frame, role });
    if (node.type === 'INSTANCE') {
      const c = await componentOf(node);
      const labels = [];
      const collect = (n) => {
        if (!visible(n)) return;
        if (n.type === 'TEXT' && labelOf(n.characters)) labels.push(labelOf(n.characters));
        kids(n).forEach(collect);
      };
      kids(node).forEach(collect);
      instances.push({ node, frame, role, ...c, isControl: controlRe.test(c.component), labels });
    }
  }
  for (const k of kids(node)) await walk(k, frame, insideInstance || node.type === 'INSTANCE', h);
};
for (const f of frames) await walk(f, f, false, false);

const findings = [];
const add = (check, frame, node, role, detail, expected, actual) =>
  findings.push({ check, frame: frame.name, frameId: frame.id, node: node ? node.name : '', nodeId: node ? node.id : '', role: role ?? '', detail, expected: expected ?? '', actual: actual ?? '' });

const textStyleSig = async (t) => {
  if (isMixed(t.textStyleId)) return 'mixed styles';
  const s = await styleOf(t.textStyleId);
  if (s) return s.name;
  const size = isMixed(t.fontSize) ? 'mixed' : t.fontSize;
  return `no style (${size}px)`;
};

// ---- check 1: same control, same component -------------------------------------------------------------------------
const checkControlLabels = async () => {
  const allowRoles = (input.allow && Array.isArray(input.allow.roles) ? input.allow.roles : ['heading', 'title']).map(norm);
  const allowTexts = new Set((input.allow && Array.isArray(input.allow.texts) ? input.allow.texts : []).map(labelOf));
  const controls = new Map(); // label → { component, frame }
  for (const i of instances) if (i.isControl) for (const l of i.labels) if (!controls.has(l)) controls.set(l, i);
  for (const t of texts) {
    const l = labelOf(t.node.characters);
    const c = l && controls.get(l);
    if (!c) continue;
    if (allowTexts.has(l)) continue;
    if (t.role && allowRoles.some((a) => a && t.role.includes(a))) continue;
    const style = await styleOf(t.node.textStyleId);
    if (style && allowRoles.some((a) => a && norm(style.name).includes(a))) continue;
    add(1, t.frame, t.node, t.role, `plain text "${t.node.characters}" repeats the label of a ${c.component} instance (in ${c.frame.name})`, `${c.component} instance`, 'plain text');
  }
};

// ---- check 2: desktop ↔ mobile pairing -----------------------------------------------------------------------------
const checkPairing = async () => {
  // page → breakpoint → role → set of styles
  const byPage = new Map();
  for (const t of texts) {
    if (!t.role) continue;
    const info = infoOf.get(t.frame.id);
    if (!byPage.has(info.page)) byPage.set(info.page, { desktop: new Map(), mobile: new Map(), frames: {} });
    const p = byPage.get(info.page);
    p.frames[info.breakpoint] = t.frame;
    const m = p[info.breakpoint];
    if (!m.has(t.role)) m.set(t.role, new Set());
    m.get(t.role).add(await textStyleSig(t.node));
  }
  const pairs = new Map(); // role → pair → [page]
  for (const [page, p] of byPage) {
    for (const [role, dStyles] of p.desktop) {
      const mStyles = p.mobile.get(role);
      if (!mStyles) continue;
      const pair = `${[...dStyles].sort().join(' + ')} → ${[...mStyles].sort().join(' + ')}`;
      if (!pairs.has(role)) pairs.set(role, new Map());
      const r = pairs.get(role);
      if (!r.has(pair)) r.set(pair, []);
      r.get(pair).push({ page, frame: p.frames.mobile });
    }
  }
  for (const [role, r] of pairs) {
    if (r.size < 2) continue;
    const ranked = [...r.entries()].sort((a, b) => b[1].length - a[1].length);
    const [expected] = ranked[0];
    for (const [pair, pages] of ranked.slice(1))
      for (const pg of pages) add(2, pg.frame, null, role, `"${role}" pairs differently on page "${pg.page}"`, expected, pair);
  }
};

// ---- check 3: page to page at one breakpoint -----------------------------------------------------------------------
const spacingSig = (node) => {
  const parent = node.parent;
  if (!parent) return null;
  if (parent.layoutMode && parent.layoutMode !== 'NONE' && node.layoutPositioning !== 'ABSOLUTE') {
    const wrap = parent.layoutWrap === 'WRAP' ? `, wrap gap ${parent.counterAxisSpacing}` : '';
    const gap = parent.primaryAxisAlignItems === 'SPACE_BETWEEN' ? 'gap auto (space between)' : `gap ${parent.itemSpacing}`;
    return `${gap}${wrap}`;
  }
  const siblings = kids(parent).filter(visible);
  const at = siblings.indexOf(node);
  if (at <= 0) return `top ${Math.round(node.y)}`;
  const prev = siblings[at - 1];
  return `below previous ${Math.round(node.y - (prev.y + prev.height))}`;
};
const checkPageToPage = async () => {
  // breakpoint → attribute → role → signature → [{frame, node}]
  const table = new Map();
  const note = (bp, attr, role, sig, frame, node) => {
    if (sig == null) return;
    const key = `${bp}\u0000${attr}\u0000${role}`;
    if (!table.has(key)) table.set(key, { bp, attr, role, sigs: new Map() });
    const s = table.get(key).sigs;
    if (!s.has(sig)) s.set(sig, []);
    s.get(sig).push({ frame, node });
  };
  for (const t of texts) if (t.role) note(infoOf.get(t.frame.id).breakpoint, 'text style', t.role, await textStyleSig(t.node), t.frame, t.node);
  for (const i of instances) if (i.role) note(infoOf.get(i.frame.id).breakpoint, 'component', i.role, i.variant ? `${i.component} (${i.variant})` : i.component, i.frame, i.node);
  for (const p of placed) note(infoOf.get(p.frame.id).breakpoint, 'spacing', p.role, spacingSig(p.node), p.frame, p.node);
  for (const { bp, attr, role, sigs } of table.values()) {
    if (sigs.size < 2) continue;
    const framesWith = new Set([...sigs.values()].flat().map((x) => x.frame.id));
    if (framesWith.size < 2) continue; // one frame alone is a layout question, not page-to-page drift
    const ranked = [...sigs.entries()].sort((a, b) => new Set(b[1].map((x) => x.frame.id)).size - new Set(a[1].map((x) => x.frame.id)).size);
    const [expected] = ranked[0];
    for (const [sig, uses] of ranked.slice(1)) {
      const seen = new Set();
      for (const u of uses) {
        if (seen.has(u.frame.id)) continue;
        seen.add(u.frame.id);
        add(3, u.frame, u.node, role, `${bp}: "${role}" ${attr} differs from the other pages`, expected, sig);
      }
    }
  }
};

// ---- check 4: bindings come from the library -----------------------------------------------------------------------
const lib = input.library && typeof input.library === 'object' ? input.library : { local: true };
const collKeys = new Set(lib.collectionKeys || []);
const styleKeys = new Set(lib.styleKeys || []);
const collRe = lib.collectionPattern ? new RegExp(lib.collectionPattern, 'i') : null;
const styleRe = lib.stylePattern ? new RegExp(lib.stylePattern, 'i') : null;
const sources = {};
const count = (src) => { sources[src] = (sources[src] || 0) + 1; };
const varIsLibrary = async (id) => {
  const v = await variableOf(id);
  if (!v) return { ok: false, src: `missing variable ${id}` };
  const c = await collectionOf(v.variableCollectionId);
  const src = `${v.remote ? 'remote' : 'local'} collection ${c ? c.name : '?'}`;
  const ok = (lib.local && !v.remote) || (c && collKeys.has(c.key)) || (c && collRe && collRe.test(c.name));
  return { ok: !!ok, src, name: v.name };
};
const styleIsLibrary = async (id) => {
  const s = await styleOf(id);
  if (!s) return { ok: false, src: `missing style ${id}` };
  const src = `${s.remote ? 'remote' : 'local'} ${String(s.type || '').toLowerCase()} style`;
  const ok = (lib.local && !s.remote) || styleKeys.has(s.key) || (styleRe && styleRe.test(s.name));
  return { ok: !!ok, src, name: s.name };
};
const aliasIds = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap(aliasIds);
  if (typeof v === 'object' && v.type === 'VARIABLE_ALIAS' && v.id) return [v.id];
  if (typeof v === 'object') return Object.values(v).flatMap(aliasIds);
  return [];
};
const checkBindings = async () => {
  for (const { node, frame, insideInstance, hidden } of all) {
    const where = `${hidden ? 'hidden ' : ''}${insideInstance ? 'inside an instance' : 'on the canvas'}`;
    const ids = new Set(aliasIds(node.boundVariables));
    for (const prop of ['fills', 'strokes']) {
      const paints = node[prop];
      if (!Array.isArray(paints)) continue;
      for (const p of paints) for (const id of aliasIds(p.boundVariables)) ids.add(id);
    }
    const segmentPaints = []; // a text node with mixed fills keeps its paints on its runs
    const styleIds = new Map(); // style id → the property that names it, so a style is checked once per node
    for (const k of ['fillStyleId', 'strokeStyleId', 'effectStyleId', 'textStyleId', 'gridStyleId']) {
      const sid = node[k];
      if (sid && !isMixed(sid) && !styleIds.has(sid)) styleIds.set(sid, k);
    }
    if (node.type === 'TEXT' && typeof node.getStyledTextSegments === 'function') {
      for (const seg of node.getStyledTextSegments(['textStyleId', 'fillStyleId', 'boundVariables', 'fills'])) {
        for (const id of aliasIds(seg.boundVariables)) ids.add(id);
        if (isMixed(node.fills) && Array.isArray(seg.fills)) {
          if (!seg.fillStyleId) segmentPaints.push(...seg.fills);
          for (const p of seg.fills) for (const id of aliasIds(p.boundVariables)) ids.add(id);
        }
        if (seg.textStyleId && !styleIds.has(seg.textStyleId)) styleIds.set(seg.textStyleId, 'a text run\'s textStyleId');
        if (seg.fillStyleId && !styleIds.has(seg.fillStyleId)) styleIds.set(seg.fillStyleId, 'a text run\'s fillStyleId');
      }
    }
    for (const id of ids) {
      const r = await varIsLibrary(id);
      count(r.src);
      if (!r.ok) add(4, frame, node, roleOf(node), `bound to ${r.src} variable "${r.name ?? id}" (${where})`, 'a library variable', r.src);
    }
    for (const [sid, k] of styleIds) {
      const r = await styleIsLibrary(sid);
      count(r.src);
      if (!r.ok) add(4, frame, node, roleOf(node), `${k} is ${r.src} "${r.name ?? sid}" (${where})`, 'a library style', r.src);
    }
    if (!insideInstance && !hidden) {
      for (const prop of ['fills', 'strokes']) {
        const paints = prop === 'fills' && isMixed(node.fills) ? segmentPaints : node[prop];
        if (!Array.isArray(paints)) continue;
        const styled = prop === 'fills' ? node.fillStyleId : node.strokeStyleId;
        if (styled && !isMixed(styled)) continue;
        for (const p of paints) {
          if (p.visible === false || p.type !== 'SOLID') continue;
          if (aliasIds(p.boundVariables).length) continue;
          const hex = '#' + ['r', 'g', 'b'].map((c) => Math.round(p.color[c] * 255).toString(16).padStart(2, '0')).join('');
          count('raw color');
          add(4, frame, node, roleOf(node), `raw ${prop === 'fills' ? 'fill' : 'stroke'} ${hex} with no variable or style`, 'a library variable or style', `raw ${hex}`);
        }
      }
    }
  }
};

// ---- run --------------------------------------------------------------------------------------------------------
await checkControlLabels();
await checkPairing();
await checkPageToPage();
await checkBindings();

findings.sort((a, b) => a.check - b.check || a.frame.localeCompare(b.frame) || a.role.localeCompare(b.role));
const NAMES = { 1: 'control label', 2: 'pairing', 3: 'page to page', 4: 'binding' };
const byCheck = { 1: 0, 2: 0, 3: 0, 4: 0 };
for (const f of findings) byCheck[f.check]++;
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const MAX_ROWS = 200;
const table = [
  '| # | Check | Frame | Node | Role | Expected | Actual | Detail |',
  '|---|---|---|---|---|---|---|---|',
  ...findings.slice(0, MAX_ROWS).map((f, i) => `| ${i + 1} | ${f.check} ${NAMES[f.check]} | ${cell(f.frame)} | ${cell(f.node)} ${f.nodeId ? `(${f.nodeId})` : ''} | ${cell(f.role)} | ${cell(f.expected)} | ${cell(f.actual)} | ${cell(f.detail)} |`),
  ...(findings.length > MAX_ROWS ? [`| … | ${findings.length - MAX_ROWS} more in findings | | | | | | |`] : []),
].join('\n');
const date = new Date().toISOString().slice(0, 10);
const label = input.label || scopeName;
const runsRow = `| ${input.run ?? '?'} | ${date} | ${cell(label)} | ${frames.length} | ${findings.length} (1: ${byCheck[1]}, 2: ${byCheck[2]}, 3: ${byCheck[3]}, 4: ${byCheck[4]}) | ? | ? | ? |`;

return {
  scope: label,
  frames: frameInfo,
  coverage: {
    frames: frames.length,
    texts: texts.length,
    textsWithoutRole: texts.filter((t) => !t.role).length,
    instances: instances.length,
    controls: instances.filter((i) => i.isControl).length,
    nodes: all.length,
    bindingSources: sources,
  },
  library: lib,
  counts: byCheck,
  findings,
  table,
  runsRow,
  ms: Date.now() - started,
};
