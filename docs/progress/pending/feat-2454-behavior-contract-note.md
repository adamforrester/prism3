## (2026-11-18) — The behavior layer is decided: a written contract for plain HTML/CSS, behavior inside the web component (#2454)

Q-BH1 A closes `docs/41`'s wall, recorded as §7.2. Thirteen interactive defs (breadcrumb item and
breadcrumbs, code input, dialog, link, page nav and its item, pagination, segmented control and its segment, slider,
tab and tabs) carried "code delivery pending: behavior layer" in a `deferred` code note; each now says
"Plain HTML/CSS: wire this behavior contract up in your framework. The web component includes it."
Their behavior contracts (`accessibility`, the other `codeOnly` entries) are untouched: they were
written framework-neutral so they would hold under any answer.

- **Two notes keep their own detail.** Dialog's adds which behavior the developer wires (initial focus,
  backdrop-click dismissal, focus return); pagination's keeps the headless `usePagination` shape.
- **The test lists the thirteen ids by hand** rather than reading which defs carry the note, so a def
  that loses it fails by id. A second check fails if any def still says code delivery is pending.
- **Not touched:** defs with a keyboard contract that never carried the pending note (accordion,
  select, radio group and others). The issue scoped the change to the notes it planted.
- The entries keep the `deferred` class: code delivery is still not built.
