import { Meta, StoryObj } from '@storybook/vue3-vite';
import Dropdown from './Dropdown.vue';

const meta = {
  title: 'Ui/Dropdown',
  component: Dropdown,
  tags: ['autodocs']
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
          <button class="border rounded-full px-3 py-2">Options</button>
        </template>
        <template #items>
          <div class="px-3 py-2 hover:opacity-80 cursor-pointer">Edit</div>
          <div class="px-3 py-2 hover:opacity-80 cursor-pointer">Duplicate</div>
          <div class="px-3 py-2 hover:opacity-80 cursor-pointer">Delete</div>
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
      <div class="flex justify-end">
        <Dropdown v-bind="args" placement="start">
          <template #button>
            <button class="border rounded-full px-3 py-2">Options</button>
          </template>
          <template #items>
            <div class="px-3 py-2 hover:opacity-80 cursor-pointer">Edit</div>
            <div class="px-3 py-2 hover:opacity-80 cursor-pointer">Duplicate</div>
            <div class="px-3 py-2 hover:opacity-80 cursor-pointer">Delete</div>
          </template>
        </Dropdown>
      </div>
    `
  })
};
