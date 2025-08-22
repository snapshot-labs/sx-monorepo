import { Meta, StoryObj } from '@storybook/vue3-vite';
import Link from './Link.vue';

const meta = {
  title: 'Ui/Link',
  component: Link,
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    isActive: { control: 'boolean' },
    count: { control: 'number' }
  }
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: 'Link',
    isActive: false
  }
};

export const Active: Story = {
  args: {
    text: 'Active Link',
    isActive: true
  }
};

export const WithCount: Story = {
  args: {
    text: 'Link with count',
    count: 42,
    isActive: false
  }
};

export const ActiveWithCount: Story = {
  args: {
    text: 'Active link with count',
    count: 123,
    isActive: true
  }
};
