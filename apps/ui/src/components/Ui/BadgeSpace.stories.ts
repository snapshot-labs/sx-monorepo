import { Meta, StoryObj } from '@storybook/vue3-vite';
import BadgeSpace from './BadgeSpace.vue';

const meta = {
  title: 'Ui/BadgeSpace',
  component: BadgeSpace,
  tags: ['autodocs'],
  args: {
    verified: false
  }
} satisfies Meta<typeof BadgeSpace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Verified: Story = {
  args: {
    verified: true,
    turbo: false,
    flagged: false
  }
};

export const Turbo: Story = {
  args: {
    verified: false,
    turbo: true,
    flagged: false
  }
};

export const Flagged: Story = {
  args: {
    verified: false,
    turbo: false,
    flagged: true
  }
};
