import type { Meta, StoryObj } from '@storybook/vue3-vite';
import RawInputString from './RawInputString.vue';

const meta = {
  title: 'Ui/RawInputString',
  component: RawInputString,
  tags: ['autodocs']
} satisfies Meta<typeof RawInputString>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    modelValue: ''
  },
  render: args => ({
    components: { RawInputString },
    setup() {
      return { args };
    },
    template:
      '<RawInputString v-bind="args" aria-label="Name" placeholder="Name" style="border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px;" />'
  })
};
