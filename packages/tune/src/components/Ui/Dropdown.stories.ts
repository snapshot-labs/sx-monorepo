import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { defineComponent, provide, ref } from 'vue';
import { TUNE_OPTIONS_KEY } from '../../plugin';
import Dropdown from './Dropdown.vue';
import DropdownItem from './DropdownItem.vue';

const meta = {
  title: 'Ui/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  args: {
    disabled: false,
    gap: '8',
    placement: 'end'
  },
  argTypes: {
    placement: {
      control: { type: 'select' },
      options: ['start', 'end']
    },
    disabled: {
      control: { type: 'boolean' }
    },
    gap: {
      control: { type: 'text' }
    }
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
          <button class="px-3 py-2 border rounded">Open menu</button>
        </template>
        <template #items>
          <div class="px-3 py-2 cursor-pointer hover:opacity-80">Item 1</div>
          <div class="px-3 py-2 cursor-pointer hover:opacity-80">Item 2</div>
          <div class="px-3 py-2 cursor-pointer hover:opacity-80">Item 3</div>
        </template>
      </Dropdown>
    `
  })
};

export const PlacementStart: Story = {
  args: {
    placement: 'start'
  },
  render: args => ({
    components: { Dropdown },
    setup: () => ({ args }),
    template: `
      <div class="flex justify-center">
        <Dropdown v-bind="args">
          <template #button>
            <button class="px-3 py-2 border rounded">Aligned start</button>
          </template>
          <template #items>
            <div class="px-3 py-2 cursor-pointer hover:opacity-80">Item 1</div>
            <div class="px-3 py-2 cursor-pointer hover:opacity-80">Item 2</div>
          </template>
        </Dropdown>
      </div>
    `
  })
};

export const WithItems: Story = {
  render: args => ({
    components: { Dropdown, DropdownItem },
    setup: () => ({ args, clicked: ref('nothing') }),
    template: `
      <Dropdown v-bind="args">
        <template #button>
          <button class="px-3 py-2 border rounded">Actions</button>
        </template>
        <template #items>
          <DropdownItem @click="clicked = 'Edit'">Edit</DropdownItem>
          <DropdownItem disabled @click="clicked = 'Archive'">Archive</DropdownItem>
          <DropdownItem danger @click="clicked = 'Delete'">Delete</DropdownItem>
        </template>
      </Dropdown>
      <p class="mt-4">Clicked {{ clicked }}</p>
    `
  })
};

// A link component that declares its own `click` emit, like the app's AppLink
const EmitsClickLink = defineComponent({
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>'
});

export const WithLinkComponent: Story = {
  render: args => ({
    components: { Dropdown, DropdownItem },
    setup: () => {
      provide(TUNE_OPTIONS_KEY, { linkComponent: EmitsClickLink });
      return { args, clicked: ref('nothing') };
    },
    template: `
      <Dropdown v-bind="args">
        <template #button>
          <button class="px-3 py-2 border rounded">Actions</button>
        </template>
        <template #items>
          <DropdownItem @click="clicked = 'Edit'">Edit</DropdownItem>
        </template>
      </Dropdown>
      <p class="mt-4">Clicked {{ clicked }}</p>
    `
  })
};

export const Disabled: Story = {
  args: {
    disabled: true
  },
  render: args => ({
    components: { Dropdown },
    setup: () => ({ args }),
    template: `
      <Dropdown v-bind="args">
        <template #button>
          <button class="px-3 py-2 border rounded opacity-50">Disabled</button>
        </template>
        <template #items>
          <div class="px-3 py-2">Item 1</div>
        </template>
      </Dropdown>
    `
  })
};
