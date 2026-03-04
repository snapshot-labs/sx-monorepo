import { Meta, StoryObj } from '@storybook/vue3-vite';
import Counter from './Counter.vue';

const meta = {
  title: 'Ui/Counter',
  component: Counter,
  tags: ['autodocs']
} satisfies Meta<typeof Counter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  args: { counter: 3 }
};

export const Double: Story = {
  args: { counter: 42 }
};

export const Triple: Story = {
  args: { counter: 128 }
};

export const Zero: Story = {
  args: { counter: 0 }
};
