// Watches the pinned Lucide and font releases for newer ones. Node.js built-ins only.
//   import { chooseAction, issueText, newestEligible, readWatches } from './pin-watch.mjs';
// A lock pins one release of each input: src/icons/lucide.lock.json a Lucide tag, src/fonts/fonts.lock.json one npm
// version of each Fontsource package. A release counts once it is COOLDOWN_DAYS old, and only a version shaped
// <digits>.<digits>.<digits> is a release. Nothing here moves a lock.
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** The days a release must be published before the watch names it. */
export const COOLDOWN_DAYS = 3;

/** The label of the issues the watch keeps. */
export const LABEL = 'pin-update';

/** The [major, minor, patch] numbers of a version shaped <digits>.<digits>.<digits>, or null. */
export function parseVersion(text) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** A negative number, 0 or a positive number as the version a is below, equal to or above the version b. */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}

/** The candidate with the highest version above the pinned one and published at least the days ago, or null. */
export function newestEligible(candidates, pinned, now, days = COOLDOWN_DAYS) {
  if (!parseVersion(pinned)) throw new Error(`can't read the pinned version "${pinned}"`);
  const latest = now.getTime() - days * 86_400_000;
  let newest = null;
  for (const candidate of candidates) {
    if (!parseVersion(candidate.version)) continue;
    if (compareVersions(candidate.version, pinned) <= 0) continue;
    if (candidate.published.getTime() > latest) continue;
    if (!newest || compareVersions(candidate.version, newest.version) > 0) newest = candidate;
  }
  return newest;
}

/** The candidates of GitHub's releases JSON: each release that is not a draft or a prerelease and is shaped x.y.z. */
export function lucideCandidates(releases) {
  return releases
    .filter((r) => !r.draft && !r.prerelease && parseVersion(r.tag_name))
    .map((r) => ({ version: r.tag_name, published: new Date(r.published_at) }));
}

/** The candidates of an npm registry document: each version shaped x.y.z, not deprecated and with a publish time. */
export function npmCandidates(packument) {
  const candidates = [];
  for (const key of Object.keys(packument.versions ?? {})) {
    if (!parseVersion(key)) continue;
    if ('deprecated' in packument.versions[key]) continue;
    if (!packument.time?.[key]) continue;
    candidates.push({ version: key, published: new Date(packument.time[key]) });
  }
  return candidates;
}

/** The two watches of a repository, one per lock, with what each lock pins. */
export function readWatches(root) {
  const readJson = (file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
  const lucide = readJson('src/icons/lucide.lock.json');
  const fonts = readJson('src/fonts/fonts.lock.json');
  return [
    {
      id: 'lucide',
      lock: 'src/icons/lucide.lock.json',
      inputs: [{ name: 'Lucide', kind: 'github-release', repo: 'lucide-icons/lucide', pinned: lucide.version }],
    },
    {
      id: 'fonts',
      lock: 'src/fonts/fonts.lock.json',
      inputs: Object.entries(fonts.families).map(([name, f]) => ({
        name,
        kind: 'npm',
        package: f.package,
        pinned: f.version,
      })),
    },
  ];
}

const HOW_TO = {
  lucide:
    "To take it, copy each icon the lock names from the new tag's `icons/` folder into `src/icons/lucide/`, " +
    "and its `LICENSE` file into `src/icons/LICENSE-Lucide.txt`, then set the lock's version, addresses and " +
    "SHA-256 hashes to match, as its `$description` says. Run `npm run build` and compare each icon that changes " +
    'with the grid in `guidelines/07-icons.md`.',
  fonts:
    "To take it, copy each file the lock names from the new package's tarball into `src/fonts/`, and set the " +
    "family's version, tarball, integrity and SHA-256 hashes to match, as the lock's `$description` says. Run " +
    '`npm run build`, then compare the specimens before and after with `node tools/shoot.mjs`.',
};

const FOOTER =
  'The pin-watch workflow, `.github/workflows/pin-watch.yml`, checks every Monday: it rewrites this issue when a ' +
  'newer release is old enough, and closes it once the lock pins the newest one. A release counts once it is 3 ' +
  'days old, as ADR-0009 in `docs/decisions/project-template/` says.';

/** The title and body of the issue for a watch whose lock is behind: behind is [{ input, release }], never empty. */
export function issueText(watch, behind) {
  const parts = behind.map(({ input, release }) => `${input.name} to ${release.version}`);
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  const lines = behind.map(({ input, release }) => {
    const date = release.published.toISOString().slice(0, 10);
    if (input.kind === 'github-release') {
      const repo = `https://github.com/${input.repo}`;
      return (
        `- ${input.name} ${input.pinned} is pinned, and ${release.version} was published on ${date}: ` +
        `[release notes](${repo}/releases/tag/${release.version}), ` +
        `[changes since ${input.pinned}](${repo}/compare/${input.pinned}...${release.version}).`
      );
    }
    return (
      `- ${input.name} (\`${input.package}\`) ${input.pinned} is pinned, and ${release.version} was published ` +
      `on ${date}: [${input.package}@${release.version} on npm]` +
      `(https://www.npmjs.com/package/${input.package}/v/${release.version}).`
    );
  });
  const intro =
    `<!-- pin-watch: ${watch.id} -->\n` +
    `\`${watch.lock}\` pins a release older than the newest one at least ${COOLDOWN_DAYS} days old:`;
  const body = [intro, lines.join('\n'), HOW_TO[watch.id], FOOTER].join('\n\n') + '\n';
  return { title: `Update ${joined}`, body };
}

/** What to do with a watch's issue: create, edit or close it, or leave it (none); issues are GitHub issue objects. */
export function chooseAction(issues, watch, text) {
  const marker = `<!-- pin-watch: ${watch.id} -->`;
  const issue = issues
    .filter((i) => !i.pull_request && typeof i.body === 'string' && i.body.includes(marker))
    .sort((a, b) => a.number - b.number)[0];
  if (!text) return issue ? { kind: 'close', number: issue.number } : { kind: 'none' };
  if (!issue) return { kind: 'create' };
  const normal = (value) => String(value ?? '').replace(/\r\n/g, '\n').trimEnd();
  const same = normal(issue.title) === normal(text.title) && normal(issue.body) === normal(text.body);
  return { kind: same ? 'none' : 'edit', number: issue.number };
}
