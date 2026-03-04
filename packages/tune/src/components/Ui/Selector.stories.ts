import { Meta, StoryObj } from '@storybook/vue3-vite';
import Selector from './Selector.vue';

const meta = {
  title: 'Ui/Selector',
  component: Selector,
  tags: ['autodocs']
} satisfies Meta<typeof Selector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isActive: false,
    default: 'Basic voting'
  }
};

export const Active: Story = {
  args: {
    isActive: true,
    default: 'Basic voting'
  }
};
