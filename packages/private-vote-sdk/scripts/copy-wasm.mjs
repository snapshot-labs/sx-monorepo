// Cross-platform replacement for `cp src/crypto/blst/blst.wasm dist/blst.wasm`.
// Also mirrors blst.{js,wasm} into apps/ui/public/ so the browser bundle's
// runtime <script src="/blst.js"> tag can resolve the WASM loader from the
// dev/preview server's public root.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcWasm = join(root, 'src', 'crypto', 'blst', 'blst.wasm');
const srcJs = join(root, 'src', 'crypto', 'blst', 'blst.js');

const targets = [
  join(root, 'dist', 'blst.wasm'),
  join(root, '..', '..', 'apps', 'ui', 'public', 'blst.wasm')
];
const jsTargets = [
  join(root, '..', '..', 'apps', 'ui', 'public', 'blst.js')
];

for (const dst of targets) {
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(srcWasm, dst);
  console.log(`copied ${srcWasm} -> ${dst}`);
}

if (existsSync(srcJs)) {
  for (const dst of jsTargets) {
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(srcJs, dst);
    console.log(`copied ${srcJs} -> ${dst}`);
  }
}

