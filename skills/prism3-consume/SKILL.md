---
name: prism3-consume
description: >-
  Build accessible, on-brand UI from a Prism3-generated token system. Teaches an
  agent to consume the generated tokens well — reference semantic roles by name
  (never invent, never reach for a raw primitive), let modes resolve themselves,
  honor each role's avoid_when, and self-check every ink-on-surface pair against
  its contrast floor. Portable: the same discipline applies to any Prism3 brand,
  with or without the MCP surface.
when_to_use: >-
  When writing component code or token bindings against a Prism3 token system
  (the `<brand>.tokens.json` DTCG tree + its `<brand>.ai.json` metadata sidecar),
  whether you reach the tokens through the MCP `theme_brand` tool, a committed
  catalog, or a design.md brief.
---

# prism3-consume — using a Prism3 token system to build compliant UI

You have a **generated** token system: a brand brief was expanded by the Prism3 engine
into a full, contrast-verified token tree. Your job is to bind UI to it **the way the
system intends** — so the accessibility contracts the engine proved at generation time
survive into the rendered component. This skill is the *reasoning*; the per-brand
specifics live in the brand's `.ai.json` sidecar. The rules below hold for every Prism3
brand.

> **The one-line contract:** reference **semantic role tokens by their exact name**, let
> **modes** resolve them, and **verify every color pair** against its floor. Do that and
> the output is compliant by construction.

## The four layers (reach for the right one)

A Prism3 tree has layers, and you consume them from the top:

1. **Type composites + weight roles** (`type.*`, `font.weight-role.*`) — the typography you apply.
2. **Semantic color + geometry roles** (`color.*`, `space.*`, `radius.*`, `size.*`, `border-width.*`, `focus.*`) — **this is your layer.** Everything a component needs has a role here.
3. **Metadata sidecar** (`<brand>.ai.json`) — one entry per token: `when_to_use` / `avoid_when` / `contrast_with` / `mode_overrides`, plus `sits_on` (the grounds an ink is measured on), `carries` (the inks a ground takes), `tracks` (companion roles — no contrast implied) and `usage_limit` (an ink for large text, icons and non-essential text only). Read it when a name isn't self-evident.
4. **Primitives** (`palette.*`, `dimension.*`, `font.size/weight.*`) — **private.** The engine marks these `consume: "Private primitive — reference a color.* semantic token that aliases this, not the raw step."` Do not bind to them (see the one exception below).

## Rules

**1. Names are the API — never invent a token.**
Every token you reference must exist in the tree. If you don't know the name, look it up
(the catalog, the MCP `theme_brand` output, or the `.ai.json`) — do **not** guess a
plausible-sounding name. Prism3's naming is deliberate and diverges from generic
convention in exactly the places guessing fails (e.g. it's `color.foreground.success-subtle`
for a tinted success surface, not `color.feedback.success.surface`; it's `focus.ring.width`,
not `focus.ring.size`).

**2. Reach for the semantic role, not the primitive.**
Use `color.interactive.primary.fill.rest`, not `palette.primary.600`. Use `space.400`, not `dimension.16`.
The semantic token aliases the primitive *and* carries the mode behavior and the contract.
Binding a raw primitive throws all of that away and is the #1 source of drift.
*Exception:* `opacity.*`, `motion.*`, and `shadow.*` are consumable directly — their
semantic layer is thin (the `.ai.json` marks them `consume: "Consumable …"`).

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
.flush-button { position: relative; }
.flush-button::before {
  content: "";
  position: absolute;
  inset: min(0px, (100% - 44px) / 2); /* negative only on an axis under 44px; 24px at small */
}
```

**3. Let modes resolve — don't hardcode a mode's value.**
A color role resolves differently per mode (`light` / `dark` / `hc-light` / `hc-dark`),
carried in the role's `mode_overrides`. Bind the **role**; the mode drives the value. Never
copy a resolved hex into your component — that pins one mode and breaks the others.

**4. Honor `avoid_when` — it is the highest-value field.**
The sidecar's `avoid_when` encodes the traps the role's *name* can't. The portable ones
that hold across brands:

- **`border.primary` is decorative — not a contrast target.** The engine makes the default
  border intentionally low-contrast (often well under 3:1). If you need a border that must
  read as a UI edge (a 3:1 target), use `border.secondary` or `border.focus`. A decorative
  divider is *exempt* from the 3:1 contract — don't pair it as one.
- **`*.on-*` ink goes on its paired fill, nothing else.** `interactive.primary.on-fill` sits on
  `interactive.primary.fill.rest`; `text.on-danger` on `foreground.danger`. Plain `text.primary` /
  `text.secondary` go on surfaces (`background.*` / `foreground.*`), never on a solid vivid fill.
- **Disabled roles are WCAG-exempt.** `disabled.text`, `disabled.fill`, and `disabled.on-fill` are *not* held to 4.5:1 — disabled controls are exempt (WCAG 1.4.3).
  Treat a disabled label as `ui` (3:1 legibility) at most; do not fail your self-check on it.
- **Tertiary and subtle inks are for large text.** A role with a `usage_limit` (`text.tertiary`,
  `text.*-subtle`, and their icon and inverse twins) clears 3:1, not 4.5:1: use it for large text,
  icons and non-essential text only, and its `body_text_alternative` for body-size text.
- **Subtle tints aren't solid fills.** `foreground.*-subtle` is a low-emphasis tint surface;
  body text on it still needs a real 4.5:1 check (pair the matching `text.*`, not `text.on-*`).

**5. Prefer type composites + weight *roles*.**
Apply a `type.*` composite for a text style; reference `font.weight-role.emphasis` (the
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

## The self-check (do this before you finish)

List every **ink-on-surface color pairing** your component renders, each as
`{fg, bg, kind}`:

- `kind: "text"` — body copy → needs **4.5:1**
- `kind: "large-text"` — ≥ 24px or ≥ 18.66px bold → needs **3:1**
- `kind: "ui"` — borders, icons, focus rings, large graphics → needs **3:1**

Resolve `fg` and `bg` **per mode** and confirm the ratio clears the floor **in every mode**.
Only pair colors where a real contrast contract applies — a **decorative** border
(`border.primary`), a **disabled** label, and pure decoration are exempt; don't score them
as if they were text or a 3:1 UI edge. If a pair fails, you reached for the wrong role — the
system has a role that passes (that's what the generation-time contracts guarantee).

## Two worked edges (where the raw name isn't enough)

These are the exact cases where "the catalog alone" leaves an agent one step short — the
sidecar's `avoid_when` closes them:

- **A card outline.** Tempting: `border.primary` as a 3:1 UI edge. Wrong — it's decorative
  (can be ~1.4:1 on the page). Either drop it from your 3:1 pairs (it's exempt decoration) or,
  if the edge must *read*, use `border.secondary` / `border.focus`.
- **A disabled button's label.** Tempting: score `disabled.on-fill` on `disabled.fill` as
  `text` (4.5:1). It's ~3:1 by design and **exempt** — classify it `ui`, don't fail on it.

Get those two right and you match the engine's own compliance contract.

## If you have the MCP surface

Call `list_levers` to learn the knobs and `theme_brand` to get the tree + `.ai.json` for the
brand, then apply everything above. The skill and the MCP compose: the MCP gives you the
*data*, this skill is the *discipline* for using it. Without the MCP (a committed catalog,
a `design.md`), the discipline is identical — you read the tree from the file.
