import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Combobox from './Combobox.vue';

const meta = { title: 'Ui/Combobox' } satisfies Meta;

export default meta;
type Story = StoryObj;

const definition = {
  type: 'number',
  title: 'Network',
  examples: ['Select a network'],
  enum: [1, 8453, 42161],
  options: [
    { id: 1, name: 'Ethereum' },
    { id: 8453, name: 'Base' },
    { id: 42161, name: 'Arbitrum' }
  ]
};

const render =
  (value: number | null): Story['render'] =>
  args => ({
    components: { Combobox },
    setup: () => ({ args, value: ref(value) }),
    template: '<Combobox v-model="value" v-bind="args" />'
  });

export const Empty: Story = { args: { definition }, render: render(null) };
export const Filled: Story = { args: { definition }, render: render(8453) };
export const WithError: Story = {
  args: { definition, error: 'Pick a network', required: true },
  render: render(null)
};
