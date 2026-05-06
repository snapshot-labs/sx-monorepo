import type { Meta, StoryObj } from '@storybook/vue3-vite';
import ColumnHeaderItem from './ColumnHeaderItem.vue';

const meta = {
  title: 'Ui/ColumnHeaderItem',
  component: ColumnHeaderItem,
  tags: ['autodocs'],
  args: {
    default: 'Column'
  },
  argTypes: {
    isOrdered: { control: 'boolean' },
    orderDirection: {
      control: 'select',
      options: [undefined, 'asc', 'desc']
    },
    onSortChange: { action: 'sortChange' }
  }
} satisfies Meta<typeof ColumnHeaderItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
