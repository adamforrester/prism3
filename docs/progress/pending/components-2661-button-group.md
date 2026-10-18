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

- **`prefersWhenBuilt` on a nest (→ `nestPrefer` on the plan).** Cancel nests `button` and prefers `button-neutral`.
  Both executors resolve the preferred set's member at the same coordinate first and fall back to `nestTarget` with
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

- The plugin executor visits a slot's items twice (`toSlots`), so the preference miss is pushed at the first-visit
  guard, after the instance is made. The paste payload pushes it at the same point, so the two agree.
- icon-button's paste chunk count moves 17 → 18: the preference code rides every chunk's shell.
- `EXECUTOR_REVISION` 31 → 32: both executors changed.
- The Buttons family now holds four sets, so the literals in `test-component-groups.ts`, `test-build-verdict.mjs`,
  `test-chrome.mjs` and `test-canvas-furniture.ts` that count it move with it. `test-roundtrip.ts`'s #1429 family
  regex matched `button-group` as a Button family and now names the three families exactly.
