## (2026-11-01) — Designer guides rewritten around Update file; READMEs and llms.txt to match (#3264 part 1)

**Status:** docs only, built as the owner decided on #3264 (decisions 1 and 4, both A). No code, artifact or emission
moves, so no change note. Wording beyond correcting facts is DRAFT, in the PR's Q-block.

### What changed

- **Update file is the hub.** `update-a-file-safely.md` is now "Update a Figma file": the checklist (Set up file, Theme,
  Components › To add and Due, Style guides) with what each writes and what is ticked by default, the run order (the
  update in place runs before To add, though To add is listed first), the status strip and Stop, the update in place
  with its check, hand-edit choice and saved version, Clean up, and the refusals.
- **`apply-a-theme.md` is "Write the theme to a Figma file"**, opening with Update file › Theme. Its what-gets-written
  table and conflict rules stay.
- **The other guides are corrected to the current UI:** the Components area's ticks and To add, Documentation's Style
  guides tab, setup as the first checklist item, the Theme area's tabs (Components moved to its own area), the Export
  area, the Agent switch, its status words and the desktop bridge (in Prism3 Studio since #3204), `draw-specs`, and 60
  component sets. The Decisions log, the Figma menu, the top bar's Apply Theme, the Build button and the Prune dialog
  are gone from every guide.
- **Slugs are kept.** `apply-a-theme.html` and `update-a-file-safely.html` keep their URLs; only the titles change, in
  `index.md` and the landing page's copy of its list (`docs/public/index.html`), which `test-docs-route.ts` holds to
  the same order.
- **READMEs and llms.txt:** the plugin README's Agent switch, eleven commands, network table with the bridge, offline
  and dev builds, and Update file in place of Apply Theme; the studio README's Export as a rail area; `llms.txt` lists
  every guide.

### Traps for whoever re-verifies

- **The busy refusal is quoted as its tail**, "is already running. Try again when it finishes.", so the guides hold
  whether or not #3264's copy PR (which changes the refusal's head to "Update file") lands first.
- **Citations into `build-queue.ts` and `run-guard.ts` are ranges** that cover the cited line before and after the copy
  PR moves it by one or two lines.
- **The agent mailbox polls every second** (`MAILBOX.pollMs`, 1000). The status line's comment gives "every 2 s" as an
  example; the guide follows the constant.
