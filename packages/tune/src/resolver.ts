import { ComponentResolver } from 'unplugin-vue-components';

const components = [
  'Alert',
  'Button',
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
  'DropdownItem',
  'Eyebrow',
  'LinkPreview',
  'Loading',
  'Message',
  'ModalSearchInput',
  'Pill',
  'RawInputAmount',
  'ScrollerHorizontal',
  'SectionHeader',
  'SelectDropdown',
  'Selector',
  'SelectorCard',
  'StateWarning',
  'Stepper',
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
