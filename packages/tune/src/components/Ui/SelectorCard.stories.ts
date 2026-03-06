import { Meta, StoryObj } from '@storybook/vue3-vite';
import { fn } from 'storybook/test';
import SelectorCard from './SelectorCard.vue';

const meta = {
  title: 'Ui/SelectorCard',
  component: SelectorCard,
  tags: ['autodocs'],
  args: {
    onClick: fn()
  }
} satisfies Meta<typeof SelectorCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    item: {
      key: 'option-1',
      label: 'Standard',
      description: 'A standard execution strategy for your space'
    }
  }
};

export const Selected: Story = {
  args: {
    item: {
      key: 'option-1',
      label: 'Standard',
      description: 'A standard execution strategy for your space'
    },
    selected: true
  }
};

export const WithTag: Story = {
  args: {
    item: {
      key: 'option-2',
      label: 'Advanced',
      description: 'An advanced execution strategy with extra features',
      tag: 'Beta'
    }
  }
};
