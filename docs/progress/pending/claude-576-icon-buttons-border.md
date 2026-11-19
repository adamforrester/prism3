## (2026-11-19) — Outline button border reaches the icon buttons (#576 Q6)

The owner's Q6 decision on #4074 (2026-11-19): "Outline button border" also rebinds the icon buttons. Before this, a
Thick brand showed 2px outline text buttons beside 1px outline icon buttons.

**Scope: nine sets, not five.** The decision named `icon-button` and `flush-icon-button`, but each factory makes three
sets, one per family (primary, neutral, destructive). The setting is one brand-wide weight, so all six icon-button sets
follow, along with the three text-button sets. The PR flags this count for the owner. Which members draw the edge
differs by def:

- In IconButton, it's the outline appearance (72 of 216 members per set).
- FlushIconButton has no appearance axis, so it's the round shape (30 of 60). Flush members bind the key and draw no
  stroke, so they don't move.

**How it lands.** The icon buttons are outside the button family (`isButtonFamily` reads the `min-width` derivation),
so they opt in the way Tag opts into "Control label weight": a new `levers.buttonBorderWeight: { edge: true }` on both
factories. Step 6 of `applyButtonLayout` became `withBorderWeight`, which the family path and the opt-in path both
call, so the rebinding and its refusal of a mis-bound edge are the same code for all nine sets. The schema refuses the
opt-in on a def with no `border-width` key. No token is added, so the contract doesn't move.

**Prose.** #4074's skill row said "Buttons only, not icon buttons", and that is corrected. Its change note says "icon
buttons are unchanged". `lint-emission-version` (ONE WRITER) refuses an edit to another PR's pending note, so this PR's
own note says it supersedes that line, and the fold writes both. The Studio description ("in every button set …") is still true, so it's unchanged.

**Measured.** The #576 block in `test.ts`:

- The scope arm spells the nine ids.
- A Q6 arm names each icon-button set the setting missed.
- The per-set rebinding and projection arms run on all nine sets, each counting its own edge members.
- An icon button with a mis-bound edge throws by name.
- The schema refuses an edgeless opt-in.

Mutation: drop `buttonBorderWeight` from both factories' `levers`. This fails the scope arm, the Q6 arm (naming all
six sets) and each icon set's rebinding and projection arms.
