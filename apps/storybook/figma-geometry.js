/*
 * FIGMA'S SIDE OF THE GEOMETRY RECORD (#3408 S6, KPI 2 with Q32 A). Run on the Mac, through the Desktop Bridge
 * (`figma_execute`), in the file the job names; see `figma-geometry.md`. It READS ONLY: no node, page, style,
 * variable or version is written.
 *
 * For every member of the `button`, `text-field` and `password-field` component sets on any page of the open file,
 * it records what Figma actually lays out, from world coordinates (`absoluteBoundingBox`), not declared values:
 *   - the member's extent, padding (each side), stroke weight (each side) and corner radii;
 *   - each visible descendant's box, relative to the member's top left, keyed by its layer path (`container/label`;
 *     the member itself is `container`), with its node id, its type and its horizontal sizing (FIXED, HUG or FILL).
 * The variant is the member's own `variantProperties`.
 *
 * It returns the record as a JSON string. Save it UNEDITED as `apps/storybook/figma-geometry.json`. The IIFE is
 * RETURNED: `figma_execute` wraps the code in an async function body and hands back only an explicit `return`, so a
 * bare `(async () => { ... })();` comes back `undefined` (the first live run). `compare-figma-geometry.ts --self-test`
 * runs this source the same way, against a stub file, and fails unless the record comes back.
 * `compare-figma-geometry.ts` holds it against the code's record.
 */
return (async () => {
  const SETS = ['button', 'text-field', 'password-field'];
  const r2 = (n) => Math.round(n * 100) / 100;
  await figma.loadAllPagesAsync();
  const sets = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }).filter((s) => SETS.includes(s.name));
  const out = { format: '1.0', source: 'figma', file: '(not recorded: the file name stays out of the repo)', note: 'Boxes relative to the member\'s top left, from absoluteBoundingBox, in px, to 0.01. Parts keyed by layer path.', components: {} };
  for (const set of sets) {
    const members = [];
    // the set's BOOLEAN component properties (e.g. "leading icon", "message") at their defaults: what each member shows
    const properties = {};
    for (const [key, def] of Object.entries(set.componentPropertyDefinitions || {})) if (def.type === 'BOOLEAN') properties[key.split('#')[0]] = String(def.defaultValue);
    for (const m of set.children) {
      if (m.type !== 'COMPONENT') continue;
      const o = m.absoluteBoundingBox;
      const parts = {};
      const walk = (n, path) => {
        for (const c of n.children || []) {
          if (c.visible === false) continue;
          const p = `${path}/${c.name}`;
          const b = c.absoluteBoundingBox;
          if (b) parts[p] = { id: c.id, type: c.type, sizing: c.layoutSizingHorizontal || null, x: r2(b.x - o.x), y: r2(b.y - o.y), w: r2(b.width), h: r2(b.height), ...(c.type === 'TEXT' ? { text: c.characters } : {}) };
          if (c.type !== 'TEXT') walk(c, p);
        }
      };
      walk(m, 'container');
      const weight = typeof m.strokeWeight === 'number' ? m.strokeWeight : 0;
      members.push({
        id: m.id,
        variant: m.variantProperties || {},
        properties,
        root: {
          w: r2(o.width), h: r2(o.height), sizing: m.layoutSizingHorizontal || null, minWidth: typeof m.minWidth === 'number' ? r2(m.minWidth) : null,
          padding: [m.paddingTop, m.paddingRight, m.paddingBottom, m.paddingLeft].map((v) => r2(v || 0)),
          border: m.strokes && m.strokes.length ? [m.strokeTopWeight, m.strokeRightWeight, m.strokeBottomWeight, m.strokeLeftWeight].map((v) => r2(typeof v === 'number' ? v : weight)) : [0, 0, 0, 0],
          radius: [m.topLeftRadius, m.topRightRadius, m.bottomRightRadius, m.bottomLeftRadius].map((v) => r2(typeof v === 'number' ? v : (typeof m.cornerRadius === 'number' ? m.cornerRadius : 0))),
        },
        parts,
      });
    }
    out.components[set.name] = { setId: set.id, members };
  }
  return JSON.stringify(out);
})();
