## (2026-11-13) — Update file's "Can't update yet" rows take the owner's copy decisions (#3721 follow-up)

The owner answered #3721's six copy choices (D3721.1–.6, 2026-11-12) by accepting each recommended option. This applies them.

- **D3721.1 (b):** a blocker line of a shape Studio's copy doesn't know no longer shows the engine's own words. It reads one fixed line, "Can’t update yet — the check gave a reason Studio doesn’t recognize. Report it with Report a problem." Report a problem is the control's own name (`state/report.ts`). The decision is the owner's; these words are the lane's, so the string keeps its DRAFT marker for the owner's check.
- **D3721.3:** "Add {Set} on Components first." became "Tick {Set} on Components first." in both the missing-set and swap-target arms, since Components adds a set by its box.
- **D3721.4:** "The agent’s Adopt can claim them first." became "Studio can’t do this yet." The pointer to #3714, the missing write path, sits in a code comment, not on screen: no other Update file row links an issue.
- **D3721.6 (b):** the plugin's swap-target blocker (`fileBlockers` in `update-plan.ts`) is now cut by set, not by target (`firstFewSets`). It keeps every target of the first three sets, grouped by set, then ", and N more" counts sets. Studio names one set per entry, so "Icon, Button, and 1 more" now means one more set. Text and effect style lists keep `firstFew`, where each entry is one style.
- D3721.2 ("N more reasons") and D3721.5 (the em dash) stay as they were. The DRAFT marker is gone from `blockedWhy`'s header.

**Left for #3724:** `blockedLine`'s header still says DRAFT. #3724 rewrites that header (into `reasonText`, `blockedLine` and `blockedReason`), so touching it here would conflict. The words it covers are approved now, so #3724 can drop the marker on its rebase.

**Trap:** the swap-target line's ", and N more" counts sets while the names before it are targets (`icon/close, icon/check, button/x, …`). That matches what Studio shows, because Studio reduces the targets to set names. A raw reader of the dry run's blockers, such as the agent, should read the tail as sets.
