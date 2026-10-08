## (2026-10-08) — Update apply: a "no changes" member takes only its stamp; an in-place paint draws its own color; a re-laid glyph fits its frame (#2379)

The first live apply on the NB master (#2328, engine 0.233.0) reported `✓ updated 658 in place`. The 16 sets its dry run called "no changes" came out visibly broken: icon buttons and badges solid black, checkbox marks and field-message glyphs oversized. Verify passed them, and the shim's corpus test passes. The owner restored the version saved before the update.

### Reproduced live first, on a scratch file

The scratch file ran the same plugin build as the NB master, driven over the agent link with `use_figma`. Steps: Apply Theme (the default example brand), then build icon-button, badge, checkbox-control and field-message. Strip the executor-revision field from every stamp, the NB master's state. The dry run reads `✓ No changes found`, and the confirmed apply reads `✓ updated 294 in place`.

**Then a snapshot of every node, before and after:** geometry, each paint's stored color, opacity and bound variable, and what that variable resolves to for the node (`resolveForConsumer`). It found:
- **No binding lost.** Every paint kept its variable, which resolved as before.
- **Every rewritten paint's stored color turned `#000000`.** That's 272 paints. The host draws the stored color, so the badge set exported as solid black blocks: the owner's report. The executor binds every paint onto a black base. A fresh build ends with the resolved color stored, but in place the host kept the black.
- **Every glyph re-laid in place came out 1.5× (24/16):** 27 glyphs. Field-message's error glyph went 14×12.3 → 21.1×18.5, and checkbox marks 11.3×8 → 17×12. These are the NB master's restored numbers exactly, so its glyph damage most likely came from an earlier in-place apply on this path.

### Why

- **The no-change members were rebuilt.** A member read as built by an earlier plugin (`revisionUnknown`) matches its plan and its record, but the apply sent it through the build's whole pass: 7,575 writes on one 45-member set in the shim, and on the host the two defects below.
- **The paint base.** In place, nothing makes the host re-resolve a paint's stored color, so the black base stays and is drawn. A wash variable's alpha, which a fresh build stores as the paint's opacity, stayed at 1 the same way, so a 10% overlay drew solid black.
- **The glyph.** In place, the frame keeps its host's size (16) and its vectors were scaled there. A fresh import arrives at the 24px artboard. The match test compared sizes, so it never matched, and it moved the 24px vectors into the 16px frame with no resize to scale them.
- **Why nothing caught either.** The shim kept vectors at their import size, so old and new always matched, and it had no color for a color variable. Verify (b) read which variable a paint binds, never what the host draws. That's the docs/34 permissive-stub shape.

### The fix

- **A "no changes" member takes its stamp and nothing else.** It's checked against its record before and after; any other write fails by name. A set of nothing but such members is never built over. The verdict reuses the approved `✓ already up to date`. Whether it should also say the members were re-stamped is held for the owner.
- **The paint binder** bases every paint on its variable's own color for that node, alpha as opacity, as the host itself does on a fresh build and on Apply Theme. It falls back to black only where nothing resolves.
- **The in-place glyph** scales the fresh import to the frame's size, by its SCALE constraints, before comparing and before moving. An unchanged glyph keeps its vectors and their ids, and a changed one lands at the size its frame draws it.
- **Verify (b)** also reads what the host draws. A bound paint whose stored color or opacity differs from what its variable resolves to, or a glyph vector outside its frame, is a content failure by name.
- **The shim models the host.** A color variable resolves to a color (an `/overlay/` one with alpha). Under `scaleConstrained` (opt-in, on for the update suites), a frame's SCALE children scale when its size changes, by resize or binding.
- **`EXECUTOR_REVISION` 2 → 3.** #2363 and #2377 also raise it, so theirs move to 4.

### Proved live, on the scratch file, with this build

1. **Repair.** One confirmed update with the fixed build re-applied the damaged sets. Every paint's stored color and alpha matched its variable again, and every glyph went back to the fresh build's geometry. Diffed node by node against the snapshot taken right after the fresh build: **0 differences** on all four sets, 657 nodes.
2. **The NB case.** Every stamp's revision was stripped again: `✓ No changes found`. The confirmed apply reads `✓ already up to date`. **0 differences** against the fresh build, and every stamp now at revision 3.

### Tests (`test-update-apply.ts`)

- `nochange/writes` and `nochange/current`.
- `drawn/paints`: 287 paints, 12 washes. `drawn/glyphs`: 69 glyphs. Both read by the test off the shim's nodes, across tag, field-message, checkbox-control and badge.

**Mutations:**
| Mutation | Fails |
|---|---|
| no-change members rebuilt | `nochange/writes` (7,575 other writes) |
| paint base black, with verify's paint check also removed | `drawn/paints` (287 of 287) |
| alpha dropped | verify names `stored #715b32 at 100%, but …/overlay/hover resolves to #715b32 at 10%` |
| glyph not scaled | `drawn/glyphs` (`17.0×12.0 in 16×16`) |
| binding dropped in place | `PAINT NOT BOUND`, 10 arms |

### Traps for whoever re-verifies

- **Bound paints in an MCP screenshot or export draw their stored color.** Read the stored color and `resolveForConsumer` before calling a paint broken or fine.
- **The dry run still can't see this damage.** On the damaged sets it read only "to update" (the revision moved), naming no field. Filed separately.
- **The NB master's glyphs, after the restore, are still the 1.5× ones.** A confirmed update with this build re-lays them at the right size, as step 1 showed live. Run it on a duplicate first.
