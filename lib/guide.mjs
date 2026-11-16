// The site build.mjs writes from the guide: a page in guide/ for each file of guidelines/, guide/guide.css, and the root
// index.html, all committed and published by .github/workflows/pages.yml (ADR-1010). Node.js built-ins only.
import { posix } from 'node:path';

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

/** Rewrites a link of a guide source, which sits in guidelines/, for the page, which sits in guide/. */
export function guideLink(target) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) return target;
  const hash = target.indexOf('#');
  const path = hash < 0 ? target : target.slice(0, hash);
  const suffix = hash < 0 ? '' : target.slice(hash);
  const repo = posix.normalize(posix.join('guidelines', path));
  if (repo.startsWith('../') || repo.startsWith('/')) throw new Error(`${target} leaves the repository`);
  if (/^guidelines\/[^/]+\.md$/.test(repo)) return pageName(repo.slice(11)) + suffix;
  if (!repo.endsWith('/') && SITE_FOLDERS.includes(repo.split('/')[0])) return `../${repo}${suffix}`;
  return `${REPOSITORY}/${repo.endsWith('/') ? 'tree' : 'blob'}/main/${repo.replace(/\/$/, '')}${suffix}`;
}
