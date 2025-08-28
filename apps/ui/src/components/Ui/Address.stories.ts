import { Meta, StoryObj } from '@storybook/vue3-vite';
import Address from './Address.vue';

const meta = {
  title: 'Ui/Address',
  component: Address,
  tags: ['autodocs'],
  argTypes: {
    copyButton: {
      control: { type: 'select' },
      options: ['always', 'hover']
    }
  }
} satisfies Meta<typeof Address>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    address: '0x1234567890123456789012345678901234567890',
    copyButton: 'hover'
  }
};

export const WithAlwaysShowCopyButton: Story = {
  args: {
    address: '0x1234567890123456789012345678901234567890',
    copyButton: 'always'
  }
};
