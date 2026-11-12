// Direction A · Cards on gray. The body takes the levers panel's gray, and each step of the run is a white card on it,
// as Color's sections (`.p3-lsec`) are. Inside the Components card, Due, Kept edits and To add are groups split by a
// hairline at the group rhythm, as Interactive's button sets split their state groups (`.p3-icol`). The run order stays
// the order on screen. The last run's warning is the Style guide's boxed note (`.p3-sg-warn`) at the top; the library
// changes callout sits in the foot, over the button it qualifies.
const cardHead = (title, end, check) => {
  const head = el('div', 'mk-a-head');
  head.append(check ?? el('h3', 'mk-a-title', title));
  if (end) head.append(end);
  return head;
};
const stepCard = (key, on, title, line, end, toggle) => {
  const card = el('section', 'p3-lsec mk-a-card');
  card.dataset.on = String(on);
  const label = el('span', 'mk-a-title', title);
  card.append(cardHead(title, end, tick(on, label, toggle, 'mk-a-tick')), sub(line, 'mk-a-line'));
  return card;
};
const group = (title, line, end) => {
  const g = el('div', 'mk-a-group');
  const h = el('div', 'mk-a-ghead');
  h.append(el('h4', 'mk-a-gtitle', title));
  if (end) h.append(end);
  g.append(h);
  if (line) g.append(sub(line));
  return g;
};
const lastRunNote = (m) => {
  const box = el('section', 'p3-sg-note p3-sg-warn mk-a-run');
  box.append(ico('warn'));
  const t = el('div', 'mk-a-runtext');
  t.append(el('span', 'mk-a-runcap', D.lastRun), draft(el('b', null, m.lastRun.what)), draft(sub(D.toCheckSub)));
  const list = el('ul', 'mk-a-runlist');
  for (const s of m.lastRun.sets) { const li = el('li'); li.append(el('b', null, s.name), draft(sub(s.line))); list.append(li); }
  t.append(list);
  box.append(t);
  return box;
};
const DIRECTION_A = {
  key: 'a',
  update: (m) => {
    const body = [];
    if (m.lastRun) body.push(lastRunNote(m));
    body.push(sub(m.fresh ? C.leadFresh : C.lead, 'mk-a-lead'));
    if (m.fresh) body.push(stepCard('setup', S.setup, C.setup, C.setupSub, null, () => { S.setup = !S.setup; }));
    body.push(stepCard('theme', S.theme, C.theme, C.themeSub, m.themeCurrent ? tag(C.themeCurrent) : null, () => { S.theme = !S.theme; }));
    // Components: one card, its groups split by hairlines.
    const comp = el('section', 'p3-lsec mk-a-card mk-a-comp');
    const counts = [m.queue.length && D.addN(m.queue.length), m.due.length && D.dueN(m.due.length), m.blocked.length && D.blockedN(m.blocked.length), m.kept.length && D.keptN(m.kept.length)];
    const summary = D.compSummary(counts) || D.noneDue;
    comp.append(cardHead(C.components, draft(tag(summary))));
    if (m.allCurrent) comp.append(draft(sub(D.allCurrent)));
    if (m.queue.length) {
      const g = group(C.toAdd, C.toAddSub(m.queue.length), m.queue.length >= 2 ? btn('p3-btn-ghost mk-a-mini', C.removeAll, () => { S.queue = []; }) : null);
      const rows = el('div', 'mk-a-rows');
      for (const q of m.queue) {
        const r = el('div', 'mk-a-row');
        r.append(el('span', 'mk-a-name', q.name));
        if (q.page) r.append(el('span', 'p3-cp-where mk-a-where', C.page(q.page)));
        const x = btn('p3-btn-ghost p3-btn-icon mk-a-x', null, () => { S.queue = S.queue.filter((id) => id !== q.id); });
        x.setAttribute('aria-label', C.removeSet(q.name));
        x.append(ico('x'));
        r.append(x);
        rows.append(r);
      }
      g.append(rows);
      if (m.also.length) g.append(sub(C.alsoAdds(m.also)));
      comp.append(g);
    } else if (m.fresh) {
      const g = group(C.toAdd, C.queueFresh(38));
      g.append(btn('p3-btn-page mk-a-addall', C.addAll(38), () => { S.queue = QUEUE.map((q) => q.id); }));
      comp.append(g);
    }
    if (m.due.length || m.blocked.length) {
      const g = group(C.due, m.due.length ? C.dueSub(m.due.length) : null);
      const rows = el('div', 'mk-a-rows');
      for (const d of m.due) {
        const r = el('div', 'mk-a-setrow');
        const text = el('span', 'p3-check-text mk-a-checktext');
        text.append(el('span', 'mk-a-name', d.name), tag(d.why));
        r.append(tick(true, text, () => {}));
        const line = d.line === 'checking' ? C.checkingSet : d.line ? C.checked(d.line) : '';
        if (line) r.append(sub(line, 'mk-a-setline'));
        rows.append(r);
      }
      for (const b of m.blocked) {
        const r = el('div', 'mk-a-blocked');
        r.append(ico('lock'));
        const t = el('div', 'mk-a-btext');
        const top = el('div', 'mk-a-btop');
        top.append(el('b', 'mk-a-name', b.name), tag(b.why));
        t.append(top, draft(el('p', 'mk-a-bwhy', `${D.blocked}. ${D.blockedWhy}`)));
        r.append(t);
        rows.append(r);
      }
      g.append(rows);
      comp.append(g);
    }
    if (m.kept.length) {
      const g = group(C.kept, C.keptSub(m.kept.length));
      const rows = el('div', 'mk-a-rows');
      for (const s of m.kept) {
        const r = el('div', 'mk-a-kept');
        const top = el('div', 'mk-a-ktop');
        top.append(el('span', 'mk-a-name', s.name), choiceSelect(s));
        r.append(top, sub(C.keptLine(s.held), 'mk-a-setline'));
        if (s.choice !== 'keep') r.append(sub(C.checked(s.check), 'mk-a-setline mk-a-will'));
        if (s.choice === 'overwrite' && s.lib) r.append(draft(sub(s.lib.what, 'mk-a-setline mk-a-will')));
        rows.append(r);
      }
      g.append(rows);
      comp.append(g);
    }
    if (m.saves) comp.append(sub(C.saves, 'mk-a-saves'));
    body.push(comp);
    body.push(stepCard('guides', S.guides, C.guides, C.guidesSub, null, () => { S.guides = !S.guides; }));
    const foot = [];
    if (m.libN) foot.push(libCallout(m));
    foot.push(footRow(m));
    return { body, foot };
  },
  clean: () => {
    const card = el('section', 'p3-lsec mk-a-card');
    card.append(el('p', 'p3-upd-summary', C.cleanNone));
    return { body: [sub(C.cleanLead, 'mk-a-lead'), card], foot: cleanDefault().foot };
  },
};
mount(DIRECTION_A);
