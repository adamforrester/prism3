## (2026-10-06) — Activity: a run's details read one line per item, console-style (#2177)

**STATUS: branch `ui/2177-activity-lines`, held for the owner's screenshot review.** UI and plugin wire only: no engine change, no emitted artifact moves. ENGINE bump class: **none owed**. `CONTRACT_VERSION` unchanged. **No copy change**: the same words, split into lines. Owner backlog, 2026-10-05. **Closes #2177.**

### What changed

A run's details in the Activity drawer were one long wrapping string. They are now one line per item: the items each summary builder already joins, each in the chrome's mono font (`--p3-font-mono`), a long one wrapping inside the drawer. The lines are a list (`ul`/`li`), so a screen reader reads them in order and says how many.

- **Apply:** one line per axis (palette, color, dims/layout, styles, type, bindings), then one per note (misses, renames, orphans, stranded collections, name-resolved and skipped text styles, unavailable typefaces, refused writes).
- **Build set:** the set's own facts stay one line (variants, grid, size, axes, properties, refs describe one set). Each reference note, the misses, the stale note, "Also built: …", each page header and a partial write's whereabouts are lines of their own.
- **Style guide:** one line per part the summary joins with `. `: each failed table, the stop, each count, each note.
- **Every verdict:** the build note ("Built from … at ….") is its own last line.
- A summary sent without items (Prune, Read-back, Set up file, or an older host) is its own one line, in the same words, in the same mono list.

### How: structured items, never a re-parse

The split is made at the source, where the items exist. `fromClauses` (`apps/plugin/src/apply-summary.ts`) takes each item and the separator that joins it to the one before (`', '`, `'. '`, `' — '`) and returns both readings: `summary`, the prose every reader had, byte for byte, and `lines`, the same items without their separators. A split in the drawer would have had to re-parse the prose, where a comma inside an item (`(Semi Bold, Bold)`, `(core/palette: 164, color: 268, …)`) is not a boundary. The three verdict kinds carry `lines` beside `summary` (`messages.ts`); the adapter validates it (every entry a string, or the list is dropped and the summary is the one line). The notes that were appended with a leading separator (`refsNote`, `alsoBuiltNote`, `pageHeaderNote`, `partialWriteNote`) gained item siblings (`refsItems`, `alsoBuiltItem`, `pageHeaderItems`, `partialWriteItem`), and each note is now defined from its items, so the two cannot drift.

**The agent link receives exactly what it did.** The dispatcher stores the verdict through `forAgent` (`agent-dispatch.ts`), which drops `lines` by destructuring, so every other key keeps its place; the panel's `forward` keeps it, so an agent's run shows lines in the drawer too. The desktop bridge relays the dispatcher's `agent-result`, never the forwarded message, so it is covered by the same strip.

### Proof that nothing an agent reads moved

A one-off differential, `origin/main` against this branch, the same harnesses on both trees, outputs normalized only for timestamps, timings, random command ids and the build's tree hash. Byte-identical on every record:

- every agent-link result envelope from `test-agent-link.ts`'s harness (40 mailbox results, 261 records);
- every panel message from 11 real Apply runs through `main.ts` over `test-mcp-paste.ts`'s file model (every example brand over the last, then three again, with renames refused, orphans, stranded collections and skipped text styles in the notes; 3.9 MB), `lines` stripped;
- every panel message from `test-build-completed.ts`'s real builds (a fresh Badge, the axes-changed refusal, the unknown def) and `test-style-guide-page.ts`'s real style-guide runs, `lines` stripped.

### Tests

- **`test:verdict`** (`test-build-verdict.mjs`, a new `#2177` section at the end): per run kind (Apply, Build set, Style guides), at 1280 and at 380, N items posted show as N lines in order in the host's words; every line's computed font is the chrome's mono token; every line stays inside the drawer, which does not scroll sideways, and at 380 a long line wraps; CDP `getPartialAXTree` reads a `list` of N `listitem`s whose text is the items, in order. The items are authored in the test; the summary is joined from them there. Plus: a summary without items is its one line.
- **`test-agent-link.ts`:** `parity/<cmd>` now compares the agent's verdict with the panel's post less `lines`; `#2177 agent/<cmd>` asserts the agent's verdict keys, in order, against a literal list of what each kind had before; `#2177 panel/<cmd>` asserts the panel's post carries lines in the summary's words.
- **`test-build-completed.ts`:** real builds' lines are their summary's items, in order, separated only by the builders' separators, and the set's facts are the first line.
- **`test-apply-summary.ts`, `test-style-guide.ts`, `test-write-adapter.ts`:** `fromClauses` and the item siblings by literal; the style guide's partial run's two lines; the adapter accepts lines and drops a malformed list.
- `test-write-components.ts`'s source scan for the stale note follows the new shape (`['. ', staleItem]`).

### Mutations (a `wip:` commit before each), each against the built bundle

- **(a) the lines joined back into one** (`[…].join(" ")` in `paintRow`): `✗ #2177 apply 1280: 9 items show as 9 lines, in order, in the host's words — read 1 lines […]` and `✗ #2177 apply 1280: a screen reader reads the lines in order, as a list of 9 items`, for every kind at 1280 and 380 (12 failures; `340 of 352`).
- **(b) the last line dropped** (`.slice(0, -1)`): `✗ #2177 apply 1280: 9 items show as 9 lines, … — read 8 lines […]` and `✗ #2177 apply 1280: a screen reader reads the lines in order, as a list of 9 items`, every kind and width, and the no-items arm (13 `#2177` failures, among the older arms that read a one-line summary; `306 of 352`).
- **(c) a non-mono line** (`.p3-op-line:last-child { font-family: sans-serif }`): `✗ #2177 apply 1280: every line is set in the chrome's mono font ("P3 Chrome Mono", ui-monospace, monospace) — read [… "sans-serif"]`, every kind and width (6 failures; `346 of 352`).
- **The agent strip removed** (`verdicts.push(m)`): `✗ #2177 agent/apply-theme: the agent's verdict has the keys it had before the drawer drew lines, in order (type, ok, headline, summary, lines)`, the same for build-components and style-guide, and `parity/<cmd>`, `foreign/agent`, `busy/agent-first`.

### Trap for whoever re-checks this

After a CSS mutation, rebuild the plugin once the source is restored. The first "after" screenshots were taken from the bundle mutation (c) left behind, and showed the build note in a proportional font. `CSS.getPlatformFontsForNode` named the cause. The `⚠` glyph falls back from JetBrains Mono (no such glyph in its subset) to the system mono, which is still mono.

### Held for the owner

- **Nested lists stay on their item's line:** "Also built: icon, badge" is one line, not one per set; a conflict refusal ("Nothing was written. 3 conflicts with existing content: a; b; c") is one line, not one per conflict; the style guide's "updated in place — A: …; B: …" is one line, not one per table. Splitting those would change the words (each would need its own lead-in), so it is a copy decision.
- **Prune, Read-back and Set up file** now show their one-line details in mono too, for one look across the drawer. Their summaries are unchanged.
- **The joining separators are dropped from the lines** (the `, ` or `. ` between items). A line keeps any punctuation of its own, so the build note and the stale note end with a full stop and the rest do not.
- **"Earlier results"** keep their one-line `time · verdict: summary` form.
