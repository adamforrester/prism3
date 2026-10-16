---
engine: minor
---
Link (#2580, owner decisions Q289 and Q297, 2026-10-14): a new component, `link`, a standalone link plus an inline look. A link
inside a paragraph stays a text range with the existing `-link` text styles. 96 members: `style` standalone | inline ×
`weight` emphasis | default × `size` small | medium | large × `surface` default | inverse × rest, hover, pressed and
focus-visible. Both styles set the body tier, 14 / 16 / 18px, with no 12px link (Q297.1): `default` binds
`type.body.<rung>.default`, `emphasis` the heaviest body weight the brand ships (`strong` in a default brand). Standalone
binds the plain style at rest and its `-link` twin at hover, pressed and focus-visible; inline binds the `-link` twin at
every state. Ink is `color.text.link.*` and `color.icon.link.*`, the
inverse twins on `surface=inverse`. One text line tall, no padding; an optional trailing icon on standalone links only, 16px with
14px and 16px text and 20px with 18px text (Q297.2); the shared focus ring. Visited, current and the 24px hit-area expansion are code only. Its own page under Components, with canvas
furniture and Q238 A reactions (48 sources, 72 reactions).

Engine: a part's `type` binding key may name `{state}` (type only, never geometry), expanded over the def's declared
states, and a structure-only plan resolves it at the first state. `weightIntent` takes an optional `intents` map, so an
axis that keeps its own value names (Link's `emphasis | default`) resolves per brand like field-label's `regular | bold`,
and the repoint keeps a `-link` suffix. A brand that ships one body weight drops Link's `weight` axis (48 members). Button's `href` is documented as the way to navigate
with a button's weight (Q289.6 A, no LinkButton), and `link` leaves the `planned` lists it was on. No new token, so
CONTRACT is unchanged.
