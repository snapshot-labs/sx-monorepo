import { Meta, StoryObj } from '@storybook/vue3-vite';
import Label from './Label.vue';

const meta = {
  title: 'Ui/Label',
  component: Label,
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    isActive: { control: 'boolean' },
    count: { control: 'number' }
  }
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: 'Label',
    isActive: false
  }
};

export const Active: Story = {
  args: {
    text: 'Active label',
    isActive: true
  }
};

export const WithCount: Story = {
  args: {
    text: 'Label with count',
    count: 42,
    isActive: false
  }
};

export const ActiveWithCount: Story = {
  args: {
    text: 'Active label with count',
    count: 123,
    isActive: true
  }
};
