## (2026-11-02) — The agent link's status holds still when two files share one bridge (#3297)

The owner saw the status under the Agent switch flip between "Listening · bridge" and "Listening · mailbox" every 2 s, with Prism3's link on in two files on one Mac.

**The diagnosis.** The issue guessed a refused second instance. The real cause was a loop between the two instances. The bridge server never lets an *unpaired* connection replace the plugin (#3204). A *paired* one does replace it, on purpose: a relay reconnecting after its socket died without a close must win over the dead socket (#2497). Both files were paired, so each retry from one evicted the other, and the evicted one retried 2 s later. The reproduction in `test-agent-bridge.ts` counted 26 status posts and 24 evictions in 2.5 s, in both relays.

**The fix keeps newer-replaces-older and adds a polite retry.** The server closes the replaced connection with a new code, `CLOSE.held` (4409), in place of 1000. The relay that gets it knows another instance holds the bridge. Until it is welcomed again, its hello carries `yield: true`. The server refuses a yielding hello with 4409 while a plugin is attached, and welcomes it when none is. Its proof is checked first, and a wrong proof is still 4401, so pairing does not change. The holder's own reconnects send no `yield`, so #2497 still works. While held, retries back off from 2 s to 30 s. The file that connected last keeps the bridge, and the other one moves to the mailbox once and stays there.

**The word moves only on a settled change.** The relay now keeps what it reported to the main thread separate from the live socket. A drop keeps `connected: true` for `holdMs` (5 s) and reports the loss only if no retry has been welcomed by then. A settled loss is reported at once: the link switched off, 4409, or a pairing refusal. Commands still depend on the live socket.

**New copy, DRAFT.** The waiting file's full line adds "The desktop bridge is connected to Prism3 in another file." The short word stays "Listening · mailbox". The PR's Owner Q-block asks about this.

**A second defect, found while writing the refused arm.** The relay's `onerror` closed the socket before its `ws !== sock` guard took effect. Node's WebSocket fires `error` again inside `close()` on a socket still connecting, so a refused socket recursed until the stack overflowed. It now marks the socket lost first. Browsers queue that event, so the panel probably never hit this, but the arm needs it.

**Mutations, each failing by name:** with no `yield` in the hello, `held/one-repaint`, `held/holder-steady`, `held/no-evict` and four more fail. With no hold, `flaky/held-word` and `real-change` fail. With the server ignoring `yield`, `held/server: a yielding hello is closed with 4409…` and the arms after it fail. With flat retries, `held/backoff` fails. Without the held note, `link/held-line` fails in `test-agent-link.ts`.
