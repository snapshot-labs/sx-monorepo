import type { Meta, StoryObj } from '@storybook/vue3-vite';
import ToolbarBottom from './ToolbarBottom.vue';

const meta = {
  title: 'Ui/ToolbarBottom',
  component: ToolbarBottom
} satisfies Meta<typeof ToolbarBottom>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ToolbarBottom },
    template:
      '<ToolbarBottom><div class="p-3">Toolbar content</div></ToolbarBottom>'
  })
};
