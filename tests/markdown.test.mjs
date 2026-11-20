// The Markdown renderer of lib/markdown.mjs: the inline rules, the block rules and GitHub's heading ids.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { plainText, renderInline, renderMarkdown, slugify } from '../lib/markdown.mjs';

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

  test('an asterisk pair is italic, and an asterisk before a space is text', () => {
    assert.equal(renderInline('*Rule.* A key, *`x`* and 2 * 3'), '<em>Rule.</em> A key, <em><code>x</code></em> and 2 * 3');
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

describe('renderMarkdown', () => {
  test('headings get GitHub ids, made unique, and the first level-1 heading is the title', () => {
    const page = renderMarkdown('# 1. Marks\n\n## Badges\n\n## Badges\n');
    assert.equal(page.html, '<h1 id="1-marks">1. Marks</h1>\n<h2 id="badges">Badges</h2>\n<h2 id="badges-1">Badges</h2>');
    assert.equal(page.title, '1. Marks');
    assert.equal(page.headings.length, 3);
  });

  test('a paragraph runs to a blank line', () => {
    assert.equal(renderMarkdown('a\nb\n\nc').html, '<p>a\nb</p>\n<p>c</p>');
  });

  test('a table with a right-aligned column renders, and comment lines are dropped', () => {
    assert.equal(
      renderMarkdown('<!-- generated:x -->\n| A | B |\n|---|---:|\n| `a` | 1 |\n<!-- /generated:x -->').html,
      '<div class="tableframe wide"><table class="table">\n<thead><tr><th scope="col">A</th><th scope="col" class="num">B</th></tr></thead>\n<tbody>\n<tr><td><code>a</code></td><td class="num">1</td></tr>\n</tbody>\n</table></div>',
    );
  });

  test('an escaped pipe stays inside its cell', () => {
    assert.ok(renderMarkdown('| A |\n|---|\n| a \\| b |').html.includes('<td>a | b</td>'));
  });

  test('a fenced block keeps its blank lines and escapes its content', () => {
    assert.equal(
      renderMarkdown('```html\n<a>\n\n```').html,
      '<div class="screen wide"><pre><code><span class="line">&lt;a&gt;</span>\n<span class="line"></span></code></pre></div>',
    );
  });

  test('a list item with one paragraph loses the paragraph element', () => {
    assert.equal(renderMarkdown('- one\n  two\n- three').html, '<ul>\n<li>one\ntwo</li>\n<li>three</li>\n</ul>');
  });

  test('a list item with a fence keeps its blocks', () => {
    assert.equal(
      renderMarkdown('1. Copy it.\n2. Write:\n\n   ```json\n   {}\n   ```\n\n3. Run it.').html,
      '<ol>\n<li>Copy it.</li>\n<li><p>Write:</p>\n<div class="screen wide"><pre><code><span class="line">{}</span></code></pre></div></li>\n<li>Run it.</li>\n</ol>',
    );
  });

  test('an ordered list that starts at another number keeps it', () => {
    assert.equal(renderMarkdown('3. a\n4. b').html, '<ol start="3">\n<li>a</li>\n<li>b</li>\n</ol>');
  });

  test('a comment on a line of its own is dropped, and one that spans lines or shares its line fails', () => {
    assert.equal(renderMarkdown('a\n<!-- x -->\nb').html, '<p>a</p>\n<p>b</p>');
    assert.throws(() => renderMarkdown('<!-- open\nclose -->'), /HTML comment/);
    assert.throws(() => renderMarkdown('<!-- a --> b <!-- c -->'), /HTML comment/);
    assert.throws(() => renderMarkdown('text\n<!-- open'), /HTML comment/);
  });

  test('a construct outside the guide\'s Markdown throws', () => {
    assert.throws(() => renderMarkdown('> quote'), /blockquote/);
    assert.throws(() => renderMarkdown('---'), /thematic break/);
    assert.throws(() => renderMarkdown('    code'), /indented code block/);
    assert.throws(() => renderMarkdown('```\nx'), /unclosed code fence/);
  });
});

describe('plainText', () => {
  test('removes nested tags until none is left, then decodes the escapes', () => {
    assert.equal(plainText('<scr<b>ipt>x</b> &lt;a&gt; &amp;lt;'), 'x <a> &lt;');
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
