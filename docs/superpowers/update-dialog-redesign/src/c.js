// Direction C · Folded step cards. Each step is a white card on the gray, as in A, but folded to one header row: its
// tick, its name, a status chip, and a chevron, as Components' families fold. Only a card that needs a person opens by
// itself (the last run with sets to check, Components with a blocked or kept set, To add on a fresh file). Inside an
// open card, each group is an inset on the fill gray with Palettes' small-capital board title, its rows split by
// hairlines, so a set reads as a table row: name, what holds it, its control at the end.
const openOf = (k, auto) => S.open[k] ?? auto;
const fold = (key, auto, { checkOn, toggle, title, chip, line, content, warn }) => {
  const open = openOf(key, auto);
  const card = el('section', 'mk-c-card');
  card.dataset.open = String(open);
  if (checkOn !== undefined) card.dataset.on = String(checkOn);
  const head = el('div', 'mk-c-head');
  if (warn) { const w = el('span', 'mk-c-mark'); w.append(ico('warn')); head.append(w); }
  if (toggle) head.append(tick(checkOn, el('span', 'mk-c-title', title), toggle, 'mk-c-tick'));
  else head.append(title instanceof Node ? title : el('span', 'mk-c-title mk-c-notick', title));
  if (chip) head.append(chip);
  if (content) {
    const d = btn('p3-btn-ghost p3-btn-icon mk-c-disc', null, () => { S.open[key] = !open; });
    d.setAttribute('aria-expanded', String(open));
    d.setAttribute('aria-label', `${open ? 'Fold' : 'Open'} ${typeof title === 'string' ? title : ''}`.trim());
    d.append(ico('chevr'));
    head.append(d);
  }
  card.append(head);
  if (line && (open || !content)) card.append(sub(line, 'mk-c-line'));
  if (content && open) card.append(...[content].flat());
  return card;
};
const inset = (title, line, end) => {
  const box = el('div', 'mk-c-inset');
  const h = el('div', 'mk-c-ihead');
  h.append(el('h4', 'p3-card-title', title));
  if (end) h.append(end);
  box.append(h);
  if (line) box.append(sub(line, 'mk-c-iline'));
  return box;
};
const DIRECTION_C = {
  key: 'c',
  update: (m) => {
    const body = [sub(m.fresh ? C.leadFresh : C.lead, 'mk-c-lead')];
    if (m.lastRun) {
      const t = el('span', 'mk-c-title mk-c-notick');
      t.append(el('span', 'mk-c-cap', `${D.lastRun} · `), draft(el('span', null, m.lastRun.what)));
      const rows = el('div', 'mk-c-rows');
      for (const s of m.lastRun.sets) { const r = el('div', 'mk-c-row mk-c-row-stack'); r.append(el('b', null, s.name), draft(sub(s.line))); rows.append(r); }
      const lead = draft(sub(D.toCheckSub, 'mk-c-line'));
      const holder = el('div', 'mk-c-inset');
      holder.append(rows);
      body.push(fold('run', true, { title: t, warn: true, content: [lead, holder] }));
    }
    if (m.fresh) body.push(fold('setup', false, { checkOn: S.setup, toggle: () => { S.setup = !S.setup; }, title: C.setup, line: C.setupSub }));
    body.push(fold('theme', false, { checkOn: S.theme, toggle: () => { S.theme = !S.theme; }, title: C.theme, chip: m.themeCurrent ? tag(C.themeCurrent) : null, line: C.themeSub }));
    // Components.
    const parts = [];
    if (m.queue.length) {
      const box = inset(C.toAdd, C.toAddSub(m.queue.length), m.queue.length >= 2 ? btn('p3-btn-ghost mk-c-mini', C.removeAll, () => { S.queue = []; }) : null);
      const rows = el('div', 'mk-c-rows');
      for (const q of m.queue) {
        const r = el('div', 'mk-c-row');
        r.append(el('span', 'mk-c-name', q.name));
        if (q.page) r.append(el('span', 'p3-sub', C.page(q.page)));
        const x = btn('p3-btn-ghost p3-btn-icon mk-c-x', null, () => { S.queue = S.queue.filter((id) => id !== q.id); });
        x.setAttribute('aria-label', C.removeSet(q.name));
        x.append(ico('x'));
        r.append(x);
        rows.append(r);
      }
      box.append(rows);
      if (m.also.length) box.append(sub(C.alsoAdds(m.also), 'mk-c-iline'));
      parts.push(box);
    } else if (m.fresh) {
      const box = inset(C.toAdd, C.queueFresh(38));
      box.append(btn('p3-btn-page mk-c-addall', C.addAll(38), () => { S.queue = QUEUE.map((q) => q.id); }));
      parts.push(box);
    }
    if (m.due.length || m.blocked.length) {
      const box = inset(C.due, m.due.length ? C.dueSub(m.due.length) : null);
      const rows = el('div', 'mk-c-rows');
      for (const d of m.due) {
        const r = el('div', 'mk-c-row mk-c-row-stack');
        const text = el('span', 'p3-check-text mk-c-dtext');
        text.append(el('span', 'mk-c-name', d.name), tag(d.why));
        r.append(tick(true, text, () => {}, 'mk-c-dtick'));
        const line = d.line === 'checking' ? C.checkingSet : d.line ? C.checked(d.line) : '';
        if (line) r.append(sub(line, 'mk-c-dline'));
        rows.append(r);
      }
      for (const b of m.blocked) {
        const r = el('div', 'mk-c-row mk-c-row-stack mk-c-blocked');
        const top = el('div', 'mk-c-btop');
        const n = el('span', 'mk-c-name');
        n.append(ico('lock'), el('b', null, b.name));
        top.append(n, draft(tag(D.blocked)));
        r.append(top, sub(b.why), draft(el('p', 'mk-c-why', D.blockedWhy)));
        rows.append(r);
      }
      box.append(rows);
      parts.push(box);
    }
    if (m.kept.length) {
      const box = inset(C.kept, C.keptSub(m.kept.length));
      const rows = el('div', 'mk-c-rows');
      for (const s of m.kept) {
        const r = el('div', 'mk-c-row mk-c-krow');
        const n = el('div', 'mk-c-kname');
        n.append(el('span', null, s.name), sub(C.keptLine(s.held)));
        if (s.choice !== 'keep') n.append(sub(C.checked(s.check), 'mk-c-will'));
        if (s.choice === 'overwrite' && s.lib) n.append(draft(sub(s.lib.what, 'mk-c-will')));
        r.append(n, choiceSelect(s));
        rows.append(r);
      }
      box.append(rows);
      parts.push(box);
    }
    if (m.allCurrent) parts.push(draft(sub(D.allCurrent, 'mk-c-line')));
    if (m.saves) parts.push(sub(C.saves, 'mk-c-line'));
    const counts = [m.queue.length && D.addN(m.queue.length), m.due.length && D.dueN(m.due.length), m.blocked.length && D.blockedN(m.blocked.length), m.kept.length && D.keptN(m.kept.length)];
    const chip = draft(tag(D.compSummary(counts) || (m.allCurrent ? C.themeCurrent : D.noneDue)));
    const attention = m.blocked.length + m.kept.length + m.queue.length + m.due.length > 0 || m.fresh;
    body.push(fold('comp', attention, { title: C.components, chip, content: parts.length ? parts : null }));
    body.push(fold('guides', false, { checkOn: S.guides, toggle: () => { S.guides = !S.guides; }, title: C.guides, line: C.guidesSub }));
    const foot = [];
    if (m.libN) foot.push(libCallout(m));
    foot.push(footRow(m));
    return { body, foot };
  },
  clean: () => {
    const card = el('section', 'mk-c-card');
    card.append(el('p', 'p3-upd-summary mk-c-cleanline', C.cleanNone));
    return { body: [sub(C.cleanLead, 'mk-c-lead'), card], foot: cleanDefault().foot };
  },
};
mount(DIRECTION_C);
