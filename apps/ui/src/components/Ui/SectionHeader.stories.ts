import { Meta, StoryObj } from '@storybook/vue3-vite';
import SectionHeader from './SectionHeader.vue';

const meta = {
  title: 'Ui/SectionHeader',
  component: SectionHeader,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' }
  }
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Section Header'
  }
};
