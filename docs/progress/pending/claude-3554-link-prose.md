## (2026-11-11) — Link's current-page line, and two stale comments (#3554 M-E)

Part of #3554 (the 2026-11-11 component consistency audit), batch M-E.

- **Link's `current` code-only note** said it renders aria-current "on a breadcrumb's last item … It stays a real <a>". A
  BreadcrumbItem renders the current page as a `<span>`, never a link (Call 2 A), so the breadcrumb clause is gone. The
  rest of the line is unchanged.
- **`breadcrumb-item.ts`'s header** still said the missing `_` prefix was held for the owner. Q394 A settled it on
  #2783, as `pagination.ts` already says.
- **`lint-axis-values.ts`** said `indicator` is gone from the register, but the register has an `indicator` entry (the
  accordion's chevron or plus-minus). The comment now says the field-label axis left and the name came back for a
  different job.

Nothing here ships to a consumer: the Link line is a `codeOnly` note, which reaches only the maintainer record
(`schema/component-maintainer.json`) and Link's plan digest in `schema/component-surface.json`, accepted: the plan
carries the note, so the digest moves with no member changed. No gate: whether a breadcrumb's current item is a link is behavior no emitted field
records.
