## (2026-11-11) — Anatomy captions: the 84 held-back part notes become reader captions (#3610, #3552 Q-UG1 A)

**What landed.** The owner approved the drafted captions on #3610 as written. Each of the 84 held-back part notes on
34 defs is now its approved caption verbatim, so every anatomy legend entry, on a family lead's usage panel and on every
docs page, has text after its dash. `schema/component-maintainer.json`'s `docGaps` drops all 84 `anatomy.parts.*.note`
entries; 34 `out/components/*.md` pages gain their captions.

**Where the maintainer detail went.** The build lane's call, per the issue: a `// Maintainer detail, out of the reader
caption (#3610): …` code comment directly above each part, carrying the old note whole. Code comments ship in no
payload, and `notes`/`codeOnly` were not the right home (they are per def, not per part). Shared notes stay shared:
Button's and Icon button's factories, and the text-entry caret, value and message, so the family members read alike.

**Applied by script, checked by script.** The gap list (`docSections(def).gaps`) was generated in the issue's row order,
the 84 captions zipped onto it, and every note literal located by its parsed value. After the edit, all 394 part notes
were compared: the 84 equal their approved caption, the other 310 are unchanged. Pagination's four step cells pass their
note through a helper, so those were edited by hand.

**The gate.** A held-back note now fails by name on both surfaces. `lint-component-docs.ts` F4 gains `UNCAPTIONED PART
(page)`, and `apps/plugin/test-doc-panel.ts` gains `anatomy/uncaptioned` (every legend entry the plan draws, on every def,
has a caption). Mutation: Tag's label note given "See #3610." → `UNCAPTIONED PART (page): out/components/tag.md lists part
label` and `anatomy/uncaptioned … tag: "5  Label"`. `anatomy/held back` lost its corpus (its floor was 30 held-back notes,
now 0), so it now also draws a probe: Button with a maintainer-register label note, typed in the test. Mutation: the model
passes held-back notes through as captions → `anatomy/held back … probe button.label`. The hold-back mechanism itself stays,
so a maintainer note written later is still kept off the panel, and now also fails the build.

**Trap.** `lint-component-docs.ts` restates the maintainer mark rather than importing it, so the two regexes can drift;
`UNCAPTIONED PART` uses the gate's own copy, like the rest of F4.
