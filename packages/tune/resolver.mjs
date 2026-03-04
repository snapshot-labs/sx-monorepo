import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @returns {import('unplugin-vue-components').ComponentResolver} */
export function TuneResolver() {
  return {
    type: 'component',
    resolve(name) {
      if (name.startsWith('Ui')) {
        const path = resolve(__dirname, `src/components/Ui/${name.slice(2)}.vue`);
        if (existsSync(path)) {
          return {
            name: 'default',
            from: `@snapshot-labs/tune/src/components/Ui/${name.slice(2)}.vue`
          };
        }
      }
    }
  };
}
