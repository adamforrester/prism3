---
engine: minor
---
SignInButton (#2343 PR 5): Continue with Apple, Google or Facebook, drawn by Prism3 to each provider's rules (owner
decisions Q-S1 to Q-S12, all A, and Q831 A). It joins the catalog with 96 members (8 provider × style pairs × 3 sizes
× 4 states), on its own Sign-in button page. Two provider glyphs join the mark set, provider/apple-black and
provider/facebook-blue, derived from social/apple and social/facebook and scaled to the provider inset, so Brand mark
gains two members. The engine gains a literal record (ComponentDef.literal, PartDef.literal):
a provider's own fill, edge, wash, label ink, wording and font, carried as values and written as plain paints and a
literal font by both executors, with read-back. A nested part may also map several host axes at once
(NestingRelation.variantWhere), which the provider glyph needs. No token name moves, so CONTRACT is unchanged.
