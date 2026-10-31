---
engine: minor
---
Accordion gains a `divider` boolean (#3198, owner decision Q-ACC2 A): a Figma component property, on by default, bound
to the nested Divider's visibility in every one of the 48 members, and a code prop of the same name and default. The
Divider part is now optional. An Update on a file built before it adds the property in place, keeping every member and
node id and every hand edit. The docs and the .ai.json say when to turn it off (DRAFT prose, for the owner). No token
path moves, so CONTRACT is unchanged.
