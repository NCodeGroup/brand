// Renders the Markdown the guide in guidelines/ is written in to HTML, for build.mjs's pages in guide/. It renders that
// subset alone and throws on a construct outside it. Node.js built-ins only.

const HTML_TAG = /^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>/;
const ESCAPABLE = '\\`*_[]()#+-.!|<>{}';

/** Escapes the three characters that start HTML in text: `&`, `<` and `>`. */
export function escapeHtml(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Escapes text for a double-quoted attribute value. */
export function escapeAttribute(text) {
  return escapeHtml(text).replaceAll('"', '&quot;');
}

/** The text of an HTML fragment: its tags removed, until none is left, and its escapes decoded. */
export function plainText(html) {
  let text = String(html);
  for (let previous; previous !== text;) {
    previous = text;
    text = text.replace(/<[^<>]*>/g, '');
  }
  return text.replace(/[<>]/g, '').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&amp;', '&');
}

/** GitHub's heading id for a heading's text. */
export function slugify(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replaceAll(' ', '-');
}

/** The index of the `]` that matches the `[` before `from`, or -1. */
function closingBracket(text, from) {
  let depth = 1;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') i++;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return i;
  }
  return -1;
}

/** The `(target)` that starts at `at`, as `{ target, end }`, or null when none starts there. */
function linkTarget(text, at) {
  if (text[at] !== '(') return null;
  const m = /^\(([^\s)]+)\)/.exec(text.slice(at));
  return m ? { target: m[1], end: at + m[0].length } : null;
}

/** Renders one run of inline Markdown to HTML; `link` maps the target of every link and image. */
export function renderInline(text, { link = (target) => target } = {}) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && i + 1 < text.length && ESCAPABLE.includes(text[i + 1])) {
      out += escapeHtml(text[i + 1]);
      i += 2;
    } else if (c === '`') {
      let n = 1;
      while (text[i + n] === '`') n++;
      let j = i + n;
      let close = -1;
      while (j < text.length) {
        if (text[j] !== '`') { j++; continue; }
        let m = 1;
        while (text[j + m] === '`') m++;
        if (m === n) { close = j; break; }
        j += m;
      }
      if (close < 0) {
        out += text.slice(i, i + n);
        i += n;
      } else {
        let content = text.slice(i + n, close);
        if (content.length > 1 && content.startsWith(' ') && content.endsWith(' ')) content = content.slice(1, -1);
        out += `<code>${escapeHtml(content)}</code>`;
        i = close + n;
      }
    } else if (c === '!' && text[i + 1] === '[') {
      const end = closingBracket(text, i + 2);
      const target = end < 0 ? null : linkTarget(text, end + 1);
      if (target) {
        out += `<img src="${escapeAttribute(link(target.target))}" alt="${escapeAttribute(text.slice(i + 2, end))}">`;
        i = target.end;
      } else {
        out += '!';
        i++;
      }
    } else if (c === '[') {
      const end = closingBracket(text, i + 1);
      const target = end < 0 ? null : linkTarget(text, end + 1);
      if (target) {
        out += `<a class="link" href="${escapeAttribute(link(target.target))}">${renderInline(text.slice(i + 1, end), { link })}</a>`;
        i = target.end;
      } else {
        out += '[';
        i++;
      }
    } else if (c === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end < 0) {
        out += '**';
        i += 2;
      } else {
        out += `<strong>${renderInline(text.slice(i + 2, end), { link })}</strong>`;
        i = end + 2;
      }
    } else if (c === '<') {
      const m = HTML_TAG.exec(text.slice(i));
      if (m) {
        out += m[0];
        i += m[0].length;
      } else {
        out += '&lt;';
        i++;
      }
    } else if (c === '&') {
      out += '&amp;';
      i++;
    } else if (c === '>') {
      out += '&gt;';
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

const COMMENT = /^\s*<!--(?:(?!-->)[\s\S])*-->\s*$/;
const COMMENT_OPEN = /^\s*<!--/;
const FENCE_OPEN = /^(\s*)```(\w*)\s*$/;
const FENCE_CLOSE = /^\s*```\s*$/;
const HEADING = /^(#{1,6}) (.+)$/;
const TABLE_DELIMITER = /^\|(\s*:?-+:?\s*\|)+\s*$/;
const LIST_MARKER = /^(- |\d+\. )/;
const PARAGRAPH_LIST_MARKER = /^(- |1\. )/;
const BLOCKQUOTE = /^\s*>/;
const THEMATIC_BREAK = /^\s*([-*_])(\s*\1){2,}\s*$/;
const INDENTED = /^ {4,}/;

/** Whether a line is empty or holds only spaces. */
function isBlank(line) {
  return /^\s*$/.test(line);
}

/** The error for a construct the guide's Markdown does not have. */
function unsupported(line, what) {
  return new Error(`cannot render "${line}": the guide's Markdown has no ${what}`);
}

/** Reads a fenced code block that opens at `lines[at]`, as `{ html, next }`. */
function readFence(lines, at) {
  const indent = FENCE_OPEN.exec(lines[at])[1].length;
  const body = [];
  let i = at + 1;
  while (i < lines.length && !FENCE_CLOSE.test(lines[i])) {
    body.push(lines[i].replace(new RegExp(`^ {0,${indent}}`), ''));
    i++;
  }
  if (i >= lines.length) throw new Error('unclosed code fence');
  const spans = body.map((line) => `<span class="line">${escapeHtml(line)}</span>`).join('\n');
  return { html: `<div class="screen wide"><pre><code>${spans}</code></pre></div>`, next: i + 1 };
}

/** Reads an ATX heading line, recording it in `state`, as `{ html, next }`. */
function readHeading(match, at, link, state) {
  const level = match[1].length;
  const inner = renderInline(match[2], { link });
  const plain = plainText(inner);
  const base = slugify(plain);
  let id = base;
  for (let n = 1; state.ids.has(id); n++) id = `${base}-${n}`;
  state.ids.add(id);
  state.headings.push({ level, id, text: plain, html: inner });
  if (level === 1 && state.title === null) state.title = plain;
  return { html: `<h${level} id="${id}">${inner}</h${level}>`, next: at + 1 };
}

/** The cells of a pipe-table row. */
function splitRow(row) {
  return row.split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.trim().replaceAll('\\|', '|'));
}

/** Reads a pipe table whose header is `lines[at]`, as `{ html, next }`. */
function readTable(lines, at, link) {
  const head = splitRow(lines[at]);
  const right = splitRow(lines[at + 1]).map((cell) => cell.endsWith(':') && !cell.startsWith(':'));
  const attr = (column) => (right[column] ? ' class="num"' : '');
  const rows = [];
  let i = at + 2;
  while (i < lines.length && lines[i].startsWith('|')) {
    const cells = splitRow(lines[i]).map((cell, column) => `<td${attr(column)}>${renderInline(cell, { link })}</td>`);
    rows.push(`<tr>${cells.join('')}</tr>`);
    i++;
  }
  const heads = head.map((cell, column) => `<th scope="col"${attr(column)}>${renderInline(cell, { link })}</th>`);
  const html = [
    '<div class="tableframe wide"><table class="table">',
    `<thead><tr>${heads.join('')}</tr></thead>`,
    '<tbody>',
    ...rows,
    '</tbody>',
    '</table></div>',
  ].join('\n');
  return { html, next: i };
}

/** Reads a list that starts at `lines[at]`, as `{ html, next }`. */
function readList(lines, at, link) {
  const ordered = !lines[at].startsWith('- ');
  const first = /^\d+/.exec(lines[at]);
  const items = [];
  let i = at;
  while (i < lines.length) {
    const marker = LIST_MARKER.exec(lines[i]);
    if (!marker || marker[1].startsWith('-') === ordered) break;
    const width = marker[1].length;
    const indent = ' '.repeat(width);
    const body = [lines[i].slice(width)];
    i++;
    while (i < lines.length) {
      if (lines[i].startsWith(indent)) {
        body.push(lines[i].slice(width));
        i++;
        continue;
      }
      if (!isBlank(lines[i])) break;
      let j = i;
      while (j < lines.length && isBlank(lines[j])) j++;
      if (j >= lines.length || !lines[j].startsWith(indent)) break;
      while (i < j) {
        body.push('');
        i++;
      }
    }
    const blocks = readBlocks(body, link, newState());
    items.push(blocks.length === 1 && /^<p>[\s\S]*<\/p>$/.test(blocks[0])
      ? `<li>${blocks[0].slice(3, -4)}</li>`
      : `<li>${blocks.join('\n')}</li>`);
    let j = i;
    while (j < lines.length && isBlank(lines[j])) j++;
    if (j < lines.length) {
      const next = LIST_MARKER.exec(lines[j]);
      if (next && next[1].startsWith('-') !== ordered) i = j;
    }
  }
  const tag = ordered ? 'ol' : 'ul';
  const open = ordered && Number(first[0]) !== 1 ? `<ol start="${Number(first[0])}">` : `<${tag}>`;
  return { html: [open, ...items, `</${tag}>`].join('\n'), next: i };
}

/** Whether a line ends a paragraph: it starts a block of another kind. */
function interruptsParagraph(line) {
  return isBlank(line) || HEADING.test(line) || FENCE_OPEN.test(line) || line.startsWith('|')
    || COMMENT_OPEN.test(line) || PARAGRAPH_LIST_MARKER.test(line);
}

/** Reads a paragraph that starts at `lines[at]`, as `{ html, next }`. */
function readParagraph(lines, at, link) {
  let i = at + 1;
  while (i < lines.length && !interruptsParagraph(lines[i])) i++;
  return { html: `<p>${renderInline(lines.slice(at, i).join('\n'), { link })}</p>`, next: i };
}

/** The document-wide state the heading rule fills in. */
function newState() {
  return { ids: new Set(), headings: [], title: null };
}

/** Reads every block of `lines` and returns the rendered blocks. */
function readBlocks(lines, link, state) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let read;
    let match;
    if (isBlank(line) || COMMENT.test(line)) {
      i++;
      continue;
    } else if (FENCE_OPEN.test(line)) {
      read = readFence(lines, i);
    } else if ((match = HEADING.exec(line))) {
      read = readHeading(match, i, link, state);
    } else if (line.startsWith('|') && i + 1 < lines.length && TABLE_DELIMITER.test(lines[i + 1])) {
      read = readTable(lines, i, link);
    } else if (LIST_MARKER.test(line)) {
      read = readList(lines, i, link);
    } else if (COMMENT_OPEN.test(line)) {
      throw unsupported(line, 'HTML comment that spans lines or shares its line');
    } else if (BLOCKQUOTE.test(line)) {
      throw unsupported(line, 'blockquote');
    } else if (THEMATIC_BREAK.test(line)) {
      throw unsupported(line, 'thematic break');
    } else if (INDENTED.test(line)) {
      throw unsupported(line, 'indented code block');
    } else {
      read = readParagraph(lines, i, link);
    }
    blocks.push(read.html);
    i = read.next;
  }
  return blocks;
}

/**
 * Renders a page of the guide's Markdown. Returns the HTML, the text of the first level-1 heading (`''` without one)
 * and every heading as `{ level, id, text, html }`; `link` maps the target of every link and image.
 */
export function renderMarkdown(text, { link = (target) => target } = {}) {
  const state = newState();
  const blocks = readBlocks(text.split('\n'), link, state);
  return { html: blocks.join('\n'), title: state.title ?? '', headings: state.headings };
}
