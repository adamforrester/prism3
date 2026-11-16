---
engine: patch
---
The agent link forgets a pairing code once the connection that carried it closes without a confirmed pairing (#3764,
option b of D3728.5). Whatever held the bridge port saw the code's proof and could search the code space offline, so the
plugin asks for a fresh code instead of sending the old one again. Plugin only; no committed artifact moves.
