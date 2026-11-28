import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InputNumber from './InputNumber.vue';

const meta = { title: 'Ui/InputNumber', component: InputNumber } satisfies Meta;

export default meta;
type Story = StoryObj;

const definition = { type: 'number', title: 'Quorum', examples: ['0'] };

const render =
  (value: unknown): Story['render'] =>
  args => ({
    components: { InputNumber },
    setup: () => ({ args, value: ref(value) }),
    template: '<InputNumber v-model="value" v-bind="args" />'
  });

export const Empty: Story = { args: { definition }, render: render('') };
export const Filled: Story = { args: { definition }, render: render(42) };
export const WithError: Story = {
  args: { definition, error: 'This field is invalid', required: true },
  render: render(42)
};
