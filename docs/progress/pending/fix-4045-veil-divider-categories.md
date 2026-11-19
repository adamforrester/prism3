## (2026-11-18) — Veil and Divider leave foundations (#4045)

**The decision.** The owner answered #4045 A on 2026-11-18: Veil's category becomes `overlay` and Divider's becomes `layout`, out of `foundations`, to match the Figma file, where both sit under Components (`apps/plugin/src/file-taxonomy.ts`). This follows #2092, which moved Badge and Tag the same way.

**The gate.** `test.ts` holds every def to its brief's category (#1700, #2488). Divider's brief, `divider.md`, still files it under `foundations`, so the departure is admitted by name in a typed table, `OWNER_CATEGORY`, which records the brief and the category it departs from. Veil has no brief: its header states its category beside the "No KB brief" line, and the header now states `overlay` with the owner's reason. A new arm, `#4045 <id>: is filed under …`, holds both values against the decision's literal.

**Trap for whoever re-verifies.** #4058 (#2092) adds the same `OWNER_CATEGORY` table for Badge and Tag and had not merged when this branched off `main`. Whichever lands second takes the union of the two tables; the two arms keep their own issue numbers.
