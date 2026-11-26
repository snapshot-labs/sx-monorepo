import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import SelectMultiple from './SelectMultiple.vue';

const meta = {
  title: 'Ui/SelectMultiple'
} satisfies Meta;

export default meta;
type Story = StoryObj;

const definition = {
  type: 'array',
  title: 'Networks',
  enum: ['eth', 'base', 'arb'],
  options: [
    { id: 'eth', name: 'Ethereum' },
    { id: 'base', name: 'Base' },
    { id: 'arb', name: 'Arbitrum' }
  ],
  maxItems: 2
};

const render =
  (value: unknown): Story['render'] =>
  args => ({
    components: { SelectMultiple },
    setup: () => ({ args, value: ref(value) }),
    template: '<SelectMultiple v-model="value" v-bind="args" />'
  });

export const Empty: Story = { args: { definition }, render: render([]) };
export const Filled: Story = {
  args: { definition },
  render: render(['eth', 'base'])
};
export const WithError: Story = {
  args: { definition, error: 'This field is invalid', required: true },
  render: render(['eth', 'base'])
};
