// The workflows' PowerShell steps parse: a step of publish.yml runs only when a release is published, so CI
// parses them all.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT, read } from './helpers.mjs';

// Reads the JSON blocks `{ file, line, script }` on stdin and prints one `file:line: message` per parse error.
const PARSE = `
foreach ($block in [Console]::In.ReadToEnd() | ConvertFrom-Json) {
  $tokens = $null; $errors = $null
  [void][System.Management.Automation.Language.Parser]::ParseInput($block.script, [ref]$tokens, [ref]$errors)
  foreach ($e in $errors) { "$($block.file):$($block.line + $e.Extent.StartLineNumber - 1): $($e.Message)" }
}`;

/**
 * Parses each `{ file, line, script }` block with PowerShell's own parser, run through `pwsh`, and returns one
 * `file:line: message` string per parse error; `line` is the line the script starts on in `file`.
 */
function parseErrors(blocks) {
  const result = spawnSync(
    'pwsh',
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(PARSE, 'utf16le').toString('base64')],
    { input: JSON.stringify(blocks), encoding: 'utf8' },
  );
  assert.ifError(result.error, 'pwsh (PowerShell 7) must be installed to parse the workflows');
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

/**
 * Reads the `run:` steps of a workflow file: the subset of YAML these workflows use, line by line with an
 * indentation stack. Returns one `{ line, shell, script }` per step with a `run:` key, in file order; `line` is the
 * 1-based line the script starts on and `shell` the step's own, its job's or the workflow's default, else `bash`.
 * A `run:` written as a folded `>` scalar throws, so an unsupported form fails instead of being skipped.
 */
function runSteps(text) {
  const lines = text.split(/\r?\n/);
  const parents = [];
  const found = [];
  let workflowShell;
  const jobShells = {};
  let step;
  for (let i = 0; i < lines.length; i += 1) {
    let content = lines[i].trimEnd();
    if (content.trim() === '' || content.trim().startsWith('#')) {
      continue;
    }
    let indent = content.length - content.trimStart().length;
    content = content.trimStart();
    while (parents.length > 0 && parents[parents.length - 1].indent >= indent) {
      parents.pop();
    }
    if (content.startsWith('- ')) {
      parents.push({ indent, key: '-' });
      if (parents.map((parent) => parent.key).join('.') === `jobs.${parents[1]?.key}.steps.-`) {
        step = { job: parents[1].key };
        found.push(step);
      }
      content = content.slice(2);
      indent += 2;
    }
    const match = /^([\w-]+):(?:\s+(.*))?$/.exec(content);
    if (!match) {
      continue;
    }
    const key = match[1];
    const raw = (match[2] ?? '').trim();
    const keyLine = i + 1;
    const path = [...parents.map((parent) => parent.key), key];
    let value = raw;
    let valueLine = keyLine;
    if (/^[|>][-+]?$/.test(raw)) {
      if (raw.startsWith('>') && key === 'run') {
        throw new Error(`line ${keyLine}: write a run script as a | block`);
      }
      const body = [];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (next.trim() !== '' && next.length - next.trimStart().length <= indent) {
          break;
        }
        body.push(next);
        i += 1;
      }
      while (body.length > 0 && body[body.length - 1].trim() === '') {
        body.pop();
      }
      const smallest = Math.min(
        ...body.filter((row) => row.trim() !== '').map((row) => row.length - row.trimStart().length),
      );
      value = body.map((row) => (row.trim() === '' ? '' : row.slice(smallest))).join('\n');
      valueLine = keyLine + 1;
    } else {
      value = raw.replace(/\s+#.*$/, '');
      const quoted = /^(['"])(.*)\1$/.exec(value);
      if (quoted) {
        value = quoted[2];
      }
      if (value === '') {
        parents.push({ indent, key });
        continue;
      }
    }
    const route = path.join('.');
    if (route === 'defaults.run.shell') {
      workflowShell = value;
    } else if (path[0] === 'jobs' && route === `jobs.${path[1]}.defaults.run.shell`) {
      jobShells[path[1]] = value;
    } else if (step && route === `jobs.${step.job}.steps.-.shell`) {
      step.shell = value;
    } else if (step && route === `jobs.${step.job}.steps.-.run`) {
      step.script = value;
      step.line = valueLine;
    }
  }
  return found
    .filter((entry) => entry.script !== undefined)
    .map((entry) => ({
      line: entry.line,
      shell: entry.shell ?? jobShells[entry.job] ?? workflowShell ?? 'bash',
      script: entry.script,
    }));
}

test('runSteps reads each run step\'s script, the line it starts on and its shell', () => {
  const sample = `defaults:
  run:
    shell: bash
jobs:
  one:
    defaults:
      run:
        shell: pwsh
    steps:
      # a comment
      - name: Block
        run: |
          $a = 1

          "$a"
      - run: npm ci
      - name: Bash here
        shell: bash
        run: echo "\${{ github.ref }}"
  two:
    steps:
      - uses: actions/checkout@v1
        with:
          ref: main
      - run: 'echo two'
`;
  assert.deepEqual(runSteps(sample), [
    { line: 13, shell: 'pwsh', script: '$a = 1\n\n"$a"' },
    { line: 16, shell: 'pwsh', script: 'npm ci' },
    { line: 19, shell: 'bash', script: 'echo "${{ github.ref }}"' },
    { line: 25, shell: 'bash', script: 'echo two' },
  ]);
});

test('runSteps refuses a run script written as a folded scalar', () => {
  assert.throws(
    () => runSteps('jobs:\n  a:\n    steps:\n      - run: >\n          echo\n'),
    /line 4: write a run script as a \| block/,
  );
});

test('parseErrors names the file and line of a script PowerShell can\'t parse', () => {
  assert.deepEqual(parseErrors([{ file: 'x.yml', line: 10, script: 'ok\n"$LASTEXITCODE: x"' }]), [
    'x.yml:11: Variable reference is not valid. \':\' was not followed by a valid variable name character. '
      + 'Consider using ${} to delimit the name.',
  ]);
});

test('every PowerShell step of the workflows parses', () => {
  const blocks = [];
  const names = readdirSync(join(ROOT, '.github/workflows')).filter((name) => /\.ya?ml$/.test(name)).sort();
  for (const name of names) {
    const file = `.github/workflows/${name}`;
    for (const { line, shell, script } of runSteps(read(file))) {
      if (shell === 'pwsh' || shell === 'powershell') {
        blocks.push({ file, line, script: script.replace(/\$\{\{[\s\S]*?\}\}/g, 'EXPRESSION') });
      }
    }
  }
  assert.ok(
    blocks.some(
      (block) =>
        block.file === '.github/workflows/publish.yml' && block.script.includes('node build.mjs --archive dist'),
    ),
    'the Pack step of publish.yml must be among the parsed steps',
  );
  const errors = parseErrors(blocks);
  assert.deepEqual(errors, [], errors.join('\n'));
});
