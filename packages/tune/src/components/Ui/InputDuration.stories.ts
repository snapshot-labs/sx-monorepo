import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InputDuration from './InputDuration.vue';

const meta = {
  title: 'Ui/InputDuration',
  component: InputDuration
} satisfies Meta;

export default meta;
type Story = StoryObj;

const definition = {
  type: 'integer',
  format: 'duration',
  title: 'Voting period',
  tooltip: 'How long voting lasts'
};

const render =
  (value: unknown): Story['render'] =>
  args => ({
    components: { InputDuration },
    setup: () => ({ args, value: ref(value) }),
    template: '<InputDuration v-model="value" v-bind="args" />'
  });

export const Empty: Story = { args: { definition }, render: render(0) };
export const Filled: Story = {
  args: { definition },
  render: render(3 * 24 * 60 * 60 + 2 * 60 * 60)
};
export const WithError: Story = {
  args: { definition, error: 'This field is invalid', required: true },
  render: render(3 * 24 * 60 * 60 + 2 * 60 * 60)
};
