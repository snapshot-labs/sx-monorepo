import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InputAmount from './InputAmount.vue';

const meta = { title: 'Ui/InputAmount', component: InputAmount } satisfies Meta;

export default meta;
type Story = StoryObj;

const definition = {
  type: 'string',
  format: 'amount',
  title: 'Amount',
  examples: ['0']
};

const render =
  (value: unknown): Story['render'] =>
  args => ({
    components: { InputAmount },
    setup: () => ({ args, value: ref(value) }),
    template: '<InputAmount v-model="value" v-bind="args" />'
  });

export const Empty: Story = { args: { definition }, render: render('') };
export const Filled: Story = { args: { definition }, render: render('1250.5') };
export const WithError: Story = {
  args: { definition, error: 'This field is invalid', required: true },
  render: render('1250.5')
};
