import type { Meta, StoryObj } from '@storybook/vue3-vite';
import Tooltip from './Tooltip.vue';

const meta = {
  title: 'Ui/Tooltip',
  component: Tooltip,
  tags: ['autodocs']
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'This is a tooltip'
  },
  render: args => ({
    components: { Tooltip },
    setup() {
      return { args };
    },
    template: '<Tooltip v-bind="args">Hover me</Tooltip>'
  })
};
