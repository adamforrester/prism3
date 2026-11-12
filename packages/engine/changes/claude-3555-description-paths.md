---
engine: minor
---
Token descriptions write token names as code (#3555 Q-MD2). Every `$description` in the DTCG trees and the sidecars now
backticks the token paths it names ("clears 3:1 on `background.secondary`"). A line-box description names the full type
path (`type.body.sm`, not `body.sm`). Figma descriptions are unchanged. The sidecar's prose gate now covers
`$description`, and `lint-description-claims` reads a backticked partner.
