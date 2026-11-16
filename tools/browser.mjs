// Playwright is the one tool outside Node.js these scripts use, and only these by-hand tools use it: the build, the
// check and the tests never do. It is loaded with require(), so a global installation (NODE_PATH) is found as well as
// a local one, and the repository needs no package.json dependency for it.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Playwright's Chromium, or an error that says how to get it. */
export function chromium() {
  try {
    return require('playwright').chromium;
  } catch {
    throw new Error(
      'These tools need Playwright: run "npm install --global playwright" and "npx playwright install chromium", then set ' +
        'NODE_PATH to the folder "npm root -g" prints, because Node.js does not look in npm\'s global folder ' +
        '(in PowerShell: $env:NODE_PATH = (npm root -g)).',
    );
  }
}
