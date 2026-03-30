import { ComponentResolver } from 'unplugin-vue-components';

const uiComponents = [
  'Affix',
  'Alert',
  'Button',
  'Calendar',
  'Carousel',
  'Checkbox',
  'ColumnHeader',
  'ContainerInfiniteScroll',
  'Countdown',
  'Dropdown',
  'DropdownItem',
  'Eyebrow',
  'Label',
  'LinkPreview',
  'Loading',
  'Message',
  'ModalSearchInput',
  'Pill',
  'RawInputAmount',
  'ScrollerHorizontal',
  'SectionHeader',
  'Selector',
  'SelectorCard',
  'StateWarning',
  'Stepper',
  'Switch',
  'Tooltip',
  'TooltipOnTruncate'
];

const rootComponents = ['AppLink'];

export function TuneResolver(): ComponentResolver {
  return {
    type: 'component',
    resolve(name) {
      if (name.startsWith('Ui')) {
        const componentName = name.slice(2);
        if (uiComponents.includes(componentName)) {
          return {
            name: `Ui${componentName}`,
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
