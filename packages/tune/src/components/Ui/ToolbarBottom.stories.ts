import { Meta, StoryObj } from '@storybook/vue3-vite';
import ToolbarBottom from './ToolbarBottom.vue';

const meta = {
  title: 'Ui/ToolbarBottom',
  component: ToolbarBottom,
  tags: ['autodocs']
} satisfies Meta<typeof ToolbarBottom>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ToolbarBottom },
    template: `
      <div class="relative h-[200px]">
        <div class="p-4">Page content above the toolbar</div>
        <ToolbarBottom>
          <div class="flex items-center justify-between p-3">
            <span>3 items selected</span>
            <button class="border px-3 py-1 rounded">Confirm</button>
          </div>
        </ToolbarBottom>
      </div>
    `
  })
};
