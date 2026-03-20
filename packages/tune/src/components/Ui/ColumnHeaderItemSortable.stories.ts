import { Meta, StoryObj } from '@storybook/vue3-vite';
import ColumnHeaderItemSortable from './ColumnHeaderItemSortable.vue';

const meta = {
  title: 'Ui/ColumnHeaderItemSortable',
  component: ColumnHeaderItemSortable,
  tags: ['autodocs'],
  argTypes: {
    isOrdered: { control: 'boolean' },
    orderDirection: {
      control: 'select',
      options: ['asc', 'desc']
    }
  }
} satisfies Meta<typeof ColumnHeaderItemSortable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOrdered: false,
    orderDirection: 'desc'
  },
  render: args => ({
    components: { ColumnHeaderItemSortable },
    setup() {
      return { args };
    },
    template:
      '<ColumnHeaderItemSortable v-bind="args">Column</ColumnHeaderItemSortable>'
  })
};

export const OrderedDesc: Story = {
  args: {
    isOrdered: true,
    orderDirection: 'desc'
  },
  render: args => ({
    components: { ColumnHeaderItemSortable },
    setup() {
      return { args };
    },
    template:
      '<ColumnHeaderItemSortable v-bind="args">Column</ColumnHeaderItemSortable>'
  })
};

export const OrderedAsc: Story = {
  args: {
    isOrdered: true,
    orderDirection: 'asc'
  },
  render: args => ({
    components: { ColumnHeaderItemSortable },
    setup() {
      return { args };
    },
    template:
      '<ColumnHeaderItemSortable v-bind="args">Column</ColumnHeaderItemSortable>'
  })
};
