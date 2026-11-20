## (2026-11-18) — Every test and tool orders without the host's locale; lists a viewer reads keep it (#3701 A)

**What.** Owner decision A on #3701 (2026-11-18): lists a viewer reads in the plugin and Studio keep the viewer's
locale order, and only test and tool sites move to `localeFreeCompare`. #3823 had already moved the sites #3701
listed. This finishes the second half:
- **The one site left.** `skills/prism3-rebind/consistency-audit.js` sorted its findings, which become the table on
  #2886's Runs record, with `localeCompare`. It runs in Figma with no import, so it restates the comparator inline,
  as `rename-map.ts` does.
- **The gate's scope.** `lint-locale-order.ts` now reaches every kind of test and tool, not just `apps/<ws>/test-*`
  and `tools/`. It adds the workspaces' own gates (`apps/<ws>/lint-*`), the files at the repo root (`verify.ts`,
  `fold.ts`, `run-suites.ts`), `packages/tokens/*.mjs` and each skill's scripts. It names one file of each new kind,
  so a lost kind fails as unrepresented: 184 files today, against 153 before.
- **The header records the decision.** The surfaces' `src/` stays outside the scan.

**Measured.** With the site as on main, the widened gate fails `LOCALE ORDER:
skills/prism3-rebind/consistency-audit.js:369`. A new `test-consistency-audit.ts` arm builds three desktop pages,
`apple`, `Ébène` and `Fig`, listed in English collation order. It fails before the fix
(`["apple / Desktop","Ébène / Desktop","Fig / Desktop"]`) and passes after (`apple`, `Fig`, `Ébène`): `É` sorts after
every ASCII letter by code unit, and `apple` sorts before `Fig` only once case is folded. Mutations: dropping the case
fold from the audit's comparator fails the same arm (`["Fig / Desktop","apple / Desktop","Ébène / Desktop"]`; review
on #4054); dropping the `skills/` clause from the
scope fails `REPRESENTED: skills/prism3-rebind/consistency-audit.js was not scanned (#3701)`.

**Left as they are, by the decision.** `apps/plugin/src/style-guide.ts`, `doc-panel.ts`, `list-fonts.ts` and
`apps/studio/src/state/component-groups.ts`. The last passes `'en'` explicitly, so it follows an English collation,
not the viewer's locale. Whether "keep" covers that is raised on the PR, not changed here.
