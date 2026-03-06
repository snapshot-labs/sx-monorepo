import { Meta, StoryObj } from '@storybook/vue3-vite';
import StateWarning from './StateWarning.vue';

const meta = {
  title: 'Ui/StateWarning',
  component: StateWarning,
  tags: ['autodocs']
} satisfies Meta<typeof StateWarning>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    default: 'This is a warning message'
  }
};
