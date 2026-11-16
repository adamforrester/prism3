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

**The `paired` has a deadline (review blocker).** Forgetting on a drop left one path open: an impostor could take the
`pair`, hold the socket open while it searched the code space, and answer on that same socket. Now the relay waits
`PAIRED_MS` (250 ms) for the `paired`; past that it drops the socket and forgets the code, and a later `paired` on it is
not heard. The real bridge answered `pair` in ≤ 2.2 ms over 15 cold starts on localhost, so the deadline is over 100×
that. In 250 ms one CPU core (≈ 4.7 × 10^5 HMAC-SHA-256 guesses a second, measured with `node:crypto`) covers about
1 in 5.6 million of the 30^8 ≈ 6.6 × 10^11 codes; a GPU at an assumed 2.5 × 10^9 guesses a second covers about 1 in 1,000.
Without the deadline that GPU finishes the whole space in about 4.4 minutes. `forget-code/hold-open` pins it, and the
review's probe now shows every path forgetting the code, the hold-open row included. What stays open: the real bridge
never saw the code, so a person who types the same code again gives an impostor that cracked it a second, unbounded
chance; that is the prompt-copy decision below.

**Held for the owner.** The prompt copy when the code is asked for again (today the plain `needed` line, with no reason
given), and the guide's replacement for "One risk remains", drafted in this PR.
