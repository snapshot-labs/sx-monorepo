import { Meta, StoryObj } from '@storybook/vue3-vite';
import ColumnHeaderItemSortable from './ColumnHeaderItemSortable.vue';

const meta = {
  title: 'Ui/ColumnHeaderItemSortable',
  component: ColumnHeaderItemSortable,
  tags: ['autodocs'],
  argTypes: {
    isOrdered: { control: 'boolean' },
    orderDirection: { control: 'select', options: ['asc', 'desc'] }
  }
} satisfies Meta<typeof ColumnHeaderItemSortable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unordered: Story = {
  args: {
    isOrdered: false,
    orderDirection: 'asc',
    default: 'Name'
  }
};

export const OrderedAsc: Story = {
  args: {
    isOrdered: true,
    orderDirection: 'asc',
    default: 'Name'
  }
};

export const OrderedDesc: Story = {
  args: {
    isOrdered: true,
    orderDirection: 'desc',
    default: 'Name'
  }
};
