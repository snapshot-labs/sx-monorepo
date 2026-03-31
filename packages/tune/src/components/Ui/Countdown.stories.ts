import type { Meta, StoryObj } from '@storybook/vue3-vite';
import Countdown from './Countdown.vue';

const meta = {
  title: 'Ui/Countdown',
  component: Countdown,
  tags: ['autodocs']
} satisfies Meta<typeof Countdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneHour: Story = {
  args: {
    timestamp: Math.floor(Date.now() / 1000) + 3600
  }
};

export const OneDay: Story = {
  args: {
    timestamp: Math.floor(Date.now() / 1000) + 86400
  }
};

export const MultipleDays: Story = {
  args: {
    timestamp: Math.floor(Date.now() / 1000) + 86400 * 3 + 3661
  }
};
