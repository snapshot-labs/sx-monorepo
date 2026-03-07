import { Meta, StoryObj } from '@storybook/vue3-vite';
import Dropdown from './Dropdown.vue';

const meta = {
  title: 'Ui/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  argTypes: {
    placement: { control: 'select', options: ['start', 'end'] },
    gap: { control: 'text' },
    disabled: { control: 'boolean' }
  }
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Dropdown },
    setup: () => ({ args }),
    template: `
      <Dropdown v-bind="args">
        <template #button>
          <button class="border px-3 py-2 rounded">Open menu</button>
        </template>
        <template #items>
          <div class="px-3 py-2 hover:bg-skin-text/10 cursor-pointer">Option 1</div>
          <div class="px-3 py-2 hover:bg-skin-text/10 cursor-pointer">Option 2</div>
          <div class="px-3 py-2 hover:bg-skin-text/10 cursor-pointer">Option 3</div>
        </template>
      </Dropdown>
    `
  })
};

export const PlacementStart: Story = {
  render: args => ({
    components: { Dropdown },
    setup: () => ({ args }),
    template: `
      <div class="flex justify-center">
        <Dropdown v-bind="args">
          <template #button>
            <button class="border px-3 py-2 rounded">Align start</button>
          </template>
          <template #items>
            <div class="px-3 py-2 hover:bg-skin-text/10 cursor-pointer">Option 1</div>
            <div class="px-3 py-2 hover:bg-skin-text/10 cursor-pointer">Option 2</div>
          </template>
        </Dropdown>
      </div>
    `
  }),
  args: {
    placement: 'start'
  }
};
