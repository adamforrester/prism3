# Prism3

The next iteration of the Prism white-label design system, delivered as a **brand-generation engine**: a brand is a small validated input set that the engine expands into a complete token tree, AI metadata, and platform outputs.

**This directory is transitional and nearly empty.** It once held everything; #650 has been
decomposing it into the layout the repo actually has. What is left here is `skills/`, and
[#650](https://github.com/adamforrester/prism3/issues/650) PR 3 moves that to a top-level
`skills/` and deletes this file with it. **Nothing new belongs here.**

Where its contents went:

| was | now |
|---|---|
| `Prism3/engine/` | `packages/engine/` — consumed by name as `@prism3/engine` (#661) |
| `Prism3/schema/`, `examples/`, `fixtures/` | inside `packages/engine/`, so the package is self-contained (#661) |
| `Prism3/docs/` | `docs/` — the numbered design record, beside `superpowers/` |
| `Prism3/skills/` | still here; PR 3 moves it to `skills/` |

Start at the [root `README.md`](../README.md) for the signpost, `CLAUDE.md` for the layer
table, and [`docs/00-progress.md`](../docs/00-progress.md) for status, the decisions log and
next steps. The architecture spec is [`docs/01-token-architecture.md`](../docs/01-token-architecture.md);
how the engine runs is [`packages/engine/README.md`](../packages/engine/README.md).

The prior iterations (`../reference/Prism2`, `../reference/New Balance`) are retained as reference inputs — Prism3 is clean-sheet and cherry-picks the best mechanics from both.
