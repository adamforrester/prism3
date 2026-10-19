## (2026-10-16) — `ai.generationPriority` gets a written scale (#2713)

**What.** From the component consistency audit (#2706). `ai.generationPriority` is the agent's tiebreak between
candidate components, and the skill called each number "a judgment call", so each def's number was set alone: child-only
parts ranged from 2 to 9, and Focus ring sat at 2, level with Text field and Dialog. The skill now carries a scale table,
and the defs follow it.

| Priority | Tier | Defs |
|---|---|---|
| 1 | the default pick | Button |
| 2 | a top-level component | the field controls (Counter included), Button group, rows, groups, Tabs, Accordion, List, Link, Dialog, Icon, Button.Destructive and .Neutral, IconButton and .Neutral |
| 3 | a supporting top-level component, or a sibling that loses its family's tiebreak | Badge, Tag, Divider, Spinner, Veil, Image placeholder, IconButton.Destructive, Segmented control |
| 4–5 | a specialization for a narrower place | the flush icon buttons (Neutral 4, the others 5) |
| 6 | a part a host nests, alone only in a stated case | Checkbox, Radio and Switch controls, Field label, Field message, Focus ring |
| 9 | a part never generated alone | Tab, List item, the segment, the accordion indicator |

**How the order was kept.** Every relative order that read as intended stays: Button above its siblings, IconButton.Destructive
below the other two icon buttons, flush Neutral above flush primary and destructive, Segmented control below Tabs and
Radio group. What moved is the parts: nothing an agent should not generate on its own now ties with a top-level
component. Segmented control moves 4 → 3 because it is a top-level control, not a specialization of one; it still ranks
below the 2s it competes with. Counter moves 4 → 2 (merged from main with the tier list lacking it): it is a field
control, not a specialization of another def. Button group was already 2.

**The gate** (`#2713 generationPriority` in `test.ts`). A hand-written tier per def, so a number moving fails naming the
def; the list must name every registered def, so a new def has to choose its tier; a number off the scale fails; and a
def at 6 or 9 must be nested (`nests`) by another registered def, read from the hosts' anatomy, a fact independent of
the number.

**Owner item.** The scale is a judgment the issue proposed and left open to a comment. The 6 tier (a part that can stand
alone) is this PR's addition; it is posted as an Owner question on #2713 and built on.
