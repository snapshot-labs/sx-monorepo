import { Menu, MenuItems } from '@headlessui/vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import DropdownItem from './DropdownItem.vue';

const meta = {
  title: 'Ui/DropdownItem',
  component: DropdownItem,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: { type: 'boolean' }
    }
  },
  decorators: [
    () => ({
      components: { Menu, MenuItems },
      template: '<Menu><MenuItems static><story /></MenuItems></Menu>'
    })
  ]
} satisfies Meta<typeof DropdownItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    default: 'Menu item'
  }
};

export const Disabled: Story = {
  args: {
    default: 'Disabled item',
    disabled: true
  }
};
