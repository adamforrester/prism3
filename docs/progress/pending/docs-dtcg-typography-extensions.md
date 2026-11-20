## (2026-11-20) — Three typography sub-properties are documented as Prism3 extensions to DTCG §9.8 (#4128)

Owner decision A on #4128 (2026-11-20): `fontStyle`, `textDecoration` and `textCase` stay in a `type.*`
style's `$value`, and are recorded as Prism3 extensions to DTCG 2025.10 Format §9.8. Docs only; no output
changes, so there is no engine change note.

- `packages/tokens/README.md` gains a section after the `font` shorthand one (#3507). It names each key, what
  it carries, which styles carry it, whether the stock `font` shorthand writes it, and that a strict §9.8
  reader may drop it.
- `docs/30-versioning-and-compatibility.md` lists the three under "What this does *not* cover": they are
  sub-values of a guaranteed name, so they move no `CONTRACT_VERSION`.

### What was measured

On the emitted `out/*.base.tokens.json`: each key only ever holds one value — `fontStyle: "italic"`,
`textDecoration: "underline"`, `textCase: "uppercase"` — and is absent otherwise (`tree.ts`
`typographyLeaf`). `prism3` carries 40 italic styles, 26 link styles and 3 eyebrow styles; the other
brands carry no italic, 18 link and 3 eyebrow styles. The engine's `textCase` type also accepts
`"lowercase"`, which no brand emits. A fresh `sd.ship.mjs` build writes
`--pds3-type-display-sm-emphasis: italic …`, so the shorthand keeps `fontStyle`; the link and eyebrow
styles' shorthands carry neither of the other two.

### Why not `$extensions`

The conforming projection strips `$extensions` (#2552), so moving a key there would drop italic from the
shipped CSS. That cost is what decided A over moving them.

### Held

#4360 (open) rewrites the README's letter-spacing paragraph and its own progress fragment calls this half
"an owner decision". This PR stays off #4360's lines; its fragment is folded as written, and this entry
records the decision.
