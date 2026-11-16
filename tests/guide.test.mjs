// The site's link rules of lib/guide.mjs: where a link of a guide source goes on the published page.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { guideLink, pageName } from '../lib/guide.mjs';

describe('guideLink', () => {
  const cases = [
    ['02-color.md', '02-color.html'],
    ['README.md', 'index.html'],
    ['12-applying.md#vendor-a-release', '12-applying.html#vendor-a-release'],
    ['#variants', '#variants'],
    ['https://cli.github.com', 'https://cli.github.com'],
    ['../specimens/foundations.html', '../specimens/foundations.html'],
    ['../logo/ncode/', 'https://github.com/NCodeGroup/brand/tree/main/logo/ncode'],
    ['../docs/decisions/1002-x.md', 'https://github.com/NCodeGroup/brand/blob/main/docs/decisions/1002-x.md'],
    ['../TRADEMARKS.md', 'https://github.com/NCodeGroup/brand/blob/main/TRADEMARKS.md'],
  ];

  for (const [target, expected] of cases) {
    test(`${target} goes to ${expected}`, () => {
      assert.equal(guideLink(target), expected);
    });
  }

  test('a link out of the repository throws', () => {
    assert.throws(() => guideLink('../../outside.md'), /leaves the repository/);
  });

  test('a guide source becomes its page', () => {
    assert.equal(pageName('01-marks.md'), '01-marks.html');
  });
});
