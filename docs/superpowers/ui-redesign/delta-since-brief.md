# What changed since the UI exploration brief (2026-09-26 → 2026-09-30)

The brief (`../specs/2026-09-26-ui-exploration-brief.md`) was written at engine 0.166.0 and token contract 13.0.0. `main` is now at engine 0.213.0 and contract 14.0.0. About 57 changes merged in between. This note lists the ones that change what the UI must carry.

**Every line is a lead to verify against the code, not a spec.** The source of truth is:
- `packages/engine/schema/lever-manifest.json` for levers;
- `packages/engine/components/index.ts` for component defs;
- `apps/plugin/src/agent-protocol.ts` for agent-link commands;
- the merged PRs cited.

## Levers (brief §4, §10)

- **Count:** 47 → **49** levers (25 → **26** advanced).
- **New since the brief:**
  - `buttonLabelWeight`, Button label weight, Default / Emphasis (#1759). It's a component-level setting (brief §4.6).
  - `typography.italicDefault`, italic as a category's default cut (#1726).
- **Now in the manifest:** `strictInteractiveContrast`, `typography.captionFloor` and `typography.sizeFloor`. The brief says they have "no control today"; check whether the studio renders one now.

## Spacing model (brief §4.5, §5 "Size and shape")

Merged in #1792, #1799 and #1799's review round.
- **`size.*` holds dimensions only:** control heights and control geometry. The shared `size.*.padding-x / padding-x-visual / padding-y / gap` tokens are **gone** (a CONTRACT 14.0.0 break). All padding and gaps now come from the `space.*` scale, and each component's spec states its own spacing per size.
- **Density moves spacing by a rule:** one step down the space scale at compact, one step up at spacious, and no gap below 4px.
- **Per-mode density** changes control heights only. The decided UI sentence is "Spacing follows the brand’s density, not the mode’s: a mode’s density changes control heights only."
- **Brief §5 is out of date:** it asks for "the size ladder with heights **and padding**". There is no shared padding ladder any more. Padding is per component, so a size view shows heights, and component spacing belongs with the component.

## Components (brief §3, §5, §10)

- **Count:** 23 → **26** defs.
- **New:**
  - **Badge** (#1730, #1736, #1767): type status / count / dot, emphasis subtle / bold, and tone.
  - **Tag** (#1738, #1767, #1799): type select / dismissible, selection, size, state, and a Check icon option.
  - **Spinner** (#1677), used by the button's pending state.
- **Veil reworked** (#1766): directional gradient washes, with intensity and value.
- **Field family** (#1772): the read-only state draws the editable field's border.
- **Minimum widths** can now come from a height ratio: Tag uses 1.5 × height, rounded to 8.

## Plugin: new actions and outputs (brief §6.2, §7)

- **Style guide generator.** This is a whole new plugin action. Phase 1 (#1749, color tables) is merged; phase 2 is in flight as PR #1788, which stacks #1784.
  - **What it does:** writes token tables onto the file's pages, one table per token type, in rows by category.
  - **Options include:**
    - which tables (a filter), collections and types;
    - the value format;
    - a dark or light header;
    - alias chips and descriptions on or off;
    - the color specimen type;
    - one dimension specimen style per run (filled bar or bracket; not chosen per role);
    - the font specimen;
    - paragraph spacing and text decoration columns;
    - an editable **title (Name) column**, whose edits are kept across reruns;
    - a separate **REM** column, always an addition to px. The Pixels toggle is being removed.
  - **How it runs:** one run at a time, yielding to Figma so the file stays usable.
  - **Agent link:** the `style-guide` command drives it.
  - **Cell components:** it draws with the file's `_style-guide-*` cell components, which the owner can restyle.
- **Set up file** now also:
  - places a `_Section-header` page header on each component page (#1711, #1742);
  - builds the style guide cell components.
- **Agent link commands:** now `status`, `apply-theme`, `build-components`, `file-setup`, `style-guide`, `prune` (preview or confirm) and `readback`. The panel side of agent prune previews is gated (#1689).
- **Read-back** compares the saved brand's declared modes, and each collection's planned modes, with the file (#1704).
- **Reliability fixes the UI can rely on:**
  - prune and cleanup no longer stop partway (#1791, #1794);
  - nested components resolve to their own set on rebuild (#1797);
  - a false "typeface unavailable" warning is gone (#1793).
- **Known rebuild pains, in flight as lanes:**
  - #1780: a def whose variant axes changed builds into the old set;
  - #1750: new sets are placed at (0,0).

## Feedback and states (brief §7)

- **Brief §7.1** (added 2026-09-27): one place for activity, results and fixes.
- **Unresolved type styles** (#1802): `resolvePreview` now names type styles a brand doesn't emit, instead of painting 0px. Owner questions are open:
  - Should the studio show this list?
  - Should a heading fall back to the heaviest weight the brand ships?
- **Rendered-contrast gates** now cover the studio and plugin chrome (#1777).

## Example brands (brief Appendix A)

- **prism3:** Prism3's canonical default theme now lives at root `pds3` (#1726). Check whether the studio offers it alongside aurora and harbor.
- **Aurora** moved to comfortable density (#1676).

## Owner direction since the brief

See `owner-direction-2026-09-30.md`.
