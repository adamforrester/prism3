## (2026-11-01) — Update file offers the usage panels a file is missing; Clean up removes them with panels off (#3137)

The owner approved #3137's wireframe on 2026-10-29 (Q3137.1–Q3137.8, all A) and lifted the hold on 2026-11-01. A set
built before Set up file had no usage panel, and turning Documentation's panels on drew nothing: a set whose only change
was a missing panel never read Due, so Update file never offered it. This builds the approved design. Every new string is
DRAFT.

- **The census (Q3137.3 A).** `apps/plugin/src/panel-census.ts`: an indexed search for panel tags, the criteria
  `allPanels` uses. A family has its panel when a live tag names its lead and a set id that is still a component set in
  the file. It runs inside `readPresent`, a page per turn beside the read's own search (`searchPagesYielding`), and is
  kept as `panelCache` beside `presentCache`,
  cleared by `guarded` the same way, so the badge's recount loads no page. `file-sets` and `file-due` carry `unpanelled`
  (and `panelLeads`, the count it is out of) only while Documentation has panels on. The switch is read on every
  recount, so turning it on recounts with no page load.
- **Update file (Q3137.1 A, Q3137.2 A, Q3137.4 A, Q3137.5 A).** Usage panels is Components' third subtitle. It lists the
  missing sets, less Due (its update draws the panel) and the queue (its build does). One tick, on by default. Up to six
  names inline, else under "Show the {n} sets", closed. The scoped check reads these sets with Due while ticked
  (`checkScopeOf`), and the update step takes them (`updateDefsOf`). The executor already draws a missing panel as
  furniture, and its re-spacing makes room for sets seated before `_Doc-block`. "Saves a version first…" now closes the
  section, so it covers the panels too. The badge counts the group as one item.
- **Documentation (Q3137.6 A, Q3137.7 A).** On, with panels missing: the count line and "Draw them with Update file",
  which opens the checklist. The description now says Update file draws a panel beside each set that has none. Off, with
  panels drawn: "Off: … The {n} already drawn stay. Update file › Clean up can remove them."
- **Clean up (Q3137.7 A).** While panels are off, Clean up counts the live panels as it opens (`panels-clean`, confirm
  false) and offers "Remove {n} panels". The removal re-reads the file and removes only the panels `panelUnedited`
  passes, so an edited panel stays. It runs under the prune's guard and, like Prune stale, saves no version. The agent
  gets it as `panels-clean` (`commands.json` regenerated).
- **Components page (Q3137.8 A).** No status, as decided.
- **Deliberate deviations.** The census search runs with every full read, not only while panels are on: that is what
  lets turning the switch on recount with no page load. Only the list is gated on the switch. And it is a search per
  page, not the wireframe's one document search: the first verify run caught a document-wide search here breaking
  #3170's rule (no turn searches more than one page, `test-open-large-file.ts` `open/no-walk`). Each page is now searched
  once per criterion per read, which that gate now counts per criterion. The panels removal saves
  no version, mirroring Prune stale, rather than adding a version-title kind.
- **Trap for re-verifiers.** The badge has two sums: `badgeCount` in the model and the shell's own `paint`. The first
  chrome run caught the shell's sum leaving the group out. Both are now under a mutation.
- **Tests.** `test-doc-panel.ts` `census/…`, `clean/…` (the in-place update over a blocked, missing panel draws it, and
  the census then lists nothing); `test-build-completed.ts` `q3137/…` through the real `main.ts` (0 page loads on the
  recount, the switch read each time); `test-update-file.ts` Q3137 arms; `test-host-session.ts`; `test-agent-link.ts`
  parity for `panels-clean`; `test-open-large-file.ts` (the census a page per turn); `test:chrome` section `3137` at 380
  and 1280, light and dark. Thirteen mutations, each failing by name.
