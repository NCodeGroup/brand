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

/** The text of an HTML fragment: its tags removed and its escapes decoded. */
export function plainText(html) {
  return html.replace(/<[^>]*>/g, '').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&amp;', '&');
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
