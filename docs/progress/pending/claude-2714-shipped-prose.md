## (2026-10-16) — Component shipped prose in one register, and a gate that holds it (#2714, #1717)

**What.** From the component consistency audit (#2706). The 13 defs built since Tag followed the build-component
skill's "What ships" rules; the older ones mostly did not. This PR brings 27 def files to the rules, one commit per file:
code spans out of the consumer fields, all-caps emphasis lowercased, "brief §N", "image.md §6" and "this def" reworded,
HC, SR and AT spelled out. It fills the content fields the audit found missing (`docs.contentGuidelines` on Icon, Focus
ring and Field label from the KB briefs' §7; `content.dialogPattern` on Dialog), lengthens Button's and IconButton's
summaries to the ~90-character line, makes the segment's summary agree with its description (emphasis weight, not
"bold"), and moves every child part's `whenToUse` onto two templates.

**How the bulk pass was done.** A scratch script removed the backticks and lowercased all-caps words outside an acronym
list, string by string against the def objects, and every resulting line was read in the diff before its commit. The
automated step gets three things wrong, each fixed by hand: a sentence that opens with an all-caps word ("GROUP-LEVEL
and specific" came out lowercase), an acronym missing from its list (AT, JSX), and brace patterns left bare by a removed
code span (`type.body.{sm,md,lg}` is now "from type.body.sm, md and lg").

**What did not move, and why.** The issue asked for Button's implementation `do` items to move into `codeOnly`. Two of
them cannot: `test.ts` (#2408) and `lint-hit-target` require the hit-area expansion to stay in the shipped `docs.do`,
because `codeOnly` never ships and the code docs would lose the only 44×44 target a flush button has (owner Q143,
Q283.3 A). The brand-setting lines (#1667, #1752, #2324) are written for the agent that builds Button in code, by a
recorded decision in their comment. Those lines keep their content in plain prose; whether they belong in a shipped
field of their own is an Owner question on #2714.

**The gate** (`test.ts`, after `component-prose`). `#2714 component register` walks the seven consumer fields of every
def and refuses a backtick, an all-caps word outside a hand-written acronym list, a section reference, "def" and an
issue number; the acronym list must be live (an acronym no field uses fails as stale), and the walk must reach each
def's summary, description, docs.usage and whenToUse. `#2714 child-only whenToUse` holds the two templates and resolves
each named host against the other defs' anatomy, so a template naming a host that does not nest the part fails.

**Out of scope, filed.** `motion` and a part's `note` also ship (the plugin bundle carries them) and carry 84 more
strings in the old register; the gate does not read them yet (#2773).
