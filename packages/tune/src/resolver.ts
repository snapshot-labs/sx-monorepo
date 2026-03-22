import { ComponentResolver } from 'unplugin-vue-components';

const components = [
  'Alert',
  'Checkbox',
  'ColumnHeader',
  'ColumnHeaderItem',
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
