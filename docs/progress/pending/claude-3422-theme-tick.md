## (2026-11-04) — Update file ticks Theme only when the file differs from the brand (#3422, Q44 A)

**What.** Update file's checklist always opened with Theme ticked (Q2909.2 A). The badge counted Theme only when the
file's variables differed from the brand (`badgeParts`, the live recount's `theme`). So a run with nothing to change
still re-applied the whole brand, and the checklist looked as if something was due. In real Figma the owner saw
"1 update" for a real Theme change, then wondered whether Theme is ever unticked. Q44 A (the owner, 2026-11-04): Theme
opens ticked only when the file differs from the brand. When it matches, the row stays, unticked, tagged "Up to date",
and can still be ticked to apply the brand again. This supersedes the always-ticked part of Q2909.2 A. Theme is still
always an item.

- `themeDueOf(live)` (`apps/studio/src/state/update-file.ts`) is the one signal: the live recount answered, could read
  the file, and says it differs. `badgeParts` counts Theme on it, and `defaultTicks` (a new `live` argument) ticks
  Theme on it, so the badge and the ticks agree. A file that is not set up holds no brand, so its Theme is always
  ticked; this keeps its cover step (#3308).
- `shell/update-file.ts` keeps the recount it opened with (`liveAtOpen`). The default tick and the tag read it, and the
  first due read asks against the brand that tick picks (#3023 Q701 B). So a recount landing while the checklist is open
  moves neither the ticks nor the counts.
- "Up to date" is the sets' existing status word (`UPDATE_COPY.themeCurrent`, held equal to `status.current` by the test).
- Before the first recount answers, and on the plugin's demo brand, where the panel shows no recount (`liveShown`), the
  badge counts no Theme, so Theme opens unticked. Ticking it is the way to apply the brand there.

**Tests.**
- `test-update-file.ts`: literal expectations. A file that matches opens Theme unticked and "Up to date". One that
  differs opens it ticked. With no recount, or a failed one, it is unticked. A file not set up ticks it. The badge
  count equals the ticked count (2 and 2 matching, 3 and 3 differing). Mutation: `defaultTicks` ticking Theme always
  fails `Q44 A ticks: a file that matches the brand opens with Theme unticked`, `Q44 A badge = ticks: … matches …` and
  two more, by name.
- `test:chrome` section 10: on a set-up file with no recount, Theme is unticked with no tag (Q44.2 A, below). After a
  recount saying the file matches, it is unticked and tagged "Up to date"; after one saying it differs, ticked, with no tag. The same mutation, built, fails `Q44 A Update file …` by name at
  every width and theme. The IA2 case plants the recount its unapplied Pill implies. Section 3170 unticks Theme only
  when it opens ticked.
- `test:verdict`: the arms that need a Theme run tick it by hand (`tickTheme`), as a designer forcing a re-apply would.
  The drivers that untick it do so only when it opens ticked.
- `test:chrome` cases that run the Theme step on the demo brand (sections 30b, 31, 3150) tick it by hand (`tickTheme`).

**Guides.** `apply-a-theme.md` and `update-a-file-safely.md` said Theme is ticked each time the dialog opens; they now
say when it is, and that it reads "Up to date" otherwise. The other guides' citations into `update-file.ts` follow the
lines this change moved (`lint-guide-claims`).

**After review: two recommended options, built as their own commits, the owner's to confirm.**

- **Q44.2 A: "Up to date" only when measured.** The tag rendered on `!themeDueOf(live)`, which is also true before the
  recount answers, when it failed, and on the demo brand: nothing had been compared. It now renders on
  `themeMatchesOf(live)`, a recount that read the file and found it matching. The tick is unchanged. Mutation: the tag
  back on `!themeDueOf` fails section 10's `Q44 A Update file … no recount has measured …` by name at every width.
- **Q44.1 A: the signal reads what was written, not only the input.** The recount's `theme` compared the saved brand
  input alone (`holdsInput`), so an engine update that moves the variables under an unchanged brand read "matches", and
  #3428's themeBlocked sets could not ride: merged with #3428, its gate failed 9 checks. Apply Theme now stamps the
  print of the plans it wrote beside the input (`apps/plugin/src/theme-emission.ts`, FNV of the plans' JSON). The
  recount (`themeDue`) reads Theme due when the input differs or the stamp is not the print of what this plugin would
  write for the panel's brand. The print is planned once per brand asked about (about 0.2 s; memoized for the same brand).
  - Gates: `test-build-completed.ts` `q44.1/engine moved`, `q44.1/no print`, `q44.1/control`, through the real
    `main.ts`; `test-readback-parity.ts`, the real Apply Theme stamps; `test-update-kept-run.ts` opens with the recount
    `main.ts` would send in its world, so #3421's ordering fix fires again. Mutations: the recount reading the input
    alone fails `q44.1/engine moved`, `q44.1/no print`, `order/theme due` and #3428's arms; Apply Theme not stamping
    fails each brand's `#3422 Q44.1 A` arm.
  - **Trap:** a brand saved with no print reads as differing: a file themed by a plugin before this one, or by an
    agent's paste (`mcp-steps.ts` `runPersist`, left alone to keep the paste scripts small, #3414). Theme counts once
    there, until a Theme run stamps the print.

**Version.** `engine: patch`, as #3428 now declares too: the repo's practice for a plugin behavior change.
