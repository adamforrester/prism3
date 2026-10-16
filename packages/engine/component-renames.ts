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
  /** A value that LEFT its axis for a coordinate on others (#2751, owner Q354): `state=error` became
   *  `state=rest, status=error` when validation moved off the state axis. The segment `axis=from` is replaced
   *  by every `axis=value` in `to`, so one member lands on one coordinate and keeps its id. A `to` axis the
   *  coordinate already carries with another value is a ledger error, refused by throwing. */
  | { readonly def: string; readonly kind: 'move'; readonly axis: string; readonly from: string; readonly to: Readonly<Record<string, string>>; readonly issue: number }
  /** A value, an axis or a whole def that is gone with no successor. An update keeps its members, marked
   *  deprecated (owner decision Q85 A, §10 Q2); the entry says the removal was meant. With `axis` and no
   *  `value` the whole axis is gone; with neither, the whole def. */
  | { readonly def: string; readonly kind: 'drop'; readonly axis?: string; readonly value?: string; readonly issue: number };

/**
 * THE LEDGER. Names are the Figma panel's, as a set holds them: an axis renamed only for display
 * (`variantAxisNames`) is an axis rename here, and arm B of the lint demands its entry.
 *
 * Accordion's two entries are for sets built from #2534 before it merged (#2592): its icon axis was `position`, then
 * `iconPosition`, then shown as `icon position`, all inside that one PR, so no merge base ever held the earlier names
 * and the lint had nothing to demand. A file built from either head is updated in place through them.
 *
 * The checkbox and switch controls' entries are owner Q354 (#2751): error left the state axis for the fields'
 * `status` axis, so a member built at `state=error` is the member now at `state=rest, status=error`, and an instance
 * placed at error keeps showing it. Every other member gains `status=default`, the plan's first value, as any added
 * axis does.
 */
export const COMPONENT_RENAMES: readonly ComponentRename[] = [
  { def: 'accordion', kind: 'axis', from: 'position', to: 'icon position', issue: 2592 },
  { def: 'accordion', kind: 'axis', from: 'iconPosition', to: 'icon position', issue: 2592 },
  { def: 'checkbox-control', kind: 'move', axis: 'state', from: 'error', to: { state: 'rest', status: 'error' }, issue: 2751 },
  { def: 'switch-control', kind: 'move', axis: 'state', from: 'error', to: { state: 'rest', status: 'error' }, issue: 2751 },
];

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
 * with every value and axis rename applied, chains included (`sm` → `small` → `s` resolves to `s`), then every
 * move (a value that left its axis for a coordinate on others).
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
  // MOVES, after the renames have settled the names they are written against. Each applies once: a move's `to`
  // is a coordinate on the new axes, never itself the `from` of another move.
  for (const mv of mine) {
    if (mv.kind !== 'move') continue;
    const at = pairs.findIndex(([a, v]) => a === mv.axis && v === mv.from);
    if (at < 0) continue;
    const rest = pairs.filter((_, i) => i !== at);
    for (const [a, v] of Object.entries(mv.to)) {
      const had = rest.find(([x]) => x === a);
      if (had && had[1] !== v) throw new Error(`COMPONENT_RENAMES: the move of ${mv.axis}=${mv.from} on '${def}' sets ${a}=${v}, and the coordinate already carries ${a}=${had[1]}`);
      if (!had) rest.push([a, v]);
    }
    pairs = rest;
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

/** `schema/component-axes.json`'s shape: per def, each axis with its sorted values, and the member count. */
export type AxesBaseline = Record<string, { axes: Record<string, string[]>; members: number }>;

/** The differences between `before` and `after` that the ledger must claim, each as a line naming the
 *  missing claim. `lint-component-renames.ts` prints them. */
export const unaccounted = (before: AxesBaseline, after: AxesBaseline, ledger: readonly ComponentRename[]): string[] => {
  const bad: string[] = [];
  for (const [def, b] of Object.entries(before)) {
    const mine = ledger.filter((r) => r.def === def);
    const a = after[def];
    if (!a) {
      if (!mine.some((r) => r.kind === 'drop' && r.axis === undefined && r.value === undefined))
        bad.push(`${def}: the def no longer projects a set — needs { def: '${def}', kind: 'drop', issue }`);
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
          (r.kind === 'move' && r.axis === axisNow && r.from === v) ||
          (r.kind === 'drop' && (r.axis === axis || r.axis === axisNow) && r.value === v));
        if (!claimed)
          bad.push(`${def}: ${axisNow}=${v} is gone — needs { kind: 'value', axis: '${axisNow}', from: '${v}', to }, { kind: 'move', axis: '${axisNow}', from: '${v}', to: { … } } or { kind: 'drop', axis: '${axisNow}', value: '${v}' }`);
      }
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
    if (r.kind === 'drop') continue;
    const a = after[r.def];
    if (!a) {
      if (!ledger.some((d) => d.def === r.def && d.kind === 'drop' && d.axis === undefined && d.value === undefined))
        bad.push(`${r.def}: entry ${JSON.stringify(r)} renames into a def that no longer projects`);
      continue;
    }
    if (r.kind === 'move') {
      // Every segment it lands on must be one the def projects.
      for (const [ax, v] of Object.entries(r.to))
        if (!a.axes[ax]?.includes(v)) bad.push(`${r.def}: move entry ${r.axis}=${r.from} → ${ax}=${v}, which the def does not project`);
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

