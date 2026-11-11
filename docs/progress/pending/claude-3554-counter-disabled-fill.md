## (2026-11-11) — Counter: a disabled outline keeps the field's disabled fill (#3554 Q-CC10)

**Status:** Counter def + test arm. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No executor
change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q-CC10 A (2026-11-11, on #3554):** a disabled outline Counter binds the disabled fill and its ink.
  `counter.ts` gains `disabled.fill: color.disabled.fill` and `disabled.label.on-fill: color.disabled.on-fill`, the
  pair Text field binds. The outline/disabled members (3 of 18) now paint the row's fill and the disabled edge, and
  the value in the on-fill ink. Ghost does not move.

### Diagnosis

No branching was needed in the def. The projector's cross-cutting disabled branch (`anatomy-figma.ts`, #784) already
applies a structural slot only where the member has it at rest, and asks for the on-fill ink only where a disabled fill
lands. Outline has `outline.fill` at rest and ghost has no box paint, so the two new keys reach outline only, and
`disabled.label` stays reached on ghost. The token-usage report shows the split: `disabled.label` now reaches 3 of 18
(ghost), `disabled.label.on-fill` the other 3.

### Contrast

The value's new pairing, `disabled.on-fill` on `disabled.fill`, is an existing per-mode contract: 3.04 to 4.89 across
the five brands' light, dark and high-contrast modes.

### Held for the owner

The nested FlushIconButton's disabled glyph binds `color.disabled.icon`, the page form, and now sits on the disabled
fill: about 2.1 to 2.6:1 in light and dark modes, the shape Q-CC11 raises for the filled IconButton. A flush button has
no fill of its own, so Q-CC11 A's factory fix does not reach it. Asked on #3554 rather than decided here. Disabled
controls are outside SC 1.4.3 and 1.4.11.

### Verification

`test.ts` `#2427 counter/paint` now holds the outline/disabled box at `[color/disabled/fill, color/disabled/border]`
and the value at `color/disabled/on-fill` (ghost: `color/disabled/text`), as literals.
