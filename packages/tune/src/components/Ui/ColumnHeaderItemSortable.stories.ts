import { Meta, StoryObj } from '@storybook/vue3-vite';
import { fn } from 'storybook/test';
import ColumnHeaderItemSortable from './ColumnHeaderItemSortable.vue';

const meta = {
  title: 'Ui/ColumnHeaderItemSortable',
  component: ColumnHeaderItemSortable,
  tags: ['autodocs'],
  args: {
    onSortChange: fn()
  }
} satisfies Meta<typeof ColumnHeaderItemSortable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOrdered: false,
    orderDirection: 'asc',
    default: 'Column Name'
  }
};

export const Ascending: Story = {
  args: {
    isOrdered: true,
    orderDirection: 'asc',
    default: 'Column Name'
  }
};

export const Descending: Story = {
  args: {
    isOrdered: true,
    orderDirection: 'desc',
    default: 'Column Name'
  }
};
