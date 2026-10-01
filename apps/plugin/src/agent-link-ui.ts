/**
 * THE AGENT LINK'S PANEL CONTROL — UI IFRAME side: the Agent chip in the top bar (IA-3), and its popover.
 *
 * PLACEMENT (UI redesign S1.4; IA-3 and D6, the owner's): the chip sits in the top bar, in the stable
 * `bar-agent` slot the frame renders (`apps/studio/src/shell/frame.ts`) and never clears. It reads
 * "Agent: Off" or "Agent: On" (a glyph alone when the panel is narrow) and opens a small popover holding
 * the switch, one line on what the link does, and the link's status. The bottom-left dark box it replaces
 * (the first live run's placement) is gone, rather than kept beside it (D6). It is styled by the chrome
 * stylesheet (`apps/studio/src/chrome.css`), so it carries no inline value and follows Figma's theme.
 *
 * It is mounted by the plugin's own UI entry (`ui/entry.ts`) beside the shared studio UI rather than inside
 * it: the web build carries none of it. The frame mounts and unmounts with the app view (the start screen
 * has none), so the chip is built once and moved into whichever slot is in the document.
 *
 * It does four things and owns no state of its own:
 *   · the switch posts `agent-link` with the opposite of the state the main thread last published — the
 *     main thread is the authority on whether the link is on;
 *   · it renders every `agent-link-state` the main thread posts: off, or on with the transport listening;
 *   · the last command the link ran, with the headline the panel would have shown for it;
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
import { glyph, h, hook } from '../../studio/src/shell/dom';

/** The frame's stable slot for the chip, by its hook. */
const SLOT = '[data-p3="bar-agent"]';

/** The status line in the popover, from the published state. Exported for the browser check. */
export const agentLinkStatusText = (s: AgentLinkState | null): string => {
  if (!s || !s.on) return 'Off — agent commands are ignored.';
  const every = `${Math.round(s.pollMs / 100) / 10} s`;
  const listening = (s.transports.mailbox ? `Listening — file mailbox, every ${every}` : 'On — no transport listening') +
    (s.transports.bridge ? ' + desktop bridge' : '');
  const last = s.lastCommand
    ? ` · last: ${s.lastCommand.cmd} ${s.lastCommand.headline} (${s.lastCommand.finishedAt.slice(11, 19)})`
    : ' · no command yet';
  const inbox = s.inboxError ? ` · ⚠️ ${s.inboxError}` : '';
  return listening + last + inbox;
};

const post = (m: UiToMain): void => parent.postMessage({ pluginMessage: m }, '*');

let mounted = false;

/** Mount the chip once. Safe to call again: a second call does nothing. */
export const mountAgentLink = (): void => {
  if (mounted) return;
  mounted = true;
  let state: AgentLinkState | null = null;

  const wrap = h('div', 'p3-popwrap');
  // The chip: concept v6's "Agent: Off" (IA-3). The word at full width, the glyph alone when narrow; the
  // name holds either way.
  const chip = hook(h('button', 'p3-btn p3-btn-collapse p3-agent-chip'), 'agent-chip');
  chip.type = 'button';
  chip.setAttribute('aria-controls', 'p3-agent-pop');
  chip.setAttribute('aria-expanded', 'false');
  const chipLabel = h('span', 'p3-btn-label');
  const chipDot = h('span', 'p3-dot p3-agent-dot');
  chipDot.setAttribute('aria-hidden', 'true');
  chip.append(glyph('agent'), chipLabel, chipDot);

  // The popover: the switch, one line on what the link does (concept v6's), and the status line.
  const pop = hook(h('div', 'p3-menu p3-agent-pop'), 'agent-popover');
  pop.id = 'p3-agent-pop';
  pop.setAttribute('role', 'group');
  pop.setAttribute('aria-labelledby', 'p3-agent-pop-title');
  const head = h('div', 'p3-agent-head');
  const title = h('b', 'p3-agent-title', 'Agent link');
  title.id = 'p3-agent-pop-title';
  const toggle = hook(h('button', 'p3-btn p3-btn-page p3-agent-switch'), 'agent-switch');
  toggle.type = 'button';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-label', 'Agent link');
  const toggleDot = h('span', 'p3-dot p3-agent-dot');
  toggleDot.setAttribute('aria-hidden', 'true');
  const toggleText = h('span', 'p3-btn-label');
  toggle.append(toggleDot, toggleText);
  head.append(title, toggle);
  const what = h('p', 'p3-agent-line', 'Lets an agent on this computer run Prism3 commands in this file. Off at every launch; only you can turn it on.');
  const status = hook(h('p', 'p3-agent-line p3-agent-status'), 'agent-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  pop.append(head, what, status);
  wrap.append(chip);

  const render = (): void => {
    const on = !!state?.on;
    const word = on ? 'Agent: On' : 'Agent: Off';
    chipLabel.textContent = word;
    chip.setAttribute('aria-label', word);
    chip.dataset.on = String(on);
    toggle.setAttribute('aria-checked', String(on));
    toggle.dataset.on = String(on);
    toggleText.textContent = on ? 'On' : 'Off';
    status.textContent = agentLinkStatusText(state);
  };

  const isOpen = (): boolean => pop.isConnected;
  const onDown = (e: MouseEvent): void => { if (!wrap.contains(e.target as Node)) close(false); };
  const open = (): void => {
    wrap.append(pop);
    chip.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', onDown);
    toggle.focus();
  };
  function close(refocus: boolean): void {
    if (!isOpen()) return;
    pop.remove();
    chip.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onDown);
    if (refocus) chip.focus();
  }
  chip.onclick = () => (isOpen() ? close(true) : open());
  // Escape closes an open popover from anywhere in it, the chip included, and gives focus to the chip.
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { e.preventDefault(); e.stopPropagation(); close(true); }
  });
  // Focus leaving the chip and its popover (Tab past the switch) closes it. A focus move with no
  // destination (a click on the popover's text, or the window losing focus) leaves it open; a click
  // outside closes it through `onDown`.
  wrap.addEventListener('focusout', (e) => {
    const to = e.relatedTarget as Node | null;
    if (to && !wrap.contains(to)) close(false);
  });

  // Transport B: while the link is on, hold a socket to the local desktop bridge and relay its commands
  // to the main thread (`agent-bridge-relay.ts`). Nothing connects while the link is off.
  const relay = createBridgeRelay({
    open: (url) => new WebSocket(url) as unknown as WsLike,
    post,
    schedule: (fn, ms) => setTimeout(fn, ms),
    cancel: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
  });

  toggle.addEventListener('click', () => post({ type: 'agent-link', on: !state?.on }));
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
