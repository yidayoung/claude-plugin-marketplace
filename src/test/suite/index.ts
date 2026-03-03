import * as path from 'path';
// @ts-ignore - Mocha types may not be perfectly aligned
import Mocha = require('mocha');
import { glob } from 'glob';

export async function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 60000
  });

  const testsRoot = path.resolve(__dirname, '..');

  // Check for test filter environment variables
  const grep = process.env.VSCODE_TEST_GREP;
  const testFile = process.env.VSCODE_TEST_FILE;

  if (grep) {
    mocha.grep(new RegExp(grep));
  }

  let pattern = '**/**.test.js';
  if (testFile) {
    pattern = `**/${testFile}.test.js`;
  }

  try {
    // Use glob to find test files
    const files = await glob(pattern, { cwd: testsRoot });

    // Add files to the test suite
    files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

    // Run the mocha test
    return new Promise<void>((c, e) => {
      try {
        mocha.run((failures: number) => {
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (err) {
        console.error(err);
        e(err);
      }
    });
  } catch (err) {
    console.error('Failed to find test files:', err);
    throw err;
  }
}
