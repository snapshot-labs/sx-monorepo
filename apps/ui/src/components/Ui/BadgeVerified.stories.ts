import { Meta, StoryObj } from '@storybook/vue3-vite';
import BadgeVerified from './BadgeVerified.vue';

const meta = {
  title: 'Ui/BadgeVerified',
  component: BadgeVerified,
  tags: ['autodocs'],
  args: {
    verified: false
  }
} satisfies Meta<typeof BadgeVerified>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Verified: Story = {
  args: {
    verified: true,
    turbo: false
  }
};

export const Turbo: Story = {
  args: {
    verified: false,
    turbo: true
  }
};
