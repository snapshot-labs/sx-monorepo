import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InputCheckbox from './InputCheckbox.vue';

const meta = {
  title: 'Ui/InputCheckbox',
  component: InputCheckbox
} satisfies Meta;

export default meta;
type Story = StoryObj;

const definition = { type: 'boolean', title: 'Hide abstain' };

const render =
  (value: unknown): Story['render'] =>
  args => ({
    components: { InputCheckbox },
    setup: () => ({ args, value: ref(value) }),
    template: '<InputCheckbox v-model="value" v-bind="args" />'
  });

export const Empty: Story = { args: { definition }, render: render(false) };
export const Filled: Story = { args: { definition }, render: render(true) };
export const WithError: Story = {
  args: { definition, error: 'This field is invalid', required: true },
  render: render(true)
};
