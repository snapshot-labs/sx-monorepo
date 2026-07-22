import { defineConfig } from 'tsup';
import { copyFile } from 'fs/promises';
import { join } from 'path';
export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    async onSuccess() {
        await copyFile(
            join(__dirname, 'src/crypto/blst/blst.js'),
            join(__dirname, 'dist/blst.js')
        );
    }
});