import { ComponentResolver } from 'unplugin-vue-components';

const components = [
  'Alert',
  'Calendar',
  'Carousel',
  'Checkbox',
  'ColumnHeader',
  'ColumnHeaderItemSortable',
  'Container',
  'ContainerInfiniteScroll',
  'ContainerSettings',
  'Counter',
  'Dropdown',
  'Eyebrow',
  'LinkPreview',
  'Loading',
  'ModalSearchInput',
  'Pill',
  'RawInputAmount',
  'ScrollerHorizontal',
  'SectionHeader',
  'Selector',
  'SelectorCard',
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
