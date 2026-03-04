import { Meta, StoryObj } from '@storybook/vue3-vite';
import TooltipOnTruncate from './TooltipOnTruncate.vue';

const meta = {
  title: 'Ui/TooltipOnTruncate',
  component: TooltipOnTruncate,
  tags: ['autodocs'],
  decorators: [
    () => ({
      template: '<div style="display: flex; width: 200px"><story /></div>'
    })
  ]
} satisfies Meta<typeof TooltipOnTruncate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Truncated: Story = {
  args: {
    content:
      'This is a very long text that will be truncated and show a tooltip on hover'
  }
};

export const NotTruncated: Story = {
  args: {
    content: 'Short text'
  }
};
