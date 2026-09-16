// Mirror the crypto SDK's blst.{js,wasm} into public/.
//
// `@shutter-network/urban-verified-crypto` loads its BLST build at runtime from
// the document root (`<script src="/blst.js">`), not through the bundler, so the
// two files have to sit in the dev/preview server's public root. Copying them at
// install time keeps a single source of truth — the installed package — rather
// than checked-in binaries that can silently drift from the pinned version.
//
// This mirrors what the generalised-el-gamal frontends do with the same package.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

// Resolve through the package entry point: the install may be hoisted to the
// workspace root, so a hardcoded ../../node_modules path is not reliable.
const distDir = dirname(
  require.resolve('@shutter-network/urban-verified-crypto')
);

mkdirSync(publicDir, { recursive: true });
for (const file of ['blst.js', 'blst.wasm']) {
  copyFileSync(join(distDir, file), join(publicDir, file));
  console.log(`copied ${file} -> apps/ui/public/${file}`);
}
