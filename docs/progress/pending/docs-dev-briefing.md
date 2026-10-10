## (2026-10-09) — `19` §9 described a closed decision as the gating one, for two months

**Docs only — no emission movement, so no change note.** `docs/19-code-library-and-dx.md` §9 gains a
`Decided (2026-08-07, #609)` heading and the row `42` owes it.

**What was wrong.** §9's last two paragraphs read *"The mode decision this forces is filed as #609"*
and, above, *"this is now the gating decision for this whole layer."* #609 closed **completed on
2026-08-07** — option C of four — merged as #639 (*"Emit a conforming DTCG projection beside the
canonical tree"*) and #631 (`packages/tokens`, the stock-Style-Dictionary consumability gate). So the
one section a developer reads to learn whether Style Dictionary is in the pipeline described the
answer as pending for two months after it landed.

**Why nothing caught it, which is the part worth keeping.** `42`'s own argument is that **nothing in
this repo catches a decision superseded by a later decision** — and until this PR, `42` held 40 rows
and **not one of them was about the code layer**. Repos, frameworks, Storybook, Style Dictionary and
AEM are all prose with no index row and no gate. This section was not an oversight in an otherwise
covered area; it was the first instance found in an area with no coverage at all. The `Decided`
heading added here is the code layer's first entry in either structure.

**The substantive correction.** Style Dictionary is a **gate, not a dependency**: `packages/tokens`
runs a stock SD over the emitted DTCG to prove a conforming consumer reads it with no custom code,
and the engine neither imports it nor needs it. Finding 1's generalization survives but narrows — it
is now a statement about the *canonical* tree, which nothing is pointed at, rather than about the
emission as a whole.

**Re-verified rather than recalled, 2026-10-09**, because §9's whole weight rests on one external
claim: Style Dictionary's DTCG page documents first-class DTCG support as of v4, says format 2025.10
*"is not fully supported yet — this is a work in progress in v5"*, and **does not mention
`$extensions` anywhere**. A conforming consumer is still blind to the canonical tree.

**Also re-verified, since `19` §3's platform ranking is the other thing a developer reads and its
citations were two months old:** Adobe's Core Components page still says *"for new projects, Adobe
recommends leveraging Edge Delivery Services"* (page dated 2026-09-08, a month newer than §3's
citation); `aem.live/docs/faq` still says web components *"are not the default recommendation"*; and
`drupal.org/project/code_component` is still `1.0.0-alpha1` and still *"not covered by Drupal's
security advisory policy"*, which is the whole of §3's reason for ranking React 5 rather than 4.
**§3 needed no change.** Recorded so the next reader knows it was checked and when.

**The trap for whoever reads §9 next.** Two constraints in it are still live and are easy to read as
superseded along with the rest: SD stays in a workspace and is never imported by the engine core (the
buildless invariant is what lets the engine bundle into the Figma sandbox), and a **production** SD
configuration must be a *second file*, never merged into the consumer one, because the consumer
configuration's value is entirely conditional on staying naive.

**Filed, not fixed here:** the code layer has no gated decision record beyond the single row this PR
adds, and four live decisions (#252, #253, #254, and the tranche-4 behaviour wall in `41` §7) sit in
prose with no index entry. One row does not close that.

**A correction made in review.** The first draft of the new heading said the engine emits "flattened,
mode-resolved trees that are valid standalone DTCG". That is the alternative #639 turned down. What
shipped is a base tree plus one overlay per mode, holding only the tokens that differ. On main,
`nb.dark.overlay.tokens.json` carries 244 of the base's 704 leaves, and 236 of the 244 are aliases that
resolve through the base. The heading now says so, with #639's reason (overlays compose per axis, where
full trees multiply) and its scope (the theme axis only).
