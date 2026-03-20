import { Meta, StoryObj } from '@storybook/vue3-vite';
import ToolbarBottom from './ToolbarBottom.vue';

const meta = {
  title: 'Ui/ToolbarBottom',
  component: ToolbarBottom,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A sticky toolbar that sticks to the bottom of the page. Useful for action bars with confirm/cancel buttons.'
      }
    }
  }
} satisfies Meta<typeof ToolbarBottom>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { ToolbarBottom },
    template: `
      <ToolbarBottom>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
          <span>3 items selected</span>
          <div style="display: flex; gap: 8px;">
            <button style="padding: 6px 16px; border: 1px solid #e5e7eb; border-radius: 8px;">Cancel</button>
            <button style="padding: 6px 16px; background: #1a1a2e; color: white; border-radius: 8px;">Confirm</button>
          </div>
        </div>
      </ToolbarBottom>
    `
  })
};
