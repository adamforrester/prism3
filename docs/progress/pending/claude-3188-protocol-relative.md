## (2026-11-01) — lint-network-reach reads protocol-relative hosts (`//host`) on both builds (#3188)

**Status:** gate change only. ENGINE patch (change note): no committed artifact moves. CONTRACT unchanged. No executor
change.

### What changed

- `URL_HOST` needs a scheme (`https?|wss?`), so a request written `'//tracker.example.net/p.gif'` named a host the
  gate never read, and an offline-only one passed. Figma's CSP under `["none"]` still blocks it: this was a gap in
  what the gate proves, not a live leak.
- New `PROTO_REL_HOST` reads a `//host` after a quote, `(`, `=` or whitespace. Both builds' host arms now read their
  hosts through `hostsIn`, the union of the two shapes, so the offline arm (reference-only) and the network arm
  (allowed or reference-only) hold the new hosts to the lists they already used. `URL_HOST` and every other arm is
  unchanged: this is an addition, not a narrowing.
- Two detector controls: the host after each claimed lead is read, and a `// comment`, a mid-path `//` and an empty
  `////` read nothing.
- The real builds name no protocol-relative host today, so no list moved.

### Verification

- N2 mutation (committed first): `new Image().src = '//tracker.example.net/p.gif'` in the offline branch of
  `requestWebFace` (`apps/studio/src/ui/web-fonts.ts`), `build:release`, then the gate fails by name:
  `[host tracker.example.net] in release-offline/ui.html is reference-only`. On `main`'s gate the same build passes.
