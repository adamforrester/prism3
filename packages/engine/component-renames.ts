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
  | { readonly def: string; readonly kind: 'drop'; readonly axis?: string; readonly value?: string; readonly issue: number }
  /** Repeating rows behind Figma-only BOOLEAN properties replaced by one native SLOT property (#2649, owner decision
   *  Q307 A). `booleans` are the removed properties' panel names; `rows` are the old row layers, in their order in the
   *  member, as direct children of the layer that held them (`from`). An update moves each placed instance's VISIBLE
   *  rows into the slot as items, in this order, and lists what it moves (`apps/plugin/src/slot-migration.ts`). */
  | { readonly def: string; readonly kind: 'slot'; readonly slot: string; readonly from: string | readonly string[]; readonly rows: readonly string[]; readonly booleans: readonly string[]; readonly issue: number;
      /** #2661 — the def whose NESTED instance holds the slot, when the slot is not the set's own. Dialog's footer buttons
       *  moved into a nested Button.Group's `items` slot, which holds its own default buttons; so the update keeps those
       *  defaults and writes each placed instance's CHANGED values (a label typed over "Button") onto them, in order,
       *  replacing nothing. `from` may then name one layer per member shape (`footerInline`, `footerStacked`). */
      readonly within?: string }
  /** A non-variant component property (BOOLEAN, TEXT, INSTANCE_SWAP or SLOT) gone with no successor, by its panel name. */
  | { readonly def: string; readonly kind: 'property'; readonly property: string; readonly issue: number }
  /** A component property renamed in the Figma panel, its type kept (#2759, owner decision Q345 A), e.g.
   *  `State icon` → `state icon`. An update renames the set's property in place, so every instance keeps the
   *  value a designer gave it. Names are the panel's, without Figma's `#id` suffix. */
  | { readonly def: string; readonly kind: 'property-rename'; readonly from: string; readonly to: string; readonly issue: number }
  /** A whole def renamed (#2759, owner decisions Q353, Q394), e.g. `tab` → `tab-item`. `def` is the OLD id, and
   *  `to` the new. The set's name in Figma is the def id, so an update finds the set under its old name and renames it
   *  in place: the set and every member keep their ids, and every placed instance keeps pointing at them. Entries for
   *  the def's axes, values and properties after the rename name the NEW id. */
  | { readonly def: string; readonly kind: 'def'; readonly to: string; readonly issue: number }
  /** A part renamed, which is a layer renamed in every member (#2759, owner decision Q350). An update renames the
   *  layer in place instead of removing it and building a new one, so it keeps its id and every override a designer
   *  made on it in a placed instance. A def's part entries apply together, as one map from old name to new, so two
   *  parts can swap names in one revision (FieldLabel's root and text). The root part is not a layer: the member is. */
  | { readonly def: string; readonly kind: 'part'; readonly from: string; readonly to: string; readonly issue: number }
  /** A native slot's plain TEXT moved out to a TEXT property beside it (#3225, owner decision Q-BN2.2 A). The slot stays
   *  for rich content behind the boolean `show`, off by default and empty, and the sentence moves to a text part the
   *  boolean `hide` shows. `slot` is the slot's layer name BEFORE the update and `text` the one text layer its default
   *  content held. An update reads every placed instance's slot before the set changes, then: a slot still holding its
   *  one text with the default characters needs nothing; one holding that text with EDITED characters has them written
   *  into `property` (so an agent can set them from then on); one holding anything else turns `show` on and `hide` off,
   *  so the content stays where it is; an emptied one turns `hide` off. Every instance moved is listed
   *  (`apps/plugin/src/slot-text-migration.ts`). `lint-component-renames.ts` demands the entry when a def that held a
   *  slot gains a TEXT property on a sibling of it. */
  | { readonly def: string; readonly kind: 'slot-text'; readonly slot: string; readonly text: string; readonly property: string; readonly show: string; readonly hide: string; readonly issue: number };

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
  // #2759 PR 3 — Tab is renamed Tab item (owner decision Q353). It is Tabs' slot item, so it stays unprefixed (Q394 A).
  { def: 'tab', kind: 'def', to: 'tab-item', issue: 2759 },
  { def: 'checkbox-control', kind: 'move', axis: 'state', from: 'error', to: { state: 'rest', status: 'error' }, issue: 2751 },
  { def: 'switch-control', kind: 'move', axis: 'state', from: 'error', to: { state: 'rest', status: 'error' }, issue: 2751 },
  // The repeating rows moved into a native `items` slot (#2649, owner decision Q307 A). `from` is the layer that held
  // the rows; `rows` are its row layers in order, the first of them always shown (no boolean of its own).
  { def: 'checkbox-group', kind: 'slot', slot: 'items', from: 'container', rows: ['row1', 'row2', 'row3', 'row4', 'row5', 'row6', 'row7', 'row8'], booleans: ['Option 2', 'Option 3', 'Option 4', 'Option 5', 'Option 6', 'Option 7', 'Option 8'], issue: 2649 },
  { def: 'radio-group', kind: 'slot', slot: 'items', from: 'container', rows: ['row1', 'row2', 'row3', 'row4', 'row5', 'row6', 'row7', 'row8'], booleans: ['Option 2', 'Option 3', 'Option 4', 'Option 5', 'Option 6', 'Option 7', 'Option 8'], issue: 2649 },
  { def: 'tabs', kind: 'slot', slot: 'items', from: 'list', rows: ['tab1', 'tab2', 'tab3', 'tab4', 'tab5', 'tab6'], booleans: ['Tab 4', 'Tab 5', 'Tab 6'], issue: 2649 },
  { def: 'list', kind: 'slot', slot: 'items', from: 'container', rows: ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8'], booleans: ['Item 4', 'Item 5', 'Item 6', 'Item 7', 'Item 8'], issue: 2649 },
  { def: 'segmented-control', kind: 'slot', slot: 'items', from: 'track', rows: ['segment1', 'segment2', 'segment3', 'segment4', 'segment5'], booleans: ['Segment 3', 'Segment 4', 'Segment 5'], issue: 2649 },
  // Dialog's footer buttons moved into a nested Button.Group's `items` slot (#2661, owner decision Q363). The two footer
  // layers each held two fixed Buttons; the group's slot holds the same two by default, so a placed Dialog keeps its
  // changed labels on them, in order. No property left the set, so there are no booleans.
  { def: 'dialog', kind: 'slot', slot: 'items', within: 'button-group', from: ['footerInline', 'footerStacked'], rows: ['cancelInline', 'confirmInline', 'confirmStacked', 'cancelStacked'], booleans: [], issue: 2661 },
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
  { def: 'list-item', kind: 'part', from: 'text', to: 'label', issue: 2759 },
  // #3148 (owner decision Q847 A) — BrandMark is ProviderLogo: the sets are third-party providers' logos, not the
  // design system's own brand. Each mark is a single top-level component, so an update renames `brand-mark/<kind>/<name>`
  // to `provider-logo/<kind>/<name>` in place, every component keeping its id. The #2343 entries below were written
  // under the old id and name the new one, as entries after a def rename do.
  { def: 'brand-mark', kind: 'def', to: 'provider-logo', issue: 3148 },
  // #2343 PR 3 — the provider logos' kinds renamed, `card/` → `payment/` (Q780 A) and `wallet/` → `logo/` (Q783 A), as the
  // owner's artwork replaced the placeholders. Each mark is a single component, `provider-logo/<kind>/<name>`, so an update
  // renames the component in place and every instance keeps it. A wallet lockup was the logo in one ink; its black
  // form is the logo's successor, PayPal's lockup its wordmark. The white forms, and `provider/apple-white`, have none:
  // the owner's set draws one form per logo, and `provider/apple` is now the white glyph.
  ...(['amex', 'generic', 'mastercard', 'visa'] as const).map((n) => ({ def: 'provider-logo', kind: 'value', axis: 'name', from: `card/${n}`, to: `payment/${n}`, issue: 2343 }) as const),
  { def: 'provider-logo', kind: 'value', axis: 'name', from: 'wallet/apple-pay-black', to: 'logo/apple-pay', issue: 2343 },
  { def: 'provider-logo', kind: 'value', axis: 'name', from: 'wallet/google-pay-black', to: 'logo/google-pay', issue: 2343 },
  { def: 'provider-logo', kind: 'value', axis: 'name', from: 'wallet/paypal', to: 'logo/paypal-wordmark', issue: 2343 },
  { def: 'provider-logo', kind: 'value', axis: 'name', from: 'wallet/shop-pay', to: 'logo/shop-pay', issue: 2343 },
  { def: 'provider-logo', kind: 'drop', axis: 'name', value: 'wallet/apple-pay-white', issue: 2343 },
  { def: 'provider-logo', kind: 'drop', axis: 'name', value: 'wallet/google-pay-white', issue: 2343 },
  { def: 'provider-logo', kind: 'drop', axis: 'name', value: 'provider/apple-white', issue: 2343 },
  // #2759 PR 2 — Figma property names are lowercase (owner decision Q345 A).
  { def: 'switch-control', kind: 'property-rename', from: 'State icon', to: 'state icon', issue: 2759 },
  { def: 'image-placeholder', kind: 'property-rename', from: 'Marker', to: 'marker', issue: 2759 },
  { def: 'tag', kind: 'property-rename', from: 'Check icon', to: 'check icon', issue: 2759 },
  { def: 'segmented-control', kind: 'property-rename', from: 'Label', to: 'label', issue: 2759 },
  // #3225 (owner decisions 2026-11-01, Q-BN2.1 A and Q-BN2.2 A) — Banner's body. The sentence moves out of the slot into
  // the `body text` property, so an agent can set it; the slot stays for rich content behind `rich body`. The slot layer
  // is renamed `richBody` in place, with its SLOT property, so the `body` boolean can take the name and every placed
  // instance keeps what it holds in the slot. The update then carries each instance's body across (`slot-text`).
  { def: 'banner', kind: 'part', from: 'body', to: 'richBody', issue: 3225 },
  { def: 'banner', kind: 'property-rename', from: 'body', to: 'richBody', issue: 3225 },
  { def: 'banner', kind: 'slot-text', slot: 'body', text: 'placeholder', property: 'body text', show: 'rich body', hide: 'body', issue: 3225 },
];

/** The ledger's slot entry for `def`, if its rows moved into a native slot (#2649). */
export const slotMigrationOf = (def: string, ledger: readonly ComponentRename[] = COMPONENT_RENAMES): Extract<ComponentRename, { kind: 'slot' }> | undefined =>
  ledger.find((r): r is Extract<ComponentRename, { kind: 'slot' }> => r.def === def && r.kind === 'slot');

/** The ledger's slot-text entry for `def`, if its slot's plain text moved out to a TEXT property (#3225). */
export const slotTextMigrationOf = (def: string, ledger: readonly ComponentRename[] = COMPONENT_RENAMES): Extract<ComponentRename, { kind: 'slot-text' }> | undefined =>
  ledger.find((r): r is Extract<ComponentRename, { kind: 'slot-text' }> => r.def === def && r.kind === 'slot-text');

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
    const next = ledger.find((r): r is Extract<ComponentRename, { kind: 'property-rename' }> => r.def === def && r.kind === 'property-rename' && r.from === at);
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

/** `schema/component-axes.json`'s shape: per def, each axis with its sorted values, and the member count. Since #2649
 *  also its non-variant component properties, panel name → type; absent in a baseline written before then, which has
 *  nothing to compare on that side. A property renamed in place (#2759) is claimed by a `property-rename` entry. */
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
          (r.kind === 'move' && r.axis === axisNow && r.from === v) ||
          (r.kind === 'drop' && (r.axis === axis || r.axis === axisNow) && r.value === v));
        if (!claimed)
          bad.push(`${def}: ${axisNow}=${v} is gone — needs { kind: 'value', axis: '${axisNow}', from: '${v}', to }, { kind: 'move', axis: '${axisNow}', from: '${v}', to: { … } } or { kind: 'drop', axis: '${axisNow}', value: '${v}' }`);
      }
    }
    // THE COMPONENT PROPERTIES (#2649): a property at the base and not in the tree, or there under another type, must
    // be claimed. A BOOLEAN by a slot entry that names it, any type by a property drop, and a name renamed in place
    // by a property rename (#2759), without which an update deletes it and adds the new one, and every instance loses
    // the value a designer gave it.
    if (b.properties && a.properties) for (const [prop, type] of Object.entries(b.properties)) {
      if (a.properties[prop] === type) continue;
      const claimed = mine.some((r) => (r.kind === 'slot' && type === 'BOOLEAN' && r.booleans.includes(prop)) || (r.kind === 'property' && r.property === prop) || (r.kind === 'property-rename' && r.from === prop));
      if (!claimed)
        bad.push(`${def}: the ${type} property '${prop}' is gone — needs { kind: 'slot', booleans: ['${prop}', …] }, { kind: 'property', property: '${prop}' } or { kind: 'property-rename', from: '${prop}', to } so instances keep their values`);
    }
  }
  return bad;
};

/**
 * #3225 — A SLOT'S TEXT MOVED OUT, CLAIMED. `siblingTexts` is, per def in the tree, every TEXT property (panel name)
 * whose part is a sibling of a native slot part, read off the live defs by the caller. A def that projected a SLOT at
 * the base and now projects such a TEXT property the base did not have has moved copy out of (or beside) a slot that
 * placed instances already filled: without a `slot-text` entry naming that property, an update leaves each edited
 * slot's text where it was, hidden or shown beside the new default. Each line names the missing claim.
 */
export const slotTextUnclaimed = (before: AxesBaseline, after: AxesBaseline, siblingTexts: Readonly<Record<string, readonly string[]>>, ledger: readonly ComponentRename[]): string[] => {
  const bad: string[] = [];
  for (const [def, texts] of Object.entries(siblingTexts)) {
    const b = before[def];
    if (!b?.properties || !after[def]?.properties) continue;
    if (!Object.values(b.properties).includes('SLOT')) continue;
    for (const t of texts) {
      if (b.properties[t] === 'TEXT' || after[def].properties![t] !== 'TEXT') continue;
      if (!ledger.some((r) => r.def === def && r.kind === 'slot-text' && r.property === t))
        bad.push(`${def}: the TEXT property '${t}' is new beside a native slot that placed instances already fill — needs { def: '${def}', kind: 'slot-text', slot, text, property: '${t}', show, hide, issue } so an update carries each edited slot's text into it`);
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
    if (r.kind === 'drop' || r.kind === 'property' || r.kind === 'part') continue;
    if (r.kind === 'slot-text') {
      // #3225 — what the update writes must be on the set: the TEXT property, and the two booleans.
      const props = after[r.def]?.properties;
      if (!after[r.def]) { bad.push(`${r.def}: slot-text entry names a def that projects no set`); continue; }
      if (!props) continue;
      if (props[r.property] !== 'TEXT') bad.push(`${r.def}: slot-text entry writes '${r.property}', which the set does not declare as TEXT`);
      for (const b of [r.show, r.hide]) if (props[b] !== 'BOOLEAN') bad.push(`${r.def}: slot-text entry toggles '${b}', which the set does not declare as BOOLEAN`);
      continue;
    }
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
    if (r.kind === 'property-rename') {
      // A property entry's successor must be declared on the set.
      if (!a.properties) continue;
      let to: string | null = null;
      try { to = renameProperty(r.def, r.from, ledger); } catch (err) { bad.push(`${r.def}: ${(err as Error).message}`); continue; }
      if (to === null || !(to in a.properties))
        bad.push(`${r.def}: property entry '${r.from}' → '${r.to}' ends at '${to ?? r.to}', which the set does not declare`);
      continue;
    }
    if (r.kind === 'move') {
      // Every segment it lands on must be one the def projects.
      for (const [ax, v] of Object.entries(r.to))
        if (!a.axes[ax]?.includes(v)) bad.push(`${r.def}: move entry ${r.axis}=${r.from} → ${ax}=${v}, which the def does not project`);
      continue;
    }
    if (r.kind === 'slot') {
      // #2661 — a slot reached through a nested instance is that def's SLOT property.
      const owner = r.within ? after[r.within] : a;
      if (r.within && !owner) bad.push(`${r.def}: slot entry reaches the slot through '${r.within}', which does not project`);
      else if (owner.properties && owner.properties[r.slot] !== 'SLOT') bad.push(`${r.def}: slot entry names the slot '${r.slot}', which ${r.within ? `'${r.within}'` : 'the def'} does not project as a SLOT property`);
      for (const b of r.booleans) if (a.properties?.[b] === 'BOOLEAN') bad.push(`${r.def}: slot entry claims '${b}' is gone, and the def still projects it`);
    } else if (r.kind === 'axis') {
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

