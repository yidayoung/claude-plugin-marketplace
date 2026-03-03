import * as path from 'path';
import { runTests } from '@vscode/test-electron';

interface RunnerArgs {
  grep?: string;
  file?: string;
}

function parseRunnerArgs(argv: string[]): RunnerArgs {
  const result: RunnerArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (token === '--grep' && i + 1 < argv.length) {
      result.grep = argv[i + 1];
      i++;
      continue;
    }

    if (token === '--file' && i + 1 < argv.length) {
      result.file = argv[i + 1];
      i++;
      continue;
    }
  }

  return result;
}

async function main() {
  try {
    // Cursor/Claude Code shells may export this, which makes Electron run in Node mode
    // and reject VS Code launch args like `--disable-gpu`.
    delete process.env.ELECTRON_RUN_AS_NODE;

    const args = parseRunnerArgs(process.argv.slice(2));

    if (args.grep) {
      process.env.VSCODE_TEST_GREP = args.grep;
    }

    if (args.file) {
      process.env.VSCODE_TEST_FILE = args.file;
    }

    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-gpu',
        '--disable-workspace-trust',
        '--skip-release-notes',
        '--skip-welcome'
      ]
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
