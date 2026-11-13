## (2026-11-13) — Update's check: a set waiting on a theme-blocked provider is blocked only until Theme (#3770)

**What.** On the template file, Update file listed Wallet button, Sign-in button and Card number field under "Can't
update yet". The first two read "needs Provider logo, which this file doesn't have"; Card number field read "swaps to
Provider logo". The file holds Provider logo. Each blocker was a provider-logo *mark* the plans nest or swap to:
`button/*` for Wallet button, `provider/*` for Sign-in button, `payment/generic` for Card number field. The set itself
was not the missing piece.

**Diagnosis.** First, what it is not. A reproduction through the real `main.ts` in the component shim ran Set up file,
then built provider-logo onto `↳ Icons & assets` and each dependent onto its own `↳` page. Its pages search one at a time,
as Figma's do. The check found every mark and blocked nothing, with or without provider-logo in scope. So the page, the
name and `locateSets` are not the cause. When every mark is in the file under its current name, the check sees it.

The template's provider-logo is short of marks the three sets now need, and the run that adds them got no credit for
them. #3343 credits a target's adds only when the target is unblocked. #3421 runs a target blocked only by Theme's
variables and styles after Theme, and it updates correctly. But it credited nothing, so the sets nesting its marks kept a
non-Theme blocker and were left out. That is the one path inside a run that matches the report: about 60 sets updated,
and only provider-logo's dependents were held. The template file itself was not read, so this is inferred from the code.

**Fix.** `previewUpdate` (`apps/plugin/src/update-plan.ts`) keeps a second credit, `addedAfterTheme`, for the names a
theme-blocked target leaves in the file. Take a set that lacks more than Theme writes. If its lacks, read again with
those names counted, are only Theme's, it reads `themeBlocked`, the same as its provider. It credits its own names the
same way, so a chain carries. Its blockers stay as the file has them now, so the hash and the Theme-unticked reasons do
not move. The run checks again after Theme (`recheckFirst`). By then the provider is unblocked and credits its marks
through #3343's `addedThisRun`.

**Not fixed, held for the owner (#3770):**
- A provider outside the run gives the same rows: under Kept edits with Keep, or under Not checked yet. The only fix is
  for the update to pull a present dependency into the run. An update does not build other components (#2380), so that
  is a scope decision.
- "Tick Provider logo on Components first" is wrong advice for a single-component set that is present but missing
  marks. Components offers no tick for a set already in the file, and ticking it queues nothing. The words are the
  owner's (#3721).

**Test.** `apps/plugin/test-update-apply.ts`, in the #3343 section. A provider-logo plan binds a variable the file lacks,
so provider-logo reads blocked only by Theme. `run adds/after theme`: wallet-button reads `themeBlocked`, and its one
blocker still names all 11 button marks. `run adds/after theme, unsupplied`: the provider's plans leave out one mark, and
wallet-button is blocked outright.

**Mutations** (each committed `wip:` first, then restored from `HEAD`):
- `addedAfterTheme` never filled: `run adds/after theme` fails.
- `themeBlocked` set whenever an after-Theme credit exists (the `after.theme === after.lines.length` test dropped):
  `run adds/after theme, unsupplied` fails.
