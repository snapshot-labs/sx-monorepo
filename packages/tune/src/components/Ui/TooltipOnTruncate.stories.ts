import { Meta, StoryObj } from '@storybook/vue3-vite';
import TooltipOnTruncate from './TooltipOnTruncate.vue';

const meta = {
  title: 'Ui/TooltipOnTruncate',
  component: TooltipOnTruncate,
  tags: ['autodocs'],
  args: {
    content: ''
  }
} satisfies Meta<typeof TooltipOnTruncate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Truncated: Story = {
  render: args => ({
    components: { TooltipOnTruncate },
    setup: () => ({ args }),
    template: `
      <div style="width: 150px; display: flex">
        <TooltipOnTruncate v-bind="args">
          This is a very long text that will be truncated
        </TooltipOnTruncate>
      </div>
    `
  })
};

export const NotTruncated: Story = {
  render: args => ({
    components: { TooltipOnTruncate },
    setup: () => ({ args }),
    template: `
      <div style="width: 300px; display: flex">
        <TooltipOnTruncate v-bind="args">
          Short text
        </TooltipOnTruncate>
      </div>
    `
  })
};

export const WithContentProp: Story = {
  args: {
    content: 'Custom tooltip content'
  },
  render: args => ({
    components: { TooltipOnTruncate },
    setup: () => ({ args }),
    template: `
      <div style="width: 150px; display: flex">
        <TooltipOnTruncate v-bind="args">
          This is a very long text that will be truncated
        </TooltipOnTruncate>
      </div>
    `
  })
};
