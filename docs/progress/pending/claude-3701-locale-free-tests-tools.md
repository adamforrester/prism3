## (2026-11-16) — Tests and tools outside the engine stop ordering by the host's locale (#3701, test and tool sites only)

**What.** #3698 finding 2 moved every comparison under `packages/engine/` onto `localeFreeCompare` and gated it with
`lint-locale-order.ts`, scoped to the engine. #3701 listed the sites outside it. This builds only the test and tool
sites, as the triage digest recommended; the user-facing ones wait for the owner.
- **Tools** (`binding-audit/audit.ts`, `binding-audit/reconcile.ts`, `conformance-scan/fix.ts`,
  `exporter-comparison/compare.ts`, `exporter-comparison/adapt-figma-emission.ts`, which feeds `gate.ts`) import
  `localeFreeCompare` by path, as they import the rest of the engine.
- **Surface tests** (`apps/plugin/test-readback.ts`, `test-agent-link.ts`, `apps/studio/test-smoke.mjs`,
  `test-chrome.mjs`) sort by code unit inline: a surface may not deep-import the engine (`lint-engine-facade.ts`), and
  each of these sorts only canonicalizes two sides that are compared to each other or to a literal.
- **`lint-locale-order.ts`** now also scans every `apps/<ws>/test-*` file (not TokenPress, a guest port) and all of
  `tools/`, with its own floor (100; 153 files today) and seven named files.

**Measured.** With the sites as on main, the widened gate fails 12 lines by file and line; with them fixed it is clean.
Narrowing its scope to drop `tools/` fails `REPRESENTED` for the three named tool files. `binding-audit/audit.ts` and
`exporter-comparison/compare.ts` print byte-identical output to main's on an English host (the comparator folds case as
the old order did there); `conformance-scan/fix.ts --selftest` passes.

**Held for the owner (#3701).** `apps/plugin/src/style-guide.ts`, `doc-panel.ts`, `list-fonts.ts` and
`apps/studio/src/state/component-groups.ts` order lists a viewer reads; whether those follow the viewer's locale is a
UX decision, so they are unchanged and outside the gate. TokenPress's `dot-notation-exporter.ts` is a guest port and
is left as ported.
