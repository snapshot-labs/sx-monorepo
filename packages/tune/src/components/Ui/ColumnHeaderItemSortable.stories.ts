import type { Meta, StoryObj } from '@storybook/vue3-vite';
import ColumnHeaderItemSortable from './ColumnHeaderItemSortable.vue';

const meta = {
  title: 'Ui/ColumnHeaderItemSortable',
  component: ColumnHeaderItemSortable
} satisfies Meta<typeof ColumnHeaderItemSortable>;

export default meta;
type Story = StoryObj<typeof meta>;

const render: Story['render'] = args => ({
  components: { ColumnHeaderItemSortable },
  setup: () => ({ args }),
  template:
    '<ColumnHeaderItemSortable v-bind="args">Voting power</ColumnHeaderItemSortable>'
});

export const Descending: Story = {
  args: { isOrdered: true, orderDirection: 'desc' },
  render
};
export const Ascending: Story = {
  args: { isOrdered: true, orderDirection: 'asc' },
  render
};
export const Unordered: Story = {
  args: { isOrdered: false, orderDirection: 'desc' },
  render
};
