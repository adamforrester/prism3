## (2026-11-19) — Avatar: a photo, initials or a glyph, with a presence dot outside the mask (#4110)

Built from the proposal with every owner decision at its recommendation (OD-A1 to OD-A8, all A, 2026-11-19), after
the wireframe in #4148. Engine {{ENGINE_VERSION}}; `CONTRACT_VERSION` 15.1.0 → 15.2.0.

### What landed

- **`avatar`**, category `foundations`, priority 3, `states: []`. A 30-member Figma set: `size` (5) × `shape`
  (circular, square) × `type` (initials, icon, image). `type` is runtime and has no prop behind it: in code the chain
  follows `src` and `name`, so `test.ts` bridges it through `src` (`#2752 avatar.type`).
- **An unclipped container and a clipping mask.** The root (`container`, not the proposal's `host`, since the root
  list is closed by Q365) sets the size and clips nothing; `mask` carries the corner, `clipsContent` and the backdrop.
  The presence ring is the container's child, so the dot overhangs the picture.
- **Presence** nests Badge at `type=dot` (`nest-exposed`, `tone`) inside a box painted `color.background.primary` with
  2px of padding, pinned into the container's bottom-right corner. Badge's dot has no stroke in Figma, so the ring is
  drawn here. A Figma-only `presence` boolean shows it, off by default.
- **`icon.size.2xl`, 64px** (OD-A3 A): the x-large avatar. The other four sizes bind `icon.size.sm` … `.xl`.
  `ICON_PAIRED` in `scale.ts` keeps the #324 pairing with `size.*` to the first five steps.
- **`person` and `organization`**, two glyphs drawn for this project on the 24px grid (OD-A6 A), DRAFT artwork.
- **`PartDef.corner` takes a box** as well as a glyph. Both executors' corner passes already placed any child by name,
  so neither executor file changed and `EXECUTOR_REVISION` does not move; only the projector and the validator did.

### Diagnosis worth keeping

- Two boxes cannot share a paint slot (#933), so the ring paints through `overlay`, the box's other ground slot; the
  mask holds `fill`.
- `lint-rung-names.ts` reads one tier family per ref, so a def that walks the icon ladder for two jobs (the box and the
  glyph) reads as one size reaching two rungs. The glyph's key is `glyph.<size>`, outside the gate's `size.` scope.
  That is a gap in the gate's family model, filed as #4314 rather than fixed here.
- The medium avatar is 32px, `icon.size.lg`, one rung above `md`: a new admission, `BOX_OFFSET_UP_ONE_DEFS`, checked
  both directions like the ring offset. The initials sit in `PINNED_LADDER_DEFS` on `type.label.*.emphasis` (OD-A4 A).
- A Figma text property holds one default for the whole set (#1567), so the one-letter rule at x-small and small is
  in code only; every member's text is "JD".
- The KB brief itself was not reachable from this lane; its positions come from the proposal's paraphrase.

### Owner decisions on the PR (2026-11-20)

The x-large token is `icon.size.2xl` (OD-A3.1 A). The `shape` values align on Icon button's words, `circular | square`
(was `circle`), so `lint-axis-values.ts` registers Avatar's set as `reordered` (it leads with `circular`, the code
default) rather than overlapping. Presence maps online = success, away = warning, busy = danger, offline = neutral.
The x-large initials stay on `type.label.lg`, and the glyph sizes stay as built. The DRAFT copy is approved. Still
open: one initial in Figma at the small sizes, the page, and the glyph artwork.

After review: the initials-contrast arm in `test.ts` reads the ink and the backdrop off the projected plans (what the def binds), not as typed role names, and measures them in all five emitted brands (wendys added), 20 cells. Rebinding the initials to `color.text.tertiary` now fails `#4110 avatar: the initials' ink clears 4.5:1 on the backdrop the def binds` by name (2.79:1 in prism3 light); before, every `#4110` arm passed and only the paint census, which `--accept` rewrites, moved.

After the delta review: the presence mapping ships. The `presence` prop description and the presence dot's part note
both say online = success, away = warning, busy = danger, offline = neutral (DRAFT wording), so a developer reading the
spec and a designer picking the dot's tone on the instance both see it; before, it lived only in `notes`, which does
not ship. A `test.ts` arm reads it from `out/components/avatar.md` and fails by name when either line drifts.
