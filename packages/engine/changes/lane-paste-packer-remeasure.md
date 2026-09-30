---
engine: patch
---
#1814: `planSetChunks` measures every chunk as it will ship, at its final index and total, and keeps moving a
variant on to the next chunk until every chunk of more than one variant fits the budget. It used to move one
variant off an over-budget last chunk and never measure again. For every set and budget measured the chunks
are the same as before; the loop replaces an unstated one-byte margin with a measurement.
