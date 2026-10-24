## (2026-10-24) — prism3-rebind: lessons from a brand rebuild and its audit, and a new audit-and-repair section

**What changed.** `skills/prism3-rebind` takes the scrubbed lessons from a brand rebuild lane (35 items), each placed in the section it belongs to and merged with what was there:

- **§2** gains steps 6–13: keys for components the file has never instanced, per-component publish state, geometry computed before building, grid columns per breakpoint, screens on the page in scope, slot sizing, structure paired with screenshots, and the steps that need the owner's hands.
- **§3** gains two subsections: *Swapping in place* (measure first, hide the original, a per-node check within 2px before removal, override copying by child index, GRID ordering by position) and *Spacing* (the default majority-and-snap rule, both spacer forms, overlay refit, off-scale owner values applied raw and flagged).
- **§4** gains ten trap rows: hanging library imports, imported objects that vanish, timed-out calls that keep running, stacked image fills, FILL children in hugging slots, `resetOverrides()` renaming slots, same-value property sets, Sticky, screenshots of a second file, and node screenshots with no background.
- **§5**: contrast over photography is measured on a 2–8px ring and quoted at the brightest 5%; `textDecoration` before choosing a text layer.
- **§7**: rogue-item provenance, normalized detach checks, explicit modes, "update available" as NOT VERIFIABLE, classification by collection key (§8 step 5 now says where a hidden collection's key comes from), FPO and state exemptions, instance padding.
- **§10**: the audit script reads gaps and sibling distance, not padding, so padding is compared by hand, grouped by row role and breakpoint.
- **§11 (new)**: auditing and repairing someone else's rebuild: the fixed report shape, a named version per pass, read-before-write with batch abort, re-measure after a library republish.

**Corrected against the code while placing them.** The lesson said a design-system search "searches only the open file" without a key; the skill says it *may*, since that is the bridge's behavior, not the plugin's. "Sticky isn't settable" is stated as what the pinned plugin typings show (no scroll-behavior property). The audit script's spacing check was read before writing §10: it has no padding term, so §10 says so rather than implying the script covers it.

**Left out on purpose.** The library-side gap (no link color over photography, and whether the inverse link is too gray on solid dark grounds) is #2986, not skill text.
