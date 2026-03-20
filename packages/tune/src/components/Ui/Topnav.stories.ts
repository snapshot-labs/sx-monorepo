import { Meta, StoryObj } from '@storybook/vue3-vite';
import Topnav from './Topnav.vue';

const meta = {
  title: 'Ui/Topnav',
  component: Topnav,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A fixed top navigation bar that spans the full width of the viewport. Uses a slot for content, typically a logo on the left and menu items on the right.'
      }
    }
  }
} satisfies Meta<typeof Topnav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Topnav },
    setup() {
      return { args };
    },
    template: `<div style="position: relative; height: 72px;"><Topnav v-bind="args">
      <div style="display: flex; align-items: center; gap: 8px; padding-left: 16px;">
        <div style="width: 32px; height: 32px; background: #6366f1; border-radius: 8px;" />
        <span style="font-weight: 600; font-size: 18px;">Acme</span>
      </div>
      <nav style="display: flex; align-items: center; gap: 16px;">
        <a href="#" style="color: inherit; text-decoration: none;">Explore</a>
        <a href="#" style="color: inherit; text-decoration: none;">Create</a>
        <a href="#" style="color: inherit; text-decoration: none;">About</a>
        <div style="width: 32px; height: 32px; background: #e5e7eb; border-radius: 50%;" />
      </nav>
    </Topnav></div>`
  })
};
