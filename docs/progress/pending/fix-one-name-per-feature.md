## (2026-11-19) — One name per feature: Clean up, Update file, Agent link, Import, Component specs (#4184, #4185, #4191)

The owner approved every recommendation on #4184 (canonical names), #4185 (plugin copy) and #4191 (two names for one
job). This PR applies the names to the shipped strings and holds them there.

### What changed on screen
- **Clean up** is the Activity row, the busy message ("Clean up is already running."), the stopped line and the failure
  line; **Apply theme** is the theme write's Activity row. The empty drawer reads "Each Update file run, and the steps
  it takes, appear here." (#4191 T2 A).
- Every hint names **Update file** in full: the field, search-field and tag style notes, the style-guide contrast note,
  the color-override refusal, Clean up's not-applied line, the canvas-label and usage-panel lines, the Cover and About
  this library lines. Writing the theme as a step is "Run Update file with Theme ticked".
- **Agent link** on both switches. The minimized strip's button keeps the visible word "Turn off" and is named
  "Turn off Agent link": the 480px strip fits the longest status line beside it only with the short word (the chrome
  arm measured it). The strip names the command in operation words, with the status line's age ("59 min ago").
- The brand menu imports with **Upload…** and **Import** (the page button), as the start window does (#4191 T1 A).
- **Download component specs**; Docs' drawings are **Spec drawings**; the Brand tab's preview is **Brand overview**.
- Designer-facing lines say **variant** and **Prism3's values / what Prism3 expects** where they said "member" and
  "the plan"; "knobs", "the generator" and "web studio" are gone from shipped strings.
- #4185 C: the stale-variant note offers Update file, never deleting the variants; "Not in this file" names the build
  step; the unreadable-brand, Docs-settings and table-cleanup lines gain a next step.

### The coupling that test caught
Studio reads the check's blocker lines by their words (`blockedWhy`, #3713). Rewording "the plan binds" in the plugin
dropped those lines to "a reason Studio doesn't recognize" until the matchers moved with them;
`test-update-kept-run.ts` failed by name on it.

### Held, not built
- `test-canonical-names.ts` is a suite, not a new CI gate: `ci.yml` is not this lane's to edit.
- The style-guide layer names (`Style guides — …` vs `Style guide — …`, #4185 D) stay: the plugin finds its own
  tables by those names, so a rename needs a migration of files already drawn.
- #4185 B (engine-internal miss lines to the dev log) is its own PR.
- #4191 T5 ("See Components" to "Set it in Components") is not here: `test-chrome.mjs` pins "See Components" as
  approved copy (2026-10-04), so it goes to the Studio lane (#4193) with the owner's read.

`docs/voice-standard.md` §7 lists the names; `29-tone-of-voice.md` §6b holds the reasoning.
