## (2026-10-10) — Grid styles are named by the bare breakpoint, renamed in place in files that hold the old names (#2467)

Owner decision Q185 A: the layout grid styles drop the `Grid /` group. They are now `sm`, `md`, `lg`, `xl`, `2xl`, plus
`xs` where a brand has it, so Figma's styles panel no longer shows them inside a "Grid" group. The emitter change is one
line (`buildFigmaGridStyles`, `name: g.bp`), and only `out/figma/<brand>/grid-styles.json` moves under regen. The DTCG
trees, the `layout.grid.*` variables, the token contract and TokenPress are untouched: TokenPress reads grid variables,
not grid style names, and the exporter gate and read-back parity both pass unchanged.

**The work is in the plugin, because a file applied before this holds the old names.** Three places had to change:

- **The executor renames in place** (`write-grid-styles.ts`). For each planned size it reuses Prism3's own `<bp>`, else
  renames Prism3's own `Grid / <bp>` to `<bp>` (same object, same id, so every layer using it stays linked), else
  creates. It never creates `<bp>` beside an old `Grid / <bp>`. `GridStyleApplyResult` gains `renamed`; no UI text moved.
- **Ownership, not name.** A bare `sm` is a name anyone might give a grid style, so a style counts as Prism3's only by the
  #1884 mark, else the engine's grid-description signature (`isPrism3GridStyle`). The description fallback is what keeps a
  file written before the mark, or a host with no shared plugin data (the MCP ledger mode), from getting duplicates.
  **A client's own `sm` skips that one size** (owner decision Q234 A): the executor leaves the client's style
  untouched, writes nothing under that name, applies every other size, and the result line names the skip
  (`⚠ 1 grid style skipped (already in this file, not created by Prism3: sm)`, `gridSkippedNote`). The pre-flight
  raises no conflict for grid styles any more; other style kinds keep the whole-apply refusal. A file holding both a
  client's `sm` and Prism3's own old `Grid / sm` skips `sm` too and leaves both as they are, because renaming the
  old one would put a second `sm` beside the client's.
- **Prune** (`prune-figma.ts`) spares an old `Grid / <bp>` whose size the plan still emits: it is waiting for its rename,
  and deleting it would unlink its layers. An old name for a size the plan dropped is stale under either name, as before.

**A trap the bare names set in the prune, found while writing the test.** The prune's namespace for a style is its
top-level group, and `styleGroup('md')` is `md`. With bare planned names, a designer's own `md/wide` grid style read as
in the engine's namespace and was offered for deletion. A planned name with no `/` now adds no group. The consequence: a
stale grid style is admitted only by its engine description (and named in the review text as such). One with an edited
description is spared; that is the conservative direction, and a mark-based admission would need the prune snapshot to
carry the mark, which it does not today.

**Owner decisions Q234, all A:** a client's colliding size is skipped, not refused (above); an old `Grid / xs` left
after a brand drops `xs` is still offered for deletion and named in the review, never removed unseen; a stale grid
style whose description a designer edited is not offered, a hand edit being protected as everywhere else. Each is
pinned by name in `test-write-grid-styles.ts`, `test-write-preflight.ts` or `test-prune.ts`.

**The check.** `test-write-grid-styles.ts` (rename keeps the object and id; pre-mark rename; a client's `sm` and
`Grid / sm` untouched; the skip, its line, and the client-plus-old-name case), `test-write-preflight.ts` (the whole
apply on a file with old names, marked and pre-mark: 0 created, 5 renamed, same objects; a client's `sm` skipped with
the other four sizes applied, with and without the legacy presumption), `test-prune.ts` (old name spared, dropped size
offered and named under either name, an edited stale description spared, `md/wide` spared), and `test.ts` #1480 (bare names, literals).
Each expected name is typed as a literal. Mutations, each after a `wip:` commit and restored with `git checkout --`:
the rename turned into create-plus-delete, and into create-beside; the executor matching by name alone; the whole
apply refused again over a client's `sm`; the skip clause dropped from the result line; the prune's rename-pending spare removed; bare names read as groups again; the emitter back to
`Grid / <bp>`. Each fails its arm by name.

**Not done here:** a live check on the scratch file. The scratch-file cleanup step (`runCleanupTheme`) removes a style
only when its name is in the plan, so on a file still holding old names it leaves them; the next apply renames them.
`tools/conformance-scan` fixtures now spell the grid style `xs`, and its mutation battery passes (54 detected).
