// The workflows' PowerShell steps parse: a step of publish.yml runs only when a release is published, so CI
// parses them all.
import assert from 'node:assert/strict';
import { test } from 'node:test';

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
