## (2026-10-08) — Update: the icons and the spinner, read and updated in place as single components (#2296)

Owner decision Q109 A: a same-named hand-made icon is kept, Adopt is never offered for icons, and the whole file is searched. Before this, `capture-baseline` and the dry run reported "Not in this file: icon, spinner" on the NB master: both defs build single top-level components (`emitAsComponents`), and the update read only component sets.

- **One reader for a single-component def** (`readSingleView`). It gives the same view a set gives, so the dry run, the capture and the apply run unchanged on it. Every top-level `<component>/<value>` component anywhere in the file is the member `<axis>=<value>`, so an icon moved into another frame or page is updated in place, not rebuilt (Q109 C). A name with a further `/` is listed and never read.
- **Ownership is the stamp, never the name.** A hand-made icon, even one under a Prism3 glyph's exact name, is unstamped. It holds its coordinate, so that glyph is never built beside it (Q109 A), and it is never written, captured or deprecated. A duplicate is no Prism3 icon (#2300). Adopt lists the single defs as not offered (Q109 B), without failing.
- **The apply** maps each coordinate to the node's own name (`name=check` ↔ `icon/check`) for its renames, deprecations and verify, and builds in the executor's emit mode. There is no set node, so identity is checked per member, and a deprecated icon gets its description prefix but no `retained` list.
- **The executor's emit branch** now finishes an updated component as a set member is finished: record, then stamp, then marker off, through one shared `finishUpdated`. Before this it returned first, so an updated icon would never have taken its stamp and would have kept its in-progress marker. In an update, a component the plan gained goes in the first grid slot no existing one holds.
- **`EXECUTOR_REVISION` 4 → 5:** the emit branch's code changed (#2396 took 3 and #2377 took 4 on `main`). Every member built before this reads as out of date, with no field difference visible, until an update re-applies it.
- **Every member read as not built by Prism3 is named in the apply's outcome,** off-plan ones included. Before this, only those on a planned coordinate were named, on the set path too.

- **With #2396's stamp-only path:** an icon or spinner from an earlier plugin (`revisionUnknown`) takes only its stamp, found by its node's own name (`icon/check` for `name=check`). `single/stamped` holds it: 44 icons stamped, 0 other writes. Mutation: the restamp looked up by coordinate → `single/stamped` (0 stamped).

### Traps for whoever re-verifies

- **The shim gains `liveComponents`** (opt-in, under `liveRoot`): a COMPONENT search returns the page's top-level component nodes themselves, as Figma does, not name-only references. Without it, the executor had no node to configure an icon in place. It is opt-in because an existing case may use a reference's own `id` as an INSTANCE_SWAP default.
- **An icon build seeds no component.** The usual `comps: [SWAP_TARGET]` is `icon/FPO-default-icon`, one of the icons' own glyphs, so the build reads it as already there and STALE.
- **Not verified live:** the NB master's 44 icons and 4 spinners read by the dry run, captured, and an update re-applying them with every key kept.
