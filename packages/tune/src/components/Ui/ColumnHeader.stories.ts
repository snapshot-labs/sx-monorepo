import { Meta, StoryObj } from '@storybook/vue3-vite';
import ColumnHeader from './ColumnHeader.vue';
import ColumnHeaderItem from './ColumnHeaderItem.vue';

const meta = {
  title: 'Ui/ColumnHeader',
  component: ColumnHeader,
  tags: ['autodocs']
} satisfies Meta<typeof ColumnHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ColumnHeader, ColumnHeaderItem },
    template: `
      <ColumnHeader class="px-4 gap-3">
        <ColumnHeaderItem style="width: 60%">Space</ColumnHeaderItem>
        <ColumnHeaderItem style="width: 20%">Proposals</ColumnHeaderItem>
        <ColumnHeaderItem style="width: 20%">Votes</ColumnHeaderItem>
      </ColumnHeader>
    `
  })
};
