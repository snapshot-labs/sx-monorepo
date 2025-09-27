import { Meta, StoryObj } from '@storybook/vue3-vite';
import ColumnHeader from './ColumnHeader.vue';

const meta = {
  title: 'Ui/ColumnHeader',
  component: ColumnHeader,
  tags: ['autodocs']
} satisfies Meta<typeof ColumnHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ColumnHeader },
    template: `
      <ColumnHeader class="text-right">
        <span class="w-[60%] lg:w-[50%] text-left truncate">Space</span>
        <span class="w-[20%] lg:w-[25%] truncate">Proposals</span>
        <span class="w-[20%] lg:w-[25%] truncate">Votes</span>
      </ColumnHeader>
    `
  })
};
