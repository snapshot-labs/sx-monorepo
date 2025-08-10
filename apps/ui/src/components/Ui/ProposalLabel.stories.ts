import { Meta, StoryObj } from '@storybook/vue3-vite';
import ProposalLabel from './ProposalLabel.vue';

const meta = {
  title: 'Ui/ProposalLabel',
  component: ProposalLabel,
  tags: ['autodocs'],
  args: {
    label: 'Example Label',
    color: '#3B82F6'
  }
} satisfies Meta<typeof ProposalLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Default Label',
    color: '#3B82F6'
  }
};

export const LongLabel: Story = {
  args: {
    label: 'This is a very long label that should be truncated',
    color: '#3B82F6'
  }
};

export const ShortLabel: Story = {
  args: {
    label: 'Short',
    color: '#3B82F6'
  }
};

export const WithLink: Story = {
  args: {
    label: 'Clickable Label',
    color: '#3B82F6',
    to: 'https://docs.snapshot.box'
  }
};
