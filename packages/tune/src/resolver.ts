import type { ComponentResolver } from 'unplugin-vue-components';

const components = [
  'Affix',
  'Alert',
  'Button',
  'Calendar',
  'Carousel',
  'Checkbox',
  'ColumnHeader',
  'ColumnHeaderItemSortable',
  'Combobox',
  'Container',
  'ContainerInfiniteScroll',
  'ContainerSettings',
  'Countdown',
  'Dropdown',
  'DropdownItem',
  'Eyebrow',
  'InputAmount',
  'InputCheckbox',
  'InputColor',
  'InputDuration',
  'InputNumber',
  'InputString',
  'Label',
  'LinkPreview',
  'Loading',
  'Message',
  'Modal',
  'ModalSearchInput',
  'Pill',
  'RawInputAmount',
  'RawInputString',
  'ReorderList',
  'ScrollerHorizontal',
  'SectionHeader',
  'Select',
  'SelectDropdown',
  'SelectMultiple',
  'Selector',
  'SelectorCard',
  'SelectorGroup',
  'StateWarning',
  'Stepper',
  'Switch',
  'Tab',
  'Tabs',
  'Textarea',
  'Toaster',
  'ToolbarBottom',
  'Tooltip',
  'TooltipOnTruncate',
  'WrapperInput'
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
