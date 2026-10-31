/**
 * The guides' markdown, drawn as pages (#3176, owner decision Q3176.3 A). `docs/public/guides/<name>.md` stays the
 * canonical file, which agents, `llms.txt` and GitHub read; `guides/<name>.html` is drawn from it on request by the
 * dev server (`docs-route.mjs`) and written by the site build (`build-site.mjs`). Nothing generated is committed.
 *
 * No dependency: the renderer covers the subset the guides use, and nothing more. Headings (`#`–`###`), paragraphs,
 * `-` and `1.` lists, tables, `**bold**`, `*italic*`, `` `code` ``, links, and two line shapes of their own:
 *   · `> text` is a message the plugin shows, labeled "Plugin message" (Q3176.4 A: no callout syntax);
 *   · `*[Screenshot placeholder: what it shows.]*` is a captioned frame until the image lands (Q3176.5 A).
 * HTML comments (the `src:` citations) are dropped: they stay in the source, where a gate can read them.
 * Anything outside the subset comes out as text, so `test-docs-route.ts` sees it as markdown left on the page.
 *
 * The page around the article is `docs/public/guides/_page.html`, and every string the renderer adds comes from it,
 * the page's `{{slot}}`s and its `<!-- part:name -->` fragments alike, so all of them sit in the US-English and
 * voice scans. The parts are cut out of the page before it is filled.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A heading's anchor, the way GitHub makes it, so `file.md#anchor` links keep working on the page. */
export const slug = (text) => text.toLowerCase().replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot);/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-');

/** A link to a guide's `.md` points at its page; every other link is left as written. */
const href = (u) => /^[\w-]+\.md(#|$)/.test(u) ? u.replace(/\.md(?=#|$)/, '.html') : u;

const inline = (s) => {
  const code = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `\0${code.push(`<code>${esc(c)}</code>`) - 1}\0`);
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${href(u)}">${t}</a>`)
    // Bold may hold an italic span, `**Build *Name***`, so the closing `**` is the one after it, not inside `***`.
    .replace(/\*\*((?:[^*]|\*[^*\s][^*]*\*)+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?![\w*])/g, '$1<em>$2</em>')
    .replace(/\0(\d+)\0/g, (_, i) => code[+i]);
};
const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));

const fill = (html, slots) => html.replace(/\{\{(\w+)\}\}/g, (_, k) => slots[k] ?? '');

/** The template's `<!-- part:name -->…<!-- /part -->` fragments, and the page with them cut out. */
const parts = (template) => {
  const found = {};
  const page = template.replace(/<!-- part:([\w-]+) -->([\s\S]*?)<!-- \/part -->\n?/g, (_, k, html) => { found[k] = html; return ''; });
  return { page, part: (k, slots) => fill(found[k] ?? '', slots) };
};

/** One guide's markdown as `{ title, html, headings }`: the article's HTML and its `##` / `###` headings. `part`
 *  draws the template's fragments: `shot` and `message`. */
export const renderMarkdown = (md, part) => {
  const lines = md.replace(/<!--[\s\S]*?-->/g, '').split('\n').map((l) => l.trimEnd());
  const out = [];
  const headings = [];
  let title = '';
  for (let i = 0; i < lines.length;) {
    const l = lines[i];
    let m;
    if (!l.trim()) { i++; continue; }
    if ((m = /^(#{1,3}) (.+)$/.exec(l))) {
      const level = m[1].length, text = inline(m[2]);
      if (level === 1) { title = text; out.push(`<h1>${text}</h1>`); } else {
        const id = slug(text);
        headings.push({ level, id, text });
        out.push(`<h${level} id="${id}">${text}</h${level}>`);
      }
      i++;
    } else if ((m = /^\*\[Screenshot placeholder: (.+)\]\*$/.exec(l))) {
      const caption = inline(m[1][0].toUpperCase() + m[1].slice(1));
      out.push(part('shot', { label: caption.replace(/<[^>]+>/g, ''), text: caption }));
      i++;
    } else if (l.startsWith('|') && /^\|[\s|:-]+\|$/.test(lines[i + 1] ?? '')) {
      const head = cells(l);
      const rows = [];
      for (i += 2; lines[i]?.startsWith('|'); i++) rows.push(cells(lines[i]));
      out.push(`<div class="tbl"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else if (l.startsWith('> ')) {
      const quote = [];
      for (; lines[i]?.startsWith('> '); i++) quote.push(lines[i].slice(2));
      out.push(part('message', { text: inline(quote.join(' ')) }));
    } else if ((m = /^(-|\d+\.) /.exec(l))) {
      const tag = m[1] === '-' ? 'ul' : 'ol';
      const items = [];
      for (; i < lines.length && lines[i].trim(); i++) {
        const item = /^(?:-|\d+\.) (.*)$/.exec(lines[i]);
        if (item) items.push(item[1]); else items[items.length - 1] += ` ${lines[i].trim()}`;
      }
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
    } else {
      const para = [lines[i++].trim()];
      for (; i < lines.length && lines[i].trim() && !/^(#{1,3} |\||> |-\s|\d+\. |\*\[Screenshot placeholder)/.test(lines[i]); i++) para.push(lines[i].trim());
      out.push(`<p>${inline(para.join(' '))}</p>`);
    }
  }
  return { title, html: out.join('\n'), headings };
};

/** The guides in `index.md`'s order, `{ name, title }`, then the reference pages its last line links. */
export const guideOrder = (guidesDir) => {
  const index = readFileSync(join(guidesDir, 'index.md'), 'utf8');
  const guides = [...index.matchAll(/^\d+\. \[([^\]]+)\]\(([\w-]+)\.md\)/gm)].map((m) => ({ name: m[2], title: m[1] }));
  const reference = [...index.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter((l) => !/^\d+\. /.test(l)).join('\n').matchAll(/\[([^\]]+)\]\(([\w-]+)\.md\)/g)]
    .map((m) => ({ name: m[2], title: m[1][0].toUpperCase() + m[1].slice(1) }));
  return { guides, reference };
};

/** The page `guides/<name>.html`, or null when `guides/<name>.md` does not exist. */
export const renderGuide = (guidesDir, name) => {
  const file = join(guidesDir, `${name}.md`);
  if (!/^[\w-]+$/.test(name) || name.startsWith('_') || !existsSync(file)) return null;
  const { page: template, part } = parts(readFileSync(join(guidesDir, '_page.html'), 'utf8'));
  const { title, html, headings } = renderMarkdown(readFileSync(file, 'utf8'), part);
  const { guides, reference } = guideOrder(guidesDir);
  const link = (g, n) => `<li><a href="${g.name}.html"${g.name === name ? ' aria-current="page"' : ''}><span>${n}</span><span>${esc(g.title)}</span></a></li>`;
  const at = guides.findIndex((g) => g.name === name);
  const prev = at > 0 ? guides[at - 1] : null, next = at >= 0 && at < guides.length - 1 ? guides[at + 1] : null;
  const h2 = headings.filter((h) => h.level === 2);
  const plain = title.replace(/<[^>]+>/g, '');
  const slots = {
    title: plain,
    crumb: part(name === 'index' ? 'crumb-index' : 'crumb-guide', { text: plain }),
    guides: guides.map((g, n) => link(g, n + 1)).join(''),
    reference: reference.map((g) => link(g, '')).join(''),
    article: html,
    prev: prev ? part('prev', { href: `${prev.name}.html`, text: esc(prev.title) }) : '',
    next: next ? part('next', { href: `${next.name}.html`, text: esc(next.title) }) : '',
    toc: h2.length > 1 ? h2.map((h) => `<li><a href="#${h.id}">${h.text}</a></li>`).join('') : '',
    source: `${name}.md`,
  };
  let page = template;
  if (!slots.prev && !slots.next) page = page.replace(/<!-- pager -->[\s\S]*?<!-- \/pager -->\n?/, '');
  if (!slots.toc) page = page.replace(/<!-- toc -->[\s\S]*?<!-- \/toc -->\n?/, '');
  return fill(page.replace(/<!--[\s\S]*?-->\n?/g, ''), slots);
};
