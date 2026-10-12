/**
 * INPUT THAT CAN NEVER WAIT FOREVER (#2547, #2550), shared by the browser suites (`test-smoke.mjs`, `test-chrome.mjs`).
 *
 * A Playwright click, key press or `selectOption` on a ready control waits for the renderer to take the input. A key
 * press has no bound at all; a click or `selectOption` throws after 30 s, uncaught unless the caller catches it. Each
 * was seen: Escape at smoke S4d waiting two hours, a step click at smoke S4c and the Interactive picker throwing at
 * 30 s, and test:chrome S6.3's `lh-swap` `selectOption` timing out in a cloud run. An input run through `bounded`
 * is held to INPUT_MS: a stall fails ONE check by name and says what the page was doing, so the cause is read off
 * the failure instead of guessed.
 *   · If the page still renders a frame, it was BUSY (a long task, a loaded machine) and the caller carries on.
 *   · If it renders none, the debugger PAUSES the renderer and the failure names the JavaScript stack it was in, or
 *     says it was not running JavaScript (layout, paint, GC, or no frames being produced at all). The caller's
 *     `onDead` then decides what happens to the page.
 *
 * The debugger is enabled on each page at its FIRST bounded input, while the page still answers. `Debugger.enable`
 * runs on the page's main thread, so asked for only once the page is stuck it never completes and the pause never
 * lands (measured: an attach-after-the-stall version reported "no JavaScript was running" for a page stuck in a
 * JavaScript loop). Enabled early, `Debugger.pause` is an interrupt that stops even a busy loop.
 */

/** The bound on one input. */
export const INPUT_MS = 15000;

/** Whether the page renders a frame within 3 s, bounded on this side. */
export const rendersFrame = (page) => Promise.race([
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(true)))).catch(() => false),
  new Promise((r) => setTimeout(() => r(false), 3000)),
]);

const debuggers = new WeakMap();
const debuggerOf = async (page) => {
  if (debuggers.has(page)) return debuggers.get(page);
  const pending = (async () => {
    try {
      const cdp = await page.context().newCDPSession(page);
      const on = await Promise.race([cdp.send('Debugger.enable').then(() => true, () => false), new Promise((r) => setTimeout(() => r(false), 3000))]);
      return on ? cdp : null;
    } catch { return null; }
  })();
  debuggers.set(page, pending);
  return pending;
};

/** Pause the page and say where it was. */
const stallStack = async (page) => {
  const cdp = await Promise.race([debuggerOf(page), new Promise((r) => setTimeout(() => r(null), 3000))]);
  if (!cdp) return 'no debugger session could be opened on the page, so where it stopped is unknown';
  try {
    const paused = new Promise((r) => cdp.once('Debugger.paused', (e) => r(e)));
    await Promise.race([cdp.send('Debugger.pause').catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
    const e = await Promise.race([paused, new Promise((r) => setTimeout(() => r(null), 5000))]);
    if (!e) return 'the debugger could not pause it within 5s: it was not running JavaScript (layout, paint, GC, or no frames being produced at all)';
    const frames = (e.callFrames ?? []).slice(0, 6).map((f) => `${f.functionName || '(anonymous)'} ${String(f.url).split('/').pop() || '(page)'}:${f.location.lineNumber + 1}`);
    await Promise.race([cdp.send('Debugger.resume').catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
    return `it was running JavaScript: ${frames.join(' < ') || '(no frames)'}`;
  } catch (err) {
    return `the debugger failed (${String(err?.message ?? err).slice(0, 80)})`;
  }
};

/**
 * A suite's `bounded(page, label, act)`, which returns whether the input went through.
 *   · `ok(cond, label)` — the suite's assertion;
 *   · `isDead(page)` — a page the suite already gave up on is not touched again;
 *   · `onDead(page, message)` — what the suite does with a page that renders no frame (it must report `message`).
 * `stats` is the slowest input that went through, for a suite to print as its margin.
 */
export const makeBounded = ({ ok, isDead = () => false, onDead }) => {
  const stats = { inputs: 0, slowestMs: 0, slowestLabel: '' };
  const bounded = async (page, label, act) => {
    if (isDead(page)) return false;
    await debuggerOf(page);
    let timer;
    const t0 = Date.now();
    const out = await Promise.race([
      act().then(() => 'ok', (e) => e),
      new Promise((r) => { timer = setTimeout(() => r('timeout'), INPUT_MS); }),
    ]);
    clearTimeout(timer);
    if (out === 'ok') {
      stats.inputs++;
      const ms = Date.now() - t0;
      if (ms > stats.slowestMs) { stats.slowestMs = ms; stats.slowestLabel = label; }
      return true;
    }
    const what = out === 'timeout' ? `did not return within ${INPUT_MS}ms` : `threw after ${Date.now() - t0}ms: ${String(out?.message ?? out).split('\n')[0].slice(0, 120)}`;
    if (await rendersFrame(page)) {
      ok(false, `${label}: the input ${what}; the page still renders frames, so it was busy, not stuck`);
      return false;
    }
    await onDead(page, `${label}: the input ${what}; ${await stallStack(page)}`);
    return false;
  };
  return { bounded, stats };
};
