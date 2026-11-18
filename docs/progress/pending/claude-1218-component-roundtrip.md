## (2026-11-18) — The component round trip can run against a real Figma file, from the Mac (#1218)

**What ships.** `tools/component-roundtrip/`, a Mac-run tool, not a CI gate (owner decision of 2026-11-18, B).
`roundtrip.ts scripts --scratch-file '<name>'` writes numbered scripts the Mac passes to the Desktop Bridge, one per
call. They build the projected defs into the open scratch file, read them back and diff them. `roundtrip.ts report`
prints one line per def and every divergence as `<def> · <member> · <path> · <field>`. The default def is `field-label`,
#866's permanent guard. The README carries the Mac job.

**Reused, not re-derived.** The plan is the offline round trip's, `figmaAnatomySet(def, { swapTarget })`. The build is
the plugin's `applyComponentPlan`, and the diff is `diffAnatomy` with ports read off the file's own catalogs. The
in-host glue restates `test-roundtrip.ts`'s `roundTrip()` steps rather than importing them, because that file is a gate
script that runs on import. The plans are hashed into the run, and `report` refuses a result built from other plans.

**Why the diff runs in the host.** A real file returns its scenegraph to the agent, and the agent would have to carry
it back into a file. The executor, the diff and the field-label plans together are about 255,000 characters, which is
already eight calls at the 45,000-character script ceiling. So the scripts STAGE the payload in the plugin's global
scope, one slice per call, and the last script checks the slices against the payload's length and hash before running
it. Only the per-def verdicts come back. A host that does not keep its global scope fails that check, and nothing is
written. Whether the Desktop Bridge keeps it is unverified, and the README says so.

**Safety, in code.** The run refuses unless the open file's name equals `--scratch-file`, and it saves a version before
the first write. Every import-by-key method throws. It writes only to a page it creates, then checks every earlier page
is still there.
- **The import guard is a facade (`host-facade.ts`), not a `Proxy` over `figma`.** The strict shim, which models #3209's
  fixed host methods, made a Proxy version throw on the first `getLocalTextStylesAsync` read. Mutant M3 below is that
  version.
- **A fresh page per run**, because the executor skips a member already in its set. Otherwise the read-back would
  report an older build.

**A drift found, filed as #3972.** `test-roundtrip.ts` restates `SWAP_TARGET` as `'FPO-default-icon'` and says it is
the plugin's constant. The plugin's is `'icon/FPO-default-icon'` (`build-deps.ts`). This tool imports the plugin's.

**Measured.** `npx tsx tools/component-roundtrip/selftest.ts` passes 23 of 23 arms, running the exact scripts against
the component shim dressed as a file:
- **clean:** field-label 24/24, 0 divergences.
- **planted:** a TEXT node that discards its property references is reported in 48 lines, as `field-label · <member> ·
  container/label · propertyRef: expected characters ← label, got characters → DISCARDED`.
- **one arm each** for not-scratch, no-version, import-by-key, page-deleted, staging-lost and other-plans.
- **import-by-key-run:** an executor planted to ask its host for `importComponentByKeyAsync` is refused, never reaches
  the raw host, and is reported as `✗ SAFETY: the build asked to import by key`. This proves `run()` hands the executor
  the guarded host, which the `import-by-key` arm (the guard alone) could not (review S1).
- **static checks:** no import-by-key call site in the bundle, and every script within the ceiling.

Eight mutants of the subject each failed their own arm:
- M1, the diff dropped → `planted`;
- M2, the scratch check dropped → `not-scratch`;
- M3, the guard as a Proxy over `figma` → `clean`, `planted` and `import-by-key` (#3209's error, verbatim);
- M4, the page check dropped → `page-deleted`;
- M5, the run carries on when no version was saved → `no-version`;
- M6, `report`'s plan-hash check dropped → `other-plans`;
- M7, `run()` hands the executor the raw host (review R1) → all three `import-by-key-run` lines;
- M8, the refused-import violation never recorded → `import-by-key-run`'s violation and SAFETY lines.

It has not run against real Figma. That is the Mac job.
