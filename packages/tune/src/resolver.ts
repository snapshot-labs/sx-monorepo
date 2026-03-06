import { ComponentResolver } from 'unplugin-vue-components';

const components = [
  'Checkbox',
  'Loading',
  'Switch',
  'Tooltip',
  'TooltipOnTruncate'
];

export function TuneResolver(): ComponentResolver {
  return {
    type: 'component',
    resolve(name) {
      if (name.startsWith('Ui')) {
        const componentName = name.slice(2);
        if (components.includes(componentName)) {
          return {
            name: `Ui${componentName}`,
            from: '@snapshot-labs/tune'
          };
        }
      }
    }
  };
}
