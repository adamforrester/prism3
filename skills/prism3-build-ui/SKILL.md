---
name: prism3-build-ui
description: >-
  Build accessible, on-brand UI from a Prism3-generated token system. Teaches an
  agent to consume the generated tokens well — reference semantic roles by name
  (never invent, never reach for a raw primitive), let modes resolve themselves,
  honor each role's avoid_when, and self-check every ink-on-surface pair against
  its contrast floor. Portable: the same discipline applies to any Prism3 brand,
  with or without the MCP surface.
when_to_use: >-
  When writing component code or token bindings against a Prism3 token system
  (the `<brand>.tokens.json` DTCG tree, or its `<brand>.base.tokens.json` +
  per-mode overlay projection, with the `<brand>.ai.json` metadata sidecar),
  whether you reach the tokens through the MCP, a committed catalog, or a
  design.md brief.
---

# prism3-build-ui — using a Prism3 token system to build compliant UI

> `prism3-build-ui` was named `prism3-consume` until #3412.

You have a **generated** token system: a brand brief was expanded by the Prism3 engine
into a full, contrast-verified token tree. Your job is to bind UI to it **the way the
system intends** — so the accessibility contracts the engine proved at generation time
survive into the rendered component. This skill is the *reasoning*; the per-brand
specifics live in the brand's `.ai.json` sidecar. The rules below hold for every Prism3
brand.

> **The one-line contract:** reference **semantic role tokens by their exact name**, let
> **modes** resolve them, and **verify every color pair** against its floor. Do that and
> the output is compliant by construction.

## Say what you can't build

**If no component or token covers the need, do not build a substitute. Leave it out and name it in
your report.**

A Prism3 component exists only when the component catalog
(`packages/engine/out/components/components.ai.json`) has an entry with its `id`. A name that appears only in another entry's `planned` list (under `composition`) is not
built yet: it has no spec, no states, no keyboard behavior and no contrast contract. A stand-in
assembled from other components, a native element or hand-styled markup ships behavior nobody
designed or verified, and it reads as part of the system when it isn't. A token is the same: when no
role fits, don't invent one (rule 1) and don't bind a primitive (rule 2). A plain layout or surface
built from tokens is covered by "or token covers the need" and is fine; a stand-in for a missing
component is not.

When the brief asks for something the system doesn't have:

1. **Leave it out.** Don't approximate it with other components, a native control or custom markup.
2. **Name it in your report** as something you could not build: what was asked, that Prism3 has no
   component or token for it, and what you left out. A substitute you disclose is still a
   substitute; the report doesn't make it acceptable.
3. **Build everything else as asked.** One gap doesn't stop the rest of the work.

**A worked negative: a tooltip.** The brief asks for an icon button with a tooltip that explains it.
The component catalog has `icon-button`; `tooltip` appears only in its `planned` list. Tempting: a
positioned `div` that shows on hover, styled with `background.primary` and a shadow. Wrong: it has no
keyboard or touch trigger, no dismissal and no measured contrast, so it fails every user who doesn't
hover with a mouse. Build the icon button with its accessible name, leave the tooltip out, and write in the
report: "Not built: the tooltip on the settings button. Prism3 has no tooltip component yet (it is
planned), so I left it out rather than build a stand-in."

## The four layers (reach for the right one)

A Prism3 tree has layers, and you consume them from the top:

1. **Type composites + weight roles** (`type.*`, `core.font.weight-role.*`) — the typography you apply.
2. **Semantic color + geometry roles** (`color.*`, `space.*`, `radius.*`, `size.*`, `border-width.*`, `focus.*`) — **this is your layer.** Everything a component needs has a role here.
3. **Metadata sidecar** (`<brand>.ai.json`) — one entry per token: `when_to_use` / `avoid_when` / `contrast_with` / `mode_overrides`, plus `sits_on` (the grounds an ink is measured on), `carries` (the inks a ground takes), `tracks` (companion roles — no contrast implied) and `usage_limit` (an ink for large text, icons and non-essential text only). Read it when a name isn't self-evident.
4. **Primitives** (`core.palette.*`, `core.dimension.*`, `core.font.size/weight.*`) — **private.** The engine marks these `consume: "Private primitive — reference a color.* semantic token that aliases this, not the raw step."` Do not bind to them (see the one exception below).

## Rules

**1. Names are the API — never invent a token.**
Every token you reference must exist in the tree. If you don't know the name, look it up
(the catalog, the brand's exported files, or the `.ai.json`) — do **not** guess a
plausible-sounding name. Prism3's naming is deliberate and diverges from generic
convention in exactly the places guessing fails (e.g. it's `color.foreground.success-subtle`
for a tinted success surface, not `color.feedback.success.surface`; it's `focus.ring.width`,
not `focus.ring.size`).

**2. Reach for the semantic role, not the primitive.**
Use `color.interactive.primary.fill.rest`, not `core.palette.primary.600`. Use `space.400`, not `core.dimension.16`.
The semantic token aliases the primitive *and* carries the mode behavior and the contract.
Binding a raw primitive throws all of that away and is the #1 source of drift.
*Exception:* `opacity.*`, `motion.*`, and `shadow.*` are consumable directly — their
semantic layer is thin (the `.ai.json` marks them `consume: "Consumable …"`).
For how things move (which duration, easing role, spring or transition each change takes, and what
reduced motion substitutes), read `prism3-motion`.

**Size is for size, space is for space.** `size.*` holds control heights only
(`size.md.height`, and `size.md.min-height` for the 44px target floor). Every padding and gap
is a `space.*` step, and each component's spec states which one per size: a medium Button is
`space.200` on the label side, `space.150` on the icon side and `space.100` between icon and
label at comfortable density. There is no per-component spacing token and no `size.*` padding.
The brand's density moves every one of those steps one position along the space scale (down at
compact, up at spacious), so read the spec's step and apply the brand's density rather than
copying a comfortable px value.

**A medium or large flush text button keeps a 44×44 hit area in code.** `inset=flush` drops a text button's
inline padding and its minimum width, so its box is only as wide as its label and the label
lines up with the content edge. At medium and large sizes, the hit area doesn't shrink with
the box: extend it to at least 44×44px with a transparent `::before` inset outward and
centered on the label. Extend it the same way to at least 24×24px at small. Figma has no
hit areas, so the design file shows only the label-width box.

```css
.flush-button { position: relative; --flush-hit: 44px; }
.flush-button.small { --flush-hit: 24px; }
.flush-button::before {
  content: "";
  position: absolute;
  inset: min(0px, (100% - var(--flush-hit)) / 2); /* negative only on an axis under the hit size */
}
```

**Keep a flush button's hit area clear of its neighbors.** The extension reaches past the label by
half of what the label lacks, on each side: (44px − label width) / 2 at medium and large, and
(24px − label width) / 2 at small. Leave at least that much between the label and the next
control, and between two flush buttons the two reaches added together, so a tap never lands on
the wrong control (WCAG 2.5.8). Beside the label, 22px is always enough at medium and large, and
12px at small.

**3. Let modes resolve — don't hardcode a mode's value.**
A color role resolves differently per mode (`light` / `dark` / `hc-light` / `hc-dark`; a brand
may ship fewer, or more, such as `wireframe` or its own custom modes). Bind the **role**; the mode drives the value. Never copy a resolved hex into
your component — that pins one mode and breaks the others. For code, build from
`<brand>.base.tokens.json` plus one `<brand>.<mode>.overlay.tokens.json` per extra mode: a
stock DTCG reader (Style Dictionary 4 and later) resolves that pair with no custom code. The
single `<brand>.tokens.json` keeps its per-mode values under `$extensions`, which a standard
reader ignores, so on its own it builds one mode. The sidecar's `mode_overrides` describes
those values; it is not how they reach your build.

**4. Honor `avoid_when` — it is the highest-value field.**
The sidecar's `avoid_when` encodes the traps the role's *name* can't. The portable ones
that hold across brands:

- **`border.primary` and `border.secondary` are decorative — not contrast targets.** The engine
  makes both intentionally low-contrast (about 1.4:1 and 2:1 on the page). If you need a border
  that must read as a UI edge (a 3:1 target), use `border.tertiary`, which clears 3:1 on the
  `background.primary`/`secondary`/`tertiary` and `foreground.primary`/`secondary`/`tertiary`
  surfaces, `field.border.rest` for an input, or `border.focus` for focus. A decorative divider is
  *exempt* from the 3:1 contract — don't pair it as one.
- **`*.on-*` ink goes on its paired fill, nothing else.** `interactive.primary.on-fill` sits on
  `interactive.primary.fill.rest`; `text.on-danger` on `foreground.danger`. Plain `text.primary`
  goes on the page surfaces (`background.primary`/`secondary`/`tertiary`,
  `foreground.primary`/`secondary`/`tertiary`); `text.secondary` is measured only on the surfaces
  its `sits_on` lists, by default `background.primary`, `background.secondary` and
  `foreground.primary`, and `background.primary` alone in a brand that sets
  `secondaryTextGround: page`. Neither goes on a solid vivid fill such as `foreground.danger`.
- **The contrast floor is the one text promise.** The secondary, tertiary, status and link inks
  (text and icon) clear their bar on the floor surface, `background.secondary` by default
  (`inverse.background.secondary` on a band), and on every surface nearer the page, unless the
  brand sets `secondaryTextGround: page`, in which case `text.secondary` and `icon.secondary` are
  promised on `background.primary` only, in light and dark. Read each role's `sits_on`. A surface
  deeper than the floor (`background.tertiary`, `foreground.secondary` and `foreground.tertiary`
  by default, and their inverse twins) carries no text promise by design; each ink's `avoid_when`
  names those surfaces for its brand. A brand that needs text there moves the floor
  (`surfaces.<mode>.floorStep`, or `inverseSecondary` on the band), and every floor-gated ink
  re-derives to clear it.
- **A link over a photograph is `inverse.text.primary`, underlined.** No link role is measured
  against a photo, and there is no on-media link color. Set the link in `inverse.text.primary` and
  keep the underline: it is the link cue, because the ink now matches the plain text beside it.
  When the photo is busy, put a media veil (`veil.*`) behind the text. The veil is the same in
  every mode and `inverse.text.primary` flips in dark mode, so pick the veil for each mode and
  check the contrast against the real photo, not the token surface.
- **Disabled inks clear 3:1, not 4.5:1.** WCAG 1.4.3 exempts disabled controls, but Prism3 does not
  use that exemption: `disabled.text` (on `background.secondary`) and `disabled.on-fill` (on
  `disabled.fill`) each carry a 3:1 contract (4.5:1 in the high-contrast modes). Score a disabled
  label as `ui` (3:1), not `text`; it passes. `disabled.fill` itself carries no contract.
- **Tertiary and subtle inks are for large text.** A role with a `usage_limit` (`text.tertiary`,
  `text.*-subtle`, and their icon and inverse twins) clears 3:1, not 4.5:1: use it for large text,
  icons and non-essential text only, and its `body_text_alternative` for body-size text.
- **Subtle tints aren't solid fills.** `foreground.*-subtle` is a low-emphasis tint surface;
  body text on it still needs a real 4.5:1 check (pair the matching `text.*`, not `text.on-*`).

**5. Prefer type composites + weight *roles*.**
Apply a `type.*` composite for a text style; reference `core.font.weight-role.emphasis` (the
role), not the numeric `700`. A brand can re-map its weights and every consumer reflows —
but only if you referenced the role.

**`type.body.xs.*` and `type.caption.lg.*` are both 12px; pick by use, not size.** Body xs is
secondary text and metadata set among body text: a timestamp, a count, a meta line under an
item. It keeps body's line height, so it sits on the body rhythm. Never use it for running
text; that starts at `type.body.sm.*`. Caption lg is small print that stands on its own (an
image caption, helper text, a footnote) at caption's tighter line height.

**Strikethrough is a modifier, not a style.** Prism3 has no strikethrough text style, so don't
look for one or invent one (rule 1). A struck run, such as a was-price beside a sale price, uses
the same `type.*` composite as the text around it, with `text-decoration-line: line-through` on
top. In Figma that's a strikethrough override on the applied style, which the dev specs show as
"Text decoration: Strikethrough". The line alone says nothing to a screen reader, and most don't
announce `<del>` or `<s>`, so put the meaning in visually hidden text:

```html
<del><span class="visually-hidden">Original price: </span>$69.99</del>
<ins><span class="visually-hidden">Sale price: </span>$55.99</ins>
```

Translate the hidden words with the rest of the page. Struck text is still content, so it still
needs 4.5:1 against its surface.

**A field's label sits one body step below its input.** Text field, select and textarea share
one `size`: `small` is a 12px label over a 14px input, `medium` (the default) 14 over 16, and
`large` 16 over 18. The message below stays 11px at every size. `small` is for fine pointers
only: under `@media (pointer: coarse)`, set the small input's font size to 16px, because iOS
Safari zooms the page when it focuses an input under 16px. Don't stop the zoom with
`maximum-scale=1`: that blocks pinch zoom too.

## Never do: habits that make UI look machine-made

Each of these passes a contrast check and still makes the result look generated rather than
designed. Each one adds a mark the system gives no meaning to. Don't do it; use the Prism3 part
or role in the third column instead.

| Never | Why it fails | Use instead |
|---|---|---|
| **A thick border on one side of a card** to make it stand out | No Prism3 part draws a one-sided stripe, so it looks like a status with no status behind it, and color is its only signal. | For a status, a Banner: the tone's subtle fill, a full 1px edge in `border.success` (or the tone's own border role) and a glyph shape per tone. For an important card, put the emphasis in the content: a `type.title.*` heading or an action. |
| **Dashed or dotted lines** as decoration | Prism3 draws every rule solid; even the focus ring is solid (`focus.ring.style`), because a dashed line breaks up at small sizes. A dash reads as a state, such as a drop target or an empty slot, so a decorative one signals something that isn't there. | Space first: a `space.*` step between groups. When space alone leaves the grouping unclear, a Divider: a solid 1px rule in `border.secondary`, or `border.primary` when it's subtle. |
| **A label on everything**: an eyebrow over every heading, a caption under every value, a badge on every row | When every item is labeled, none stands out, and each label is one more string a screen reader reads aloud. | Let the heading and the layout do the grouping. Use `type.eyebrow.*` once per section at most, and a Badge only for a status the user needs. A form field keeps its field label: that one is required. |
| **A gradient nobody asked for** | A brand's gradient tokens, where it ships any, are for brand and marketing surfaces, and no text promise holds on them: each one's `avoid_when` names the worst ratio measured across it. On a product screen a gradient adds a contrast question with no answer. | A solid surface role: `background.primary`, or `foreground.brand` for a brand moment. Use a gradient only where the brief asks for one, and read its `avoid_when` first. |
| **One radius on every corner** | Prism3 sets the radius per part, and the difference carries meaning: a status Badge is `radius.sm` so it never reads as a Tag, a Tag is `radius.round`, and a Button is `radius.md`. One radius everywhere erases that difference. | Take each component's radius from its spec. For a new surface, use the radius of the nearest Prism3 part. |
| **An icon beside every heading, button and row** | An icon helps when it is faster to read than the word, or when it tells two things apart (each Banner tone has its own glyph shape). Everywhere else it competes with the text, and a decorative icon is hidden from assistive technology, so it adds nothing there. | An Icon only where it carries meaning, at an `icon.size.*` step and in `icon.primary` or `icon.secondary`. An Icon button with an accessible name when the icon is the whole control. |
| **Status color as decoration**: green for good news, a brand fill on a tip | The status roles (`foreground.success`, `text.danger` and the rest) mean a status. Spent on decoration, they stop meaning anything, and the next real error looks like decoration. | The neutral roles (`text.primary`, `background.secondary`) for content that carries no status. A status role only for a status, with a glyph or text beside the color. |
| **Opacity to quiet text**, such as `opacity: 0.6` on a label | Opacity mixes the text with whatever is behind it, so its ratio changes with every surface and every mode, and no contract covers the result. | `text.secondary`, or `text.tertiary` for large text and non-essential text. Each is measured on its `sits_on` surfaces in every mode. |

## The self-check (do this before you finish)

List every **ink-on-surface color pairing** your component renders, each as
`{fg, bg, kind}`:

- `kind: "text"` — body copy → needs **4.5:1**
- `kind: "large-text"` — ≥ 24px or ≥ 18.66px bold → needs **3:1**
- `kind: "ui"` — borders, icons, focus rings, large graphics → needs **3:1**

Resolve `fg` and `bg` **per mode** and confirm the ratio clears the floor **in every mode**.
Only pair colors where a real contrast contract applies — a **decorative** border
(`border.primary`) and pure decoration are exempt; don't score them as if they were text or a
3:1 UI edge. A **disabled** label is not exempt: score it as `ui` (3:1). If a pair fails on the floor surface or nearer the page, you reached for the wrong role — the
system has a role that passes there (that's what the generation-time contracts guarantee). Below
the floor there is no promise: move the content to a shallower surface, or move the brand's floor.

Then reread the brief against what you built. Each thing it asks for is either built from a Prism3
component and its tokens, or named in your report as not built ("Say what you can't build", above).
Nothing is in between.

## Two worked edges (where the raw name isn't enough)

These are the exact cases where "the catalog alone" leaves an agent one step short — the
sidecar's `avoid_when` closes them:

- **A card outline.** Tempting: `border.primary` as a 3:1 UI edge. Wrong — it's decorative
  (can be ~1.4:1 on the page). Either drop it from your 3:1 pairs (it's exempt decoration) or,
  if the edge must *read*, use `border.tertiary` / `border.focus`. `border.secondary` is
  decorative too (~2:1).
- **A disabled button's label.** Tempting: score `disabled.on-fill` on `disabled.fill` as
  `text` (4.5:1). It's held to 3:1 by design — classify it `ui`, which it passes.

Get those two right and you match the engine's own compliance contract.

## Native (iOS, Android, Compose) is not in the stock promise

Web is whole: a stock Style Dictionary 4 or later build reads the base and overlay set and writes CSS,
SCSS and JavaScript that carry every type usably, apart from gradients on CSS and SCSS. Native is not
covered yet. A stock build for Swift, Android resource XML or Compose reaches every token, but several
types come out wrong or uncompilable. `packages/tokens/` pins each as a `[GAP]`. Each is stock Style
Dictionary's gap, not a defect in the DTCG, and each is a documented consumer gap: the options for
closing them are tracked on #2426.

- **Sizes.** The stock native transforms multiply every dimension by 16, so `16px` becomes
  `CGFloat(256.00)` or `256.00.dp`. Our literals mix `px` and `rem`, and no stock transform reads the
  unit. Write a transform that does.
- **Font sizes on Android and Compose.** They come out in `dp`, not `sp`, so text ignores the
  user's system font scale. Convert them to `sp`.
- **Durations, font families, stroke styles and cubic beziers.** They are written as bare text
  (`= 80ms`, `= Inter`) that does not compile in Swift or Kotlin. Quote or convert them in your own
  transform.
- **Composites.** Typography, shadow, transition and gradient tokens become `[object Object]`.
  Read them from the JavaScript or JSON output, or write a format that models each one.
- **Android numbers.** `<integer>1.5</integer>` is refused by `aapt2`. Write non-integer
  numbers as `<item type="dimen" format="float">`.

So on native, supply your own size, quoting and composite handling, and take composites from the
JavaScript or JSON output until that is done. The no-custom-code rule stands: the gate admits no
custom transforms, and no reference production config with custom transforms ships for now. Do not
look for one, and do not describe native output as supported or compiled when you hand off work.

## Letter spacing is a multiplier of the font size

`core.font.letter-spacing.*` and `core.font.letter-spacing-role.*` are DTCG `number` tokens (#2434): `-0.04`
means 0.04 of the font size, tighter. No stock transform turns that into a platform unit, so apply it
where you set the text's size:

- **CSS:** `letter-spacing: calc(var(--<root>-core-font-letter-spacing-role-tight) * 1em);`. A bare
  number is not a valid `letter-spacing`.
- **iOS:** multiply by the font's point size and set the result as `kern` (UIKit) or `tracking`
  (SwiftUI).
- **Android:** `android:letterSpacing` already takes em, so set the number as it is.
- **Compose:** `letterSpacing = (-0.04).em`.

A type style (`type.*`) names its letter spacing by role. Apply it from the same type style as the
font size, so the two can't drift apart.

## Checking rebuilt Figma pages for consistency

When you build or rebuild a set of spec pages in Figma, every element bound to Prism3 is not enough:
the same control must be the same component on every page, and each element must keep the same text
style, variant and spacing from page to page and the same desktop-to-mobile pairing. The rebind skill
ships a read-only audit for this (`skills/prism3-rebind/consistency-audit.js`, run through the plugin's
agent link). Its section 10 says when to run it, how to read the findings and how to log the run on
#2886.

## If you have the MCP surface

Call `export_theme` to write the brand's tree (`tokens.json`), its metadata sidecar
(`ai-metadata.json`) and its Figma files (`figma/`) to a directory (the host must grant file
access), then apply everything above. It does not write the base + overlay set rule 3 builds
from, so for a multi-mode code build compile the brand with `packages/engine/cli.ts --out <dir>`
or download it from the studio's export, which both write it. `theme_brand` returns only the contract results and notes unless you
ask for the tree with `include`, and the tree is too large to read through a tool result.
When you finish, `score_consumption` runs the self-check above for you: it flags invented
names and raw primitives, and scores each `{fg, bg, kind}` pair in every mode. The skill and
the MCP compose: the MCP gives you the *data*, this skill is the *discipline* for using it.
Without the MCP (a committed catalog), the discipline is identical — you read the tree from the
file. From a `design.md` brief, compile it first (`theme_from_brief`, or the CLI).
