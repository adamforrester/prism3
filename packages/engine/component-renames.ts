/**
 * Prism3 engine — COMPONENT RENAMES: the declared ledger of variant renames (#2265, owner decision Q85 A, §10 Q3).
 *
 * A component set's members are matched to the plan by their VARIANT COORDINATE, the sorted `axis=value`
 * list (`coordKey` below). That match cannot see a rename: when a def renames a value (`size=sm` →
 * `size=small`) or an axis, the old members and the new plan share no coordinate, and a diff of the two
 * reads as one member dropped and one added. Figma tracks an instance by its main component's id, so the
 * difference matters: a member renamed in place keeps its key and every instance of it in other files,
 * while a dropped member plus a new one breaks those instances after the library is published.
 *
 * So a rename is DECLARED here, and an update renames the members in place. Nothing infers one: a
 * drop/add pair that differs in one value is shown as a POSSIBLE rename, never acted on.
 *
 * `lint-component-renames.ts` is the forcing function. It compares the committed axes baseline
 * (`schema/component-axes.json`) at the merge base with the tree, and fails a PR in which a def, an axis
 * or a value disappears without an entry here. The pattern is `materialization-renames.ts`'s, one layer
 * over: an authored rule supplies the pairing, and a diff read from git supplies the compulsion.
 *
 * PURE, and it imports nothing that produces a coordinate. The lint checks this ledger against coordinates
 * made by another revision of the engine; a ledger derived from today's projection would agree with it
 * by construction (`docs/34` shape 11).
 */

/** One declared change to a def's variant coordinates. `issue` is the issue that made the change. */
export type ComponentRename =
  /** A value on one axis renamed, e.g. `size` `sm` → `small`. */
  | { readonly def: string; readonly kind: 'value'; readonly axis: string; readonly from: string; readonly to: string; readonly issue: number }
  /** An axis renamed, its values kept, e.g. `tone` → `appearance`. */
  | { readonly def: string; readonly kind: 'axis'; readonly from: string; readonly to: string; readonly issue: number }
  /** A value, an axis or a whole def that is gone with no successor. An update keeps its members, marked
   *  deprecated (owner decision Q85 A, §10 Q2); the entry says the removal was meant. With `axis` and no
   *  `value` the whole axis is gone; with neither, the whole def. */
  | { readonly def: string; readonly kind: 'drop'; readonly axis?: string; readonly value?: string; readonly issue: number }
  /** A component property renamed in the Figma panel, its type kept (#2759, owner decision Q345 A), e.g.
   *  `State icon` → `state icon`. An update renames the set's property in place, so every instance keeps the
   *  value a designer gave it. Names are the panel's, without Figma's `#id` suffix. */
  | { readonly def: string; readonly kind: 'property'; readonly from: string; readonly to: string; readonly issue: number }
  /** A whole def renamed (#2759, owner decisions Q349, Q353, Q355), e.g. `tab` → `_tab-item`. `def` is the OLD id, and
   *  `to` the new. The set's name in Figma is the def id, so an update finds the set under its old name and renames it
   *  in place: the set and every member keep their ids, and every placed instance keeps pointing at them. Entries for
   *  the def's axes, values and properties after the rename name the NEW id. */
  | { readonly def: string; readonly kind: 'def'; readonly to: string; readonly issue: number }
  /** A part renamed, which is a layer renamed in every member (#2759, owner decision Q350). An update renames the
   *  layer in place instead of removing it and building a new one, so it keeps its id and every override a designer
   *  made on it in a placed instance. A def's part entries apply together, as one map from old name to new, so two
   *  parts can swap names in one revision (FieldLabel's root and text). The root part is not a layer: the member is. */
  | { readonly def: string; readonly kind: 'part'; readonly from: string; readonly to: string; readonly issue: number };

/**
 * THE LEDGER. Names are the Figma panel's, as a set holds them: an axis renamed only for display
 * (`variantAxisNames`) is an axis rename here, and arm B of the lint demands its entry.
 *
 * Accordion's two entries are for sets built from #2534 before it merged (#2592): its icon axis was `position`, then
 * `iconPosition`, then shown as `icon position`, all inside that one PR, so no merge base ever held the earlier names
 * and the lint had nothing to demand. A file built from either head is updated in place through them.
 */
export const COMPONENT_RENAMES: readonly ComponentRename[] = [
  { def: 'accordion', kind: 'axis', from: 'position', to: 'icon position', issue: 2592 },
  { def: 'accordion', kind: 'axis', from: 'iconPosition', to: 'icon position', issue: 2592 },
  // #2759 PR 4 — layers named per the naming table (owner decision Q350): glyph layers `<shape>Glyph`, a Row's control cell
  // `controlCell`, main text `label`. Roots are not layers (Divider's and FieldLabel's root renames need no entry).
  { def: 'checkbox-control', kind: 'part', from: 'mark', to: 'checkGlyph', issue: 2759 },
  { def: 'checkbox-control', kind: 'part', from: 'dash', to: 'dashGlyph', issue: 2759 },
  { def: 'field-message', kind: 'part', from: 'iconError', to: 'errorGlyph', issue: 2759 },
  { def: 'field-message', kind: 'part', from: 'iconWarning', to: 'warningGlyph', issue: 2759 },
  { def: 'field-message', kind: 'part', from: 'iconSuccess', to: 'successGlyph', issue: 2759 },
  { def: 'field-message', kind: 'part', from: 'text', to: 'label', issue: 2759 },
  { def: 'textarea', kind: 'part', from: 'grip', to: 'gripGlyph', issue: 2759 },
  { def: 'select', kind: 'part', from: 'chevron', to: 'chevronGlyph', issue: 2759 },
  { def: 'image-placeholder', kind: 'part', from: 'marker', to: 'markerGlyph', issue: 2759 },
  { def: 'spinner', kind: 'part', from: 'ring', to: 'ringGlyph', issue: 2759 },
  { def: 'tag', kind: 'part', from: 'check', to: 'checkGlyph', issue: 2759 },
  { def: '_accordion-indicator', kind: 'part', from: 'chevronDown', to: 'chevronDownGlyph', issue: 2759 },
  { def: '_accordion-indicator', kind: 'part', from: 'chevronUp', to: 'chevronUpGlyph', issue: 2759 },
  { def: '_accordion-indicator', kind: 'part', from: 'plus', to: 'plusGlyph', issue: 2759 },
  { def: '_accordion-indicator', kind: 'part', from: 'minus', to: 'minusGlyph', issue: 2759 },
  { def: 'checkbox-row', kind: 'part', from: 'controlBox', to: 'controlCell', issue: 2759 },
  { def: 'radio-row', kind: 'part', from: 'controlBox', to: 'controlCell', issue: 2759 },
  { def: 'switch-row', kind: 'part', from: 'trackBox', to: 'controlCell', issue: 2759 },
  { def: 'field-label', kind: 'part', from: 'text', to: 'label', issue: 2759 },
  { def: 'badge', kind: 'part', from: 'text', to: 'label', issue: 2759 },
  { def: '_list-item', kind: 'part', from: 'text', to: 'label', issue: 2759 },
  // #2759 PR 3 — a part used only inside its parent takes the `_` prefix (owner decisions Q349, Q353, Q355).
  { def: 'segmented-control-segment', kind: 'def', to: '_segmented-control-segment', issue: 2759 },
  { def: 'tab', kind: 'def', to: '_tab-item', issue: 2759 },
  { def: 'list-item', kind: 'def', to: '_list-item', issue: 2759 },
  // #2759 PR 2 — Figma property names are lowercase (owner decision Q345 A).
  { def: 'switch-control', kind: 'property', from: 'State icon', to: 'state icon', issue: 2759 },
  { def: 'image-placeholder', kind: 'property', from: 'Marker', to: 'marker', issue: 2759 },
  { def: 'tag', kind: 'property', from: 'Check icon', to: 'check icon', issue: 2759 },
  { def: 'segmented-control', kind: 'property', from: 'Label', to: 'label', issue: 2759 },
];

/** The id a def has now, its ledger renames followed (`a` → `b` → `c` resolves to `c`). The id itself when the
 *  ledger does not rename it. A cycle is a ledger error, refused by throwing. */
export const currentDefId = (id: string, ledger: readonly ComponentRename[] = COMPONENT_RENAMES): string => {
  let at = id;
  const seen = new Set([id]);
  for (;;) {
    const next = ledger.find((r): r is Extract<ComponentRename, { kind: 'def' }> => r.kind === 'def' && r.def === at);
    if (!next) return at;
    if (seen.has(next.to)) throw new Error(`COMPONENT_RENAMES: the def renames from '${id}' loop back to '${next.to}'`);
    seen.add(next.to);
    at = next.to;
  }
};

/** Every earlier id the ledger renames into `id`, nearest first: the names a file built before the renames holds
 *  the set under. */
export const formerDefIds = (id: string, ledger: readonly ComponentRename[] = COMPONENT_RENAMES): string[] => {
  const out: string[] = [];
  const walk = (to: string): void => {
    for (const r of ledger) if (r.kind === 'def' && r.to === to && !out.includes(r.def) && r.def !== id) { out.push(r.def); walk(r.def); }
  };
  walk(id);
  return out;
};

/** `def`'s part renames as one map from old layer name to new (see the `part` kind). A name renamed twice is a ledger
 *  error, refused by throwing: the map would not say which. */
export const partRenames = (def: string, ledger: readonly ComponentRename[] = COMPONENT_RENAMES): Map<string, string> => {
  const out = new Map<string, string>();
  for (const r of ledger) {
    if (r.kind !== 'part' || r.def !== def) continue;
    if (out.has(r.from)) throw new Error(`COMPONENT_RENAMES: '${def}' renames the part '${r.from}' twice`);
    out.set(r.from, r.to);
  }
  return out;
};

/**
 * Where a property named `name` on `def`'s set lands under the ledger's property renames, chains followed
 * (`A` → `B` → `c` resolves to `c`). `null` when the ledger does not rename it. A cycle is a ledger error,
 * refused by throwing, as `renameCoordinate` refuses one.
 */
export const renameProperty = (def: string, name: string, ledger: readonly ComponentRename[] = COMPONENT_RENAMES): string | null => {
  let at = name;
  const seen = new Set([name]);
  for (;;) {
    const next = ledger.find((r): r is Extract<ComponentRename, { kind: 'property' }> => r.def === def && r.kind === 'property' && r.from === at);
    if (!next) break;
    if (seen.has(next.to)) throw new Error(`COMPONENT_RENAMES: the property renames for '${def}' loop back to '${next.to}'`);
    seen.add(next.to);
    at = next.to;
  }
  return at === name ? null : at;
};

/** A coordinate as its canonical key: the `axis=value` segments, sorted by axis, joined with `, `. Two
 *  names that differ only in segment order share one key (Figma rewrites the order when an axis is renamed
 *  in its UI). `null` for a name that is not a coordinate: any segment without `=`, or an axis named twice. */
export const coordKey = (name: string): string | null => {
  const segs = name.split(', ');
  const pairs: [string, string][] = [];
  for (const s of segs) {
    const at = s.indexOf('=');
    if (at <= 0) return null;
    pairs.push([s.slice(0, at), s.slice(at + 1)]);
  }
  const axes = new Set(pairs.map(([a]) => a));
  if (axes.size !== pairs.length) return null;
  return pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([a, v]) => `${a}=${v}`).join(', ');
};

/** The `axis → value` pairs of a canonical key, in its order. */
export const coordPairs = (key: string): [string, string][] =>
  key.split(', ').map((s) => [s.slice(0, s.indexOf('=')), s.slice(s.indexOf('=') + 1)]);

/** The canonical key of a set of pairs. */
const keyOf = (pairs: readonly (readonly [string, string])[]): string =>
  [...pairs].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([a, v]) => `${a}=${v}`).join(', ');

/**
 * Where an existing member's coordinate lands under the ledger's renames for `def`: its canonical key,
 * with every value and axis rename applied, chains included (`sm` → `small` → `s` resolves to `s`).
 * Drops are not applied: a dropped value has no successor to land on. `renamed` says whether anything moved.
 *
 * A CYCLE IS A LEDGER ERROR, refused by throwing: `a` → `b` → `a` names no coordinate the plan could hold.
 */
export const renameCoordinate = (def: string, key: string, ledger: readonly ComponentRename[] = COMPONENT_RENAMES): { key: string; renamed: boolean } => {
  const mine = ledger.filter((r) => r.def === def);
  let pairs = coordPairs(key);
  const seen = new Set<string>([keyOf(pairs)]);
  for (;;) {
    let moved = false;
    pairs = pairs.map(([a, v]) => {
      const ax = mine.find((r): r is Extract<ComponentRename, { kind: 'axis' }> => r.kind === 'axis' && r.from === a);
      const axis = ax ? ax.to : a;
      const val = mine.find((r) => r.kind === 'value' && r.axis === axis && r.from === v);
      if (ax || val) moved = true;
      return [axis, val ? (val as { to: string }).to : v];
    });
    if (!moved) break;
    const k = keyOf(pairs);
    if (seen.has(k)) throw new Error(`COMPONENT_RENAMES: the renames for '${def}' loop back to ${k}`);
    seen.add(k);
  }
  const out = keyOf(pairs);
  return { key: out, renamed: out !== key };
};

/** Whether the ledger declares that `axis=value` (or the whole axis, or the whole def) on `def` was
 *  removed on purpose. */
export const isDeclaredDrop = (def: string, axis: string | null, value: string | null, ledger: readonly ComponentRename[] = COMPONENT_RENAMES): boolean =>
  ledger.some((r) => r.def === def && r.kind === 'drop'
    && (r.axis === undefined || (axis !== null && r.axis === axis))
    && (r.value === undefined || (value !== null && r.value === value)));

// ---- the accounting `lint-component-renames.ts` runs ---------------------------------------------------

/** `schema/component-axes.json`'s shape: per def, each axis with its sorted values, the member count, and the
 *  set's component properties by panel name with their type (#2759; absent in a baseline written before it). */
export type AxesBaseline = Record<string, { axes: Record<string, string[]>; members: number; properties?: Record<string, string> }>;

/** The differences between `before` and `after` that the ledger must claim, each as a line naming the
 *  missing claim. `lint-component-renames.ts` prints them. */
export const unaccounted = (before: AxesBaseline, after: AxesBaseline, ledger: readonly ComponentRename[]): string[] => {
  const bad: string[] = [];
  for (const [old, b] of Object.entries(before)) {
    // A RENAMED DEF (#2759) is compared under its new id, with the entries for either id.
    let def = old;
    try { def = after[old] ? old : currentDefId(old, ledger); } catch (err) { bad.push(`${old}: ${(err as Error).message}`); continue; }
    const mine = ledger.filter((r) => r.def === def || r.def === old);
    const a = after[def];
    if (!a) {
      if (def !== old) bad.push(`${old}: the def entry renames it to '${def}', which projects no set`);
      else if (!mine.some((r) => r.kind === 'drop' && r.axis === undefined && r.value === undefined))
        bad.push(`${def}: the def no longer projects a set — needs { def: '${def}', kind: 'drop', issue } or { def: '${def}', kind: 'def', to, issue }`);
      continue;
    }
    for (const [axis, values] of Object.entries(b.axes)) {
      const axisMove = mine.find((r) => r.kind === 'axis' && r.from === axis) as { to: string } | undefined;
      const axisNow = axisMove ? axisMove.to : axis;
      if (!a.axes[axisNow]) {
        if (!mine.some((r) => r.kind === 'drop' && r.axis === axis && r.value === undefined))
          bad.push(`${def}: axis '${axis}' is gone — needs { kind: 'axis', from: '${axis}', to } or { kind: 'drop', axis: '${axis}' }`);
        continue;
      }
      for (const v of values) {
        if (a.axes[axisNow].includes(v)) continue;
        const claimed = mine.some((r) =>
          (r.kind === 'value' && r.axis === axisNow && r.from === v) ||
          (r.kind === 'drop' && (r.axis === axis || r.axis === axisNow) && r.value === v));
        if (!claimed)
          bad.push(`${def}: ${axisNow}=${v} is gone — needs { kind: 'value', axis: '${axisNow}', from: '${v}', to } or { kind: 'drop', axis: '${axisNow}', value: '${v}' }`);
      }
    }
    // A PROPERTY that left the set (#2759). Without an entry, an update deletes it and adds the new one, and every
    // instance loses the value a designer gave it. Compared only when both baselines carry properties.
    if (b.properties && a.properties)
      for (const name of Object.keys(b.properties)) {
        if (name in a.properties) continue;
        if (!mine.some((r) => r.kind === 'property' && r.from === name))
          bad.push(`${def}: property '${name}' is gone — needs { kind: 'property', from: '${name}', to } so instances keep their values`);
      }
  }
  return bad;
};

/** Every ledger entry whose successor is absent from the tree's projection. A value entry's `to` may
 *  itself have been renamed by a later entry, so the chain is followed to its end first. */
export const danglingTargets = (after: AxesBaseline, ledger: readonly ComponentRename[]): string[] => {
  const bad: string[] = [];
  for (const r of ledger) {
    if (!Number.isInteger(r.issue) || r.issue <= 0) bad.push(`${r.def}: entry ${JSON.stringify(r)} names no issue`);
    if (r.kind === 'drop' || r.kind === 'part') continue;
    if (r.kind === 'def') {
      let to = r.to;
      try { to = currentDefId(r.def, ledger); } catch (err) { bad.push(`${r.def}: ${(err as Error).message}`); continue; }
      if (!after[to]) bad.push(`${r.def}: def entry → '${r.to}' ends at '${to}', which projects no set`);
      continue;
    }
    const a = after[r.def];
    if (!a) {
      if (!ledger.some((d) => d.def === r.def && d.kind === 'drop' && d.axis === undefined && d.value === undefined))
        bad.push(`${r.def}: entry ${JSON.stringify(r)} renames into a def that no longer projects`);
      continue;
    }
    if (r.kind === 'property') {
      // A property entry's successor must be declared on the set.
      if (!a.properties) continue;
      let to: string | null = null;
      try { to = renameProperty(r.def, r.from, ledger); } catch (err) { bad.push(`${r.def}: ${(err as Error).message}`); continue; }
      if (to === null || !(to in a.properties))
        bad.push(`${r.def}: property entry '${r.from}' → '${r.to}' ends at '${to ?? r.to}', which the set does not declare`);
      continue;
    }
    if (r.kind === 'axis') {
      let to = r.to; const seen = new Set([r.from]);
      for (let next = ledger.find((x) => x.def === r.def && x.kind === 'axis' && x.from === to); next && next.kind === 'axis' && !seen.has(to); next = ledger.find((x) => x.def === r.def && x.kind === 'axis' && x.from === to)) { seen.add(to); to = next.to; }
      if (!a.axes[to] && !ledger.some((d) => d.def === r.def && d.kind === 'drop' && d.axis === to && d.value === undefined))
        bad.push(`${r.def}: axis entry ${r.from} → ${r.to} ends at '${to}', which the def does not project`);
    } else {
      let to = r.to; const seen = new Set([r.from]);
      for (let next = ledger.find((x) => x.def === r.def && x.kind === 'value' && x.axis === r.axis && x.from === to); next && next.kind === 'value' && !seen.has(to); next = ledger.find((x) => x.def === r.def && x.kind === 'value' && x.axis === r.axis && x.from === to)) { seen.add(to); to = next.to; }
      const values = a.axes[r.axis];
      const dropped = ledger.some((d) => d.def === r.def && d.kind === 'drop' && d.axis === r.axis && (d.value === undefined || d.value === to));
      if ((!values || !values.includes(to)) && !dropped)
        bad.push(`${r.def}: value entry ${r.axis} ${r.from} → ${r.to} ends at '${to}', which the def does not project`);
    }
  }
  return bad;
};

