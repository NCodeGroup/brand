// Watches the pinned Lucide and font releases for newer ones. Node.js built-ins only.
//   import { chooseAction, issueText, newestEligible, readWatches } from './pin-watch.mjs';
// A lock pins one release of each input: src/icons/lucide.lock.json a Lucide tag, src/fonts/fonts.lock.json one npm
// version of each Fontsource package. A release counts once it is COOLDOWN_DAYS old, and only a version shaped
// <digits>.<digits>.<digits> is a release. Nothing here moves a lock.
//   node tools/pin-watch.mjs [--dry-run] [--repo=<owner/name>]
// Keeps one open issue per lock that is behind on the repository, from GITHUB_REPOSITORY or --repo, with the token
// in GITHUB_TOKEN or GH_TOKEN, and closes it once the lock is current. It prints one line per lock: what it opened,
// updated, closed or left. --dry-run reads everything, writes nothing, needs no token and prints "Would ..." lines.
// Exits 0 when it finishes, 1 when a request fails, 2 on a usage error.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

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
  'newer release is old enough, and closes it once the lock pins the newest one. ' +
  `A release counts once it is ${COOLDOWN_DAYS} days old, as ADR-0009 in \`docs/decisions/project-template/\` says.`;

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
    `\`${watch.lock}\` pins an older release than the newest one published at least ${COOLDOWN_DAYS} days ago:`;
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

const TIMEOUT = 30_000;
const LABELS = [
  { name: LABEL, color: '1D76DB', description: 'A pinned input has a newer release' },
  { name: 'dependencies', color: '0366D6', description: 'A dependency to update' },
];

/**
 * Compares each lock's pins with the newest releases at least COOLDOWN_DAYS old and keeps one issue per lock on
 * GitHub: opens, rewrites or closes it. Returns the lines it reports. A dry run reads and writes nothing.
 */
export async function runPinWatch({
  root,
  repo,
  token = '',
  now = new Date(),
  fetch = globalThis.fetch,
  dryRun = false,
}) {
  const request = async (method, url, body) => {
    const github = new URL(url).origin === 'https://api.github.com';
    const headers = { 'User-Agent': 'ncode-brand-pin-watch' };
    if (github) {
      headers.Accept = 'application/vnd.github+json';
      headers['X-GitHub-Api-Version'] = '2022-11-28';
    } else {
      headers.Accept = 'application/json';
    }
    if (token && github) headers.Authorization = `Bearer ${token}`;
    const init = { method, headers, signal: AbortSignal.timeout(TIMEOUT) };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const response = await fetch(url, init);
    if (!response.ok) {
      const error = new Error(`${method} ${url} answered ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response;
  };
  const api = `https://api.github.com/repos/${repo}`;

  const plans = [];
  for (const watch of readWatches(root)) {
    const behind = [];
    for (const input of watch.inputs) {
      const url =
        input.kind === 'github-release'
          ? `https://api.github.com/repos/${input.repo}/releases?per_page=100`
          : `https://registry.npmjs.org/${input.package}`;
      const json = await (await request('GET', url)).json();
      const candidates = input.kind === 'github-release' ? lucideCandidates(json) : npmCandidates(json);
      const release = newestEligible(candidates, input.pinned, now);
      if (release) behind.push({ input, release });
    }
    plans.push({ watch, behind });
  }
  const issues = await (await request('GET', `${api}/issues?labels=${LABEL}&state=open&per_page=100`)).json();

  const lines = [];
  for (const { watch, behind } of plans) {
    const text = behind.length ? issueText(watch, behind) : null;
    const action = chooseAction(issues, watch, text);
    if (action.kind === 'create') {
      if (dryRun) {
        lines.push(`Would open: ${text.title}`);
        continue;
      }
      for (const label of LABELS) {
        try {
          await request('GET', `${api}/labels/${encodeURIComponent(label.name)}`);
        } catch (error) {
          if (error.status !== 404) throw error;
          await request('POST', `${api}/labels`, label);
        }
      }
      const body = { title: text.title, body: text.body, labels: LABELS.map((label) => label.name) };
      const created = await (await request('POST', `${api}/issues`, body)).json();
      lines.push(`Opened #${created.number}: ${text.title}`);
    } else if (action.kind === 'edit') {
      if (dryRun) {
        lines.push(`Would update #${action.number}: ${text.title}`);
        continue;
      }
      await request('PATCH', `${api}/issues/${action.number}`, { title: text.title, body: text.body });
      lines.push(`Updated #${action.number}: ${text.title}`);
    } else if (action.kind === 'close') {
      const done = `\`${watch.lock}\` pins the newest release at least ${COOLDOWN_DAYS} days old.`;
      if (dryRun) {
        lines.push(`Would close #${action.number}: ${done}`);
        continue;
      }
      await request('POST', `${api}/issues/${action.number}/comments`, {
        body:
          `\`${watch.lock}\` pins the newest release at least ${COOLDOWN_DAYS} days old, so this issue is done. ` +
          'The pin-watch workflow opens a new one when a newer release is out.',
      });
      await request('PATCH', `${api}/issues/${action.number}`, { state: 'closed', state_reason: 'completed' });
      lines.push(`Closed #${action.number}: ${done}`);
    } else {
      lines.push(
        action.number
          ? `#${action.number} already says: ${text.title}`
          : `\`${watch.lock}\` pins the newest release at least ${COOLDOWN_DAYS} days old.`,
      );
    }
  }
  return lines;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const usage = 'usage: node tools/pin-watch.mjs [--dry-run] [--repo=<owner/name>]';
  let parsed;
  try {
    parsed = parseArgs({
      options: { 'dry-run': { type: 'boolean', default: false }, repo: { type: 'string' } },
    });
  } catch (error) {
    console.error(`${error.message}\n${usage}`);
    process.exit(2);
  }
  const dryRun = parsed.values['dry-run'];
  const repo = parsed.values.repo ?? process.env.GITHUB_REPOSITORY ?? '';
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || (!token && !dryRun)) {
    console.error(usage);
    process.exit(2);
  }
  try {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
    for (const line of await runPinWatch({ root, repo, token, dryRun })) console.log(line);
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
