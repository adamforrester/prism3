---
engine: minor
---
WalletButton's wording prop is `wording`, not `type` (#3554 Q-CC21 A, owner decision 2026-11-11): SignInButton, built by the same factory, names that job `wording`, and on Button, IconButton and FlushIconButton `type` is the HTML button type. The value still reaches the provider as its button type.
