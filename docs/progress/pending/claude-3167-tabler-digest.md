## (2026-11-01) — test:chrome holds the vendored Tabler set to a digest taken from the package (#3167)

**Status:** gate change. ENGINE patch (change note): no committed artifact moves. CONTRACT unchanged. No executor
change.

### What changed

- The glyph arm (#3083) compares each drawn `<svg>` with `TABLER_SET`, which is parsed from
  `apps/studio/src/shell/icons/tabler.ts`, the file the bundles draw from. A path edited there by hand reached the
  oracle and the drawing alike, and the arm passed (docs/34: the oracle derived from its subject).
- **Direction: the issue's second option, a committed digest.** The first, re-deriving the set from the pinned
  package in a gate, needs the tarball at gate time: a network fetch inside a gate or a new CI step. The digest needs
  neither, and a hand edit to `tabler.ts` is exactly what it catches.
  - `apps/studio/chrome/vendor-icons.mjs` now also writes `apps/studio/chrome/tabler-digest.json`: the version and,
    per icon, the sha256 of `JSON.stringify` of its `d` strings as the package ships them.
  - `test-chrome.mjs` checks `TABLER_SET` against it before any arm reads the set: every icon matches its digest,
    no digest names an icon the set lost, and `TABLER_VERSION` is the digest's. A miss fails by name and exits.
    The formula is restated there, not imported.
  - The committed digest was taken from `npm pack @tabler/icons@3.49.0`: re-vendoring every icon in the set from
    that package reproduced `tabler.ts` and `LICENSE-Tabler.txt` byte for byte, then wrote the digest.
  - The generated header of `tabler.ts` now says the set is held to the digest.
- **Limit, stated:** editing `tabler.ts` and the digest together by hand passes. The digest makes that a deliberate
  two-file act rather than a slip; it does not prove the pair is Tabler's.

### Verification

- Mutation (committed first): `'M3 3l18 18'` appended to `color-swatch` in `tabler.ts`, both bundles rebuilt (the
  issue's reproduction), and `test:chrome` fails by name: `✗ tabler digest: … paths differ: color-swatch`.
