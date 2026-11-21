## (2026-11-20) — Report a problem: a placed instance's name and text stay out, and the scrub never wraps its own placeholder (#4351, #3957)

**#4351, what.** Update file's slot migrations name each placed instance by the client's own layer and page names
(`<set> instance "<name>" on <page>: …`, `slot-migration.ts` and `slot-text-migration.ts`), in the check's lines and in
the apply's misses, which `applyVerdict` prints on the `<set>: N fields still differ from the plan — …` line. The issue
named the instance and page; tracing it showed the rest of each line carries the client's own text as well: the rows'
labels (`"Email" selection=checked; …`), the body that moves into the text property, and the values a miss read back.
None of it is a brand word or a host message, so `buildReport` passed it whole.

**#4351, the fix.** `reduceInstance` (`apps/studio/src/state/report.ts`) keeps the set and cuts each entry from
` instance "` on: `checkbox-group instance [removed]`. The drawer is unchanged. A name can hold a quote or a line break,
so no end inside it is trusted: the cut runs to the end of the entry, not of a line, before the entry is split. A
`<set>: N fields still differ — …` line loses any misses after the first instance-named one; it loses detail, never
leaks. The words in the report's place (`instance [removed]`, reusing the existing placeholder) are DRAFT, an owner
decision on #4351. Arm: `apps/plugin/test-slot-migration.ts` section "report", over the plugin's own dry run (an
instance named and labeled with literals), an apply verdict, `slotTextLine` with a page, and a name holding a quote and a
line break. Mutation: `reduceInstance` dropped → `#4351 report/instance: … the check's line` and the others. After
review, the misses come from the fills themselves, never a typed copy of their wording: `fillSlots` on a next run that
reads a kept capture on a host that finds no row component, and `fillSlotText` reading back a value the host did not
take. Mutation: both fills' `where` written with single quotes → `#4351 report/instance: … the rows fill's misses` and
`… the text fill's misses`.

**#3957, what.** A brand word the scrub's own placeholder holds wrapped it again: the aurora and prism3 examples name a
gradient `brand`, so `[brand]` became `[[brand]]`, and a plain long word such as `bran` or `remove` cut into `[brand]`
or `[removed]`. **The fix:** `scrub` splits the text on the placeholders it writes and looks for each word only between
them. A placeholder's brackets bound a segment just as its letters did, so matching elsewhere is unchanged. A brand
word that itself holds a placeholder's text (`Zork [brand] Quux`, any case) is looked for in the whole text, as before,
so it is still taken out (found in review). Arms: `apps/studio/test-report.ts`, the issue's reproduction, four typed
cases and three `#3957/holds` cases. Mutations: the split dropped → each `#3957` arm by name; every word looked for
only between placeholders → each `#3957/holds` arm by name.

**Not done here.** #3957's second half, whether a word such as `brand` (the engine's `color.text.brand` role) should
count as engine vocabulary, is a question about `ENGINE_VOCABULARY`'s scope, raised on the issue as an owner decision:
the report still takes `brand` out of `color/text/brand` when a brand authored that word. Plugin and studio behavior
only: no change note, as #3702 and #4257 had none.
