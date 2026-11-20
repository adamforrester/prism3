## (2026-11-20) — The CLI's --help names the CSS-only source

Owner decision 2026-11-20 on #3998: `--help` lists the new `<id>.css-only.json` beside the token files it
already named, in a small follow-up. The `--out` line now ends "and `<id>.css-only.json`, each spring as a CSS
linear() curve for the shippable token CSS" (DRAFT wording).

- A `#3510` arm in the CLI block runs `--help` and the real CLI into a temp directory, and holds both: the help
  names `<id>.css-only.json`, and the run wrote `harbor.css-only.json`. It failed by name before the help change.
- This branch carries #3998 by a normal merge of its head, not a stacked base; it lands after #3998.
- `--help` still doesn't name `<id>.web.base.tokens.json` (#4155). Out of scope here, filed as #4425.
