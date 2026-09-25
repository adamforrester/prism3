/**
 * THE AGENT LINK'S PANEL CONTROL — UI IFRAME side. A deliberately minimal, TEMPORARY switch.
 *
 * WHERE THIS LIVES AND WHAT IT IS CALLED ARE THE OWNER'S DECISION, and neither is taken here: this is a
 * small fixed chip in the panel's bottom-left corner with a dashed border (read: not part of the designed
 * UI) and plain wording, so the link can be tested before anyone designs it. It is mounted by the plugin's
 * own UI entry (`ui/entry.ts`) beside the shared studio UI rather than inside it — the studio's body, and
 * the web build, carry none of it.
 *
 * It does three things and owns no state of its own:
 *   · the button posts `agent-link` with the opposite of the state the main thread last published — the
 *     main thread is the authority on whether the link is on;
 *   · it renders every `agent-link-state` the main thread posts: off, or on with the transport listening;
 *   · and the last command the link ran, with the headline the panel would have shown for it.
 *
 * Compiled under `tsconfig.ui.json` (DOM, no plugin typings); reaches the main thread only by
 * `parent.postMessage`, like `apps/studio/src/write-adapter.ts`.
 */
import type { UiToMain } from './messages';
import type { AgentLinkState } from './agent-protocol';

const CHIP_ID = 'p3-agent-link';

/** The chip's second line, from the published state. Exported for the browser check. */
export const agentLinkStatusText = (s: AgentLinkState | null): string => {
  if (!s || !s.on) return 'Off — agent commands are ignored.';
  const every = `${Math.round(s.pollMs / 100) / 10} s`;
  const listening = s.transports.mailbox ? `Listening — file mailbox, every ${every}` : 'On — no transport listening';
  const last = s.lastCommand
    ? ` · last: ${s.lastCommand.cmd} ${s.lastCommand.headline} (${s.lastCommand.finishedAt.slice(11, 19)})`
    : ' · no command yet';
  const inbox = s.inboxError ? ` · ⚠️ ${s.inboxError}` : '';
  return listening + last + inbox;
};

const post = (m: UiToMain): void => parent.postMessage({ pluginMessage: m }, '*');

/** Mount the chip once. Safe to call again: a second call finds the first chip and does nothing. */
export const mountAgentLink = (): void => {
  if (document.getElementById(CHIP_ID)) return;
  let state: AgentLinkState | null = null;

  const chip = document.createElement('div');
  chip.id = CHIP_ID;
  chip.setAttribute('role', 'group');
  chip.setAttribute('aria-label', 'Agent link');
  chip.title = 'Temporary control. While on, an agent can run this plugin\'s actions in this file by command. Off at every launch.';
  // Fixed light colors: the panel paints light tokens unconditionally (see `ui/index.html`), so the chip
  // does too. #1e1e1e on #ffffff is 16.7:1; the dashed #6b6b6b edge is 5.3:1 against the white.
  chip.style.cssText = [
    'position:fixed', 'left:8px', 'bottom:8px', 'z-index:2147483000', 'box-sizing:border-box',
    'display:flex', 'align-items:center', 'gap:8px', 'max-width:calc(100vw - 16px)',
    'padding:4px 8px', 'border:1px dashed #6b6b6b', 'border-radius:4px',
    'background:#ffffff', 'color:#1e1e1e', 'font:11px/1.4 system-ui, -apple-system, sans-serif',
  ].join(';');

  const button = document.createElement('button');
  button.type = 'button';
  button.style.cssText = 'font:inherit;padding:2px 6px;border:1px solid #6b6b6b;border-radius:3px;background:#ffffff;color:#1e1e1e;cursor:pointer;white-space:nowrap';

  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0';

  const render = (): void => {
    const on = !!state?.on;
    button.textContent = on ? 'Agent link: on' : 'Agent link: off';
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    status.textContent = agentLinkStatusText(state);
    status.title = status.textContent;
  };

  button.addEventListener('click', () => post({ type: 'agent-link', on: !state?.on }));
  window.addEventListener('message', (e: MessageEvent) => {
    const m = e.data && (e.data as { pluginMessage?: { type?: string; state?: AgentLinkState } }).pluginMessage;
    if (m && m.type === 'agent-link-state' && m.state && typeof m.state === 'object') {
      state = m.state;
      render();
    }
  });

  chip.append(button, status);
  render();
  document.body.appendChild(chip);
};
