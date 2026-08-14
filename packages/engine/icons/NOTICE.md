# Icon set — provenance, licence and the reason this set is small

## Attribution

This project uses icons from Remix Icon (https://remixicon.com),
licensed under the Remix Icon License v1.0.

That wording is the notice the licence itself asks for, quoted rather than paraphrased. The full
licence text is committed beside this file as `LICENSE` — Remix Icon License v1.0, dated January
2026, copyright (c) 2017–2026 Remix Design.

**Remix Icon is not Apache 2.0.** It was relicensed in January 2026 and most third-party references
still say otherwise, including the first draft of `docs/40`. Read `LICENSE`, not a summary of it.

## Why our use is permitted, stated from the licence's own text

The relevant clauses are quoted rather than characterized, because the useful thing for whoever
re-checks this is the sentence, not our reading of it:

- §2.1 **Permitted Uses** lists *"User interface designs, design systems, and UI kits."*
- §3.1 gives worked examples, and one of the **Permitted** ones is
  *"Design systems or UI kits where Icons are a minor component."*
- §3.1 **Prohibited**: selling, sublicensing or distributing the Icons as a standalone product or an
  independent icon pack.
- §3.2 **Prohibited**: using the Icons to create, distribute or sell a competing icon library, even
  with only superficial changes.
- §3.3 **Prohibited**: use as a logo, trademark or brand identifier.

So the question is not whether a design system may include them — the licence names that use
explicitly — but whether they are a *minor component* of it. They are, and the reason is a stated
product decision rather than an interpretation:

> **This is a placeholder core set, supplied so the component tier has glyphs to build against. The
> intent is that a client swaps it for their own branded set.** The value Prism3 delivers is the
> generation engine, the token layer and the component definitions; the glyphs are scaffolding.

**That intent is recorded here rather than remembered**, because it is the whole licence argument
and it otherwise lives only in a conversation. If the set ever stops being swappable — if a brand's
identity comes to depend on these specific glyphs — this paragraph stops being true and the licence
position needs re-examining, which is exactly the kind of change nobody notices without a written
premise to contradict.

## Swapping the set is cheap, and that is by design

`icon-set.ts` maps **our** names to source filenames. Consumers reference our vocabulary
(`chevron-down`), never the source's (`arrow-down-s-line`), so replacing the set changes the mapping
and the SVGs and leaves `icon.name`'s contract untouched.

This matters beyond convenience. `icon.name` is part of the versioned component name surface
(#823) — adopting a vendor's vocabulary as our contract would make a set swap a MAJOR break, and
would hand the stability of our public names to a third party's naming decisions. It also makes a
*licence-driven* swap cheap, which is not hypothetical: this set's terms changed once already, seven
months before we adopted it.

Permissive alternatives with comparable coverage, if the set is ever replaced for licence reasons
rather than brand ones: Lucide (ISC), Phosphor (MIT), Heroicons (MIT), Material Symbols
(Apache 2.0).

## Scope of what is committed here

36 glyphs of Remix Icon's several thousand — well under the *"complete Icon library or substantial
portions of it"* threshold §5 attaches its licence-inclusion requirement to. The licence is committed
anyway: it costs nothing, and it removes the judgment call for whoever reads this next.
