import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Textarea from './Textarea.vue';

const meta = { title: 'Ui/Textarea', component: Textarea } satisfies Meta;

export default meta;
type Story = StoryObj;

const definition = {
  type: 'string',
  format: 'long',
  title: 'About',
  examples: ['Tell people about your space'],
  maxLength: 160
};

const render =
  (value: unknown): Story['render'] =>
  args => ({
    components: { Textarea },
    setup: () => ({ args, value: ref(value) }),
    template: '<Textarea v-model="value" v-bind="args" />'
  });

export const Empty: Story = { args: { definition }, render: render('') };
export const Filled: Story = {
  args: { definition },
  render: render('A short description of the space.')
};
export const WithError: Story = {
  args: { definition, error: 'This field is invalid', required: true },
  render: render('A short description of the space.')
};
