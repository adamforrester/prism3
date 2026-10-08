# 46 — Never detach a Prism3 component to match a design

**Status:** decided by the owner. The how-to is the shipped skill `skills/prism3-rebind/SKILL.md`; this doc
holds the decision and the reasoning.

---

## Decided (2026-10-06): never detach a Prism3 component to match a design; place it attached and file the differences

When an existing design is rebuilt or rebound onto Prism3, a Prism3 component is **placed attached** and
matched as closely as its variants, properties, text content and layout overrides allow. It is **not**
detached, its layers are **not** restyled to look like the design, and it is **not** replaced by a lookalike
frame built from bound variables. Every visible difference that remains is listed, measured, and sorted for
the owner (below).

**Why.** A rebuild exists to find out what Prism3 can't do yet. A detached or lookalike component makes the
screen look right while hiding exactly the gap the exercise was meant to find, and nothing downstream can
see it. The swap also stops paying off: a detached instance never receives the component's later fixes. An
attached instance with a recorded difference turns into a specific piece of component work, and once the
component changes, every placed instance picks the fix up.

**How it was arrived at.** The first rebuild pass placed form fields as plain frames bound to Prism3
variables, because the Prism3 text field's input text was larger than the design's. That screen looked
closer to the design and taught nothing about the field. The owner replaced the call the same day. The
attached text field, placed with only a layout override, then produced a measured list of differences
(label and input sizes, gaps, padding, a missing focused-with-a-value state, an input box that hugs instead
of filling its column) that became filed component work.

**Scope.**
- Applies to **Prism3** components only. Detaching the legacy library's instances that are being replaced is
  the normal mechanism, after confirming the main component is remote.
- Where Prism3 has **no** component for a piece, rebuilding it as bound frames is allowed. The missing
  component is logged, and Prism3 atoms are used inside it where they fit.
- A **layout** override that keeps the instance attached (for example, a nested part set to FILL) is allowed
  and recorded. If every placement needs it, it is also a gap.

**What happens to each difference.** It is proposed as one of three kinds, and the owner decides:
1. a **Prism3 improvement** (accessibility, consistency, best practice), kept and recorded;
2. a **Prism3 gap**, filed as an issue;
3. a **brand-only** item, handled in the brand's own library or settings.

A difference that an existing setting resolves is none of these; the setting is changed. An agent proposes
the kind and never self-certifies an improvement.

---

*Cross-refs: `skills/prism3-rebind/SKILL.md` (the workflow, the plugin-API traps, the audit), `docs/42`
(the decisions index).*
