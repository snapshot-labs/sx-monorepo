import { Meta, StoryObj } from '@storybook/vue3-vite';
import Label from './Label.vue';

const meta = {
  title: 'Ui/Label',
  component: Label,
  tags: ['autodocs'],
  args: {
    text: 'Proposals',
    isActive: false
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['md', 'lg']
    },
    isActive: {
      control: { type: 'boolean' }
    },
    count: {
      control: { type: 'number' }
    }
  }
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: 'Proposals'
  }
};

export const Active: Story = {
  args: {
    text: 'Proposals',
    isActive: true
  }
};

export const WithCount: Story = {
  args: {
    text: 'Proposals',
    isActive: true,
    count: 42
  }
};

export const WithLargeCount: Story = {
  args: {
    text: 'Votes',
    isActive: true,
    count: 12500
  }
};

export const Large: Story = {
  args: {
    text: 'Proposals',
    size: 'lg',
    isActive: true
  }
};

export const LargeWithCount: Story = {
  args: {
    text: 'Proposals',
    size: 'lg',
    isActive: true,
    count: 156
  }
};
