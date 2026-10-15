## (2026-10-15) — Agent reference: the style-guide `tables` example uses the default root, and a legacy namespace in it fails by name (Q313.2 A)

**What moved.** The `bad-args` refusal for `style-guide`'s `args.tables` in `apps/plugin/src/agent-protocol.ts` gave its example table title with a legacy client namespace as the root. `docs/public/reference/commands.json` quotes that refusal verbatim, so every agent reading the reference was shown another brand's root as the way to name a Prism3 table. The example now reads `['Primary — prism']`: `prism` is the default `theme.root`, and the title shape (`<collection> — <root>`, drawn when a file holds more than one root) is unchanged. The rest of the refusal text is unchanged. The reference is regenerated from the source, not edited.

**The check.** `emit-agent-reference.ts` now refuses to write, and `--check` fails, when the generated reference spells a legacy namespace anywhere, and names the entry that holds it (`legacy namespace '<ns>' in agent-link command style-guide`). The list (`LEGACY_NAMESPACES`) is typed in the gate, not read from the engine's brand inputs: a list derived from what the engine emits today would shrink when an input was retired and stop catching the name it exists for (docs/34). It matches a whole word in any case, so a scale name like `pds3` does not hit.

**Why not an existing gate.** No gate read `docs/public/reference/` for a namespace. `--check` alone would not have caught a return either: a source edit followed by a regen moves both sides together, and the byte comparison goes green. The new check reads the generated text, so it fails before and after the regen.

**The check checks itself (review on `69b6dad6`).** Because `--check` cannot see a source edit plus a regen, the matcher is the only thing that would catch a return, and a review mutation showed a one-character change to it (the `y` flag, so it only matched at index 0) shipped the legacy example green. `legacyNamespaceSelfCheck` now runs before the real scan, the `lint-skills.ts` pattern: every listed name, in lower and upper case and in the `<root>.<sub>` form, must be reported inside a refusal-shaped probe and named by its entry; `pds3`, `prism` and `prism.color` must not be. A broken matcher exits 1 with "the legacy-namespace check is broken" before any reference is read or written.

**Mutations (each committed first, restored with `git reset --hard`).**
- The example set back to the legacy root at the source → `--check` and the plain write both exit 1 with `legacy namespace '<ns>' in agent-link command style-guide`.
- The same root in upper case with its sub-namespace → the same failure, naming the upper-case spelling.

**Left alone.** Two doc comments in the plugin (`messages.ts`, `style-guide.ts`) still use the old title as an example. Neither reaches the agent reference, so they are outside this decision; filed separately if the owner wants them aligned.
