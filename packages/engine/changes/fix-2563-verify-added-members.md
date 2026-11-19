---
engine: patch
---
Update file verifies the members it adds (#2563). The apply's content check (the plan's anatomy, paints it does not
give, nested members, what the host draws, reactions) read only the members it configured in place, so a member it
added was never checked, and a translucent wash the host left at 100% on it would ship under a success. Every planned
member that is in the set after the run and was not before is now held to its whole plan the same way, and a fault on it
fails the verdict by name. Plugin only; no committed artifact moves.
