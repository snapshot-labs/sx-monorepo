import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InputString from './InputString.vue';

const meta = { title: 'Ui/InputString', component: InputString } satisfies Meta;

export default meta;
type Story = StoryObj;

const definition = {
  type: 'string',
  title: 'Name',
  examples: ['Enter a name'],
  maxLength: 32,
  tooltip: 'Shown on your profile'
};

const render =
  (value: unknown): Story['render'] =>
  args => ({
    components: { InputString },
    setup: () => ({ args, value: ref(value) }),
    template: '<InputString v-model="value" v-bind="args" />'
  });

export const Empty: Story = { args: { definition }, render: render('') };
export const Filled: Story = {
  args: { definition },
  render: render('Snapshot')
};
export const WithError: Story = {
  args: { definition, error: 'This field is invalid', required: true },
  render: render('Snapshot')
};
