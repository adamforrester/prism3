---
engine: minor
---
out/tokens.html is built on demand and no longer committed (Q319.6, owner decision on #2583). regen.ts drops the
visualize step and lists the page in ON_DEMAND_OUT: both out/ walks (regen's and lint-payload-manifest's) skip it, and
regen --check fails by name if any step writes it or git tracks it. visualize.ts takes --out <dir>; the root script npm run tokens-html
builds it into out/, where it is gitignored. lint-us-english and lint-voice skip a local copy and scan a page
rendered into a temp dir (regen.ts renderOnDemand), so the page stays in their scope in CI. test.ts renders its own copy into a temp dir for the #2586 specimen check.
The preview rule leaves payload-manifest.json, and the drift gate's artifact count drops by one. No token, emitted tree
or projected component surface moves, so CONTRACT is unchanged.
