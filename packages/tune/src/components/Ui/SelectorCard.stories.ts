import type { Meta, StoryObj } from '@storybook/vue3-vite';
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
      key: 'option-1',
      label: 'Option 1',
      description: 'Description for this option'
    },
    selected: false
  }
};

export const Selected: Story = {
  args: {
    item: {
      key: 'option-1',
      label: 'Option 1',
      description: 'Description for this option'
    },
    selected: true
  }
};

export const WithTag: Story = {
  args: {
    item: {
      key: 'option-1',
      label: 'Option 1',
      description: 'Description for this option',
      tag: 'Beta'
    },
    selected: false
  }
};
