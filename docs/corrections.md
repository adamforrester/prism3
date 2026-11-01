# Corrections log

One line per owner correction to how an agent works (#3240, owner decision Q-SI1 A). Each line
records the date, the correction, where it became a rule, and the PR or issue that carries it. The
weekly retro checks that every line has landed as a rule; a line whose rule column says "Not yet"
is the retro's to-do. How to add a line: `CONTRIBUTING.md` §4, "Running a lane".

Rule locations: `CLAUDE.md`, a skill (`skills/…`), a gate (`packages/engine/lint-*.ts` and the
others in `CONTRIBUTING.md` §3), or the stance skills.

| Date | Correction | Rule | PR or issue |
|---|---|---|---|
| 2026-10-31 | No spec overrides on library instances. | Not yet | stance-skills #15 |
| 2026-10-31 | Spacing goes on the layout. | Not yet | stance-skills #15 |
| 2026-10-31 | Layer names, and the `/ role` exception. | Not yet | stance-skills #15 |
| 2026-10-31 | Nothing is added to the master unless a rebuild needs it. | Not yet | stance-skills #15 |
| 2026-10-31 | Skip "Flow" as a source. | Not yet | stance-skills #15 |
