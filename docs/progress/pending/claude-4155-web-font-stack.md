## (2026-11-19) — The token CSS carries each typeface's fallback stack, from a web-only base (#4155)

Found in the 2026-11-19 token output audit (#4104). The shipped `@prism3/tokens` CSS wrote each typeface as one
name, `--pds3-core-font-typeface-inter: Inter;`, with no generic family, so a face that failed to load fell back to
the browser default, usually a serif, for body text and code alike. The engine already curates a stack per face
(`$extensions.prism3.fallbackStack`, since #105.3), but every projection strips `$extensions` (#2552), and the
consumer transform #105.3 expected was never written: the shippable build (#3408 S1) came later under NO CUSTOM CODE.

### Why a new file and not the base (owner decision B)

The first attempt (branch `fix/token-font-fallback-stack`, no PR) put the stack into the conforming base's
`$value`. It fixed the CSS and broke Android: `check-platforms.mjs` builds that same base for every platform, and
stock Style Dictionary's android group writes the array as one `<string>Inter,system-ui,…</string>`, which isn't a
font name. The base is the platform-neutral handoff (#609), and `system-ui` / `-apple-system` / `Segoe UI` are web
names, so the owner chose B: keep the base single-family and ship the stack only where the web reads it.

`buildWebBase` (`emit-dtcg-overlay.ts`) is `buildBase` with each `fontFamily` leaf's stack folded into `$value` as
the DTCG 2025.10 §8.3 array, then stripped like the base. `emitTheme` writes it beside the base for every brand, so
the CLI writes one for a client's brand too. `sd.ship.mjs` sources it in place of the base, with the shared
overlays: typefaces don't vary by mode. Stock Style Dictionary's `css` group writes the array as a comma list, so
the package stays free of custom code.

The name ends in `.base.tokens.json` on purpose. Every brand discovery in the gates (`check-consumability`,
`check-platforms`, `test.ts`) sorts `out/` by the suffix `\.(base|<mode>\.overlay)\.tokens\.json$`; the first
name tried, `<brand>.base.web.tokens.json`, read there as a brand called `aurora.base.web`, and `consumability`
failed on it. A name inside the existing convention needed no gate's scope changed.

Registered: `payload-manifest.json` classifies the new kind `web-base`, and `ARTIFACT_FLOOR` rises to 265, the
set's new size, so losing the five files fails the drift meta-check. `schema/` gains nothing, so
`lint-schema-classification` has nothing to classify.

### Tests

- `check-package.mjs` [FALLBACK]: every `--pds3-core-font-typeface-*` in every block, joined and per-mode file,
  ends in a CSS generic family. Its [VALUE] oracle now expects `[$value, ...fallbackStack]` for a `fontFamily`
  leaf, read from the canonical tree, which the build doesn't read. Both fail on main.
- `test.ts` #4155, per brand, from the committed files: the web base exists; each of its typefaces is a stack,
  primary first, ending in a generic family; it differs from the base in nothing else; and the conforming base
  keeps each typeface the canonical single family. The last arm passes on main by design, since it guards the
  side option A would have broken.

The generic-family list in both is each gate's own transcription of CSS Fonts 4 §4.1.1, not read off the engine.
