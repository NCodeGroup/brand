// tools/pin-watch.mjs reads the versions the locks pin and the releases upstream publishes, and names the newest
// release at least three days old. The tests never touch the network.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  chooseAction,
  compareVersions,
  issueText,
  lucideCandidates,
  newestEligible,
  npmCandidates,
  parseVersion,
  readWatches,
  runPinWatch,
} from '../tools/pin-watch.mjs';
import { ROOT, readJson, runNode } from './helpers.mjs';

const NOW = new Date('2026-11-20T00:00:00Z');
const daysAgo = (days) => new Date(NOW.getTime() - days * 86_400_000);

test('parseVersion reads x.y.z and refuses any other text', () => {
  assert.deepEqual(parseVersion('1.72.0'), [1, 72, 0]);
  for (const text of ['v1.2.3', '1.2.3-beta.1', '@lucide/lab@0.14.0', '1.2']) {
    assert.equal(parseVersion(text), null, text);
  }
});

test('compareVersions orders the numbers, not the text', () => {
  assert.ok(compareVersions('1.10.0', '1.9.0') > 0);
  assert.ok(compareVersions('1.9.0', '1.10.0') < 0);
  assert.equal(compareVersions('1.72.0', '1.72.0'), 0);
});

test('newestEligible names the highest version above the pin that is at least three days old', () => {
  const candidates = [
    { version: '1.71.0', published: daysAgo(10) },
    { version: '1.73.0', published: daysAgo(5) },
    { version: '1.74.0', published: daysAgo(4) },
    { version: '1.75.0', published: daysAgo(1) },
  ];
  assert.equal(newestEligible(candidates, '1.72.0', NOW).version, '1.74.0');
  assert.equal(newestEligible([{ version: '1.75.0', published: daysAgo(1) }], '1.72.0', NOW), null);
  assert.throws(() => newestEligible(candidates, 'latest', NOW), /can't read the pinned version "latest"/);
});

test('newestEligible counts a release exactly three days old and not one a millisecond younger', () => {
  const exact = [{ version: '1.73.0', published: daysAgo(3) }];
  assert.equal(newestEligible(exact, '1.72.0', NOW).version, '1.73.0');
  const younger = [{ version: '1.73.0', published: new Date(daysAgo(3).getTime() + 1) }];
  assert.equal(newestEligible(younger, '1.72.0', NOW), null);
});

test('lucideCandidates skips a draft, a prerelease and a tag that is not x.y.z', () => {
  const releases = [
    { tag_name: '1.73.0', published_at: '2026-11-10T00:00:00Z', draft: false, prerelease: false },
    { tag_name: '1.74.0', published_at: '2026-11-11T00:00:00Z', draft: true, prerelease: false },
    { tag_name: '1.75.0', published_at: '2026-11-12T00:00:00Z', draft: false, prerelease: true },
    { tag_name: '@lucide/lab@0.14.0', published_at: '2026-11-13T00:00:00Z', draft: false, prerelease: false },
  ];
  assert.deepEqual(lucideCandidates(releases), [{ version: '1.73.0', published: new Date('2026-11-10T00:00:00Z') }]);
});

test('npmCandidates skips a deprecated version and a version that is not x.y.z', () => {
  const packument = {
    versions: { '5.3.0': {}, '5.3.1': { deprecated: 'use 5.3.2' }, '5.4.0-beta.1': {} },
    time: {
      '5.3.0': '2026-10-01T00:00:00.000Z',
      '5.3.1': '2026-10-02T00:00:00.000Z',
      '5.4.0-beta.1': '2026-10-03T00:00:00.000Z',
    },
  };
  assert.deepEqual(npmCandidates(packument), [{ version: '5.3.0', published: new Date('2026-10-01T00:00:00.000Z') }]);
});

test('readWatches reads the versions and packages the two locks pin', () => {
  const lucide = readJson('src/icons/lucide.lock.json');
  const fonts = readJson('src/fonts/fonts.lock.json');
  const [lucideWatch, fontsWatch] = readWatches(ROOT);
  assert.equal(lucideWatch.id, 'lucide');
  assert.equal(lucideWatch.lock, 'src/icons/lucide.lock.json');
  assert.deepEqual(lucideWatch.inputs, [
    { name: 'Lucide', kind: 'github-release', repo: 'lucide-icons/lucide', pinned: lucide.version },
  ]);
  assert.equal(fontsWatch.id, 'fonts');
  assert.equal(fontsWatch.lock, 'src/fonts/fonts.lock.json');
  assert.deepEqual(
    fontsWatch.inputs,
    Object.entries(fonts.families).map(([name, f]) => ({ name, kind: 'npm', package: f.package, pinned: f.version })),
  );
  assert.ok(fontsWatch.inputs.length > 0);
});

test('issueText writes the Lucide issue: marker first, both links and the publish date', () => {
  const watch = {
    id: 'lucide',
    lock: 'src/icons/lucide.lock.json',
    inputs: [{ name: 'Lucide', kind: 'github-release', repo: 'lucide-icons/lucide', pinned: '1.72.0' }],
  };
  const release = { version: '1.74.0', published: new Date('2026-11-10T08:30:00Z') };
  const { title, body } = issueText(watch, [{ input: watch.inputs[0], release }]);
  assert.equal(title, 'Update Lucide to 1.74.0');
  const blocks = body.split('\n\n');
  assert.equal(
    blocks[0],
    '<!-- pin-watch: lucide -->\n' +
      '`src/icons/lucide.lock.json` pins an older release than the newest one published at least 3 days ago:',
  );
  assert.equal(
    blocks[1],
    '- Lucide 1.72.0 is pinned, and 1.74.0 was published on 2026-11-10: ' +
      '[release notes](https://github.com/lucide-icons/lucide/releases/tag/1.74.0), ' +
      '[changes since 1.72.0](https://github.com/lucide-icons/lucide/compare/1.72.0...1.74.0).',
  );
  assert.ok(blocks[2].startsWith('To take it, copy each icon the lock names'));
  assert.ok(blocks[3].startsWith('The pin-watch workflow, `.github/workflows/pin-watch.yml`, checks every Monday'));
  assert.ok(blocks[3].includes('A release counts once it is 3 days old'));
  assert.ok(body.endsWith('says.\n'));
});

test('issueText names two font families in the title and links each package on npm', () => {
  const watch = { id: 'fonts', lock: 'src/fonts/fonts.lock.json' };
  const behind = [
    {
      input: { name: 'Instrument Sans', kind: 'npm', package: '@fontsource/instrument-sans', pinned: '5.3.0' },
      release: { version: '5.4.0', published: new Date('2026-11-01T00:00:00Z') },
    },
    {
      input: { name: 'Martian Mono', kind: 'npm', package: '@fontsource/martian-mono', pinned: '5.3.0' },
      release: { version: '5.4.0', published: new Date('2026-11-02T00:00:00Z') },
    },
  ];
  const { title, body } = issueText(watch, behind);
  assert.equal(title, 'Update Instrument Sans to 5.4.0 and Martian Mono to 5.4.0');
  assert.ok(body.startsWith('<!-- pin-watch: fonts -->\n'));
  assert.ok(
    body.includes(
      '- Instrument Sans (`@fontsource/instrument-sans`) 5.3.0 is pinned, and 5.4.0 was published on 2026-11-01: ' +
        '[@fontsource/instrument-sans@5.4.0 on npm]' +
        '(https://www.npmjs.com/package/@fontsource/instrument-sans/v/5.4.0).\n' +
        '- Martian Mono',
    ),
  );
  assert.ok(body.includes('node tools/shoot.mjs'));
  assert.ok(body.includes('node tools/refresh-fonts.mjs --pin'));
  const three = behind.concat(behind[0]);
  assert.match(issueText(watch, three).title, /^Update Instrument Sans to 5\.4\.0, Martian Mono to 5\.4\.0 and /);
});

test("chooseAction creates, edits, leaves or closes the lock's issue", () => {
  const watch = { id: 'lucide' };
  const text = { title: 'Update Lucide to 1.74.0', body: '<!-- pin-watch: lucide -->\nbody\n' };
  const issue = (number, extra) => ({ number, title: text.title, body: text.body, ...extra });
  assert.deepEqual(chooseAction([], watch, text), { kind: 'create' });
  assert.deepEqual(chooseAction([issue(7, { title: 'Old title' })], watch, text), { kind: 'edit', number: 7 });
  assert.deepEqual(chooseAction([issue(7, { body: '<!-- pin-watch: lucide -->\nold\n' })], watch, text), {
    kind: 'edit',
    number: 7,
  });
  assert.deepEqual(chooseAction([issue(7)], watch, text), { kind: 'none', number: 7 });
  assert.deepEqual(chooseAction([issue(7, { body: text.body.replace(/\n/g, '\r\n') })], watch, text), {
    kind: 'none',
    number: 7,
  });
  assert.deepEqual(chooseAction([issue(7)], watch, null), { kind: 'close', number: 7 });
  assert.deepEqual(chooseAction([], watch, null), { kind: 'none' });
});

test('chooseAction keeps the lowest number and ignores another marker and a pull request', () => {
  const watch = { id: 'lucide' };
  const text = { title: 'T', body: '<!-- pin-watch: lucide -->\nbody\n' };
  const issues = [
    { number: 9, title: 'T', body: text.body },
    { number: 4, title: 'Old', body: text.body },
    { number: 2, title: 'T', body: '<!-- pin-watch: fonts -->\nbody\n' },
    { number: 1, title: 'T', body: text.body, pull_request: {} },
  ];
  assert.deepEqual(chooseAction(issues, watch, text), { kind: 'edit', number: 4 });
  assert.deepEqual(chooseAction(issues.slice(2), watch, null), { kind: 'none' });
});

const FONT_PACKAGES = {
  'Instrument Sans': '@fontsource-variable/instrument-sans',
  'Martian Mono': '@fontsource-variable/martian-mono',
};

/** A fixture repository root whose locks pin Lucide 1.72.0 and both font families at 5.3.0. */
function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'ncode-brand-pin-watch-'));
  mkdirSync(join(root, 'src/icons'), { recursive: true });
  mkdirSync(join(root, 'src/fonts'), { recursive: true });
  writeFileSync(join(root, 'src/icons/lucide.lock.json'), JSON.stringify({ version: '1.72.0' }));
  const families = {};
  for (const [name, pkg] of Object.entries(FONT_PACKAGES)) families[name] = { package: pkg, version: '5.3.0' };
  writeFileSync(join(root, 'src/fonts/fonts.lock.json'), JSON.stringify({ families }));
  return root;
}

const FONTS_ISSUE = { number: 7, title: 'Update Instrument Sans to 5.4.0', body: '<!-- pin-watch: fonts -->\nold\n' };

/**
 * A fake fetch that answers by URL and records [method, url, parsed body, headers]; registryStatus answers the npm
 * reads and issues answers the open pin-update issues.
 */
function fakeFetch(calls, registryStatus = 200, issues = [FONTS_ISSUE]) {
  const answer = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json });
  return async (url, init) => {
    calls.push([init.method, url, init.body ? JSON.parse(init.body) : undefined, init.headers ?? {}]);
    if (url.startsWith('https://registry.npmjs.org/')) {
      const time = { '5.3.0': '2026-09-01T00:00:00.000Z' };
      return answer(registryStatus, { versions: { '5.3.0': {} }, time });
    }
    if (url.startsWith('https://api.github.com/repos/lucide-icons/lucide/releases')) {
      const release = { tag_name: '1.73.0', published_at: '2026-11-10T00:00:00Z', draft: false, prerelease: false };
      return answer(200, [release]);
    }
    if (url.includes('/issues?labels=pin-update')) return answer(200, issues);
    if (url.endsWith('/labels/pin-update')) return answer(200, {});
    if (url.endsWith('/labels/dependencies')) return answer(404, {});
    if (init.method === 'POST' && url.endsWith('/issues')) return answer(201, { number: 12 });
    return answer(200, {});
  };
}

test('runPinWatch opens the Lucide issue, creates the missing label and closes the fonts issue', async () => {
  const root = fixtureRoot();
  try {
    const calls = [];
    const lines = await runPinWatch({ root, repo: 'NCodeGroup/brand', token: 't', now: NOW, fetch: fakeFetch(calls) });
    const api = 'https://api.github.com/repos/NCodeGroup/brand';
    const written = calls.filter(([method]) => method !== 'GET').map(([method, url]) => `${method} ${url}`);
    assert.deepEqual(written, [
      `POST ${api}/labels`,
      `POST ${api}/issues`,
      `POST ${api}/issues/7/comments`,
      `PATCH ${api}/issues/7`,
    ]);
    const label = calls.find(([method, url]) => method === 'POST' && url === `${api}/labels`)[2];
    assert.deepEqual(label, { name: 'dependencies', color: '0366D6', description: 'A dependency to update' });
    const created = calls.find(([method, url]) => method === 'POST' && url === `${api}/issues`)[2];
    assert.equal(created.title, 'Update Lucide to 1.73.0');
    assert.deepEqual(created.labels, ['pin-update', 'dependencies']);
    assert.ok(created.body.startsWith('<!-- pin-watch: lucide -->\n'));
    const closed = calls.find(([method, url]) => method === 'PATCH' && url === `${api}/issues/7`)[2];
    assert.deepEqual(closed, { state: 'closed', state_reason: 'completed' });
    assert.deepEqual(lines, [
      'Opened #12: Update Lucide to 1.73.0',
      'Closed #7: `src/fonts/fonts.lock.json` pins the newest release at least 3 days old.',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/** The issue text runPinWatch writes for the Lucide fixture: the pin is 1.72.0 and 1.73.0 is the newest eligible. */
function lucideIssueText(root) {
  const [watch] = readWatches(root);
  const release = { version: '1.73.0', published: new Date('2026-11-10T00:00:00Z') };
  return issueText(watch, [{ input: watch.inputs[0], release }]);
}

test('runPinWatch rewrites a stale Lucide issue', async () => {
  const root = fixtureRoot();
  try {
    const calls = [];
    const stale = { number: 5, title: 'Update Lucide to 1.72.5', body: '<!-- pin-watch: lucide -->\nold\n' };
    const fetch = fakeFetch(calls, 200, [stale]);
    const lines = await runPinWatch({ root, repo: 'NCodeGroup/brand', token: 't', now: NOW, fetch });
    const written = calls.filter(([method]) => method !== 'GET').map(([method, url, body]) => [method, url, body]);
    assert.deepEqual(written, [
      ['PATCH', 'https://api.github.com/repos/NCodeGroup/brand/issues/5', lucideIssueText(root)],
    ]);
    assert.deepEqual(lines, [
      'Updated #5: Update Lucide to 1.73.0',
      '`src/fonts/fonts.lock.json` pins the newest release at least 3 days old.',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runPinWatch writes nothing when the issue already says what it would', async () => {
  const root = fixtureRoot();
  try {
    const calls = [];
    const current = { number: 5, ...lucideIssueText(root) };
    const fetch = fakeFetch(calls, 200, [current]);
    const lines = await runPinWatch({ root, repo: 'NCodeGroup/brand', token: 't', now: NOW, fetch });
    assert.ok(calls.length > 0);
    assert.ok(calls.every(([method]) => method === 'GET'));
    assert.deepEqual(lines, [
      '#5 already says: Update Lucide to 1.73.0',
      '`src/fonts/fonts.lock.json` pins the newest release at least 3 days old.',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runPinWatch in a dry run reads and reports but sends no write', async () => {
  const root = fixtureRoot();
  try {
    const calls = [];
    const fetch = fakeFetch(calls);
    const lines = await runPinWatch({ root, repo: 'NCodeGroup/brand', now: NOW, fetch, dryRun: true });
    assert.ok(calls.length > 0);
    assert.ok(calls.every(([method]) => method === 'GET'));
    assert.deepEqual(lines, [
      'Would open: Update Lucide to 1.73.0',
      'Would close #7: `src/fonts/fonts.lock.json` pins the newest release at least 3 days old.',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runPinWatch rejects when the registry answers 500 and writes nothing', async () => {
  const root = fixtureRoot();
  try {
    const calls = [];
    await assert.rejects(
      runPinWatch({ root, repo: 'NCodeGroup/brand', token: 't', now: NOW, fetch: fakeFetch(calls, 500) }),
      /GET https:\/\/registry\.npmjs\.org\/\S+ answered 500/,
    );
    assert.ok(calls.every(([method]) => method === 'GET'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runPinWatch sends the token to api.github.com and never to the npm registry', async () => {
  const root = fixtureRoot();
  try {
    const calls = [];
    await runPinWatch({ root, repo: 'NCodeGroup/brand', token: 't', now: NOW, fetch: fakeFetch(calls) });
    const registry = calls.filter(([, url]) => url.startsWith('https://registry.npmjs.org/'));
    assert.ok(registry.length > 0);
    for (const [, , , headers] of registry) {
      assert.equal(headers.Authorization, undefined);
      assert.equal(headers['X-GitHub-Api-Version'], undefined);
    }
    const github = calls.filter(([, url]) => url.startsWith('https://api.github.com/'));
    assert.ok(github.length > 0);
    for (const [, , , headers] of github) assert.equal(headers.Authorization, 'Bearer t');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const NO_ENV = { GITHUB_REPOSITORY: '', GITHUB_TOKEN: '', GH_TOKEN: '' };

test('the command line exits 2 before any request when no repository is given', () => {
  const { code, output } = runNode(ROOT, ['tools/pin-watch.mjs', '--dry-run'], NO_ENV);
  assert.equal(code, 2);
  assert.match(output, /usage:/);
});

test('the command line exits 2 before any request when there is a repository but no token and no --dry-run', () => {
  const { code, output } = runNode(ROOT, ['tools/pin-watch.mjs', '--repo=NCodeGroup/brand'], NO_ENV);
  assert.equal(code, 2);
  assert.match(output, /usage:/);
});
