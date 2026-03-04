import { Meta, StoryObj } from '@storybook/vue3-vite';
import Countdown from './Countdown.vue';

const meta = {
  title: 'Ui/Countdown',
  component: Countdown,
  tags: ['autodocs']
} satisfies Meta<typeof Countdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    timestamp: Math.floor(Date.now() / 1000) + 3600
  }
};
