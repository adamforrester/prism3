---
engine: patch
---
lint-network-reach reads protocol-relative hosts (#3188). A request written `//host/...` takes the page's scheme, and
the gate's host scan needed one, so an offline-only request written that way passed. A second shape reads a `//host`
after a quote, `(`, `=` or whitespace, on both builds, held to the same allowed and reference-only lists. No existing
arm narrows, and no emitted artifact, token or component surface moves.
