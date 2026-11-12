---
engine: patch
---
The agent link authenticates both ways (#3697 R8, owner decision A). The desktop bridge now proves it holds the pairing
secret: the plugin sends its own nonce with each pair and hello, and hears a `welcome` only with an HMAC of that nonce
keyed by the token, and a `paired` only while it has a code pending and with an HMAC keyed by that code. Through the file
mailbox, `apply-theme`, a dev build's `run-code` and every `confirm: true` need the link session's code (`session`), drawn at switch-on,
kept in the plugin's memory and shown in the link's status; without it they are answered `no-session` and not run.
