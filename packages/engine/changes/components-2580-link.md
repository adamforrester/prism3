---
engine: minor
---
Link (#2580, owner decisions Q289, 2026-10-14): a new component, `link`, a standalone link plus an inline look. A link
inside a paragraph stays a text range with the existing `-link` text styles. 96 members: `style` standalone | inline ×
`weight` emphasis | default × `size` small | medium | large × `surface` default | inverse × rest, hover, pressed and
focus-visible. Standalone binds `type.label.<rung>.<weight>` at rest and its `-link` twin at hover, pressed and
focus-visible; inline binds the `-link` twin at every state. Ink is `color.text.link.*` and `color.icon.link.*`, the
inverse twins on `surface=inverse`. One text line tall, no padding; optional leading and trailing icons; the shared
focus ring. Visited, current and the 24px hit-area expansion are code only. Its own page under Components, with canvas
furniture and Q238 A reactions (48 sources, 72 reactions).

Engine: a part's `type` binding key may name `{state}` (type only, never geometry), expanded over the def's declared
states, and a structure-only plan resolves it at the first state. Button's `href` is documented as the way to navigate
with a button's weight (Q289.6 A, no LinkButton), and `link` leaves the `planned` lists it was on. No new token, so
CONTRACT is unchanged.
