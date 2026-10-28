## (2026-10-28) — The Activity drawer, direction A: glyphs and words for verdicts, split counts, next steps, a sheet header at 380, and T5's one shadow (#3113)

The owner approved #3113's wireframe on 2026-10-28: Q3113.1–Q3113.10 are all A. This builds direction A, the refined
drawer, in `apps/studio/src/shell/activity.ts`, `apps/studio/src/chrome.css` and `apps/plugin/src/agent-link-ui.ts`, with
one lend in `apps/studio/src/main.ts`. The drawer only draws in the plugin; the studio runs no write, so its drawer stays
undrawn. All new strings are DRAFT.

- **Verdicts (Q3113.2 A).** A verdict is a glyph in its status ink (check in `ok-icon`, alert triangle in `warn-icon`,
  alert circle in `bad-icon`, the running ring for a run) and the headline's words without its leading mark. Only a
  failure's words are in `bad-text`. The pill is gone from the drawer (the style guide page still draws one). A warning is
  a bad result whose headline leads with "⚠" and reports nothing it was asked to make as failed (`kindOf`, the owner's
  D-RED A), so P3's red warning is gone.
- **Counts (Q3113.3 A).** "1 failed" in the error ink after the error glyph, "1 warning" in the text ink after the warning
  glyph, and "n running" only while more than one runs. The counts are inline, so they keep the row's one baseline (#2213).
- **Rows.** Attention first (failures, warnings), then what runs, then the rest, each in the order it first ran. A row that
  moves keeps its focus, and a next step that starts its run hands focus to its row's header.
- **A bad result (Q3113.4 A, Q3113.5 A).** Its first line is its reason, in the UI face at the emphasis weight (500); the
  rest stays mono (#2177). Then the next steps: Apply again, Build again, Set up again, or Run again (style guides, Prune
  stale, Specs), then Copy details. A rerun goes through the call the panel already makes (`activityAgain` in `main.ts`:
  Update file's run for the theme, Set up file and the style guides, the Components run for the last panel build's sets,
  Clean up's dry run, Draw specs). No new message. It is offered only on a panel result (an agent's ran with the agent's
  input), and only while nothing else runs. The read-back has no rerun.
- **History (Q3113.6 A).** Each earlier result is one line (its mark, time, words and Agent tag), which opens its own lines.
- **The agent link (Q3113.7 A).** The bar row shows the link's glyph, a dot and one word: "Listening", or "Not listening"
  and "Error" in the error inks. At 380 it shows the glyph and the dot, and the word is clipped the way `.p3-sr` clips text,
  so it stays in the accessible name. The full line (`agentLinkStatusText`) heads the open drawer after the same glyph and
  dot, in operation words with a relative age, for example "Listening for agent commands (file mailbox, every 2 s). Last:
  Build set, built 48 variants, 2 min ago." The minimized strip (#2949) and the announced short status (#2275) are
  unchanged.
- **The 380 sheet (Q3113.8 A).** A header row with a 24 × 24 Close (named "Close Activity"), "Activity", the counts and the
  agent dot takes the bar row's place while the sheet is open. Row headers wrap, and the Settings/Preview toggle hides.
  Focus that the sheet would strand goes to Close.
- **Launch and unread (Q3113.9 A).** The plugin draws the bar row from launch, closed, reading "Activity". A dot on the bar
  row marks a result nobody has opened, with "New result" in its name.
- **Sizes (Q3113.10 A under #3083's decisions).** Drawer text at 12, and the bar row stays at 56 (Q3083.2 B). A parallel
  lane builds #3083's size pass; whichever PR lands second resolves the overlap in `chrome.css` and `test-chrome.mjs`.

### T5's one exception: the drawer's shadow

The owner added a subtle shadow along the drawer's top edge, so it reads as an overlay that slides up and over the
preview. It applies to the open drawer, and to the strip and the sheet at 380, where they overlay content. **This is an
explicit owner exception to T5 (no shadows), scoped to this edge.** It is recorded where T5 lives: `SHADOW_EXCEPTION` in
`apps/studio/chrome/spec.mjs`, the T5 row of `docs/superpowers/ui-redesign/decisions-2026-09-30-v4-review.md`, the
`chrome.css` header and the RAW comment in `chrome/tokens.mjs`.

- The shadow is `0 calc(-1 * space-025) space-150 calc(-1 * space-050) scrim`. Its color is the chrome's existing
  `--p3-scrim` (`color.scrim.default`, black at 40% in light and 60% in dark). No token and no pair is added.
- The build's [raw] scan lets that one rule through word for word, exactly once (`withoutShadowException`). Its value
  must be chrome spacing variables and the scrim, and its own canaries (`SHADOW_CANARIES`) check that the same shadow on
  another selector, or the rule twice, still fails. The mockups' `RAW` scan still refuses it.
- `test:chrome`'s T5 probe excepts only the drawer's own box-shadow, while the drawer is open or at the narrow tier. In
  every probe state, a new check gates it: the open drawer (or the strip) casts the shadow up from its top edge (a negative
  y offset, no x offset, a blur) in the emission's scrim for the chrome theme drawn, and the closed bar row draws none.
  The scrim's value comes from this suite's own walk of the committed emission.
- **Dark, measured.** In light, the shadow takes the page from 255 to about 220 at the edge. In dark, the page is near
  black (13), and a black shadow can only take it to about 10. Over the cards and swatches it covers, it does read in dark,
  and the hairline still marks the edge. A stronger geometry made light heavy. This is raised as a question on the PR.

### Gates that moved

- `test:chrome` section 10: the plugin's launch state, verdict words and marks, the split counts, the reason line's face
  and weight, the next steps, "Set up again" posting exactly Set up file's message, the one-line history, the 380 header
  row, the hidden Settings/Preview toggle, and the sheet's Close. Sections 31 and 32 and the #2487 A8 arm moved to the
  glyph, dot and word, and to Close.
- `test:verdict`: reads the verdict's words, and a bad result's reason with its lines (#2177, #2281, #1890).
- `test-agent-link.ts`: the full line's words and relative age.
- `lint:contrast`: no new pair. The marks are `ok-icon`, `warn-icon` and `bad-icon` on `bg-page`. The words are `text` and
  `bad-text`, and the unread dot is `icon`, all on `bg-page`.

Out of scope, filed separately: "Show the set in Figma" needs a main-thread message that selects a set's page, and fixes
for a specific cause need structured results from the writers.
