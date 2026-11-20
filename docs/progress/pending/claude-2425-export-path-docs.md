## (2026-11-19) — docs/12 records the export package, and the code's two gaps are filed (#2425)

**What.** Owner decision #2425 A lands as `docs/12` §12, a `Decided (2026-11-19, #2425)` heading with its `docs/42` row
and baseline row, and `docs/12` joins `REQUIRED_DECISION_DOCS` in `lint-decisions-index.ts`. No Style Dictionary preset,
no value-shape options, one ZIP once an export has more than one file, and CSS built by the Style Dictionary build.
§11a ("a DTCG preset, a Style Dictionary preset, or custom") and §10g's "genuinely relevant remainder" each carry a
"Superseded 2026-11-19 by §12" marker rather than being rewritten.

**Where the code disagrees.** The first two calls already match `apps/studio/src/export-settings.ts`: `ARTIFACTS` has no
Style Dictionary entry, and `DTCG_SETTINGS` holds four renamings and no value shapes. The other two don't. `exportTokens`
and `exportComponentSpecs` in `apps/studio/src/main.ts` write one download per file, with a comment explaining why it
isn't zipped, and the studio exports no CSS. Both are code changes with their own calls, so neither is built in this
docs PR. The ZIP needs a writer the engine's no-dependency rule can live with, and `test:export-parity` has to read
through it (#4303). CSS for a live theme needs Style Dictionary to run at export time, and a place in the dialog (#4304).
The extras export is #4302. Collection filtering and TokenPress's place in the Community (#2425's calls 5 and 6) are not
decided here, and the section says so.
