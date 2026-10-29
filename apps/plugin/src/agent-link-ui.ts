/**
 * THE AGENT LINK'S PANEL CONTROL — UI IFRAME side: the Agent switch in the top bar.
 *
 * THE SWITCH SINCE #3083 (the owner's Q3083.5 B, Q3083.6 A and Q3083.7 B, 2026-10-28): the tile below became a bare
 * "Agent" and the chrome's switch (`dom.ts` `switchEl`) at a bar-only size, on the bar ground, in the same slot and with
 * the same hook (`agent-toggle`). It is a `role="switch"` button named "Agent", `aria-checked` for on or off, and a click
 * still posts `agent-link`. The tile's green dot and the on mark's fill and edge (Q738 A, Q788 C) are gone: the switch's
 * on state says it. At 380 the label drops and the switch stands alone. The history below is kept as written.
 *
 * PLACEMENT SINCE Q731 (the owner, 2026-10-26): the Agent tile is on the top bar again, in the place Minimize held
 * (after the brand, before Update file), and Minimize is at the rail's foot, where #2909 had put the Agent tile. The tile
 * keeps its toggle, its `aria-pressed` and its green dot; on the bar it shows its label where the bar's tiles do.
 *
 * PLACEMENT (UI redesign S1.4, IA-3 and D6; the owner's top-bar decision T7 A, 2026-10-05): a bar tile like Theme,
 * Activity and Export (`dom.ts` `tile`), its glyph over "Agent", in the stable `bar-agent` slot the frame renders
 * (`apps/studio/src/shell/frame.ts`) and never clears, which the bar places between Theme and Activity. A click
 * switches the link; its name is "Agent", with `aria-pressed` for on or off; a green dot sits on the glyph
 * while the link is on. Until T7 it was the "Agent: Off" chip, which opened a popover holding the switch, a line on
 * what the link does and the link's status; the chip and the popover are gone. The status now lives in the Activity
 * drawer (#2213, the owner's N1 A and AS1 A, 2026-10-06): a short status at the far right of its bar row, beside the
 * caret, and the full status line (`agentLinkStatusText`) as the open drawer's first line and the short status's tooltip
 * and accessible name. Since #3113 (Q3113.7 A) the short status is the link's glyph, a dot and one word
 * (`agentLinkWord`: "Listening"), and the full line speaks in operation words with a relative age. The tile reports both with each published state (`setAgentLinkStatus`,
 * `shell/activity.ts`). A change of the short status INTO "Agent error" or "Agent not listening" is announced once,
 * politely, through one persistent live region the tile owns (#2275, the owner's Q86 B, 2026-10-07; below). Both are styled by the chrome stylesheet (`apps/studio/src/chrome.css`), so they carry no
 * inline value and follow the chrome's theme.
 *
 * It is mounted by the plugin's own UI entry (`ui/entry.ts`) beside the shared studio UI rather than inside
 * it: the web build carries none of it. The frame mounts and unmounts with the app view (the start screen
 * has none), so the tile is built once and moved into whichever slot is in the document.
 *
 * THE STRIP (#2949; the owner's Q1 A, Q2 A, Q3 A and Q600 A, 2026-10-23). A Minimize tile sits at the rail's foot
 * (`rail-minimize`, Q731; on the top bar from #2909 until then). It asks the main thread to shrink the window to a one-row strip (`minimize-ui`), and the main
 * thread answers `ui-minimized`, the authority as for the link. Minimize does not depend on the link (the owner's
 * direction on #2909, 2026-10-24): it is drawn and works whether the link is on or off. Minimized, the document shows
 * only the strip (`html[data-strip]`, `chrome.css`). While the link is on, the strip holds the link's dot, its status in
 * the Activity drawer's words plus the running or last command and its age (`agentStripText`), Restore, and Turn off,
 * which turns the link off and so restores the window too (`main.ts`). While the link is off, it holds the product's
 * name and Restore only (`STRIP_IDLE`; placeholder wording, Q2909.10 A). Everything else stays mounted under it, only not drawn, so Restore returns to the same page and state. The
 * strip is built once and appended to `<body>`, like the live region, since the frame comes and goes with the app view.
 *
 * THE LIBRARY HOME'S SWITCH (#2879; the owner's Q613 3 A, 2026-10-23). The library home (`apps/studio/src/shell/home.ts`)
 * holds a card with an empty slot, `home-agent`. This fills it with "Agent link", the link's full status line, and the
 * chrome's switch (`switchEl`). It is a second control on the ONE state: a click posts `agent-link` exactly as the tile
 * does, and both render from the same published `agent-link-state`, so they cannot disagree.
 *
 * It does these things and owns no state of its own:
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
import { glyph, h, hook, switchEl, tile } from '../../studio/src/shell/dom';
import { OP_TITLE, setAgentLinkOn, setAgentLinkStatus } from '../../studio/src/shell/activity';

/** The frame's stable slot for the tile, by its hook: on the top bar since Q731 (the rail's foot under #2909). */
const SLOT = '[data-p3="bar-agent"]';
/** Q731: Minimize's slot at the rail's foot, where the Agent tile was (on the top bar from #2909 until then). */
const MIN_SLOT = '[data-p3="rail-minimize"]';
/** The library home's slot for its switch (#2879), by its hook. */
const HOME_SLOT = '[data-p3="home-agent"]';

/** #3113 (Q3113.7 A): each agent command in operation words, the Activity drawer's titles where the command is one of its
 *  operations. DRAFT wording for the rest. */
export const AGENT_CMD_WORDS: Readonly<Record<string, string>> = {
  status: 'Status', 'apply-theme': OP_TITLE['apply'], 'build-components': OP_TITLE.components, 'file-setup': OP_TITLE.filesetup,
  'style-guide': OP_TITLE.styleguide, prune: OP_TITLE.prune, readback: OP_TITLE.readback, 'draw-specs': OP_TITLE.specs,
  'update-components': 'Update sets', 'capture-baseline': 'Record the sets', 'adopt-members': 'Adopt members',
};
/** A relative age in words (Q3113.7 A; DRAFT): "just now" under a minute, then minutes, hours and days ago. Pure. */
export const agoWords = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const hrs = Math.floor(m / 60);
  return hrs < 24 ? `${hrs} h ago` : `${Math.floor(hrs / 24)} d ago`;
};

/** The link's full status line, from the published state (the old popover's words; since #2213, the open Activity drawer's
 *  first line). Since #3113 (Q3113.7 A) in operation words with a relative age: "Listening for agent commands (file
 *  mailbox, every 2 s). Last: Build set, built 48 variants, 2 min ago." DRAFT wording. `now` is milliseconds since the
 *  epoch. Pure. */
export const agentLinkStatusText = (s: AgentLinkState | null, now: number = Date.now()): string => {
  if (!s || !s.on) return 'Off — agent commands are ignored.';
  const every = `${Math.round(s.pollMs / 100) / 10} s`;
  const how = [s.transports.mailbox && `file mailbox, every ${every}`, s.transports.bridge && 'desktop bridge'].filter(Boolean).join(', and the ');
  const listening = how ? `Listening for agent commands (${how}).` : 'On, but not listening: no transport is open.';
  const c = s.lastCommand;
  const at = c ? Date.parse(c.finishedAt) : NaN;
  const words = c ? c.headline.replace(/^[^\p{L}\p{N}]+/u, '').trim() : '';
  const last = c
    ? ` Last: ${AGENT_CMD_WORDS[c.cmd] ?? c.cmd}${words ? `, ${words}` : ''}${Number.isNaN(at) ? '' : `, ${agoWords(now - at)}`}.`
    : ' No command yet.';
  const inbox = s.inboxError ? ` Inbox error: ${s.inboxError.replace(/[.\s]+$/, '')}.` : '';
  return listening + last + inbox;
};

/** #3113 (Q3113.7 A): the bar row's one word for the link, beside its glyph and dot: nothing while it is off, "Error" for
 *  an inbox error, "Not listening" while it is on with no transport listening, otherwise "Listening". The error states
 *  draw in the chrome's error inks. DRAFT wording, except "Listening". Pure. */
export const agentLinkWord = (s: AgentLinkState | null): { readonly text: string; readonly error: boolean } | null => {
  if (!s || !s.on) return null;
  if (s.inboxError) return { text: 'Error', error: true };
  if (!s.transports.mailbox && !s.transports.bridge) return { text: 'Not listening', error: true };
  return { text: 'Listening', error: false };
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

/** An age in the strip's words (#2949): seconds under a minute, then whole minutes, then whole hours. Pure. */
export const agentAge = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`;
};

/** The strip's one line (#2949, the owner's Q2 A and Q3 A): the short status, and while it is not an error state, the
 *  command running with how long it has run, or the last command with how long ago it finished. Nothing while the link is
 *  off. `running` is the command the panel was told started and not yet finished (`agent-started`, `agent-finished`);
 *  `now` is milliseconds since the epoch. Pure. */
export const agentStripText = (s: AgentLinkState | null, running: { readonly cmd: string; readonly since: number } | null, now: number):
  { readonly text: string; readonly error: boolean } | null => {
  const short = agentLinkShortStatus(s);
  if (!short || short.error) return short;
  if (running) return { text: `Agent running ${running.cmd}… ${agentAge(now - running.since)}`, error: false };
  const last = s?.lastCommand;
  const at = last ? Date.parse(last.finishedAt) : NaN;
  if (!last || Number.isNaN(at)) return { text: `${short.text} · no command yet`, error: false };
  return { text: `${short.text} · last: ${last.cmd} ${agentAge(now - at)} ago`, error: false };
};

/** The strip's line while the link is off: the product's name, nothing about the link. */
export const STRIP_IDLE = 'Prism3';

const post = (m: UiToMain): void => parent.postMessage({ pluginMessage: m }, '*');

/** The one live region for the link's status (#2275, the owner's Q86 B, 2026-10-07: announce errors only). Built once at
 *  mount, visually hidden (`p3-sr`), polite, and appended to `<body>` rather than to the frame, which mounts and unmounts
 *  with the app view: a region that is moved or rebuilt is one a screen reader may stop hearing. Its text is updated in
 *  place and only when the short status changes INTO an error state ("Agent error", "Agent not listening") from any
 *  other, the short status's own words (AS1 A). Recovery to "Agent listening", switching off, and a change of the full
 *  line alone (a new "last:" time) announce nothing. A change OUT of an error state (recovery, or switching off) clears its
 *  text, the same node kept: a removal from a polite region with the default `aria-relevant` (additions text) is not
 *  announced, and an emptied region leaves no stale "Agent error" for anyone reading the page (the UI lane's call on
 *  #2285, 2026-10-07). */
const statusRegion = (): HTMLElement => {
  const live = hook(h('div', 'p3-sr'), 'agent-status-live');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  document.body.append(live);
  return live;
};

let mounted = false;

/** Mount the chip once. Safe to call again: a second call does nothing. */
export const mountAgentLink = (): void => {
  if (mounted) return;
  mounted = true;
  let state: AgentLinkState | null = null;
  const live = statusRegion();
  /** The short status last drawn, and whether it was an error state, so a repeat or a full-line-only change is not a
   *  change, and a change out of an error state clears the region. */
  let shownShort: string | null = null;
  let shownError = false;

  // The Agent switch (#3083, the owner's Q3083.5 B, Q3083.6 A and Q3083.7 B, 2026-10-28): a bare "Agent" and the chrome's
  // switch, at the bar's own size, on the bar ground. It replaced the Agent tile (T7 A), its green dot and the on mark's
  // fill and edge (Q738 A, Q788 C). A click switches the link, the same request the tile posted: the main thread is the
  // authority, so the switch shows only the state it publishes (`set`, in `render`), never its own click. One fixed name,
  // "Agent" (the owner's Q44 note), and `aria-checked` says on or off; at 380 the label drops and the name stays.
  // The label is a `<label>` beside the switch, not inside it, so the switch stays the chrome's one track-and-knob kind
  // (#2183) and a click on the word turns it too. It is hidden from assistive tech: the switch's own name says "Agent".
  const wrap = h('div', 'p3-popwrap');
  const { el: chip, set: setChip } = switchEl('agent-toggle', 'Agent', () => post({ type: 'agent-link', on: !state?.on }));
  chip.classList.add('p3-agent-switch');
  chip.id = 'p3-agent-switch';
  const label = h('label', 'p3-agent-switch-label', 'Agent');
  label.htmlFor = chip.id;
  label.setAttribute('aria-hidden', 'true');
  // #2949 (Q600 A): Minimize, at the rail's foot since Q731, whether the link is on or off. A plain button: the main thread decides.
  // Its icon alone (#3083, the owner, 2026-10-28), as the strip's Restore is: the name and the tooltip say "Minimize".
  const { btn: minBtn, mark: minMark, tip: minTip } = tile('agent-minimize', null);
  minBtn.classList.add('p3-agent-min');
  minBtn.setAttribute('aria-label', 'Minimize');
  minTip.textContent = 'Minimize';
  // The collapse glyph, two arrows in toward the center, the mirror of the strip's Restore (the owner, 2026-10-26; it was a minus).
  minMark.append(glyph('collapse'));
  minBtn.addEventListener('click', () => post({ type: 'minimize-ui', minimized: true }));
  wrap.append(label, chip, minBtn);

  // #2879 (Q613 3 A): the library home's row: its title, the link's full status line, and the switch. The same request as
  // the tile's click; the switch shows only what the main thread publishes.
  const homeRow = hook(h('div', 'p3-home-agentrow'), 'home-agent-row');
  const homeText = h('div', 'p3-home-agenttext');
  const homeStatus = hook(h('span', 'p3-home-agentstatus'), 'home-agent-status');
  homeStatus.id = 'p3-home-agent-status';
  homeText.append(h('span', 'p3-home-agenttitle', 'Agent link'), homeStatus);
  const homeSwitch = switchEl('home-agent-switch', 'Agent link', () => post({ type: 'agent-link', on: !state?.on }));
  homeSwitch.el.setAttribute('aria-describedby', homeStatus.id);
  homeRow.append(homeText, homeSwitch.el);

  // The strip (#2949): the link's dot, its line, Restore and Turn off; with the link off, the name and Restore. Drawn only
  // while the main thread says minimized.
  const strip = hook(h('div', 'p3-strip'), 'agent-strip');
  strip.hidden = true;
  const stripDot = hook(h('span', 'p3-dot p3-dot-ok'), 'agent-strip-dot');
  stripDot.setAttribute('aria-hidden', 'true');
  const stripText = hook(h('span', 'p3-strip-text'), 'agent-strip-text');
  const restore = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon'), 'agent-strip-restore');
  restore.type = 'button';
  restore.setAttribute('aria-label', 'Restore');
  restore.title = 'Restore';
  restore.append(glyph('restore'));
  restore.addEventListener('click', () => post({ type: 'minimize-ui', minimized: false }));
  const turnOff = hook(h('button', 'p3-btn', 'Turn off'), 'agent-strip-off');
  turnOff.type = 'button';
  turnOff.addEventListener('click', () => post({ type: 'agent-link', on: false }));
  strip.append(stripDot, stripText, restore, turnOff);
  document.body.append(strip);
  let minimized = false;
  /** The command the panel was told started and not yet finished, with when it was told. */
  let running: { cmd: string; since: number } | null = null;
  let ticker: ReturnType<typeof setInterval> | null = null;
  /** #2909: keeps the drawer's "… ago" current while the link is on. */
  let drawerTicker: ReturnType<typeof setInterval> | null = null;
  const renderStrip = (): void => {
    if (!minimized) return;
    const line = agentStripText(state, running, Date.now());
    stripText.textContent = line?.text ?? STRIP_IDLE;
    stripText.dataset.error = String(!!line?.error);
    stripDot.className = line?.error ? 'p3-dot p3-dot-bad' : 'p3-dot p3-dot-ok';
    // The link's own parts only while it is on (the owner's direction on #2909, 2026-10-24).
    const on = !!state?.on;
    stripDot.hidden = !on;
    turnOff.hidden = !on;
    strip.title = on && state ? agentLinkStatusText(state) : '';
  };
  const setMinimized = (on: boolean): void => {
    if (on === minimized) return;
    minimized = on;
    strip.hidden = !on;
    if (on) document.documentElement.dataset.strip = 'true';
    else delete document.documentElement.dataset.strip;
    if (ticker !== null) { clearInterval(ticker); ticker = null; }
    if (on) { renderStrip(); ticker = setInterval(renderStrip, 1000); restore.focus(); }
    else if (minBtn.isConnected) minBtn.focus();
  };

  const render = (): void => {
    const on = !!state?.on;
    setChip(on);
    homeSwitch.set(on);
    homeStatus.textContent = agentLinkStatusText(state);
    renderStrip();
    // Activity's name and tooltip say "agent link on" while it is (the owner's top-bar decision, 2026-10-05).
    setAgentLinkOn(on);
    // The Activity drawer's agent status (#2213): the short status in its bar row, and the full line while the link is
    // on or holds an inbox error.
    const short = agentLinkShortStatus(state);
    // Q86 B: into an error state, once; out of one, the region is emptied, which announces nothing.
    const nextShort = short?.text ?? null;
    if (short?.error && nextShort !== shownShort) live.textContent = short.text;
    else if (!short?.error && shownError) live.textContent = '';
    shownShort = nextShort;
    shownError = !!short?.error;
    // #3113 (Q3113.7 A): the drawer's bar row draws the link's glyph, a dot and one word ("Listening"); the full line, in
    // operation words with a relative age, heads the open drawer and is the word's tooltip. The ticker below keeps the
    // age current while the link is on.
    const word = agentLinkWord(state);
    setAgentLinkStatus({ short: word?.text ?? null, error: !!word?.error,
      full: state && (state.on || state.inboxError) ? agentLinkStatusText(state) : null });
    if (on && drawerTicker === null) drawerTicker = setInterval(render, 30_000);
    if (!on && drawerTicker !== null) { clearInterval(drawerTicker); drawerTicker = null; }
  };

  // Transport B: while the link is on, hold a socket to the local desktop bridge and relay its commands
  // to the main thread (`agent-bridge-relay.ts`). Nothing connects while the link is off.
  // DEV BUILDS ONLY (#2530): the socket's one origin is listed under `devAllowedDomains`, which Figma honours only
  // for a development import, so the release build (`PRISM3_DEV` false) drops the relay and its URL entirely.
  let relay: ReturnType<typeof createBridgeRelay> | null = null;
  if (PRISM3_DEV) {
    relay = createBridgeRelay({
      open: (url) => new WebSocket(url) as unknown as WsLike,
      post,
      schedule: (fn, ms) => setTimeout(fn, ms),
      cancel: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
    });
  }

  window.addEventListener('message', (e: MessageEvent) => {
    const m = e.data && (e.data as { pluginMessage?: { type?: string; state?: AgentLinkState } }).pluginMessage;
    if (m && m.type === 'ui-minimized') { setMinimized((m as { minimized?: unknown }).minimized === true); return; }
    if (!m || typeof m.type !== 'string' || !m.type.startsWith('agent-')) return;
    if (m.type === 'agent-link-state' && m.state && typeof m.state === 'object') {
      state = m.state;
      render();
    }
    if (m.type === 'agent-started') { running = { cmd: String((m as { cmd?: unknown }).cmd ?? ''), since: Date.now() }; render(); }
    if (m.type === 'agent-finished') { running = null; render(); }
    relay?.fromMain(m as Parameters<ReturnType<typeof createBridgeRelay>['fromMain']>[0]);
  });

  // The slot comes and goes with the app view (the start screen has no frame), and the frame keeps one
  // slot for its whole life. So the chip is moved into whichever slot is in the document, whenever one
  // appears; the slot itself is never cleared by anything else. A new slot arrives only with a new frame,
  // which is mounted as a direct child of the app root (`#app`), so only that root's own children are
  // watched, not every repaint below it.
  const place = (): void => {
    const slot = document.querySelector(SLOT);
    if (slot && wrap.parentElement !== slot) slot.append(wrap);
    // Q731: Minimize sits at the rail's foot, apart from the tile, while the frame draws its slot there.
    const minSlot = document.querySelector(MIN_SLOT);
    if (minSlot && minBtn.parentElement !== minSlot) minSlot.append(minBtn);
    // The library home's slot is mounted with the frame (`frame.ts`), so it arrives with the same frame.
    const homeSlot = document.querySelector(HOME_SLOT);
    if (homeSlot && homeRow.parentElement !== homeSlot) homeSlot.append(homeRow);
  };
  const root = document.getElementById('app');
  new MutationObserver(place).observe(root ?? document.body, root ? { childList: true } : { childList: true, subtree: true });
  render();
  place();
};
