import { Meta, StoryObj } from '@storybook/vue3-vite';
import Dropdown from './Dropdown.vue';
import DropdownItem from './DropdownItem.vue';

const meta = {
  title: 'Ui/DropdownItem',
  component: DropdownItem,
  tags: ['autodocs']
} satisfies Meta<typeof DropdownItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Dropdown, DropdownItem },
    setup() {
      return { args };
    },
    template: `
      <Dropdown>
        <template #button>
          <button class="px-3 py-2 border rounded">Open menu</button>
        </template>
        <template #items>
          <DropdownItem v-bind="args">Default item</DropdownItem>
        </template>
      </Dropdown>
    `
  })
};

export const Disabled: Story = {
  render: args => ({
    components: { Dropdown, DropdownItem },
    setup() {
      return { args };
    },
    template: `
      <Dropdown>
        <template #button>
          <button class="px-3 py-2 border rounded">Open menu</button>
        </template>
        <template #items>
          <DropdownItem>Enabled item</DropdownItem>
          <DropdownItem v-bind="args">Disabled item</DropdownItem>
        </template>
      </Dropdown>
    `
  }),
  args: {
    disabled: true
  }
};
