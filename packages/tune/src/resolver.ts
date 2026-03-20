import { ComponentResolver } from 'unplugin-vue-components';

const components = [
  'Alert',
  'Carousel',
  'Checkbox',
  'ColumnHeader',
  'ColumnHeaderItemSortable',
  'Container',
  'ContainerInfiniteScroll',
  'ContainerSettings',
  'Eyebrow',
  'Loading',
  'ModalSearchInput',
  'Pill',
  'RawInputAmount',
  'ScrollerHorizontal',
  'SectionHeader',
  'Selector',
  'StateWarning',
  'Switch',
  'ToolbarBottom',
  'Tooltip',
  'TooltipOnTruncate',
  'Topnav'
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
