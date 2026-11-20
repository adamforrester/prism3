---
engine: minor
---
A new component, Popover (#4008): a non-modal panel anchored to the control that opened it, with a header (a title and a small flush close button), a body slot that scrolls when the screen is short, and an optional Button group footer. One member, on the raised surface (`color.foreground.raised`, a hairline `color.border.secondary` edge, `shadow.lg`, `radius.lg`). Dialog's `alternativeTo` gains Popover, and Button, IconButton and Tag list it as a common partner instead of a planned component.
