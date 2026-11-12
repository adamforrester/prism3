// Direction B · Decisions first. What needs a person comes first, in a gray well of white cards (the levers panel's
// gray holding `.p3-lsec`-style cards): the last run's sets to check, a set that can't be updated, and each kept set with
// its three choices shown at once as a segmented control. Under it, one white list card says what this update writes,
// one row per step in run order, each with its tick and a status at the row's end. The library changes callout sits in
// the foot, over the button it qualifies.
const bCard = (iconName, title, cls = '') => {
  const card = el('section', `mk-b-card ${cls}`);
  const head = el('div', 'mk-b-chead');
  if (iconName) head.append(ico(iconName));
  head.append(title);
  card.append(head);
  return card;
};
const stepRow = (on, title, line, end, toggle, more) => {
  const row = el('div', 'mk-b-step');
  row.dataset.on = String(on);
  const top = el('div', 'mk-b-stop');
  top.append(toggle ? tick(on, el('span', 'mk-b-stitle', title), toggle, 'mk-b-tick') : el('span', 'mk-b-stitle mk-b-notick', title));
  if (end) top.append(end);
  row.append(top);
  if (line) row.append(sub(line, 'mk-b-sline'));
  if (more) row.append(more);
  return row;
};
const DIRECTION_B = {
  key: 'b',
  update: (m) => {
    const body = [];
    if (m.fresh) body.push(sub(C.leadFresh, 'mk-b-lead'));
    // 1 · Needs a decision.
    const needs = [];
    if (m.lastRun) {
      const card = bCard('warn', draft(el('b', null, m.lastRun.what)), 'mk-b-warn');
      card.append(draft(sub(D.toCheckSub)));
      const list = el('ul', 'mk-b-list');
      for (const s of m.lastRun.sets) { const li = el('li'); li.append(el('b', null, s.name), draft(sub(s.line))); list.append(li); }
      card.append(list);
      needs.push(card);
    }
    for (const b of m.blocked) {
      const t = el('span', 'mk-b-ctitle');
      t.append(el('b', null, b.name), draft(el('span', 'mk-b-cstate', ` · ${D.blocked}`)));
      const card = bCard('lock', t);
      card.append(sub(b.why), draft(el('p', 'mk-b-why', D.blockedWhy)));
      needs.push(card);
    }
    if (m.kept.length) {
      const card = bCard(null, el('b', null, C.kept));
      card.append(sub(C.keptSub(m.kept.length)));
      const list = el('div', 'mk-b-kept');
      for (const s of m.kept) {
        const r = el('div', 'mk-b-krow');
        const name = el('div', 'mk-b-kname');
        name.append(el('span', null, s.name), sub(C.keptLine(s.held)));
        if (s.choice !== 'keep') name.append(sub(C.checked(s.check), 'mk-b-will'));
        if (s.choice === 'overwrite' && s.lib) name.append(draft(sub(s.lib.what, 'mk-b-will')));
        r.append(name, choiceSeg(s));
        list.append(r);
      }
      card.append(list);
      needs.push(card);
    }
    if (needs.length) {
      const well = el('section', 'mk-b-well');
      well.append(draft(el('h3', 'mk-b-wtitle', D.needs)), ...needs);
      body.push(well);
    }
    // 2 · This update writes.
    const writes = el('section', 'mk-b-writes');
    const head = el('div', 'mk-b-whead');
    head.append(draft(el('h3', 'mk-b-wtitle', D.writes)));
    if (!m.fresh) head.append(sub(C.lead));
    writes.append(head);
    const list = el('div', 'mk-b-steps');
    if (m.fresh) list.append(stepRow(S.setup, C.setup, C.setupSub, null, () => { S.setup = !S.setup; }));
    list.append(stepRow(S.theme, C.theme, C.themeSub, m.themeCurrent ? tag(C.themeCurrent) : null, () => { S.theme = !S.theme; }));
    // Components: no tick of its own; its status says how many sets run, and its inset lists the sets.
    let detail = null;
    if (m.queue.length) {
      detail = el('div', 'mk-b-inset');
      const h = el('div', 'mk-b-ihead');
      h.append(el('b', null, C.toAdd), m.queue.length >= 2 ? btn('p3-btn-ghost mk-b-mini', C.removeAll, () => { S.queue = []; }) : '');
      detail.append(h, sub(C.toAddSub(m.queue.length)));
      for (const q of m.queue) {
        const r = el('div', 'mk-b-irow');
        r.append(el('span', 'mk-b-iname', q.name));
        if (q.page) r.append(el('span', 'p3-sub', C.page(q.page)));
        const x = btn('p3-btn-ghost p3-btn-icon mk-b-x', null, () => { S.queue = S.queue.filter((id) => id !== q.id); });
        x.setAttribute('aria-label', C.removeSet(q.name));
        x.append(ico('x'));
        r.append(x);
        detail.append(r);
      }
      if (m.also.length) detail.append(sub(C.alsoAdds(m.also)));
    } else if (m.fresh) {
      detail = el('div', 'mk-b-inset');
      detail.append(el('b', null, C.toAdd), sub(C.queueFresh(38)), btn('p3-btn-page mk-b-addall', C.addAll(38), () => { S.queue = QUEUE.map((q) => q.id); }));
    } else if (m.due.length) {
      detail = el('div', 'mk-b-inset');
      detail.append(el('b', null, C.due), sub(C.dueSub(m.due.length)));
      for (const d of m.due) {
        const r = el('div', 'mk-b-drow');
        const text = el('span', 'p3-check-text mk-b-dtext');
        text.append(el('span', 'mk-b-iname', d.name), tag(d.why));
        r.append(tick(true, text, () => {}));
        const line = d.line === 'checking' ? C.checkingSet : d.line ? C.checked(d.line) : '';
        if (line) r.append(sub(line, 'mk-b-dline'));
        detail.append(r);
      }
    }
    const runN = m.queue.length + m.keptRun.length + (m.waiting ? 0 : m.due.length);
    // While the check is out the due sets are not counted as running yet: the chip says how many are due.
    const compEnd = draft(tag(m.waiting ? D.dueN(m.due.length) : runN ? D.willRun(runN) : m.allCurrent ? C.themeCurrent : D.noneDue));
    const compLine = m.allCurrent ? D.allCurrent : null;
    const comp = stepRow(runN > 0, C.components, compLine, compEnd, null, detail);
    if (m.allCurrent) comp.querySelector('.mk-b-sline').dataset.draft = '';
    list.append(comp);
    list.append(stepRow(S.guides, C.guides, C.guidesSub, null, () => { S.guides = !S.guides; }));
    writes.append(list);
    if (m.saves) writes.append(sub(C.saves, 'mk-b-saves'));
    body.push(writes);
    const foot = [];
    if (m.libN) foot.push(libCallout(m));
    foot.push(footRow(m));
    return { body, foot };
  },
  clean: () => {
    const w = el('section', 'mk-b-writes');
    w.append(el('p', 'p3-upd-summary mk-b-cleanline', C.cleanNone));
    return { body: [sub(C.cleanLead, 'mk-b-lead'), w], foot: cleanDefault().foot };
  },
};
mount(DIRECTION_B);
