---
engine: minor
---
A brand's breakpoints must rise (#3872). Each floor in `layout.breakpoints` must now be above the one before, as the schema's description already said. Out-of-order floors (`[0, 1024, 768]`) used to emit `lg` below `md`, a repeated floor named one width twice, and a negative floor sat below the first; each built cleanly. `brandTheme` now refuses them, naming the floor and the one it follows. A fractional floor is still allowed. Every committed brand's emission is unchanged.
