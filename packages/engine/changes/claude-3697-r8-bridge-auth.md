---
engine: patch
---
The desktop bridge proves itself to the plugin (#3697 R8, owner decision A). The plugin sends its own nonce with each
pair and hello, and hears a `welcome` only with an HMAC of that nonce keyed by the token, and a `paired` only while it
has a code pending on that socket and with an HMAC keyed by that code. A plugin and a bridge from before this change no
longer connect to each other.
