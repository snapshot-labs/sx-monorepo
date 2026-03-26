import { readdirSync, writeFileSync } from 'node:fs';

const names = readdirSync('src/components/Ui')
  .filter((f: string) => f.endsWith('.vue'))
  .map((f: string) => f.replace('.vue', ''))
  .sort();

const indexExports = names
  .map(
    name =>
      `export { default as Ui${name} } from './components/Ui/${name}.vue';`
  )
  .join('\n');

const index = `// Styles
import './styles/index.scss';

// Plugin
export { createTune, TUNE_OPTIONS_KEY } from './plugin';
export type { TuneOptions } from './plugin';

// Types
export type * from './types';

// Components (auto-generated, do not edit manually)
${indexExports}
`;

const resolver = `import { ComponentResolver } from 'unplugin-vue-components';

const components = [
${names.map(name => `  '${name}'`).join(',\n')}
];

export function TuneResolver(): ComponentResolver {
  return {
    type: 'component',
    resolve(name) {
      if (name.startsWith('Ui')) {
        const componentName = name.slice(2);
        if (components.includes(componentName)) {
          return {
            name: \`Ui\${componentName}\`,
            from: '@snapshot-labs/tune'
          };
        }
      }
    }
  };
}
`;

writeFileSync('src/index.ts', index);
writeFileSync('src/resolver.ts', resolver);

console.log(
  `Generated exports for ${names.length} components: ${names.join(', ')}`
);
