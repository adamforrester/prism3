## (2026-11-12) — component-schema.ts: the `nesting` docblock says a `nest` takes `nest-exposed` too (#1723)

**What moved.** One comment; no code change. `PartDef.nesting`'s docblock said a `nest` part is "`nest-fixed` only (`nest-exposed` stays refused, #761)". #1330 reversed that refusal: `anatomyErrors` accepts `nest-exposed` on a `nest`, and its error text names both. The comment now says so, and that `swap` is refused on a `nest`. It names no example defs, because fifteen use `nest-exposed` today and a short list would go stale.

**The issue's other item was already done.** `ComponentDef.content`'s "has no reader" line was corrected under #846 finding 1 before this PR. The docblock now names `emit-component-docs.ts` as its reader. Nothing changed there.
