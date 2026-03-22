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
      <ColumnHeader>
        <ColumnHeaderItem class="w-[60%] lg:w-[50%]">Space</ColumnHeaderItem>
        <ColumnHeaderItem class="w-[20%] lg:w-[25%]">Proposals</ColumnHeaderItem>
        <ColumnHeaderItem class="w-[20%] lg:w-[25%]">Votes</ColumnHeaderItem>
      </ColumnHeader>
    `
  })
};
