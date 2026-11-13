## (2026-11-12) — Running prose names the Docs area as the rail draws it (#3669, Q203 A)

#3553 Q-UI9 A drew the Documentation area as **Docs** on the rail, its tooltip and its page title. Running prose
kept sending readers to "Documentation", and no gate held it: `lint-guide-claims` LABEL reads only bold spans, and
a fingerprint holds a block, not a word in it. The owner picked A: "Docs" everywhere.

- Guides (`docs/public/guides/`): the 16 lines the issue lists, plus `style-guides.md`'s screenshot placeholder.
  "Docs" takes no possessive, so "Documentation's Specs tab" reads "the Specs tab in Docs".
- App strings: `update-file.ts` `setupSub`, `toAddSub`, `cleanPanels` (the Clean up activity row) and
  `guidesSub`, and the plugin's run line `COVER_OFF` ("not drawn, the cover is off in Docs"). The test literals
  quoting them follow (`test-chrome.mjs`, `test-build-completed.ts`).
- `features.md:40`'s fingerprint on `update-file.ts:311-338` is re-stamped: the block's only change is the word.
- **Guard:** a new `lint-guide-claims` arm, AREA. Its oracle is `RAIL_AREAS` read as text from `pages.ts`. An
  area's `id` spelled as a word (`documentation` → "Documentation") that differs from its drawn `name` is a name
  the rail no longer draws, and it fails by name in a guide's prose and in any string literal of the three
  source trees. The limit is in its header: a rename that also renames the id leaves the old word unguarded.
- Left as written: the maintainer README (`apps/studio/README.md`) and code comments, which aren't running
  prose a designer reads; `style-guides.md`'s HTML draft note, which is history.
