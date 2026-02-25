import { Meta, StoryObj } from '@storybook/vue3-vite';
import ModalSearchInput from './ModalSearchInput.vue';

const meta = {
  title: 'Ui/ModalSearchInput',
  component: ModalSearchInput,
  tags: ['autodocs']
} satisfies Meta<typeof ModalSearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    modelValue: '',
    placeholder: 'Search'
  }
};

export const CustomPlaceholder: Story = {
  args: {
    modelValue: '',
    placeholder: 'Search name or paste address'
  }
};

export const WithValue: Story = {
  args: {
    modelValue: '0x1234...',
    placeholder: 'Search name or paste address'
  }
};
