## (2026-11-11) — WalletButton's `type` prop is `wording` (#3554 Q-CC21)

**STATUS: built, owner decision 2026-11-11 (Q-CC21 A).** Engine `minor`, ENGINE_VERSION {{ENGINE_VERSION}}.

WalletButton's provider-wording prop was `type` (default `plain`). SignInButton, built by the same
branded-button factory, names that job `wording`, and on Button, IconButton and FlushIconButton `type` is
the HTML button type, so the same word meant two things. It is now `wording`. The provider-element note
says the value still reaches the provider as its own button type (`buttonType` and the like), so nothing
about what is drawn changes.

Code only: the Figma set has no wording property (Q3174.5 A builds `plain` only), so no member, property
or instance moves and `COMPONENT_RENAMES` needs no entry. The release notes read the prop rename off
`components.ai.json` as breaking.
