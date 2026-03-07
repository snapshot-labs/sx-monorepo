import { Meta, StoryObj } from '@storybook/vue3-vite';
import SelectorCard from './SelectorCard.vue';

const meta = {
  title: 'Ui/SelectorCard',
  component: SelectorCard,
  tags: ['autodocs'],
  argTypes: {
    selected: { control: 'boolean' }
  }
} satisfies Meta<typeof SelectorCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    item: {
      key: 'basic',
      label: 'Basic voting',
      description: 'Any wallet can vote on proposals'
    }
  }
};

export const Selected: Story = {
  args: {
    item: {
      key: 'basic',
      label: 'Basic voting',
      description: 'Any wallet can vote on proposals'
    },
    selected: true
  }
};

export const WithTag: Story = {
  args: {
    item: {
      key: 'weighted',
      label: 'Weighted voting',
      description: 'Votes are weighted by token balance',
      tag: 'Popular'
    }
  }
};
