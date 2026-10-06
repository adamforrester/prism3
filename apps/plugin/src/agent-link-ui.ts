/**
 * THE AGENT LINK'S PANEL CONTROL — UI IFRAME side: the Agent tile in the top bar.
 *
 * PLACEMENT (UI redesign S1.4, IA-3 and D6; the owner's top-bar decision T7 A, 2026-10-05): a bar tile like Theme,
 * Activity and Export (`dom.ts` `tile`), its glyph over "Agent", in the stable `bar-agent` slot the frame renders
 * (`apps/studio/src/shell/frame.ts`) and never clears, which the bar places between Theme and Activity. A click
 * switches the link; its name is "Agent", with `aria-pressed` for on or off; a green dot sits on the glyph
 * while the link is on. Until T7 it was the "Agent: Off" chip, which opened a popover holding the switch, a line on
 * what the link does and the link's status; the chip and the popover are gone. The status now lives in the Activity
 * drawer (#2213, the owner's N1 A and AS1 A, 2026-10-06): a short status (`agentLinkShortStatus`) at the far right of its
 * bar row, beside the caret, and the full status line (`agentLinkStatusText`) as the open drawer's first line and the
 * short status's tooltip and accessible name. The tile reports both with each published state (`setAgentLinkStatus`,
 * `shell/activity.ts`). Both are styled by the chrome stylesheet (`apps/studio/src/chrome.css`), so they carry no
 * inline value and follow the chrome's theme.
 *
 * It is mounted by the plugin's own UI entry (`ui/entry.ts`) beside the shared studio UI rather than inside
 * it: the web build carries none of it. The frame mounts and unmounts with the app view (the start screen
 * has none), so the tile is built once and moved into whichever slot is in the document.
 *
 * It does three things and owns no state of its own:
 *   · a click posts `agent-link` with the opposite of the state the main thread last published — the
 *     main thread is the authority on whether the link is on;
 *   · it renders every `agent-link-state` the main thread posts, and tells Activity whether the link is on;
 *   · and, while the link is on, the socket to the local desktop bridge (transport B) — the main thread has
 *     no network, so the iframe holds it and relays envelopes (`agent-bridge-relay.ts`).
 *
 * Compiled under `tsconfig.ui.json` (DOM, no plugin typings); reaches the main thread only by
 * `parent.postMessage`, like `apps/studio/src/write-adapter.ts`.
 */
import type { UiToMain } from './messages';
import type { AgentLinkState } from './agent-protocol';
import { createBridgeRelay } from './agent-bridge-relay';
import type { WsLike } from './agent-bridge-relay';
import { glyph, h, hook, tile } from '../../studio/src/shell/dom';
import { setAgentLinkOn, setAgentLinkStatus } from '../../studio/src/shell/activity';

/** The frame's stable slot for the tile, by its hook. */
const SLOT = '[data-p3="bar-agent"]';

/** The link's full status line, from the published state (the old popover's words; since #2213, the open Activity drawer's first line). */
export const agentLinkStatusText = (s: AgentLinkState | null): string => {
  if (!s || !s.on) return 'Off — agent commands are ignored.';
  const every = `${Math.round(s.pollMs / 100) / 10} s`;
  const listening = (s.transports.mailbox ? `Listening — file mailbox, every ${every}` : 'On — no transport listening') +
    (s.transports.bridge ? ' + desktop bridge' : '');
  const last = s.lastCommand
    ? ` · last: ${s.lastCommand.cmd} ${s.lastCommand.headline} (${s.lastCommand.finishedAt.slice(11, 19)})`
    : ' · no command yet';
  const inbox = s.inboxError ? ` · ⚠ ${s.inboxError}` : '';
  return listening + last + inbox;
};

/** The link's short status for the Activity drawer's bar row (#2213, the owner's AS1 A, 2026-10-06): nothing while the
 *  link is off; "Agent error" (the error ink) for an inbox error; "Agent not listening" (the error ink) while it is on
 *  with no transport listening; otherwise "Agent listening" (quiet). Pure. */
export const agentLinkShortStatus = (s: AgentLinkState | null): { readonly text: string; readonly error: boolean } | null => {
  if (!s || !s.on) return null;
  if (s.inboxError) return { text: 'Agent error', error: true };
  if (!s.transports.mailbox && !s.transports.bridge) return { text: 'Agent not listening', error: true };
  return { text: 'Agent listening', error: false };
};

const post = (m: UiToMain): void => parent.postMessage({ pluginMessage: m }, '*');

let mounted = false;

/** Mount the chip once. Safe to call again: a second call does nothing. */
export const mountAgentLink = (): void => {
  if (mounted) return;
  mounted = true;
  let state: AgentLinkState | null = null;

  // The Agent tile (the owner's top-bar decision T7 A, 2026-10-05): a bar tile like Theme, Activity and Export, its
  // glyph over "Agent", the glyph alone when narrow. A click switches the link, the same request the old popover's
  // switch posted: the main thread is the authority, so the tile shows only the state it publishes. It is a toggle,
  // so it carries `aria-pressed` (the old switch's `aria-checked`) under the fixed name "Agent". A green dot on the glyph while the link is on; nothing while it is off.
  const wrap = h('div', 'p3-popwrap');
  const { btn: chip, mark, tip } = tile('agent-toggle', 'Agent');
  // A toggle (the owner's Q44 note): one fixed name, and `aria-pressed` says on or off, so the state is announced once.
  chip.setAttribute('aria-label', 'Agent');
  tip.textContent = 'Agent';
  const dot = hook(h('span', 'p3-dot p3-agent-dot'), 'agent-dot');
  dot.setAttribute('aria-hidden', 'true');
  mark.append(glyph('agent'), dot);
  wrap.append(chip);

  const render = (): void => {
    const on = !!state?.on;
    chip.setAttribute('aria-pressed', String(on));
    chip.dataset.on = String(on);
    // Activity's name and tooltip say "agent link on" while it is (the owner's top-bar decision, 2026-10-05).
    setAgentLinkOn(on);
    // The Activity drawer's agent status (#2213): the short status in its bar row, and the full line while the link is
    // on or holds an inbox error.
    const short = agentLinkShortStatus(state);
    setAgentLinkStatus({ short: short?.text ?? null, error: !!short?.error,
      full: state && (state.on || state.inboxError) ? agentLinkStatusText(state) : null });
  };
  chip.addEventListener('click', () => post({ type: 'agent-link', on: !state?.on }));

  // Transport B: while the link is on, hold a socket to the local desktop bridge and relay its commands
  // to the main thread (`agent-bridge-relay.ts`). Nothing connects while the link is off.
  const relay = createBridgeRelay({
    open: (url) => new WebSocket(url) as unknown as WsLike,
    post,
    schedule: (fn, ms) => setTimeout(fn, ms),
    cancel: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
  });

  window.addEventListener('message', (e: MessageEvent) => {
    const m = e.data && (e.data as { pluginMessage?: { type?: string; state?: AgentLinkState } }).pluginMessage;
    if (!m || typeof m.type !== 'string' || !m.type.startsWith('agent-')) return;
    if (m.type === 'agent-link-state' && m.state && typeof m.state === 'object') {
      state = m.state;
      render();
    }
    relay.fromMain(m as Parameters<typeof relay.fromMain>[0]);
  });

  // The slot comes and goes with the app view (the start screen has no frame), and the frame keeps one
  // slot for its whole life. So the chip is moved into whichever slot is in the document, whenever one
  // appears; the slot itself is never cleared by anything else. A new slot arrives only with a new frame,
  // which is mounted as a direct child of the app root (`#app`), so only that root's own children are
  // watched, not every repaint below it.
  const place = (): void => {
    const slot = document.querySelector(SLOT);
    if (slot && wrap.parentElement !== slot) slot.append(wrap);
  };
  const root = document.getElementById('app');
  new MutationObserver(place).observe(root ?? document.body, root ? { childList: true } : { childList: true, subtree: true });
  render();
  place();
};
