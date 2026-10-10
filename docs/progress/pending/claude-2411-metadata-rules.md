## (2026-10-09) — Consumer prose names no tool, and the token trees carry no free-text note (#2411, #2422)

**Status:** engine emitters, the component defs, a new gate. ENGINE minor (change note). CONTRACT unchanged:
`token-contract.ts --check` is clean, since the contract baselines token paths and `$type` only and nothing here
adds, removes or retypes a path. Owner decision **Q167, all recommended**, recorded on #2411 after two
independent audits that agreed on every count.

### What changed

- **No free-text note in the token trees.** Every `note` under `$extensions` is gone:
  - `figma.note` (9 distinct strings, 382 per tree in one brand): each clause was already a field (`kind`,
    `styleType`, `binds`, `baked`, `unit`, `percent`, `collection`, `modes`) or rationale and roadmap. The
    gradient note held two facts no field held, so they became `figma.requires: "plugin-api"` and
    `figma.interpolation: "srgb"`.
  - `prism3.note` on alpha steps and springs: dropped, since `alpha` and `customType: "spring"` say it.
  - The mode-override notes (radius, density, tempo, easing, family, weight re-points): dropped. They emit in no
    committed brand, so a represented-scope gate could never see them; `aliasOf`, `px`, `ms`, `face` and
    `weight` beside them hold the fact.
- **#2422 closed.** `a11y.note` on gradients is replaced by `a11y.floor` (4.5) and `a11y.clears.{white,black}`,
  each computed from that ink's own un-rounded worst case. The old note tested `min(white, black) < 4.5`, so it
  said "neither clears" whenever either side failed. `emit-figma-styles.ts` was the one reader of any token
  note and now copies the structured verdict into `gradient-styles.json`.
- **`hueSource` on every step of a status palette** (`"brand"` or `"default"`). Set for every status palette whose
  source is known, including defaulted success and warning, not only the danger and info ramps the audits found;
  the defaulted ramps' `$description` is now the purpose alone (`danger status`, `info status`). The field name
  and its placement are drafts for the owner. Owner Q167 named the palette GROUP, and that was tried first:
  `test:export-parity` showed both the studio and the plugin export drop it, because they rebuild the tree from
  its leaves (`apps/studio/src/export-settings.ts`, `projectDtcg`), and the flat dotted format has no group to
  hold it at all. So it sits on each step; group placement needs the export taught to carry group metadata.
- **Tool names out of consumer prose:** the grid `$description`, two decision strings (gradient sampling,
  responsive typography), the strikethrough guidance (its per-surface half now in
  `modifiers.strikethrough.{code,figma}`, `.ai.json` schema 0.5), the component docs file note, and eleven
  component strings, whose Figma half moved to a new maintainer-only `notes.projection`.

### The gate: `lint-tool-neutral-prose.ts`

Reads the committed `out/` files against a word list typed in the gate. Arms: `TOOL-NAME`, `NOTE-KEY`,
`GRADIENT-CLEARS` (recomputes each ink's worst contrast from the sampled stops with its own WCAG formula, never
reading `worstOnWhite` / `worstOnBlack`) and `UNREPRESENTED` (every promised field read in every brand and file,
plus floors). Exempt by path, never by word. Run against `main`'s output before this change it reports 369
`TOOL-NAME`, 7,194 `NOTE-KEY` and 36 `GRADIENT-CLEARS` lines. Mutations, each regenerated and failing by name:
the grid description restored (78 `TOOL-NAME`), the `min()` condition restored (6 `GRADIENT-CLEARS`, white at
5.36:1 and 4.56:1), an alpha `note` restored (220 `NOTE-KEY`).

### Traps for whoever re-verifies this

- A group-level `$extensions` is valid DTCG and still lost by this repo's own exports (above), and no gate but
  `test:export-parity` notices. Keep metadata on leaves until the export carries groups.
- `lint-component-docs.ts` types the maintainer record's `notes` keys, so `notes.projection` had to be added to
  its `MAINTAINER_NOTES` list; the bundle strip (`strip-maintainer-prose.mjs`) drops `notes` whole and needed no
  change.

- A backticked dotted name in `.ai.json` prose is read as a token path by `test.ts`'s sidecar-paths arm, so
  `` `modifiers.strikethrough` `` in `when_to_use` failed it. The prose names the field without backticks.
- The prism3 brand's id is the product's name, so the `.ai.json` file note ("companion to prism3.tokens.json")
  matches "Prism3". The gate strips file names before matching; that is its one textual carve-out.
- Platform names (iOS, Safari, HTML, Jetpack Compose) stay allowed in prose (owner Q167 call 4); structured
  platform notes are filed for later. The `prism3` extension key itself is out of scope (call 7).
