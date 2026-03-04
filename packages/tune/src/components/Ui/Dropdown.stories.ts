import { Meta, StoryObj } from '@storybook/vue3-vite';
import Dropdown from './Dropdown.vue';
import DropdownItem from './DropdownItem.vue';

const meta = {
  title: 'Ui/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  argTypes: {
    placement: { control: 'select', options: ['start', 'end'] }
  }
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Dropdown, DropdownItem },
    setup() {
      return { args };
    },
    template: `
      <Dropdown v-bind="args">
        <template #button>
          <button class="px-3 py-2 border rounded">Open menu</button>
        </template>
        <template #items>
          <DropdownItem>Action 1</DropdownItem>
          <DropdownItem>Action 2</DropdownItem>
          <DropdownItem>Action 3</DropdownItem>
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
      <Dropdown v-bind="args">
        <template #button>
          <button class="px-3 py-2 border rounded opacity-50">Disabled menu</button>
        </template>
        <template #items>
          <DropdownItem>Action 1</DropdownItem>
        </template>
      </Dropdown>
    `
  }),
  args: {
    disabled: true
  }
};

export const PlacementStart: Story = {
  render: args => ({
    components: { Dropdown, DropdownItem },
    setup() {
      return { args };
    },
    template: `
      <div class="flex justify-end">
        <Dropdown v-bind="args">
          <template #button>
            <button class="px-3 py-2 border rounded">Start aligned</button>
          </template>
          <template #items>
            <DropdownItem>Action 1</DropdownItem>
            <DropdownItem>Action 2</DropdownItem>
          </template>
        </Dropdown>
      </div>
    `
  }),
  args: {
    placement: 'start'
  }
};
