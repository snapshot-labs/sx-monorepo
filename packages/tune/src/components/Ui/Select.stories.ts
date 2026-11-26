import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Select from './Select.vue';

const meta = { title: 'Ui/Select' } satisfies Meta;

export default meta;
type Story = StoryObj;

const definition = {
  type: 'string',
  title: 'Voting type',
  enum: ['basic', 'single-choice'],
  options: [
    { id: 'basic', name: 'Basic' },
    { id: 'single-choice', name: 'Single choice' }
  ]
};

const render =
  (value: unknown): Story['render'] =>
  args => ({
    components: { Select },
    setup: () => ({ args, value: ref(value) }),
    template: '<Select v-model="value" v-bind="args" />'
  });

export const Empty: Story = { args: { definition }, render: render('') };
export const Filled: Story = { args: { definition }, render: render('basic') };
export const WithError: Story = {
  args: { definition, error: 'This field is invalid', required: true },
  render: render('basic')
};
