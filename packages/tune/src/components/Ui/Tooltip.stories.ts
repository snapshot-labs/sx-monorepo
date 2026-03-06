import { Meta, StoryObj } from '@storybook/vue3-vite';
import Tooltip from './Tooltip.vue';

const meta = {
  title: 'Ui/Tooltip',
  component: Tooltip,
  tags: ['autodocs']
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Tooltip },
    setup() {
      return { args };
    },
    template: `
      <Tooltip v-bind="args">
        <button class="px-3 py-2 border rounded">Hover me</button>
      </Tooltip>
    `
  }),
  args: {
    title: 'Tooltip text'
  }
};

export const Bottom: Story = {
  render: args => ({
    components: { Tooltip },
    setup() {
      return { args };
    },
    template: `
      <Tooltip v-bind="args">
        <button class="px-3 py-2 border rounded">Hover me</button>
      </Tooltip>
    `
  }),
  args: {
    title: 'Tooltip text',
    placement: 'bottom'
  }
};
