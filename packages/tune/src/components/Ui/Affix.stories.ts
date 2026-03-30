import { Meta, StoryObj } from '@storybook/vue3-vite';
import Affix from './Affix.vue';

const meta = {
  title: 'Ui/Affix',
  component: Affix,
  tags: ['autodocs'],
  args: {
    top: 0,
    bottom: 0
  },
  argTypes: {
    top: {
      control: { type: 'number' }
    },
    bottom: {
      control: { type: 'number' }
    }
  }
} satisfies Meta<typeof Affix>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Affix },
    setup: () => ({ args }),
    template: `
      <div style="height: 2000px; padding: 20px;">
        <p>Scroll down to see the sticky behavior.</p>
        <Affix v-bind="args">
          <div style="padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg);">
            Sticky content
          </div>
        </Affix>
      </div>
    `
  })
};

export const WithOffset: Story = {
  args: {
    top: 64,
    bottom: 64
  },
  render: args => ({
    components: { Affix },
    setup: () => ({ args }),
    template: `
      <div style="height: 2000px; padding: 20px;">
        <p>Sticky content with top and bottom offset.</p>
        <Affix v-bind="args">
          <div style="padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg);">
            Sticky with offset
          </div>
        </Affix>
      </div>
    `
  })
};
