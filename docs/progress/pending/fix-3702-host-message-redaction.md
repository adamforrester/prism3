## (2026-11-17) — Report a problem: every other line that carries a host's message keeps only its class (#3702)

**Status:** Plugin and Studio. ENGINE unchanged (no change note: no engine code moved). CONTRACT unchanged.

### What changed

- **The plugin's lines** (`apps/plugin/src/main.ts`): the sites #3702 lists now post `failureDetail(e)`
  (`<Class>: <message>`) in place of the raw host message: `component build failed:`, the canvas-label, usage-panel,
  spec-panel and cover refusals (`Figma refused the write (…)`), `the engine could not plan it (…)`, the version-save
  note, `file setup failed:`, `style guide failed:`, `read-back failed:` and `Cleanup failed:`. The Activity drawer shows
  the line whole, so the designer keeps Figma's reason. This is D3703.1 B carried to every site.
- **The report** (`apps/studio/src/state/report.ts`): `reduceFailure` now also cuts each line, one line at a time, from an
  error-class detail (`Error`, `TypeError`, `…Error`, at the start of a line, after `: ` or after `(`) to the end of
  the line, and closes a parenthesis the detail opened. The apply's `variable writes refused by Figma (<name>: <reason>)`
  note, whose reason `write-figma.ts` records with no class, keeps the variable's name. Prune's version note
  (`Nothing removed — the named version could not be saved (…)`) already posted `failureDetail` but leaked as well. The
  same rule now cuts it.
- **Held for the owner:** the drawer lines gain the class in front of Figma's message (`file setup failed: TypeError:
  …`), the visible change #3703 made at `write failed:`. The issue's literal fix, the class alone at each site, is the
  alternative (D3703.1's option A).

### Not in this entry

The update, record, adopt and draw-specs catches post the raw message as the whole line, with no head. They are not in
#3702's list, and giving them a head is a copy decision, so they are filed as #3854.

### Verification

- `apps/studio/test-report.ts`: one typed line per site, each reported line a literal (13 fail on `main`).
- `apps/plugin/test-report-redaction.ts`: a thrown-host arm for each action the shim reaches: Build components, Set up
  file, Style guide, Clean up style guide (through the panel's message), Read from file, and a refused variable write
  (`setSurviving`). Each arm holds the drawer line and the reported line, both typed whole. A sixth arm reads the
  templates of the six sites the shim cannot reach (a built set, a cover, a saved version) from `main.ts`. Against
  `main`'s `main.ts` and `report.ts`, 17 checks fail by name.
- Mutations: dropping the `DETAIL` rule fails 13 report checks and 5 redaction arms by name. `file setup failed:`
  carrying the class alone fails `#3702 D3703.1 B Set up file: the drawer line keeps the host's message`.
