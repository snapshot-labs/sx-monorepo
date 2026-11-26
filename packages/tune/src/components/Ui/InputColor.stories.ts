import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InputColor from './InputColor.vue';

const meta = { title: 'Ui/InputColor', component: InputColor } satisfies Meta;

export default meta;
type Story = StoryObj;

const definition = {
  type: 'string',
  format: 'color',
  title: 'Brand color',
  examples: ['#000000']
};

const render =
  (value: unknown): Story['render'] =>
  args => ({
    components: { InputColor },
    setup: () => ({ args, value: ref(value) }),
    template: '<InputColor v-model="value" v-bind="args" />'
  });

export const Empty: Story = { args: { definition }, render: render('') };
export const Filled: Story = {
  args: { definition },
  render: render('#EB4C5B')
};
export const WithError: Story = {
  args: { definition, error: 'This field is invalid', required: true },
  render: render('#EB4C5B')
};
