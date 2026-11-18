# Dependency advisories: the register

Each `npm audit` advisory the repo carries on purpose, with the owner decision that keeps it and the day
it is reviewed. Nothing here ships: every package below is a build-time or dev dependency, and none
reaches a plugin or Studio bundle. Every row below is owner decision A on #3505 (2026-11-18): accept the
deepmerge and esbuild advisories as dev-only, and wait for upstream fixes to glob and minimatch. The
audit census for that decision, run the same day: `npm audit` reports 11 moderate (glob, minimatch,
esbuild and the packages that depend on them) and no longer lists deepmerge, which is still installed
at 4.3.1.

**The review date is enforced.** Each row's last cell reads "advisory until `<date>`", the form
`packages/engine/lint-advisory-expiry.ts` reads in every tracked file. On that day the gate fails and
names the row. `test.ts` (#3505) checks that the gate sees every row.

## How to review a row

1. Run `npm audit` and read the advisory's range against what the lockfile installs.
2. If a fix now exists inside the declared ranges (no `--force`, no major bump the owner has not
   approved), take it in its own PR and delete the row.
3. If not, ask the owner. A new date is a new decision: record it in the row with the decision's date
   and issue. Moving the date without one is what the gate exists to stop.

## Accepted: dev-only, no fix taken

| Advisory | Package | What reaches it | Why no fix | Review |
|---|---|---|---|---|
| GHSA-gcqx-w48m-w2h4 (prototype poisoning, low) | `deepmerge` 4.3.1, via `@bundled-es-modules/deepmerge` under `style-dictionary` (`@prism3/tokens`) | Style Dictionary merging the repo's own token JSON at build time. No untrusted input. | No patched release exists: 4.3.1 is the latest. | Accepted advisory until 2027-02-18 |
| GHSA-67mh-4wv8-2f99 (dev server reads, moderate) | `esbuild` `^0.24.0`, a direct dependency of plugin, Studio and TokenPress | The advisory is about esbuild's development server. Every build and test calls `esbuild.build`. One local command starts the server: Studio's `npm run dev` (`apps/studio/build.mjs`), on `127.0.0.1` behind the front server on port 5173, which passes the server's response headers through. A page open in the developer's browser while it runs is the exposure (#4011). | The fix is 0.25+, a major change under 0.x that moves every built bundle. | Accepted advisory until 2027-02-18 |

## Waiting on upstream

No override across a major version. The fix arrives when the parent package takes the patched major.

| Advisory | Package | What reaches it | What it waits for | Review |
|---|---|---|---|---|
| GHSA-3g3m-2fjr-6pw4 (traversal after a timeout, moderate) | `glob` 13.x, via `@bundled-es-modules/glob` under `style-dictionary` | Style Dictionary's file globbing over the repo's own token files at build time. | `style-dictionary` or `@bundled-es-modules/glob` to take `glob` 14.0.2+. Every 13.x is in range. | Waiting; advisory until 2027-02-18 |
| GHSA-g3hv-75wg-m249 (denial of service, moderate) | `minimatch` 10.x, via `@typescript-eslint/typescript-estree` (TokenPress dev dependencies) and `glob` | Lint and build tooling over the repo's own files. | `@typescript-eslint/typescript-estree` to take `minimatch` 11.0.1+. Every 10.x is in range. | Waiting; advisory until 2027-02-18 |
