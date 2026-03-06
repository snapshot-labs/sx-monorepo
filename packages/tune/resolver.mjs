/** @returns {import('unplugin-vue-components').ComponentResolver} */
export function TuneResolver() {
  const components = [
    'Checkbox',
    'Loading',
    'Switch',
    'Tooltip',
    'TooltipOnTruncate'
  ];

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
