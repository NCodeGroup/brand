// Writes a release's notes from CHANGELOG.md: the lines of the `## [<version>]` section, else those of
// `## [Unreleased]`, up to the next `## ` heading or the link reference definitions. An empty or missing section fails.
// .github/workflows/publish.yml runs it in the pack job, and the release carries the notes.
//   node tools/release-notes.mjs <version> <output file>      for example: node tools/release-notes.mjs 0.9.0 dist/release-notes.md
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** The notes of `version` (without `v`) in `changelog`, or those of `[Unreleased]` when it has no section. */
export function releaseNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  let start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start < 0) start = lines.findIndex((line) => line.startsWith('## [Unreleased]'));
  if (start < 0) throw new Error(`CHANGELOG.md has no section for ${version} and no [Unreleased] section.`);
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ') || /^\[[^\]]+\]:\s/.test(line)) break;
    body.push(line);
  }
  const notes = body.join('\n').trim();
  if (!notes) throw new Error(`The CHANGELOG.md section for ${version} is empty.`);
  return notes;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
    writeFileSync(process.argv[3], `${releaseNotes(changelog, process.argv[2])}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
