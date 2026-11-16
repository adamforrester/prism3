---
engine: patch
---
When an agent-link pairing fails and the plugin forgets the code (#3764), the prompt now says why, under the code field:
"The connection closed before pairing finished. Ask your agent for a new code." (the owner's Q-PC1 B). A first prompt
still shows only its plain line. The line clears when the next code is submitted, as the wrong-code line does. Plugin
only; no committed artifact moves.
