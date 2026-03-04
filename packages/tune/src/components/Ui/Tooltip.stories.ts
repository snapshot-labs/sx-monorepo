import { Meta, StoryObj } from '@storybook/vue3-vite';
import Tooltip from './Tooltip.vue';

const meta = {
  title: 'Ui/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  args: {
    title: 'Tooltip text',
    default: 'Hover me'
  },
  argTypes: {
    placement: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right']
    }
  }
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'This is a tooltip',
    default: 'Hover me'
  }
};

export const Bottom: Story = {
  args: {
    title: 'Tooltip on bottom',
    placement: 'bottom',
    default: 'Hover me'
  }
};

export const Left: Story = {
  args: {
    title: 'Tooltip on left',
    placement: 'left',
    default: 'Hover me'
  }
};

export const Right: Story = {
  args: {
    title: 'Tooltip on right',
    placement: 'right',
    default: 'Hover me'
  }
};
