// Phase 0 parity gate (guide §8.5).
//
// Builds the latest TypeScript fixture vectors with `gen-vectors`, syncs the
// shared cross-implementation fixture files into the thresholdELGamal repo,
// and runs the Python `test_sdk_compat.py` suite. Exits non-zero on any drift
// or test failure. This is the blocking CI gate for the TS<->Python ballot
// pipeline: if it is red, the TypeScript browser is producing bytes the
// Python backend cannot verify (or vice versa) and every other test in this
// repo is meaningless.
//
// Usage:
//   node scripts/parity-gate.mjs                # default: ../thresholdELGamal
//   THRESHOLD_ELGAMAL_PATH=/path/to/repo node scripts/parity-gate.mjs

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(here, '..');
const sdkDir = join(monorepoRoot, 'packages', 'private-vote-sdk');

const teRepoEnv = process.env.THRESHOLD_ELGAMAL_PATH;
const teRepo = resolve(
  teRepoEnv ? teRepoEnv : join(monorepoRoot, '..', 'thresholdELGamal')
);

const SHARED_FIXTURES = [
  'decrypt-share/thresholdElGamal_dkg_keyper_1.json',
  'decrypt-share/thresholdElGamal_dkg_keyper_2.json',
  'decrypt-share/thresholdElGamal_dkg_keyper_3.json',
  'tally/thresholdElGamal_dkg_combined.json'
];

function run(label, cmd, args, opts = {}) {
  console.log(`\n--- ${label} ---`);
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  if (r.status !== 0) {
    console.error(`\n[parity-gate] ${label} failed (exit ${r.status}).`);
    process.exit(r.status ?? 1);
  }
}

function fail(msg) {
  console.error(`[parity-gate] ${msg}`);
  process.exit(1);
}

if (!existsSync(teRepo)) {
  fail(
    `thresholdELGamal not found at ${teRepo}. Set THRESHOLD_ELGAMAL_PATH or clone it next to sx-monorepo.`
  );
}

// Step 1: regenerate TS fixture vectors.
const npmCmd = platform() === 'win32' ? 'npm.cmd' : 'npm';
run('regenerate fixture vectors', npmCmd, ['run', 'gen-vectors'], {
  cwd: sdkDir
});

// Step 2: sync the shared cross-impl fixtures into the Python repo.
console.log('\n--- sync shared fixtures ---');
for (const rel of SHARED_FIXTURES) {
  const from = join(sdkDir, 'tests', 'vectors', rel);
  const to = join(teRepo, 'fixtures', rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  // Compare so any future drift is loud and obvious.
  const a = readFileSync(from);
  const b = readFileSync(to);
  if (!a.equals(b)) fail(`drift detected in ${rel}`);
  console.log(`  ok  ${rel}`);
}

// Step 3: Python verifier must accept what TS produced.
const pyExe = resolve(
  teRepo,
  '.venv',
  platform() === 'win32' ? 'Scripts/python.exe' : 'bin/python'
);
if (!existsSync(pyExe)) {
  fail(
    `Python venv not found at ${pyExe}. Bootstrap:  python -m venv .venv && .venv/bin/pip install -r src/requirements.txt pytest`
  );
}
run(
  'pytest test_sdk_compat',
  pyExe,
  ['-m', 'pytest', 'tests/test_sdk_compat.py', '-x', '--tb=short'],
  { cwd: join(teRepo, 'src') }
);

console.log('\n[parity-gate] OK — TS and Python agree on ballot bytes.');
