## (2026-11-10) — Studio README: the Shell and Scope sections describe the IA v2 shell (#3271)

Docs only, no behavior change.

- **Scope.** The section still described the four-stage shell (Semantic / Typography / Form stages) and a brand
  selector that held the Name, Namespace and Modes fields. It now describes what the code builds: the rail's
  four areas (`RAIL_AREAS`, with Documentation hidden on the web), Theme's tab row (`DOMAINS`), the brand menu's
  examples, + New brand and ↑ Import design.md… (`bar.ts`), Theme › Brand's Identity, Personality and Modes
  (`domains/brand.ts`, `MODE_ROWS`), and Export's three artifacts (`export-settings.ts`, Component specs since
  #3425). Each bullet cites its source file.
- **Shell.** The "four-stage build order" section above it made the same claim, so it is replaced with a short
  description of the rail that points to Scope rather than repeating it.
- **Dropped, not rewritten.** "Promote the engine to `@prism3/engine`" is done (Studio imports it by name). The
  type specimen's "capped at 60px" no longer matches `type-scale.ts`, which caps at 44px. The detail belongs in that
  file's header, which already states it.
- **US spelling** throughout the two sections ("colour", "grey", "organised", "labelled" are gone).
