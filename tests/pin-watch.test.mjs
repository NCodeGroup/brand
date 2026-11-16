// tools/pin-watch.mjs reads the versions the locks pin and the releases upstream publishes, and names the newest
// release at least three days old. The tests never touch the network.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compareVersions,
  lucideCandidates,
  newestEligible,
  npmCandidates,
  parseVersion,
  readWatches,
} from '../tools/pin-watch.mjs';
import { ROOT, readJson } from './helpers.mjs';

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
