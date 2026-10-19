## (2026-10-18) — Button.Group: the Dialog footer as a shared button group, Cancel falling back to the primary Button (#2661, Q363)

Builds the owner-approved wireframe on #2661 (Q363: every call A except 8 → C and 9 → B), with the 2026-10-16
amendment of call 8 and Q386 (#2808): no component requires the Neutral button families.

### What shipped

- **Button.Group** (`button-group`), public, category `form`, no KB brief. One `layout` axis, inline | stacked | fill,
  three members. Its content is a native `items` slot: one to three buttons, two by default, preferred-only. Inline is
  Cancel then Save at the end edge, 12px apart; stacked is Save over Cancel, full width, 8px apart (Q363.5 A); fill is
  Cancel then Save sharing the width, 12px apart. The buttons read "Cancel" and "Save" through #2645's overrides. It
  joins the Button family's page (Buttons), so the plugin's Components list shows it in that family.
- **Dialog** nests it: a `footer` box (padded like the header) holds `actionsInline` (layout=inline) or `actionsStacked`
  (layout=stacked). The old `footerInline`/`footerStacked` boxes, their four nested Buttons and the two footer gap
  tokens are gone. `actions` is now a slot prop of one to three Button elements (Q363.10 A).

### The mechanisms, and why each is its own field

- **The host decides the secondary (Q418).** Button.Group on its own makes Cancel the outline primary Button and prefers
  nothing. Dialog's nests of the group prefer Button.Neutral for the group's Cancel through `nestItemPrefers` (below),
  falling back to the primary Button; Banner, Card and later hosts declare their own. The first cut put
  `prefersWhenBuilt` on the group's Cancel; Q418 moved it to the host.
- **`nestItemPrefers` on a nest (→ `nestItemPrefer` on the plan).** The smallest mechanism that carries a preference
  through a nest of a nest. The group's default buttons are instances inside the group, so a host cannot reach them
  with `prefersWhenBuilt`, which replaces the component an in-flow instance is made from. `nestItemPrefers: { cancel:
  'button-neutral' }` names a `nest-fixed` anatomy part of the nested def and a sibling set that takes its coordinate
  (the projection checks it with the same `nestPreferOf` as `prefersWhenBuilt`, and refuses a part the nested def lacks,
  one that is not such a nest, and the item's own component). Once the nested instance exists, both executors resolve the
  sibling's member at the item's coordinate (`resolveNestMember`, shared) and `swapComponent` the one instance of that
  layer name inside it, through one shared writer, `applyNestItemPrefers`. No set in the file: the item stays the primary
  Button, no miss. Two sets, or no member: named once per instance, and the item stays. It is not `nests` or `nestTarget`,
  so `build-deps.ts` and the #2808 gate's readings never count it. The paste payload splices the writer in only for a
  payload whose plans carry it, so no other set's chunk count moves.
- **`prefersWhenBuilt` on a nest (→ `nestPrefer` on the plan)** stays in the schema for a part that nests a component
  directly, but no def uses it now. Both executors resolve the preferred set's member at the same coordinate first and fall back to `nestTarget` with
  no miss when the file has no such set; a set of that name that cannot yield the member (two copies) is named once
  per instance and still falls back. It is not `nestTarget`, so `build-deps.ts` never builds it first and the #2808
  gate's two readings never count it; the projection refuses a preferred set whose coordinates differ from the nested
  one's. The read-back accepts an instance of either set.
- **`preferredWhenBuilt` on a slot.** The slot requires the primary Button and offers Button.Destructive and
  Button.Neutral only when the file has them, with no miss otherwise (a missing `preferred` def stays a named miss).
  Destructive moved here too: no default button uses it, and a fresh Dialog build would otherwise report it. The
  read-back accepts any in-order subset of these.
- **`directionWhen` on a box.** A native slot is one SLOT property per part name, so a designer's buttons survive a
  layout switch only if all three members share the one `items` part. Its direction is resolved per member at
  projection (`directionAt`, beside `centeredAt` and `builtSizeAt`), so the executors see an ordinary `layoutMode`.
  The default buttons are one pair per layout, `presentWhen`-gated, because hug, stretch and grow belong to each child.
- **`layout` joins `VARIANT_AXES`**, argued in its header: Dialog's `footer` has `none` and is a Dialog word.

### Placed Dialogs

`COMPONENT_RENAMES` gains a slot entry with `within: 'button-group'` and two `from` layers. A nested group's slot
already holds the right defaults, so the update replaces nothing: it keeps only the labels a designer changed (a value
unequal to the set's default) and writes them onto the slot's default buttons in order, by property name. An unchanged
instance is left out, and a button swapped or hidden by hand is named. This is driven on a hand-built model in
`test-slot-migration.ts`, because the shim's placed-instance model has no nested slot. Writing into a nested
instance's slot items on a real host is not measured.

### Found, and filed

- **#2817:** the outline primary label (`interactive.primary.text.rest`) misses 4.5:1 on the panel
  (`foreground.primary`) in aurora: 3.76 light, 4.49 dark. That is Dialog's Cancel on `main` today and the fallback
  Cancel after this PR; the Neutral Cancel clears 14.05. Pinned in `test.ts` until the owner answers there.

### Traps

- `swapComponent` is said to keep an instance's overrides by property name, and the shim models it, so the swapped
  Cancel keeps "Cancel"; a real file has not been read. Update sees no plan difference when only the file changed, so a
  Dialog built before Button.Neutral keeps the primary Cancel until rebuilt (Q416 call 4, its own follow-up).
- The plugin shim and the paste stub gained `nestedItems`, which makes an instance of a built group carry its default
  buttons as real children; without it a Dialog's instance of the group has no Cancel to swap.

- The plugin executor visits a slot's items twice (`toSlots`), so the preference miss is pushed at the first-visit
  guard, after the instance is made. The paste payload pushes it at the same point, so the two agree.
- icon-button's paste chunk count moves 17 → 18: the preference code rides every chunk's shell.
- `EXECUTOR_REVISION` 31 → 32: both executors changed.
- The Buttons family now holds four sets, so the literals in `test-component-groups.ts`, `test-build-verdict.mjs`,
  `test-chrome.mjs` and `test-canvas-furniture.ts` that count it move with it. `test-roundtrip.ts`'s #1429 family
  regex matched `button-group` as a Button family and now names the three families exactly.
