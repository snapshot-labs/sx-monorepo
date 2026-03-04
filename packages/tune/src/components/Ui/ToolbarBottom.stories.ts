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
  render: args => ({
    components: { ToolbarBottom },
    setup: () => ({ args }),
    template: `
      <div style="height: 200px; overflow: auto; position: relative">
        <div style="height: 400px; padding: 16px">Scroll down to see the toolbar</div>
        <ToolbarBottom v-bind="args">
          <div class="flex justify-between items-center p-4">
            <span>Toolbar content</span>
            <button class="border rounded-full px-4 py-2">Action</button>
          </div>
        </ToolbarBottom>
      </div>
    `
  })
};
