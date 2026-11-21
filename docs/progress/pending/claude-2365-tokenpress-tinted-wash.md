## (2026-11-19) — TokenPress exports a tinted wash as the color at its alpha (#2365)

**What.** Since #1646 Apply Theme writes a tinted wash (`color/interactive/primary/subtle-fill/selected`, in every color
mode) as an alias with opacity, `{ color: alias, opacity: alias }`. TokenPress read that as a plain color and exported
`components: [null, null, null]`. Owner decision #2365 A: it now exports the color the alias resolves to in the wash's
mode, its alpha multiplied by the opacity (a percent, as #709 records), and with Figma extensions on it keeps both
aliases in `$extensions.figma.aliasOf`. The reader takes any composed color, so a literal color at an aliased opacity
(Figma's other `VariableComposedColor` form, which prism3 never writes) takes the same path.

**Mode resolution.** The exporter's existing alias walk (`resolveAliasSourceValue`) reads a target's first mode, which
is right for typing and wrong for a value: the dark wash would get the light fill. The new walk reads a same-collection
target in the same mode, and a target in another collection through that collection's default mode, as Figma does when
no mode is set. That is how the 30% step in the single-mode opacity collection resolves.

**The two gates.** `tools/exporter-comparison/adapt-figma-emission.ts` had dropped `aliasOpacity`, so the expected side
handed TokenPress an opaque alias too. It now passes the composed shape through as Apply Theme writes it (counted as
`washesComposed`). `apps/plugin/test-readback-parity.ts`'s carve-out failed as its header predicted (0 of 4 carved per
brand) and is gone, so the washes cross the export comparison like every leaf. **That comparison runs one exporter over
both sides, so a wash both read wrong would agree with itself.** A new arm checks each wash's exported color against the
emission instead, which neither export produced: the emission's own channels, and its `aliasOpacity` percent as the
alpha, floored at 4 washes per brand. The exporter gate's value differences are reporting-only and moved no pinned arm.

**Mutations, each failing by name:** the composed path disabled fails the unit test and `<brand> washes (#2365): each of
the 4 exports as the emission's color at its opacity` (with the null components printed); the opacity not applied fails
both; the mode ignored fails the unit test's dark arm and the same read-back arm; the adapter dropping the opacity again
fails `<brand> export: VALUE — 4`.

**After #4166 (delta review, 2026-11-20).** The merge put the wash next to #4166's team-library aliases, and both the
scanner's library lookup and the validator's broken-alias check read only a bare alias. A wash over a library variable
exported `{VariableID:…}` and a wash over a dangling id passed validation, against the fallback's own comment. One
helper, `aliasTargetIds` (`figma-guards.ts`), now gives both halves of a wash to the scanner and the validator, and the
scanner records each library collection's default mode, which the wash's walk reads as it does a local collection's.
`tests/unit/tinted-wash-library.test.ts` (5) holds it, by hand-typed values; each arm failed before the fix.
