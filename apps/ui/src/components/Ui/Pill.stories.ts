import { Meta, StoryObj } from '@storybook/vue3-vite';
import Pill from './Pill.vue';

const meta = {
  title: 'Ui/Pill',
  component: Pill,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'primary']
    }
  }
} satisfies Meta<typeof Pill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: '42'
  }
};

export const Secondary: Story = {
  args: {
    label: 'Beta',
    variant: 'secondary'
  }
};

export const Primary: Story = {
  args: {
    label: 'Recent',
    variant: 'primary'
  }
};

export const Role: Story = {
  args: {
    label: 'admin'
  }
};

export const LargeCount: Story = {
  args: {
    label: '1.2K'
  }
};
