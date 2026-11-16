## (2026-11-16) — The agent link forgets a pairing code after a failed bridge connection (#3764)

**What.** #3728 made the desktop bridge prove itself, and the owner accepted one residual risk (D3728.5 a): the plugin's
`pair` proof lets whatever holds port 17331 search the 8-character code offline, and the relay kept the pending code
across dropped sockets, so a cracked code could answer a later connection. This is option b. Once the socket that took
the code's `pair` is gone without a verified `paired` (closed, errored, or answered with a proof that fails), the relay
forgets the code, the prompt goes back to `needed`, and nothing retries until a code is entered.

**One helper, both drop paths.** `forgetSentCode()` runs in `lost()` and `drop()`. It forgets only when this socket sent
the code (`codeSent`), the code is still pending (a wrong-code refusal has already cleared it and set `wrong-code`), and
the socket was never welcomed (a welcome settles the connection by its token). A socket that closes before its challenge
never sent the code, and keeps it. Because both paths now clear `codeSent`, the #3728 S1′ reset in `connect()` is a
second guard: removing it alone no longer fails a test.

**Measured.** `test-agent-bridge.ts` `forget-code/*`: `closed` (1006), `error` and `impostor-paired` fail on main and pass
with the fix; each also proves the next pair carries the new code and a `paired` proving the forgotten code is refused.
`unsent` and `welcomed` pin the two cases that must keep going. Mutations, each failing by name: the helper emptied →
`closed`, `error`, `impostor-paired`; its `codeSent` clause dropped → `unsent`; its `connected` clause dropped →
`welcomed`. Three existing #3728 arms re-enter the code after their drop.

**Held for the owner.** The prompt copy when the code is asked for again (today the plain `needed` line, with no reason
given), and the guide's replacement for "One risk remains", drafted in this PR.
