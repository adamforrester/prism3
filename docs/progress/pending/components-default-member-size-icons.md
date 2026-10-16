## (2026-10-16) — Every size ladder leads with medium, and Button's icon slots lead with off (#2752, Q1 B and Q2 A)

**Status:** built on #2754's branch (open when this was cut), so the diff against `main` includes #2754 until it
lands. ENGINE minor (change note): the projected sets' member order, the component docs, `components.ai.json` and the
comparison report move. CONTRACT unchanged. `EXECUTOR_REVISION` stands: the slot order lives in the engine's
`figmaAnatomySet`, not in the plugin's executor, and `lint-executor-revision.ts` agrees.

**What moved.** The 25 sized defs that ran small to large (Q213, #2501) now read `medium, small, large`, the field
family's order since Q221 B; the two switch defs read `medium, small`. `figmaAnatomySet` enumerates each slot presence
axis `false` before `true`, so Button's three families insert with no icons. Only Button declares slot axes, so that
one line moves no other def. The code enums (`props.*.values`) keep their own order, as Q347's PR left them.

**The gates.** #2754's default-member gate (`#2752 <def>`) loses its two recorded exceptions, and with them the
exception machinery: no exception remains, and an empty list's per-entry checks would be assertion sites that never
run (#1268). Its MUST list now also names the size axis on every sized def and Button's two slot axes on all three
families. The #2501 order gate's size rule is retyped: medium first, then smallest to largest, with two named
exceptions, each with its reason: `field-label` (code default small, so small leads, Q1's own rule) and `spinner`
(builds single components, so nothing is inserted as a set). `lint-axis-values.ts`'s register follows: the canonical
size set is now `medium, small, large` with the field entry folded in, `field-label` is `reordered`, and the switch
subset is `medium, small`.

**Pins that assumed small first (Q213), updated to the decision and citing #2752:** `#1667`'s owner-worked floors
(now read through a typed small-to-large list, not the def's order), `#2188`'s first inverse row, the six-loop
`figmaAnatomySet` replica, the sizeless-plan refusal message, the cohort key, `#2417` and `#2319`'s shape literals,
and in `test-canvas-furniture.ts` the panel's size options and the Tag pilot's row labels.

**Update reorders in place** (`apps/plugin/test-update-apply.ts`, a second `default member/…` section). Button, Tag and
Switch are each built the way Q213 left them, two instances are placed, then the dry run and the apply run as
`main.ts` runs them. The dry run reads moves only (576, 30, 24), every member keeps its id and key, both instances stay
on the page on live members, the decided default ends up top-left, and the next dry run reads up to date. The old
Button is the new plan list with each run of four slot members reversed, because slot order is no `variants` list; a
premise check asserts the runs of four first. Same limit as #2754's proof: a shim instance holds its main component by
reference, so this proves no member was rebuilt, not how Figma itself resolves the instance.
