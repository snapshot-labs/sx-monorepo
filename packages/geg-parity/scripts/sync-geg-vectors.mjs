#!/usr/bin/env node
/**
 * Refresh `vectors/` from the geg repo's canonical vector set.
 *
 * The vectors are checked in rather than read from a sibling checkout so the
 * parity gate is hermetic: CI must be able to run it without geg present. This
 * script is how the copy gets refreshed, and it rewrites PROVENANCE.md with the
 * geg commit it copied from so the snapshot is always attributable.
 *
 *   node scripts/sync-geg-vectors.mjs /path/to/generalised-el-gamal
 *   GEG_REPO=/path/to/generalised-el-gamal node scripts/sync-geg-vectors.mjs
 *
 * The checkout has to be named explicitly. There is no default: it lives
 * wherever the person running this put it, and guessing a sibling path only
 * turns "you did not say where geg is" into a confusing error further down.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEST = resolve(HERE, '..', 'vectors');

const gegRepoArg = process.argv[2] || process.env.GEG_REPO;
if (!gegRepoArg) {
  console.error(
    'sync-geg-vectors: no generalised-el-gamal checkout given\n' +
      '  node scripts/sync-geg-vectors.mjs /path/to/generalised-el-gamal\n' +
      '  (or set GEG_REPO)'
  );
  process.exit(2);
}
const gegRepo = resolve(gegRepoArg);
const src = join(gegRepo, 'tests', 'vectors');

if (!existsSync(src)) {
  console.error(
    `sync-geg-vectors: no vectors at ${src}\n` +
      `Pass the geg repo path: node scripts/sync-geg-vectors.mjs /path/to/generalised-el-gamal`
  );
  process.exit(1);
}

let commit = 'unknown';
let describe = '';
try {
  commit = execFileSync('git', ['-C', gegRepo, 'rev-parse', 'HEAD'], {
    encoding: 'utf8'
  }).trim();
  describe = execFileSync(
    'git',
    ['-C', gegRepo, 'log', '-1', '--format=%cI %s'],
    { encoding: 'utf8' }
  ).trim();
} catch {
  console.warn(
    'sync-geg-vectors: geg repo is not a git checkout; commit unknown'
  );
}

// Replace wholesale — a vector deleted upstream must disappear here too, or the
// gate silently keeps verifying a file geg no longer publishes.
//
// Only the *vendored* part, though. Some vectors in here are ours: they are
// generated against sx's own code (`scripts/geg/gen-legacy-equivalence.ts` and
// friends) and geg has never heard of them. Wiping the directory wholesale
// deleted them, which is silent and irreversible for any that were not yet
// committed. Vendored content is always a category directory; anything loose at
// the top level is ours and is left alone.
for (const entry of readdirSync(DEST, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    rmSync(join(DEST, entry.name), { recursive: true, force: true });
  }
}
mkdirSync(DEST, { recursive: true });
cpSync(src, DEST, {
  recursive: true,
  filter: s => {
    const name = basename(s);
    if (name.startsWith('.')) return false; // .DS_Store and friends
    if (name.endsWith('.ts')) return false; // schema types stay ours
    // geg's own README describes the same categories PROVENANCE.md does. An
    // un-maintained copy of another repo's doc only rots — skip it.
    return name !== 'README.md';
  }
});

const categories = readdirSync(DEST, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => ({
    name: d.name,
    count: readdirSync(join(DEST, d.name)).filter(f => f.endsWith('.json'))
      .length
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const total = categories.reduce((n, c) => n + c.count, 0);

writeFileSync(
  join(DEST, 'PROVENANCE.md'),
  `# geg conformance vectors — vendored copy

**Do not hand-edit.** Regenerate with:

\`\`\`bash
node scripts/sync-geg-vectors.mjs /path/to/generalised-el-gamal
\`\`\`

| | |
|---|---|
| Source repo | \`generalised-el-gamal\` |
| Source path | \`tests/vectors/\` |
| Commit | \`${commit}\` |
| Commit date / subject | ${describe || 'n/a'} |
| Vectors | ${total} across ${categories.length} categories |

${categories.map(c => `- \`${c.name}/\` — ${c.count}`).join('\n')}

## Why these are checked in

\`tests/geg-parity.test.ts\` in this package is a **blocking gate**: it proves the pinned
\`@shutter-network/urban-verified-crypto\` build agrees byte-for-byte with what
geg's Python implementation verifies, which is the premise the whole integration
rests on. A gate that skips when a sibling checkout is missing is not a gate, so
the vectors live here and CI runs them unconditionally.

## Do not regenerate these locally

The corpus is geg-owned. The only thing that may rewrite it is
\`sync-geg-vectors.mjs\`, pointed at a geg checkout. Producing the vectors from
this side instead would leave the gate passing while it verified nothing but its
own output.

Every file here is accounted for: the gate fails if a vector on disk is neither
checked directly nor listed as covered through a composite path, so a vector geg
adds later cannot be silently skipped.
`
);

console.log(
  `sync-geg-vectors: copied ${total} vectors (${categories.length} categories) from ${commit.slice(0, 12)}`
);
