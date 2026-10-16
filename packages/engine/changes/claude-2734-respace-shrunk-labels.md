---
engine: patch
---
When an Update redraws a set's labels narrower, the same Update moves the sets that sat exactly 160px of white space
from it back to 160 (#2734), instead of keeping the wider gap as a designer's spacing. Any other spacing stays.
Plugin only: no token, emitted artifact or projected component surface moves. EXECUTOR_REVISION 30.
