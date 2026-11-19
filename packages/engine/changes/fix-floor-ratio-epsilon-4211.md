---
engine: patch
---
`floorRatio`, and so `formatRatio`, no longer loses a step to float error (#4211). `4.6 * 100` is 459.99999999999994, so
an exact 4.6 printed as 4.59:1 and 4.35 as 4.34:1; 141 of the two-decimal values from 1.00 to 21.00 did. The floor now
adds a 1e-9 tolerance on the hundredths scale before it floors: enough for float error, far too small to lift a real
miss, so a pair at 4.5 - 1e-8 still prints 4.49:1. Re-flooring a floored value is now a no-op. No emitted file changes:
regen over every brand writes the same bytes, and no pass or fail moves, since those read the raw ratio.
The sidecar schema's `ratio` description now says the ratio is floored to two decimals (#4214 item 4).
