## (2026-10-16) — Breadcrumbs, BreadcrumbItem and BreadcrumbSeparator, from the approved wireframe (#2666)

Built from the proposal on #2666, which the owner approved on 2026-10-16 with every numbered call at its
recommendation (A), then given a choice of separator by owner decision Q382 A (below). Three defs: `breadcrumbs`
(`layout` trail | parent × `separator` chevron | slash × `size` medium | small, 6 members), `breadcrumb-item` (`kind`
ancestor | current | overflow × `separator` × `size`, 10 members) and `_breadcrumb-separator` (`type` chevron | slash,
2 members). No state axis on either: the nested Link
and FlushIconButton.Neutral carry their own, exposed (`nest-exposed`, `expose: ['state']`), the Dialog precedent.

### What the build settled

- **The items slot follows #2649's pattern, which had not merged.** PR #2660 was still a draft, so the trail uses the
  slot machinery already on main (`contentSlot`, `slotSettings`, `preferred`, from #2417 and #2646) and declares its
  `items` prop as a plain `slot`. #2660 has since landed, so the prop now carries `anyOf: ['breadcrumb-item'],
  minItems: 2`.
- **Size order is medium first.** The proposal listed small first; Q347 A and Q359 B (#2752, decided the same day)
  make every size axis lead with the code default, medium. Both defs join the medium-first lists in `test.ts`'s #2501
  arm, `lint-rung-names.ts` DEFAULT_FIRST and `lint-axis-values.ts`, which the Q359 sweep will absorb.
- **Two new axis names, `kind` and `layout`,** the approved proposal's own, argued in `VARIANT_AXES`' header the way
  Dialog's `placement` and `footer` were.
- **No `_` prefix on the item, held for the owner.** Q349 gives a part used only inside its parent the `_` prefix,
  and the lane's brief expected the item to take it. But the projection refuses a `_` id as a slot's preferred item
  (`slotPreferredOf`): Figma leaves `_` sets out of a published library, so a file using the library could not insert
  more steps. The item keeps a plain id until the owner rules (#2783). The same conflict waits for `_list-item` (the naming
  sweep) against List's items slot (#2660).
- **Contrast is measured from the committed emission,** not from the theme the engine computes: the arm reads each
  `out/<brand>.tokens.json`, resolves the mode aliases itself, and asserts 20 cells literally. Link ink 4.5:1 on
  `background.primary` at every state and on `background.secondary` at rest; `text.primary` on both; the back
  chevron's `icon.link.default` 3:1. The separator is decorative and held to no floor.

### After QA: a choice of separator (Q382 A)

The owner's QA on the first build asked for a choice of separator, as Prism 2 had, and decided Q382 A: a separate part,
`_breadcrumb-separator`, in two looks, `type: chevron | slash`, and one `separator` setting on Breadcrumbs for every
step, chevron by default, both in `color.icon.secondary`. The overflow item and the `parent` layout stay as built.

- **How the setting reaches each step.** `follow` passes an axis by its own name, and Q382 names the part's axis
  `type` and the trail's setting `separator`. So Breadcrumbs and BreadcrumbItem both carry a `separator` axis, the
  trail's default ancestors follow it, and the item nests the separator twice, the chevron look at `separator=chevron`
  and the slash at `separator=slash` (`presentWhen`). No engine change. The current page and the parent layout have no
  separator, so neither has a slash member: the item is 10 members, the trail 6, the separator 2. `separator` is the
  thirtieth axis name, argued in `VARIANT_AXES`' header.
- **The slash glyph is the set's first that is not Remix's.** Remix 4.9.1 has no plain slash (`code-s-slash`,
  `slash-commands` and `divide` are the nearest). So `icons/slash-line.svg` is drawn for this project: one
  parallelogram on the 24px grid, a 2px stroke like `chevron-right`'s (1.995px measured across the stroke), and
  `icons/NOTICE.md` records it. Held for the owner on the PR.
- **Naming.** The id is the owner's, `_breadcrumb-separator`. The display name is BreadcrumbSeparator: the
  `component-names` family rule would make `Breadcrumb.Separator` force `Breadcrumb.Item` too, and the item's name
  waits on #2783. It shares the Breadcrumb Item page, first, as the Accordion indicator shares the Accordion's.
- **The icon set grew to 46,** so the icon-count pins in `test-update-apply.ts`, `test-update-components.ts` and the
  studio catalog moved by one, as they did for `menu`.
- **The studio catalog missed override swaps as nests.** The item's chevron used to be an icon instance, which hid the
  gap: the overflow's dots come from a #2645 swap override, which the catalog did not walk. Pagination (#2796) fixed
  the same line; the fix is ported as is.

### Traps for whoever re-verifies this

- **Two test fixtures did not model a nested glyph override.** Breadcrumbs is the first def on main with a #2645
  swap override (the overflow step's three dots). `test-update-apply.ts` and `test-canvas-furniture.ts` built a file
  holding only the plan's nest and swap targets, so the override's `icon/more-horizontal-filled` was missing and the
  set never read current. Both helpers now include override glyphs, as a real file holds the whole icon set. The
  engine's #1392 paste arm likewise now gives a swapped-into nested component its own declared properties and gives a
  slot's preferred def a keyed set.
- **A slot item's label cannot be set two levels down.** The slot's default ancestors read Link's "Link text", not the
  approved "Home" and "Category": a host's #2645 override reaches its own nested instance, not that instance's nested
  Link. The proposal named this gap; #2781 tracks it. The parent layout's Link is one level down and reads "Parent page".
- **The collapsed-trail example is not on the canvas.** The proposal's §12 places one beside the set; the canvas
  furniture cannot place a configured instance yet (#2784).
- **The wireframe's CSS and the proposal's token table disagree on the separator gap.** The wireframe draws 4px either
  side at both sizes; the table says `space.050` small and `space.100` medium (DRAFT). The build follows the table.
