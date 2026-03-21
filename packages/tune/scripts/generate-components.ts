import { globSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const uiFiles = globSync('src/components/Ui/*.vue');
const uiNames = uiFiles.map(f => basename(f, '.vue')).sort();

const rootFiles = globSync('src/components/*.vue');
const rootNames = rootFiles.map(f => basename(f, '.vue')).sort();

const uiExports = uiNames
  .map(
    name =>
      `export { default as Ui${name} } from './components/Ui/${name}.vue';`
  )
  .join('\n');

const rootExports = rootNames
  .map(
    name => `export { default as ${name} } from './components/${name}.vue';`
  )
  .join('\n');

const index = `// Styles
import './styles/index.scss';

// Plugin
export { createTune, TUNE_OPTIONS_KEY } from './plugin';
export type { TuneOptions } from './plugin';

// Composables
export { useRouter } from './composables/useRouter';

// Types
export type * from './types';
export type { StepRecords } from './components/Ui/Stepper.vue';

// Components (auto-generated, do not edit manually)
${rootExports}
${uiExports}
`;

const resolver = `import { ComponentResolver } from 'unplugin-vue-components';

const uiComponents = [
${uiNames.map(name => `  '${name}'`).join(',\n')}
];

const rootComponents = [
${rootNames.map(name => `  '${name}'`).join(',\n')}
];

export function TuneResolver(): ComponentResolver {
  return {
    type: 'component',
    resolve(name) {
      if (name.startsWith('Ui')) {
        const componentName = name.slice(2);
        if (uiComponents.includes(componentName)) {
          return {
            name: \`Ui\${componentName}\`,
            from: '@snapshot-labs/tune'
          };
        }
      }

      if (rootComponents.includes(name)) {
        return {
          name,
          from: '@snapshot-labs/tune'
        };
      }
    }
  };
}
`;

writeFileSync('src/index.ts', index);
writeFileSync('src/resolver.ts', resolver);

const allNames = [...rootNames, ...uiNames];
console.log(
  `Generated exports for ${allNames.length} components: ${allNames.join(', ')}`
);
