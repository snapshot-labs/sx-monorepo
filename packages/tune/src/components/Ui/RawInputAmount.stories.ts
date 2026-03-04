import { Meta, StoryObj } from '@storybook/vue3-vite';
import RawInputAmount from './RawInputAmount.vue';

const meta = {
  title: 'Ui/RawInputAmount',
  component: RawInputAmount,
  tags: ['autodocs']
} satisfies Meta<typeof RawInputAmount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    modelValue: '0'
  }
};

export const WithDecimals: Story = {
  args: {
    modelValue: '1.5',
    decimals: 2
  }
};
