// The Markdown renderer of lib/markdown.mjs: the inline rules and GitHub's heading ids.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { renderInline, slugify } from '../lib/markdown.mjs';

describe('renderInline', () => {
  test('a code span escapes its content and the text around it', () => {
    assert.equal(renderInline('a `<b>` & c'), 'a <code>&lt;b&gt;</code> &amp; c');
  });

  test('bold, links and code spans nest, and link maps a target', () => {
    assert.equal(
      renderInline('**Bold** [x `y`](02-color.md)', { link: (t) => t.replace('.md', '.html') }),
      '<strong>Bold</strong> <a class="link" href="02-color.html">x <code>y</code></a>',
    );
  });

  test('raw inline HTML passes through and a stray angle bracket is escaped', () => {
    assert.equal(renderInline('<img src="a.svg" alt="x">'), '<img src="a.svg" alt="x">');
    assert.equal(renderInline('a < b > c'), 'a &lt; b &gt; c');
  });

  test('a code span closes on a run of exactly its backticks, and an unclosed run is text', () => {
    assert.equal(renderInline('``a`b``'), '<code>a`b</code>');
    assert.equal(renderInline('a ` b'), 'a ` b');
  });

  test('an image becomes an img element, and a backslash escapes a character', () => {
    assert.equal(renderInline('![NuGet](x.svg)'), '<img src="x.svg" alt="NuGet">');
    assert.equal(renderInline('\\| \\*'), '| *');
  });
});

describe('slugify', () => {
  test('follows the heading ids GitHub makes', () => {
    assert.equal(slugify('The {id} Kit'), 'the-id-kit');
    assert.equal(slugify("Do and Don't"), 'do-and-dont');
    assert.equal(slugify('Tokens: the One Rule'), 'tokens-the-one-rule');
    assert.equal(slugify('1. Marks'), '1-marks');
  });
});
