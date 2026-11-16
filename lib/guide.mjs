// The site build.mjs writes from the guide: a page in guide/ for each file of guidelines/, guide/guide.css, and the root
// index.html, all committed and published by .github/workflows/pages.yml (ADR-1010). Node.js built-ins only.
import { posix } from 'node:path';
import { escapeHtml, renderMarkdown } from './markdown.mjs';

/** The folders of the repository the site publishes, so a link into one keeps its relative path. */
export const SITE_FOLDERS = ['brace', 'css', 'fonts', 'guide', 'icons', 'logo', 'specimens', 'tokens'];

/** The repository's address on GitHub, where a link to a file the site does not publish goes. */
export const REPOSITORY = 'https://github.com/NCodeGroup/brand';

/** The Content-Security-Policy every published page states in a <meta> element. */
export const META_CSP = "default-src 'self'; base-uri 'none'; form-action 'self'";

/** The file name of the page for a guide source: README.md is index.html, NN-name.md is NN-name.html. */
export function pageName(source) {
  return source === 'README.md' ? 'index.html' : source.replace(/\.md$/, '.html');
}

/** The folder of the guide's Markdown sources. */
const SOURCE_FOLDER = 'guidelines';

/** Rewrites a link of a guide source, which sits in guidelines/, for the page, which sits in guide/. */
export function guideLink(target) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) return target;
  const hash = target.indexOf('#');
  const path = hash < 0 ? target : target.slice(0, hash);
  const suffix = hash < 0 ? '' : target.slice(hash);
  const repo = posix.normalize(posix.join(SOURCE_FOLDER, path));
  if (repo.startsWith('../') || repo.startsWith('/')) throw new Error(`${target} leaves the repository`);
  if (posix.dirname(repo) === SOURCE_FOLDER && repo.endsWith('.md')) return pageName(posix.basename(repo)) + suffix;
  if (!repo.endsWith('/') && SITE_FOLDERS.includes(repo.split('/')[0])) return `../${repo}${suffix}`;
  return `${REPOSITORY}/${repo.endsWith('/') ? 'tree' : 'blob'}/main/${repo.replace(/\/$/, '')}${suffix}`;
}

/** The key of the previous or next page at the foot of a page, in the markup of specimens/docs.html's .pagenav. */
function pageKey(direction, page) {
  const href = escapeHtml(page.file);
  const title = escapeHtml(page.title);
  const text = `<span><span class="label">${direction === 'prev' ? 'Previous' : 'Next'}</span><span class="pagenav__title">${title}</span></span>`;
  if (direction === 'prev') {
    return [
      `      <a class="key pagenav__key pagenav__key--prev" href="${href}">`,
      '        <svg class="icon icon--lg" aria-hidden="true"><use href="../icons/sprite.svg#i-arrow-left"/></svg>',
      `        ${text}`,
      '      </a>',
    ].join('\n');
  }
  return [
    `      <a class="key pagenav__key pagenav__key--next" href="${href}">`,
    `        ${text}`,
    '        <svg class="icon icon--lg" aria-hidden="true"><use href="../icons/sprite.svg#i-arrow-right"/></svg>',
    '      </a>',
  ].join('\n');
}

/** The nav list of the guide, one line per page, with the current page marked. */
function navList(pages, current) {
  return pages.map((page) => {
    const title = escapeHtml(page.title);
    return page === current
      ? `        <li><a class="navkey" href="${page.file}" aria-current="page"><span>${title}</span><span class="lamp" aria-hidden="true"></span></a></li>`
      : `        <li><a class="navkey" href="${page.file}"><span>${title}</span></a></li>`;
  }).join('\n');
}

/** The previous and next page keys at the foot of a page. */
function pageNav(pages, index) {
  const lines = ['    <nav class="pagenav" aria-label="Previous and next page">'];
  if (index > 0) lines.push(pageKey('prev', pages[index - 1]));
  if (index < pages.length - 1) lines.push(pageKey('next', pages[index + 1]));
  lines.push('    </nav>');
  return lines.join('\n');
}

/** The "On this page" list of a page's level-2 headings, or '' when it has none. */
function tableOfContents(headings) {
  const items = headings.filter((heading) => heading.level === 2);
  if (items.length === 0) return '';
  return [
    '  <aside class="docs__toc" aria-labelledby="toc-title">',
    '    <h2 class="label" id="toc-title">On this page</h2>',
    '    <ol class="toc">',
    ...items.map((heading) => `      <li><a class="toc__link" href="#${heading.id}"><span class="lamp lamp--off" aria-hidden="true"></span>${heading.html}</a></li>`),
    '    </ol>',
    '  </aside>',
  ].join('\n');
}

/**
 * Returns the site's files as a Map from path (from the repository root) to text: a page in guide/ for each of the
 * sources, guide/guide.css and the root index.html. sources is [name, markdown][] for the files of guidelines/;
 * lockup is { viewBox, d }; page, index and css are the texts of src/guide/page.html, src/guide/index.html and
 * src/guide/guide.css.
 */
export function guideFiles({ sources, version, lockup, page, index, css }) {
  const ordered = [...sources].sort(([a], [b]) => {
    if (a === 'README.md') return b === 'README.md' ? 0 : -1;
    if (b === 'README.md') return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const pages = ordered.map(([name, markdown]) => {
    let rendered;
    try {
      rendered = renderMarkdown(markdown, { link: guideLink });
    } catch (error) {
      throw new Error(`${SOURCE_FOLDER}/${name}: ${error.message}`);
    }
    return { name, file: pageName(name), title: rendered.title, html: rendered.html, headings: rendered.headings };
  });

  const files = new Map();
  pages.forEach((current, at) => {
    const values = {
      source: current.name,
      title: escapeHtml(current.title),
      page: current.file,
      version,
      'lockup-viewbox': lockup.viewBox,
      'lockup-d': lockup.d,
      content: current.html,
      nav: navList(pages, current),
      pagenav: pageNav(pages, at),
      toc: tableOfContents(current.headings),
    };
    const text = page.replace(/\{\{([a-z-]+)\}\}/g, (match, key) => {
      if (!Object.hasOwn(values, key)) throw new Error(`src/guide/page.html has no value for {{${key}}}`);
      return values[key];
    });
    files.set(`guide/${current.file}`, text);
  });
  files.set('guide/guide.css', `/* NCode Brand ${version}: guide/guide.css, copied by build.mjs from src/guide/guide.css; edit that file. Apache-2.0. */\n${css}`);
  files.set('index.html', index);
  return files;
}
