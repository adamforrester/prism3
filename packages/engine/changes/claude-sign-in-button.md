---
engine: minor
---
SignInButton (#2343 PR 5): Continue with Apple, Google or Facebook, drawn by Prism3 to each provider's rules (owner
decisions Q-S1 to Q-S17, all A, Q831 A and Q846 A). It joins the catalog with 96 members (8 provider × style pairs ×
3 sizes × 4 states), on its own Sign-in button page. One provider glyph joins the mark set, provider/facebook-blue,
derived from social/facebook and scaled to the provider inset, so Brand mark gains one member. Apple black and
Facebook blue paint the black provider/apple and provider/facebook glyph white (Q846 A): the literal entry's markTint,
read by a `literal: 'mark'` nest, becomes the plan's literalTint, which both executors paint on every vector of the
glyph and read back (EXECUTOR_REVISION 43). No other host or mark may tint. The engine gains a literal record
(ComponentDef.literal, PartDef.literal):
a provider's own fill, edge, wash, label ink, wording and font, carried as values and written as plain paints and a
literal font by both executors, with read-back. A nested part may also map several host axes at once
(NestingRelation.variantWhere), which the provider glyph needs. No token name moves, so CONTRACT is unchanged.
