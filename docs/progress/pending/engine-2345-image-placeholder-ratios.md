## (2026-10-08) — image-placeholder: seven ratios, a marker that scales with the frame, and a Marker boolean (#2345)

**What.** `ratio` is now `2:3, 3:4, 4:5, 1:1, 4:3, 3:2, 16:9`, the ratios a measured commerce file needed, tallest
to widest. The marker scales with the frame. A `Marker` boolean (code `showMarker`, default on) hides it once an image
is in. Plan and owner questions: #2345. Held for the owner: a flat axis rather than a portrait/landscape pairing, the
value order, the boolean rather than an image-bearing variant, and the names `Marker` / `showMarker`.

**The diagnosis that made the scaling small.** #1340 had filed true resize-tracking as needing "a Figma
scale-constraint / percentage-size projection the engine does not have". It doesn't need either. The frame is
aspect-locked, so every resize a designer makes is uniform, and a plain `SCALE`/`SCALE` constraint on an absolutely
positioned child then keeps the square glyph square and centered at the same fraction. The engine already lifted and
centered a child (the pending spinner's `absoluteCenter`), so the new plan field is one flag, `absoluteScale`, that
swaps that path's `CENTER` constraints for `SCALE`. `PartDef.scaleWithParent` refuses an unlocked parent for exactly
this reason: under no lock, SCALE stretches the glyph.

**The NB master.** The in-place update reaches the new shape without a change to `update-apply.ts`. The three existing
members keep their names, keys, ids and marker node, and read as update with `marker · absoluteCenter / absoluteScale
/ visibleProp` as the named differences. The other four ratios are added, and `Marker` is declared and wired.
`test-update-apply.ts` proves it on a set built from the pre-#2345 def.

**Traps for whoever re-verifies this.**
- **One live-host fact, not provable offline:** that Figma applies the marker's SCALE constraints when a designer
  resizes an instance. It's recorded in the def's `notes.unverified`. To check, place a 4:3 instance in a scratch
  file and drag it to 64px wide.
- **Option order after an in-place update.** The variant options read `1:1, 4:3, 16:9, 2:3, 3:4, 4:5, 3:2`,
  because added members are appended. A fresh build reads tallest to widest. This is the update path's ordering,
  outside this change; filed as #2386.
- **The marker is an icon-set glyph** (`image`), not component geometry, so #2380 will turn it into an `icon/image`
  instance. `absoluteScale` is node-type independent, so it carries over.
- **`EXECUTOR_REVISION` raised to 3.** Every built member reads as needing a re-apply in the next dry run, which is
  correct.

Engine {{ENGINE_VERSION}}.
