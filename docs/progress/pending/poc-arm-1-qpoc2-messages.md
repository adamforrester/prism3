## (2026-11-18) — A field at a validation status always writes and names its message (Q-POC2 A, #3408)

**What changed.** On the code POC's integration branch `poc/arm-1`, `<p3-text-field>` and `<p3-password-field>` write
the field message at `error`, `warning` or `success` and name it in the input's `aria-describedby`, whatever
`showMessage` says, so `aria-invalid` never stands without a description (#1712 A). `@prism3/css`'s README states
the same contract, and its markup writers follow it. Engine output doesn't move, so there is no change note.

- **Both field browser checks** fail by name when a status field renders without a linked, shown message, with new
  self-test mutants.
- **Two check weaknesses fixed:** the element parity contract's message link passed when no message was written, and
  the element browser check's mutants were built at load, so a hand mutation crashed it before the real run reported.
