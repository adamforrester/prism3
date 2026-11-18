## (2026-11-18) — Badge and Tag leave foundations; Spinner's summary drops "ladder" (#2092)

**The decision.** The owner answered #2092 A on 2026-11-18. Badge and Tag leave `foundations` to match the Figma file, where both sit under Components (`apps/plugin/src/file-taxonomy.ts`). The Spinner summary the issue drafted is approved: "Indeterminate loading indicator in the icon sizes."

**Two values the decision did not name.** The category vocabulary is the KB's seven, and none of them is "components", so moving a def out of `foundations` means choosing one of the other six. This PR builds the recommendation: Badge becomes `feedback`, because a status label, count or dot reports state, as Banner and Toast do. Tag becomes `form`, because it is a control a user toggles or removes, as Segmented control is. **OWNER DECISION, pending:** both values are DRAFT and held in the PR.

**The gate.** `test.ts` held every def to its brief's category (#1700, #2488), and the KB still files `badge.md` and `tag.md` under `foundations`. The departure is admitted by name in a typed table, `OWNER_CATEGORY`, never by pattern. Each entry also records the brief and the category it departs from, so the entry fails if the brief moves under it. Two new arms cover the change:
- `#2092 <id> is filed under …` holds each value against the literal.
- `#2092 no component summary uses a retired word` sweeps all 62 summaries for D16's retired words. Spinner's was the only hit.

**Trap for whoever re-verifies.** Veil and Divider also sit under Components in the file and still carry `foundations`. The owner's answer named only Badge and Tag, so the two are filed as #4045 rather than moved here.
