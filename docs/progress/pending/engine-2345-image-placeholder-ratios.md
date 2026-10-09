## (2026-10-09) — image-placeholder: seven ratios, a marker that scales with the frame, and a Marker boolean (#2345)

**What.** `ratio` is now `2:3, 3:4, 4:5, 1:1, 4:3, 3:2, 16:9`, the ratios a measured commerce file needed, tallest
to widest. The marker scales with the frame. A Figma-only `Marker` boolean, on by default, hides it once an image is in. Plan:
#2345. Owner decisions, recorded on #2398:
- **Q163 1–5:** the flat axis, the value order, the boolean rather than an image-bearing variant, the name `Marker`,
  and the drafted prose.
- **Q163.4b A:** no `showMarker` code prop. `Marker` is a Figma-only boolean (#2419's form), because in code the
  marker follows whether an image is supplied (a `codeOnly` entry says so).
- **The screenshots** are approved.

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

**Marker is Figma-only (Q163.4b A).** The boolean was first built with a code twin, `showMarker`. That prop is
gone. `Marker` is now a `figmaOnly` boolean (key `marker`, `figmaName: 'Marker'`, on by default), the form #2419
added, and a `codeOnly` entry records that in code the marker follows whether an image is supplied. The Figma set
is unchanged: the same property name, default and wiring.

`test.ts` asserts the boolean is `figmaOnly` and that no `showMarker` or `marker` prop exists. Two mutations, each
from a `wip:` commit:
- **`figmaOnly` dropped:** `❌ component: ImagePlaceholder def is structurally valid — figmaProperties.booleans:
  'marker' is not a declared prop`, and `❌ #2345/Q163.4b the Marker boolean is Figma-only and no code prop drives
  it (figmaOnly undefined; props ratio)`.
- **A `showMarker` prop re-added:** `❌ #2345/Q163.4b … (figmaOnly true; props ratio, showMarker)`.

**Traps for whoever re-verifies this.**
- **One live-host fact, not provable offline:** that Figma applies the marker's SCALE constraints when a designer
  resizes an instance. It's recorded in the def's `notes.unverified`. To check, place a 4:3 instance in a scratch
  file and drag it to 64px wide.
- **Option order after an in-place update.** The variant options read `1:1, 4:3, 16:9, 2:3, 3:4, 4:5, 3:2`,
  because added members are appended. A fresh build reads tallest to widest. This is the update path's ordering,
  outside this change; filed as #2386.
- **The marker is an icon-set glyph** (`image`), not component geometry, so #2380 will turn it into an `icon/image`
  instance. `absoluteScale` is node-type independent, so it carries over.
- **`EXECUTOR_REVISION` takes the next number after #2389's.** Every built member reads as needing a re-apply in the next dry run, which is
  correct.

Engine {{ENGINE_VERSION}}.
